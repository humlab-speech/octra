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
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
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
  /** When present, overrides `key` in the i18n lookup path. */
  i18nKey?: string;
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

export const OPENAI_WHISPER_MODELS: KbWhisperModel[] = [
  {
    key: 'tiny',
    i18nKey: 'openai-tiny',
    modelId: 'onnx-community/whisper-tiny-ONNX',
    sizeMb: 95,
    requiresWebGpu: false,
    hasWebgpuVariant: true,
    dtypeWasm: 'q4',
    dtypeWebgpu: 'q4',
  },
  {
    key: 'small',
    i18nKey: 'openai-small',
    modelId: 'onnx-community/whisper-small',
    sizeMb: 290,
    requiresWebGpu: false,
    hasWebgpuVariant: true,
    dtypeWasm: 'q4',
    dtypeWebgpu: 'q4',
  },
  {
    key: 'large-v3-turbo',
    i18nKey: 'openai-large-v3-turbo',
    modelId: 'onnx-community/whisper-large-v3-turbo',
    sizeMb: 700,
    requiresWebGpu: true,
    hasWebgpuVariant: true,
    dtypeWasm: 'q4',
    dtypeWebgpu: 'q4',
  },
  {
    key: 'large-v3',
    i18nKey: 'openai-large-v3',
    modelId: 'onnx-community/whisper-large-v3-ONNX',
    sizeMb: 1200,
    requiresWebGpu: true,
    hasWebgpuVariant: true,
    dtypeWasm: 'q4',
    dtypeWebgpu: 'q4',
  },
];

export interface WhisperLanguage {
  code: string;
  name: string;
}

