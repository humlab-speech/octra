import { Injectable, NgZone, OnDestroy } from '@angular/core';
import {
  OAnnotJSON,
  OLabel,
  OSegment,
  OSegmentLevel,
} from '@octra/annotation';
import { pickInitialLevelName } from '@octra/utilities';
import { Observable, Subject } from 'rxjs';
import type {
  PlanStage,
  TranslationPlan,
  TranslationSegment,
  TWorkerOutMessage,
  WorkerTranslateMessage,
} from '../../workers/translation.worker';

export interface TranslationDownloadProgress {
  type: 'download-progress';
  loaded: number;
  total: number;
  file: string;
}

export interface TranslationModelInit {
  type: 'model-init';
}

export interface TranslationStart {
  type: 'translate-start';
  total: number;
}

export interface TranslationSegmentProgress {
  type: 'segment-progress';
  index: number;
  total: number;
}

export interface TranslationResult {
  type: 'result';
  annotJson: OAnnotJSON;
}

export interface TranslationError {
  type: 'error';
  message: string;
}

export type TranslationEvent =
  | TranslationDownloadProgress
  | TranslationModelInit
  | TranslationStart
  | TranslationSegmentProgress
  | TranslationResult
  | TranslationError;

export interface TranslationOptions {
  sourceLanguage: string;
  targetLanguage: string;
  useMultilingual?: boolean;
  skipBrowserCache?: boolean;
}

export type TranslationAvailability =
  | { kind: 'direct'; modelId: string; estimatedBytes: number }
  | { kind: 'pivot'; legA: string; legB: string; estimatedBytes: number }
  | { kind: 'multilingual'; modelId: string; estimatedBytes: number }
  | { kind: 'unavailable'; reason: string };

export const TRANSLATION_REQUIRED_BYTES = 200_000_000;

export const MULTILINGUAL_MODEL_ID = 'Xenova/m2m100_418M';
export const MULTILINGUAL_BYTES = 450_000_000;
export const OPUS_MT_BYTES_PER_PAIR = 80_000_000;

const HF_BASE = 'https://huggingface.co';

@Injectable({ providedIn: 'root' })
export class LocalTranslationService implements OnDestroy {
  private worker: Worker | null = null;
  private subject: Subject<TranslationEvent> | null = null;
  private readonly probeCache = new Map<string, Promise<boolean>>();

  constructor(private ngZone: NgZone) {}

  async resolveAvailability(
    sourceLanguage: string,
    targetLanguage: string,
    useMultilingual: boolean,
  ): Promise<TranslationAvailability> {
    if (sourceLanguage === targetLanguage) {
      return { kind: 'unavailable', reason: 'source and target are the same' };
    }
    if (useMultilingual) {
      return {
        kind: 'multilingual',
        modelId: MULTILINGUAL_MODEL_ID,
        estimatedBytes: MULTILINGUAL_BYTES,
      };
    }
    const direct = opusMtId(sourceLanguage, targetLanguage);
    if (await this.probeModel(direct)) {
      return { kind: 'direct', modelId: direct, estimatedBytes: OPUS_MT_BYTES_PER_PAIR };
    }
    if (sourceLanguage !== 'en' && targetLanguage !== 'en') {
      const a = opusMtId(sourceLanguage, 'en');
      const b = opusMtId('en', targetLanguage);
      const [okA, okB] = await Promise.all([this.probeModel(a), this.probeModel(b)]);
      if (okA && okB) {
        return {
          kind: 'pivot',
          legA: a,
          legB: b,
          estimatedBytes: OPUS_MT_BYTES_PER_PAIR * 2,
        };
      }
    }
    return {
      kind: 'unavailable',
      reason: `No local opus-mt path for ${sourceLanguage}\u2192${targetLanguage}. Enable the multilingual model.`,
    };
  }

  private probeModel(modelId: string): Promise<boolean> {
    const hit = this.probeCache.get(modelId);
    if (hit) return hit;
    const url = `${HF_BASE}/${modelId}/resolve/main/config.json`;
    const p = fetch(url, { method: 'HEAD' })
      .then((r) => r.ok)
      .catch(() => false);
    this.probeCache.set(modelId, p);
    return p;
  }

  translate(
    annotJson: OAnnotJSON,
    options: TranslationOptions,
  ): Observable<TranslationEvent> {
    this.cancel();

    const subject = new Subject<TranslationEvent>();
    this.subject = subject;

    const sourceLevel = (annotJson.levels ?? []).find(
      (l): l is OSegmentLevel<OSegment> => l instanceof OSegmentLevel,
    );

    if (!sourceLevel) {
      queueMicrotask(() =>
        subject.error(new Error('No segment level found to translate')),
      );
      return subject.asObservable();
    }

    const segments: TranslationSegment[] = sourceLevel.items.map((item, idx) => ({
      id: idx,
      text: item.labels?.[0]?.value ?? '',
    }));

    if (!segments.some((s) => s.text.trim().length > 0)) {
      queueMicrotask(() =>
        subject.error(new Error('Source level contains no text to translate')),
      );
      return subject.asObservable();
    }

    const skipCache = options.skipBrowserCache === true;

    void (async () => {
      const availability = await this.resolveAvailability(
        options.sourceLanguage,
        options.targetLanguage,
        options.useMultilingual === true,
      );
      if (availability.kind === 'unavailable') {
        this.ngZone.run(() => {
          subject.error(new Error(availability.reason));
          this.cleanup();
        });
        return;
      }

      const requiredBytes = availability.estimatedBytes;
      if (!skipCache && navigator.storage?.estimate) {
        try {
          const { quota = 0, usage = 0 } = await navigator.storage.estimate();
          const available = quota - usage;
          if (available > 0 && available < requiredBytes) {
            this.ngZone.run(() => {
              subject.error(
                new Error(
                  `Not enough browser storage for the translation model. ` +
                    `Need ~${(requiredBytes / 1e6).toFixed(0)} MB free, ` +
                    `have ${(available / 1e6).toFixed(0)} MB. ` +
                    `Free space, or enable "Skip browser cache" in the translation options.`,
                ),
              );
              this.cleanup();
            });
            return;
          }
        } catch {
          // estimate not available; fall through
        }
      }
      try {
        await navigator.storage?.persist?.();
      } catch {
        // best-effort
      }

      const plan = buildPlanFromAvailability(
        availability,
        options.sourceLanguage,
        options.targetLanguage,
      );
      this.spawnWorker(annotJson, sourceLevel, segments, options, subject, skipCache, plan);
    })();

    return subject.asObservable();
  }

