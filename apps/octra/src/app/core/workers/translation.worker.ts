/// <reference lib="webworker" />

import { env, pipeline } from '@huggingface/transformers';
import { toFloresCode } from './flores-codes';

if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = '/assets/ort/';
}

async function isCacheAvailable(): Promise<boolean> {
  try {
    await caches.open('__probe__');
    return true;
  } catch {
    return false;
  }
}

export interface TranslationSegment {
  id: number;
  text: string;
}

export interface WorkerTranslateMessage {
  type: 'translate';
  modelId: string;
  segments: TranslationSegment[];
  srcLang: string;
  tgtLang: string;
  useWebGPU: boolean;
  dtype?: string;
}

export interface TWorkerDownloadProgressMessage {
  type: 'download-progress';
  loaded: number;
  total: number;
  file: string;
}

export interface TWorkerModelInitMessage {
  type: 'model-init';
}

export interface TWorkerStartMessage {
  type: 'translate-start';
  total: number;
}

export interface TWorkerSegmentProgressMessage {
  type: 'segment-progress';
  index: number;
  total: number;
}

export interface TWorkerResultMessage {
  type: 'result';
  translated: TranslationSegment[];
}

export interface TWorkerErrorMessage {
  type: 'error';
  message: string;
}

export type TWorkerOutMessage =
  | TWorkerDownloadProgressMessage
  | TWorkerModelInitMessage
  | TWorkerStartMessage
  | TWorkerSegmentProgressMessage
  | TWorkerResultMessage
  | TWorkerErrorMessage;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let translator: any = null;
let loadedModelId: string | null = null;

addEventListener('message', async ({ data }: MessageEvent<WorkerTranslateMessage>) => {
  if (data.type !== 'translate') return;

  const { modelId, segments, srcLang, tgtLang, useWebGPU, dtype } = data;

  try {
    if (!(await isCacheAvailable())) {
      env.useBrowserCache = false;
    }

    if (!translator || loadedModelId !== modelId) {
      translator = null;
      loadedModelId = null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pipelineFn = pipeline as any;
      const fileProgress = new Map<string, { loaded: number; total: number }>();
      let initSignaled = false;
      const emitAggregateProgress = (file: string) => {
        let totalLoaded = 0;
        let totalSize = 0;
        for (const fp of fileProgress.values()) {
          totalLoaded += fp.loaded;
          totalSize += fp.total;
        }
        const msg: TWorkerDownloadProgressMessage = {
          type: 'download-progress',
          loaded: totalLoaded,
          total: totalSize,
          file,
        };
        postMessage(msg);
      };

      translator = await pipelineFn('translation', modelId, {
        device: useWebGPU ? 'webgpu' : 'wasm',
        dtype: dtype ?? 'q4',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        progress_callback: (progress: any) => {
          const file: string = progress?.file ?? '';
          if (progress?.status === 'progress' && progress.loaded !== undefined) {
            fileProgress.set(file, {
              loaded: progress.loaded,
              total: progress.total ?? 0,
            });
            emitAggregateProgress(file);
          } else if (progress?.status === 'done' && file) {
            const fp = fileProgress.get(file);
            if (fp && fp.total > 0) {
              fp.loaded = fp.total;
              emitAggregateProgress(file);
            }
            if (!initSignaled) {
              initSignaled = true;
              const msg: TWorkerModelInitMessage = { type: 'model-init' };
              postMessage(msg);
            }
          }
        },
      });

      loadedModelId = modelId;
    }

    const startMsg: TWorkerStartMessage = {
      type: 'translate-start',
      total: segments.length,
    };
    postMessage(startMsg);

    const translated: TranslationSegment[] = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const text = seg.text.trim();
      if (!text) {
        translated.push({ id: seg.id, text: '' });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const out: any = await (translator as any)(text, {
          src_lang: toFloresCode(srcLang),
          tgt_lang: toFloresCode(tgtLang),
        });
        const first = Array.isArray(out) ? out[0] : out;
        const translatedText: string =
          first?.translation_text ?? first?.generated_text ?? '';
        translated.push({ id: seg.id, text: translatedText });
      }
      const progressMsg: TWorkerSegmentProgressMessage = {
        type: 'segment-progress',
        index: i + 1,
        total: segments.length,
      };
      postMessage(progressMsg);
    }

    const resultMsg: TWorkerResultMessage = { type: 'result', translated };
    postMessage(resultMsg);
    self.close();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const errMsg: TWorkerErrorMessage = { type: 'error', message };
    postMessage(errMsg);
    self.close();
  }
});
