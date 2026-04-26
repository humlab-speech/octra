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
  | TranslationStart
  | TranslationSegmentProgress
  | TranslationResult
  | TranslationError;

export interface TranslationOptions {
  modelId: string;
  useWebGPU: boolean;
  dtype?: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export const HYMT_DEFAULT_MODEL_ID = 'onnx-community/HY-MT1.5-1.8B-ONNX';

@Injectable({ providedIn: 'root' })
export class LocalTranslationService implements OnDestroy {
  private worker: Worker | null = null;
  private subject: Subject<TranslationEvent> | null = null;

  constructor(private ngZone: NgZone) {}

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
          subject.error(
            new Error(this.friendlyError(data.message, options.useWebGPU)),
          );
          this.cleanup();
        } else {
          subject.next(data);
        }
      });
    };

    worker.onerror = (err) => {
      this.ngZone.run(() => {
        subject.error(
          new Error(this.friendlyError(err.message ?? '', options.useWebGPU)),
        );
        this.cleanup();
      });
    };

    const message: WorkerTranslateMessage = {
      type: 'translate',
      modelId: options.modelId,
      segments,
      srcLang: options.sourceLanguage,
      tgtLang: options.targetLanguage,
      useWebGPU: options.useWebGPU,
      ...(options.dtype ? { dtype: options.dtype } : {}),
    };
    worker.postMessage(message);

    return subject.asObservable();
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
    annotJson.levels = [...(annotJson.levels ?? []), newLevel];
    return annotJson;
  }

  private friendlyError(raw: string, usedWebGPU: boolean): string {
    const lower = raw.toLowerCase();
    const isGpuError =
      lower.includes('device') ||
      lower.includes('gpu') ||
      lower.includes('webgpu') ||
      lower.includes('out of memory') ||
      lower.includes('oom');
    if (usedWebGPU && isGpuError) {
      return (
        'WebGPU error during translation: the GPU ran out of memory or lost ' +
        'its connection (common with the 1.8B model after the display sleeps). ' +
        'Try disabling WebGPU in the translation options and run with WASM instead.'
      );
    }
    return raw;
  }
}
