/// <reference lib="webworker" />

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { AutoModelForAudioFrameClassification, AutoProcessor, env } from '@huggingface/transformers';
import { normalizePyannoteSpeakerTurns } from '../shared/service/local-diarization-postprocess';
import { SpeakerTurn } from '../shared/service/local-diarization.service';
import { DiarizationDType } from '../shared/service/local-diarization-runtime.service';

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

export interface WorkerDiarizeMessage {
  type: 'diarize';
  modelId: string;
  audio: Float32Array;
  useWebGPU: boolean;
  audioDurationS: number;
  dtype?: DiarizationDType;
}

export interface WorkerDiarizationDownloadProgressMessage {
  type: 'download-progress';
  loaded: number;
  total: number;
  file: string;
}

export interface WorkerDiarizeStartMessage {
  type: 'diarize-start';
  audioDurationS: number;
}

export interface WorkerDiarizationResultMessage {
  type: 'result';
  turns: SpeakerTurn[];
}

export interface WorkerDiarizationErrorMessage {
  type: 'error';
  message: string;
}

export type WorkerDiarizationOutMessage =
  | WorkerDiarizationDownloadProgressMessage
  | WorkerDiarizeStartMessage
  | WorkerDiarizationResultMessage
  | WorkerDiarizationErrorMessage;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loadedProcessor: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let loadedModel: any = null;
let loadedModelId: string | null = null;

addEventListener('message', async ({ data }: MessageEvent<WorkerDiarizeMessage>) => {
  if (data.type !== 'diarize') {
    return;
  }

  const { modelId, audio, useWebGPU, audioDurationS, dtype } = data;

  try {
    if (!(await isCacheAvailable())) {
      env.useBrowserCache = false;
    }

    if (!loadedModel || !loadedProcessor || loadedModelId !== modelId) {
      loadedModel = null;
      loadedProcessor = null;
      loadedModelId = null;

      const fileProgress = new Map<string, { loaded: number; total: number }>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const progress_callback = (progress: any) => {
        if (progress?.status !== 'progress' || progress.loaded === undefined) {
          return;
        }

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

        const msg: WorkerDiarizationDownloadProgressMessage = {
          type: 'download-progress',
          loaded: totalLoaded,
          total: totalSize,
          file: progress.file ?? '',
        };
        postMessage(msg);
      };

      loadedProcessor = await AutoProcessor.from_pretrained(modelId, {
        progress_callback,
      });
      loadedModel = await AutoModelForAudioFrameClassification.from_pretrained(modelId, {
        device: useWebGPU ? 'webgpu' : 'wasm',
        ...(dtype ? { dtype } : {}),
        progress_callback,
      });
      loadedModelId = modelId;
    }

    const startMsg: WorkerDiarizeStartMessage = {
      type: 'diarize-start',
      audioDurationS,
    };
    postMessage(startMsg);

    const inputs = await loadedProcessor(audio);
    const { logits } = await loadedModel(inputs);
    const diarization = loadedProcessor.post_process_speaker_diarization(
      logits,
      audio.length,
    ) as Array<Array<{ id: number; start: number; end: number; confidence?: number }>>;

    const turns = normalizePyannoteSpeakerTurns(diarization[0] ?? []);
    const resultMsg: WorkerDiarizationResultMessage = { type: 'result', turns };
    postMessage(resultMsg);
    self.close();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const errMsg: WorkerDiarizationErrorMessage = { type: 'error', message };
    postMessage(errMsg);
    self.close();
  }
});