export const WHISPER_LANGUAGES: WhisperLanguage[] = [
  { code: 'sv', name: 'Swedish' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'sq', name: 'Albanian' },
  { code: 'am', name: 'Amharic' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hy', name: 'Armenian' },
  { code: 'as', name: 'Assamese' },
  { code: 'az', name: 'Azerbaijani' },
  { code: 'ba', name: 'Bashkir' },
  { code: 'eu', name: 'Basque' },
  { code: 'be', name: 'Belarusian' },
  { code: 'bn', name: 'Bengali' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'br', name: 'Breton' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'yue', name: 'Cantonese' },
  { code: 'ca', name: 'Catalan' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hr', name: 'Croatian' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'en', name: 'English' },
  { code: 'et', name: 'Estonian' },
  { code: 'fo', name: 'Faroese' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'gl', name: 'Galician' },
  { code: 'ka', name: 'Georgian' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'ht', name: 'Haitian Creole' },
  { code: 'ha', name: 'Hausa' },
  { code: 'haw', name: 'Hawaiian' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'id', name: 'Indonesian' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'jw', name: 'Javanese' },
  { code: 'kn', name: 'Kannada' },
  { code: 'kk', name: 'Kazakh' },
  { code: 'km', name: 'Khmer' },
  { code: 'ko', name: 'Korean' },
  { code: 'lo', name: 'Lao' },
  { code: 'la', name: 'Latin' },
  { code: 'lv', name: 'Latvian' },
  { code: 'ln', name: 'Lingala' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'lb', name: 'Luxembourgish' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'mg', name: 'Malagasy' },
  { code: 'ms', name: 'Malay' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mt', name: 'Maltese' },
  { code: 'mi', name: 'Maori' },
  { code: 'mr', name: 'Marathi' },
  { code: 'mn', name: 'Mongolian' },
  { code: 'my', name: 'Myanmar' },
  { code: 'ne', name: 'Nepali' },
  { code: 'no', name: 'Norwegian' },
  { code: 'nn', name: 'Nynorsk' },
  { code: 'oc', name: 'Occitan' },
  { code: 'ps', name: 'Pashto' },
  { code: 'fa', name: 'Persian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sa', name: 'Sanskrit' },
  { code: 'sr', name: 'Serbian' },
  { code: 'sn', name: 'Shona' },
  { code: 'sd', name: 'Sindhi' },
  { code: 'si', name: 'Sinhala' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'so', name: 'Somali' },
  { code: 'es', name: 'Spanish' },
  { code: 'su', name: 'Sundanese' },
  { code: 'sw', name: 'Swahili' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'tg', name: 'Tajik' },
  { code: 'ta', name: 'Tamil' },
  { code: 'tt', name: 'Tatar' },
  { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' },
  { code: 'bo', name: 'Tibetan' },
  { code: 'tr', name: 'Turkish' },
  { code: 'tk', name: 'Turkmen' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'uz', name: 'Uzbek' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'cy', name: 'Welsh' },
  { code: 'yi', name: 'Yiddish' },
  { code: 'yo', name: 'Yoruba' },
];

const KB_TO_OPENAI_KEY: Record<string, string> = {
  tiny: 'tiny', small: 'small', medium: 'medium', large: 'large-v3',
};
const OPENAI_TO_KB_KEY: Record<string, string> = {
  tiny: 'tiny', base: 'tiny', small: 'small', medium: 'medium',
  'large-v3': 'large', 'large-v3-turbo': 'large',
};
const DEFAULT_OPENAI_KEY = 'small';
const DEFAULT_KB_KEY = 'medium';


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

            <div class="mb-2">
              <label for="languageSelect" class="form-label form-label-sm mb-1">
                {{ 'login.auto-transcription.language label' | transloco }}
              </label>
              <select
                class="form-select form-select-sm"
                id="languageSelect"
                [(ngModel)]="selectedLanguage"
                (ngModelChange)="onLanguageChange()"
              >
                @for (lang of languages; track lang.code) {
                  <option [value]="lang.code">{{ lang.name }} ({{ lang.code }})</option>
                }
              </select>
            </div>

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
                      ? 'login.auto-transcription.models.' + (model.i18nKey ?? model.key) + '.webgpu'
                      : 'login.auto-transcription.models.' + (model.i18nKey ?? model.key) + '.wasm')
                      | transloco
                  }}
                </label>
              </div>
            }

            @if (selectedLanguage === 'sv') {
              <small class="text-muted d-block mt-1">
                <i class="bi bi-info-circle"></i>
                {{ 'login.auto-transcription.swedish kb-whisper hint' | transloco }}
              </small>
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

  models: KbWhisperModel[] = KB_WHISPER_MODELS;
  readonly languages = WHISPER_LANGUAGES;
  selectedLanguage = 'en';

  constructor(private readonly transloco: TranslocoService) {
    effect(() => {
      // Track signal reads so the effect re-runs when they change
      this.audioLoaded();
      this.annotationAlreadyLoaded();
      this.emitChange();
    });
  }

  async ngOnInit(): Promise<void> {
    const langCode = this.transloco.getActiveLang().split('-')[0];
    this.selectedLanguage = WHISPER_LANGUAGES.some(l => l.code === langCode)
      ? langCode
      : 'en';
    this.onLanguageChange();

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

  onLanguageChange(): void {
    const currentKey = this.models.find(m => m.modelId === this.selectedModelId)?.key ?? '';
    if (this.selectedLanguage === 'sv') {
      const targetKey = OPENAI_TO_KB_KEY[currentKey] ?? DEFAULT_KB_KEY;
      this.models = KB_WHISPER_MODELS;
      this.selectedModelId = (
        KB_WHISPER_MODELS.find(m => m.key === targetKey) ??
        KB_WHISPER_MODELS.find(m => m.key === DEFAULT_KB_KEY)!
      ).modelId;
    } else {
      const targetKey = KB_TO_OPENAI_KEY[currentKey] ?? DEFAULT_OPENAI_KEY;
      this.models = OPENAI_WHISPER_MODELS;
      this.selectedModelId = (
        OPENAI_WHISPER_MODELS.find(m => m.key === targetKey) ??
        OPENAI_WHISPER_MODELS.find(m => m.key === DEFAULT_OPENAI_KEY)!
      ).modelId;
    }
    this.emitChange();
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
    const model = this.models.find(m => m.modelId === this.selectedModelId);
    const dtype = this.hasWebGpu() ? model?.dtypeWebgpu : model?.dtypeWasm;
    this.optionsChange.emit({
      modelId: this.selectedModelId,
      useWebGPU: this.hasWebGpu(),
      dtype,
      language: this.selectedLanguage,
    });
  }
}