  private spawnWorker(
    annotJson: OAnnotJSON,
    sourceLevel: OSegmentLevel<OSegment>,
    segments: TranslationSegment[],
    options: TranslationOptions,
    subject: Subject<TranslationEvent>,
    skipCache: boolean,
    plan: TranslationPlan,
  ): void {
    const worker = new Worker(
      new URL('../../workers/translation.worker', import.meta.url),
      { type: 'module' },
    );
    this.worker = worker;

    worker.onmessage = ({ data }: MessageEvent<TWorkerOutMessage>) => {
      this.ngZone.run(() => {
        if (data.type === 'result') {
          try {
            const augmented = this.appendTranslatedLevel(
              annotJson,
              sourceLevel,
              data.translated,
              options,
            );
            subject.next({ type: 'result', annotJson: augmented });
            subject.complete();
          } catch (err: unknown) {
            subject.error(err);
          }
          this.cleanup();
        } else if (data.type === 'error') {
          subject.error(new Error(this.friendlyError(data.message)));
          this.cleanup();
        } else {
          subject.next(data);
        }
      });
    };

    worker.onerror = (err) => {
      this.ngZone.run(() => {
        subject.error(new Error(this.friendlyError(err.message ?? '')));
        this.cleanup();
      });
    };

    const message: WorkerTranslateMessage = {
      type: 'translate',
      plan,
      segments,
      skipBrowserCache: skipCache,
    };
    worker.postMessage(message);
  }

  cancel(): void {
    if (this.worker) {
      this.cleanup();
    }
  }

  ngOnDestroy(): void {
    this.cancel();
  }

  private cleanup(): void {
    const w = this.worker;
    this.worker = null;
    w?.terminate();
    if (this.subject && !this.subject.closed) {
      this.subject.complete();
    }
    this.subject = null;
  }

  private appendTranslatedLevel(
    annotJson: OAnnotJSON,
    sourceLevel: OSegmentLevel<OSegment>,
    translated: TranslationSegment[],
    options: TranslationOptions,
  ): OAnnotJSON {
    const levelName = pickInitialLevelName({
      asrLanguage: options.targetLanguage,
    });
    const usedNames = new Set(annotJson.levels.map((l) => l.name));
    let unique = levelName;
    let counter = 2;
    while (usedNames.has(unique)) {
      unique = `${levelName} (${counter++})`;
    }

    const newItems = sourceLevel.items.map((item, idx) => {
      const tr = translated.find((t) => t.id === idx);
      const text = tr?.text ?? '';
      return new OSegment(
        idx + 1,
        item.sampleStart,
        item.sampleDur,
        [new OLabel(unique, text)],
      );
    });
    const newLevel = new OSegmentLevel<OSegment>(unique, newItems);
    const mergedLevels = [
      ...(annotJson.levels ?? []).map((l) => l.serialize()),
      newLevel.serialize(),
    ];
    const mergedLinks = (annotJson.links ?? []).map((l) => l.serialize());
    return new OAnnotJSON(
      annotJson.annotates,
      annotJson.name,
      annotJson.sampleRate,
      mergedLevels,
      mergedLinks,
    );
  }

  private friendlyError(raw: string): string {
    if (/^\d+$/.test(raw.trim())) {
      return (
        `Translation engine crashed (code ${raw}). The model is likely too large ` +
        `for browser memory. Try reloading; if it persists, switch to a smaller pair.`
      );
    }
    return raw;
  }
}

export function opusMtId(src: string, tgt: string): string {
  return `Xenova/opus-mt-${src}-${tgt}`;
}

function buildPlanFromAvailability(
  a: Exclude<TranslationAvailability, { kind: 'unavailable' }>,
  src: string,
  tgt: string,
): TranslationPlan {
  if (a.kind === 'direct') {
    const stage: PlanStage = {
      modelId: a.modelId,
      family: 'opus-mt',
      srcLang: src,
      tgtLang: tgt,
    };
    return { stages: [stage] };
  }
  if (a.kind === 'pivot') {
    return {
      stages: [
        { modelId: a.legA, family: 'opus-mt', srcLang: src, tgtLang: 'en' },
        { modelId: a.legB, family: 'opus-mt', srcLang: 'en', tgtLang: tgt },
      ],
    };
  }
  return {
    stages: [
      { modelId: a.modelId, family: 'm2m100', srcLang: src, tgtLang: tgt },
    ],
  };
}
