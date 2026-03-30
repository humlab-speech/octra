import { Component, effect, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranscriptionOptions } from '../../shared/service/local-transcription.service';

export interface KbWhisperModel {
  label: string;
  modelId: string;
  sizeMb: number;
  requiresWebGpu: boolean;
}

export const KB_WHISPER_MODELS: KbWhisperModel[] = [
  { label: 'Tiny (~150 MB)', modelId: 'KBLab/kb-whisper-tiny', sizeMb: 150, requiresWebGpu: false },
  { label: 'Small (~450 MB)', modelId: 'KBLab/kb-whisper-small', sizeMb: 450, requiresWebGpu: false },
  { label: 'Medium (~1.5 GB)', modelId: 'KBLab/kb-whisper-medium', sizeMb: 1500, requiresWebGpu: false },
  { label: 'Large (~3 GB)', modelId: 'KBLab/kb-whisper-large', sizeMb: 3000, requiresWebGpu: true },
];

@Component({
  selector: 'octra-auto-transcribe-options',
  standalone: true,
  imports: [FormsModule, NgbTooltipModule],
  template: `
    @if (audioLoaded() && !annotationAlreadyLoaded()) {
      <div class="auto-transcribe-options mt-2 p-2 border rounded">
        <div class="form-check mb-1">
          <input
            class="form-check-input"
            type="checkbox"
            id="autoTranscribeCheck"
            [(ngModel)]="enabled"
            (ngModelChange)="emitChange()"
          />
          <label class="form-check-label" for="autoTranscribeCheck">
            Auto-transcribe with Whisper
          </label>
        </div>
        <small class="text-muted d-block mb-2">
          <i class="bi bi-cloud-download"></i>
          Requires internet access — the selected model will be downloaded from HuggingFace
          (150 MB – 3 GB). Downloaded models are cached in the browser.
        </small>

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
                  [disabled]="model.requiresWebGpu && !hasWebGpu()"
                  (ngModelChange)="emitChange()"
                />
                <label
                  class="form-check-label"
                  [class.text-muted]="model.requiresWebGpu && !hasWebGpu()"
                  [for]="'model-' + model.modelId"
                  [ngbTooltip]="model.requiresWebGpu && !hasWebGpu() ? 'Requires WebGPU — not available in this browser' : null"
                >
                  {{ model.label }}
                </label>
              </div>
            }

            @if (!hasWebGpu()) {
              <small class="text-muted">
                <i class="bi bi-exclamation-triangle"></i>
                WebGPU not detected — Large model disabled
              </small>
            }

            <small class="text-muted mt-1">
              <i class="bi bi-info-circle"></i>
              Model will be cached after first download
            </small>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .auto-transcribe-options {
      background-color: #f8f9fa;
      font-size: 0.9rem;
    }
  `],
})
export class AutoTranscribeOptionsComponent implements OnInit {
  readonly audioLoaded = input<boolean>(false);
  readonly annotationAlreadyLoaded = input<boolean>(false);
  readonly optionsChange = output<TranscriptionOptions | null>();

  readonly enabled = signal(false);
  selectedModelId = KB_WHISPER_MODELS[2].modelId; // default: medium
  readonly hasWebGpu = signal(false);

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
    try {
      const nav = navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> | null } };
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
    this.optionsChange.emit(this.enabled() ? { modelId: this.selectedModelId, useWebGPU: this.hasWebGpu() } : null);
  }
}
