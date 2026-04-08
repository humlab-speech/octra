import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { IFile, OAnnotJSON } from '@octra/annotation';
import { OAudiofile } from '@octra/media';
import { AudioManager, resampleChannels } from '@octra/web-media';
import { Observable, Subject } from 'rxjs';
import { AppInfo } from '../../../app.info';
import type {
  WorkerOutMessage,
  WorkerTranscribeMessage,
} from '../../workers/whisper-transcription.worker';

export interface TranscriptionDownloadProgress {
  type: 'download-progress';
  loaded: number;
  total: number;
  file: string;
}

export interface TranscriptionStart {
  type: 'transcribe-start';
  audioDurationS: number;
}

export interface TranscriptionSegmentProgress {
  type: 'segment-progress';
  segmentEndS: number;
}

export interface TranscriptionResult {
  type: 'result';
  annotJson: OAnnotJSON;
}

export interface TranscriptionError {
  type: 'error';
  message: string;
}

export type TranscriptionEvent =
  | TranscriptionDownloadProgress
  | TranscriptionStart
  | TranscriptionSegmentProgress
  | TranscriptionResult
  | TranscriptionError;

export interface TranscriptionOptions {
  modelId: string;
  useWebGPU: boolean;
  dtype?: string;
}

const WHISPER_SAMPLE_RATE = 16000;

@Injectable({ providedIn: 'root' })
export class LocalTranscriptionService implements OnDestroy {
  private worker: Worker | null = null;
  private subject: Subject<TranscriptionEvent> | null = null;

  constructor(private ngZone: NgZone) {}

  transcribe(
    audioManager: AudioManager,
    oaudiofile: OAudiofile,
    options: TranscriptionOptions,
  ): Observable<TranscriptionEvent> {
    this.cancel();

    const subject = new Subject<TranscriptionEvent>();
    this.subject = subject;

    const channel = audioManager.channel;
    if (!channel) {
      subject.error(new Error('Audio channel data not available'));
      return subject.asObservable();
    }

    // Tiers 1/3 normalize to 16 kHz; Tier 4 (WAV/OCTRA decoder) may not.
    const srcRate =
      audioManager.resource.info.audioBufferInfo?.sampleRate ??
      audioManager.sampleRate;
    const mono: Float32Array =
      srcRate !== WHISPER_SAMPLE_RATE
        ? resampleChannels([channel], srcRate, WHISPER_SAMPLE_RATE)[0]
        : new Float32Array(channel); // copy — never transfer the AudioManager's own buffer

    const audioDurationS = mono.length / WHISPER_SAMPLE_RATE;

    const worker = new Worker(
      new URL('../../workers/whisper-transcription.worker', import.meta.url),
      { type: 'module' },
    );
    this.worker = worker;

    worker.onmessage = ({ data }: MessageEvent<WorkerOutMessage>) => {
      this.ngZone.run(() => {
        if (data.type === 'result') {
          try {
            const annotJson = this.chunksToAnnotJson(data.chunks, oaudiofile);
            subject.next({ type: 'result', annotJson });
            subject.complete();
          } catch (err: unknown) {
            subject.error(err);
          }
          this.cleanup();
        } else if (data.type === 'error') {
          subject.error(new Error(this.friendlyError(data.message, options.useWebGPU)));
          this.cleanup();
        } else {
          subject.next(data);
        }
      });
    };

    worker.onerror = (err) => {
      this.ngZone.run(() => {
        subject.error(new Error(this.friendlyError(err.message ?? '', options.useWebGPU)));
        this.cleanup();
      });
    };

    const message: WorkerTranscribeMessage = {
      type: 'transcribe',
      modelId: options.modelId,
      audio: mono,
      useWebGPU: options.useWebGPU,
      audioDurationS,
      ...(options.dtype ? { dtype: options.dtype } : {}),
    };
    worker.postMessage(message, [mono.buffer]);

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
    w?.terminate(); // free WASM heap on every exit path
    if (this.subject && !this.subject.closed) {
      this.subject.complete();
    }
    this.subject = null;
  }

  private chunksToAnnotJson(
    chunks: Array<{ timestamp: [number, number | null]; text: string }>,
    oaudiofile: OAudiofile,
  ): OAnnotJSON {
    const audioDurationS = oaudiofile.duration / oaudiofile.sampleRate;
    const srtText = this.chunksToSrt(chunks, audioDurationS);
    const srtConverter = AppInfo.converters.find((c) => c.name === 'SRT');
    if (!srtConverter) {
      throw new Error('SRT converter not found in AppInfo.converters');
    }

    const ofile: IFile = {
      name: oaudiofile.name.replace(/\.[^.]+$/, '') + '.srt',
      type: 'text/plain',
      content: srtText,
      encoding: 'UTF-8',
    };

    const result = srtConverter.import(ofile, oaudiofile);
    if (!result?.annotjson) {
      throw new Error(
        result?.error ?? 'SRT import returned no annotation',
      );
    }
    return result.annotjson;
  }

  private chunksToSrt(
    chunks: Array<{ timestamp: [number, number | null]; text: string }>,
    audioDurationS: number,
  ): string {
    return (
      chunks
        .map(
          (c, i) =>
            `${i + 1}\n${this.toSrtTime(c.timestamp[0])} --> ${this.toSrtTime(c.timestamp[1] ?? audioDurationS)}\n${c.text.trim()}`,
        )
        .join('\n\n') + '\n'
    );
  }

  private toSrtTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${this.pad2(h)}:${this.pad2(m)}:${this.pad2(s)},${ms.toString().padStart(3, '0')}`;
  }

  private pad2(n: number): string {
    return n.toString().padStart(2, '0');
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
        'WebGPU error: the GPU ran out of memory or lost its connection ' +
        '(common with large models or after the display sleeps). ' +
        'Try disabling WebGPU in the transcription options and run with WASM instead.'
      );
    }
    return raw;
  }
}
