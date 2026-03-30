/// <reference lib="webworker" />

import { env, pipeline } from '@huggingface/transformers';

// Point ONNX Runtime to the locally served WASM files
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

export interface WorkerTranscribeMessage {
  type: 'transcribe';
  modelId: string;
  audio: Float32Array;
  useWebGPU: boolean;
}

export interface WorkerDownloadProgressMessage {
  type: 'download-progress';
  loaded: number;
  total: number;
  file: string;
}

export interface WorkerTranscribeProgressMessage {
  type: 'transcribe-progress';
  chunksProcessed: number;
}

export interface WorkerResultMessage {
  type: 'result';
  chunks: Array<{ timestamp: [number, number]; text: string }>;
}

export interface WorkerErrorMessage {
  type: 'error';
  message: string;
}

export type WorkerOutMessage =
  | WorkerDownloadProgressMessage
  | WorkerTranscribeProgressMessage
  | WorkerResultMessage
  | WorkerErrorMessage;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: any = null;
let loadedModelId: string | null = null;

addEventListener('message', async ({ data }: MessageEvent<WorkerTranscribeMessage>) => {
  if (data.type !== 'transcribe') return;

  const { modelId, audio, useWebGPU } = data;

  try {
    if (!(await isCacheAvailable())) {
      env.useBrowserCache = false;
    }

    if (!transcriber || loadedModelId !== modelId) {
      transcriber = null;
      loadedModelId = null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pipelineFn = pipeline as any;
      const fileProgress = new Map<string, { loaded: number; total: number }>();
      transcriber = await pipelineFn('automatic-speech-recognition', modelId, {
        device: useWebGPU ? 'webgpu' : 'wasm',
        progress_callback: (progress: any) => {
          if (progress?.status === 'progress' && progress.loaded !== undefined) {
            fileProgress.set(progress.file ?? '', {
              loaded: progress.loaded,
              total: progress.total ?? 0,
            });
            let totalLoaded = 0;
            let totalSize = 0;
            for (const fp of fileProgress.values()) {
              totalLoaded += fp.loaded;
              totalSize += fp.total;
            }
            const msg: WorkerDownloadProgressMessage = {
              type: 'download-progress',
              loaded: totalLoaded,
              total: totalSize,
              file: progress.file ?? '',
            };
            postMessage(msg);
          }
        },
      });

      loadedModelId = modelId;
    }

    let chunksProcessed = 0;
    const result = await transcriber(audio, {
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
      language: 'sv',
      task: 'transcribe',
      callback_function: () => {
        chunksProcessed++;
        const msg: WorkerTranscribeProgressMessage = {
          type: 'transcribe-progress',
          chunksProcessed,
        };
        postMessage(msg);
      },
    });

    const chunks = (result as any).chunks as Array<{ timestamp: [number, number]; text: string }>;
    const msg: WorkerResultMessage = { type: 'result', chunks: chunks ?? [] };
    postMessage(msg);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const msg: WorkerErrorMessage = { type: 'error', message };
    postMessage(msg);
  }
});
