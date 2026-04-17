import {
  Component,
  effect,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { isSafariOrWebKit } from '@octra/web-media';
import { TranslocoPipe } from '@jsverse/transloco';
import { TranscriptionOptions } from '../../shared/service/local-transcription.service';

export interface KbWhisperModel {
  /** Translation key suffix for i18n, e.g. 'tiny', 'small', 'medium', 'large'. */
  key: string;
  modelId: string;
  sizeMb: number;
  requiresWebGpu: boolean;
  hasWebgpuVariant: boolean;
  /** Set when the model cannot be used in a browser regardless of hardware. */
  unsupportedReason?: string;
  /** ONNX dtype to request when running on WASM (e.g. 'q8'). */
  dtypeWasm?: string;
  /** ONNX dtype to request when running on WebGPU (e.g. 'q4f16'). */
  dtypeWebgpu?: string;
}

export const KB_WHISPER_MODELS: KbWhisperModel[] = [
  {
    key: 'tiny',
    modelId: 'onnx-community/kb-whisper-tiny-ONNX',
    sizeMb: 120,
    requiresWebGpu: false,
    hasWebgpuVariant: true,
    dtypeWasm: 'q8',
    dtypeWebgpu: 'q4',
  },
  {
    key: 'small',
    modelId: 'onnx-community/kb-whisper-small-ONNX',
    sizeMb: 400,
    requiresWebGpu: false,
    hasWebgpuVariant: true,
    dtypeWasm: 'q8',
    dtypeWebgpu: 'q4',
  },
  {
    key: 'medium',
    modelId: 'onnx-community/kb-whisper-medium-ONNX',
    sizeMb: 1000,
    requiresWebGpu: true,
    hasWebgpuVariant: true,
    dtypeWasm: 'q4',
    dtypeWebgpu: 'q4',
  },
  {
    key: 'large',
    modelId: 'onnx-community/kb-whisper-large-ONNX',
    sizeMb: 1200,
    requiresWebGpu: true,
    hasWebgpuVariant: true,
    dtypeWasm: 'q4',
    dtypeWebgpu: 'q4',
  },
];


@Component({
  selector: 'octra-auto-transcribe-options',
  standalone: true,
  imports: [FormsModule, NgbTooltipModule, TranslocoPipe],
  template: `
    @if (audioLoaded() && !annotationAlreadyLoaded()) {
      <div class="auto-transcribe-options mt-2 p-2 border rounded">
        @if (isSafari()) {
          <div class="alert alert-warning mb-2">
            <i class="bi bi-exclamation-triangle"></i>
            {{ 'login.auto-transcription.safari warning' | transloco }}
          </div>
        }
        <div class="form-check mb-1">
          <input
            class="form-check-input"
            type="checkbox"
            id="autoTranscribeCheck"
            [(ngModel)]="enabled"
            (ngModelChange)="emitChange()"
            [disabled]="isSafari()"
            [class.safari-disabled]="isSafari()"
          />
          <label class="form-check-label" for="autoTranscribeCheck">
            {{ 'login.auto-transcription.auto-transcribe label' | transloco }}
          </label>
        </div>
        @if (!isSafari()) {
          <small class="text-muted d-block mb-2">
            <i class="bi bi-cloud-download"></i>
            {{ 'login.auto-transcription.requires internet' | transloco }}
          </small>
        }

        @if (enabled()) {
          <div class="d-flex flex-column gap-1">
            @for (model of models; track model.modelId) {
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="radio"
                  [id]="'model-' + model.modelId"
                  [value]="model.modelId"
                  [(ngModel)]="selectedModelId"
                  [disabled]="
                    !!model.unsupportedReason ||
                    (model.requiresWebGpu && !hasWebGpu())
                  "
                  (ngModelChange)="emitChange()"
                />
                <label
                  class="form-check-label"
                  [class.text-muted]="
                    !!model.unsupportedReason ||
                    (model.requiresWebGpu && !hasWebGpu())
                  "
                  [for]="'model-' + model.modelId"
                  [ngbTooltip]="
                    model.unsupportedReason ??
                    (model.requiresWebGpu && !hasWebGpu()
                      ? ('login.auto-transcription.requires webgpu' | transloco)
                      : null)
                  "
                >
                  {{
                    (hasWebGpu() && model.hasWebgpuVariant
                      ? 'login.auto-transcription.models.' + model.key + '.webgpu'
                      : 'login.auto-transcription.models.' + model.key + '.wasm')
                      | transloco
                  }}
                </label>
              </div>
            }

            @if (!hasWebGpu()) {
              <small class="text-muted">
                <i class="bi bi-exclamation-triangle"></i>
                {{ 'login.auto-transcription.no webgpu' | transloco }}
              </small>
            }

            <small class="text-muted mt-1">
              <i class="bi bi-info-circle"></i>
              {{ 'login.auto-transcription.model cached after download' | transloco }}
            </small>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .auto-transcribe-options {
        background-color: var(--octra-surface-background);
        font-size: 0.9rem;
      }
      .form-check-input.safari-disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class AutoTranscribeOptionsComponent implements OnInit {
  readonly audioLoaded = input<boolean>(false);
  readonly annotationAlreadyLoaded = input<boolean>(false);
  readonly optionsChange = output<TranscriptionOptions | null>();

  readonly enabled = signal(false);
  selectedModelId = KB_WHISPER_MODELS[2].modelId; // default: medium
  readonly hasWebGpu = signal(false);
  readonly isSafari = signal(false);

  readonly models = KB_WHISPER_MODELS;

  constructor() {
    effect(() => {
      // Track signal reads so the effect re-runs when they change
      this.audioLoaded();
      this.annotationAlreadyLoaded();
      this.emitChange();
    });
  }

  async ngOnInit(): Promise<void> {
    this.isSafari.set(isSafariOrWebKit());
    try {
      const nav = navigator as Navigator & {
        gpu?: { requestAdapter(): Promise<unknown> | null };
      };
      if (nav.gpu) {
        const adapter = await nav.gpu.requestAdapter();
        this.hasWebGpu.set(!!adapter);
      }
    } catch {
      this.hasWebGpu.set(false);
    }
  }

  emitChange(): void {
    if (!this.audioLoaded() || this.annotationAlreadyLoaded()) {
      this.optionsChange.emit(null);
      return;
    }
    if (!this.enabled()) {
      this.optionsChange.emit(null);
      return;
    }
    const model = KB_WHISPER_MODELS.find(
      (m) => m.modelId === this.selectedModelId,
    );
    const dtype = this.hasWebGpu() ? model?.dtypeWebgpu : model?.dtypeWasm;
    this.optionsChange.emit({
      modelId: this.selectedModelId,
      useWebGPU: this.hasWebGpu(),
      dtype,
    });
  }
}
