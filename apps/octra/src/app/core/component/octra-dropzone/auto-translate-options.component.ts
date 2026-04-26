import {
  Component,
  computed,
  DestroyRef,
  effect,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { getEnglishLanguageLabel } from '@octra/utilities';
import {
  HYMT_DEFAULT_MODEL_ID,
  TranslationOptions,
} from '../../shared/service/local-translation.service';

export const HYMT_LANGUAGES: readonly string[] = [
  'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'sv', 'da', 'no',
  'fi', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'el', 'tr', 'ru',
  'uk', 'ar', 'he', 'fa', 'hi', 'zh', 'ja', 'ko', 'vi', 'id', 'th',
];

const TRANSLATION_DTYPE_WEBGPU = 'q4f16';

@Component({
  selector: 'octra-auto-translate-options',
  standalone: true,
  imports: [FormsModule, NgbTooltipModule, TranslocoPipe],
  template: `
    @if (visible()) {
      <div class="auto-translate-options mt-2 p-2 border rounded">
        @if (!hasWebGpu()) {
          <div class="alert alert-warning mb-2">
            <i class="bi bi-exclamation-triangle"></i>
            {{ 'login.translation.webgpu required' | transloco }}
          </div>
        }
        <div class="form-check mb-1">
          <input
            class="form-check-input"
            type="checkbox"
            id="autoTranslateCheck"
            [(ngModel)]="enabledModel"
            (ngModelChange)="onEnabledChange()"
            [disabled]="!hasWebGpu()"
          />
          <label class="form-check-label" for="autoTranslateCheck">
            {{ 'login.translation.enable label' | transloco }}
          </label>
        </div>
        <small class="text-muted d-block mb-2">
          <i class="bi bi-cloud-download"></i>
          {{ 'login.translation.download size' | transloco }}
        </small>
        <small class="text-muted d-block mb-2">
          <i class="bi bi-clock-history"></i>
          {{ 'login.translation.time warning' | transloco }}
        </small>

        @if (enabled() && hasWebGpu()) {
          <div class="mb-2">
            <label for="translateFrom" class="form-label form-label-sm mb-1">
              {{ 'login.translation.from' | transloco }}
            </label>
            <select
              class="form-select form-select-sm"
              id="translateFrom"
              [(ngModel)]="sourceLanguage"
              (ngModelChange)="emitChange()"
            >
              @for (lang of languages; track lang.code) {
                <option [value]="lang.code">{{ lang.label }}</option>
              }
            </select>
          </div>
          <div class="mb-2">
            <label for="translateTo" class="form-label form-label-sm mb-1">
              {{ 'login.translation.to' | transloco }}
            </label>
            <select
              class="form-select form-select-sm"
              id="translateTo"
              [(ngModel)]="targetLanguage"
              (ngModelChange)="emitChange()"
            >
              @for (lang of languages; track lang.code) {
                <option [value]="lang.code">{{ lang.label }}</option>
              }
            </select>
          </div>

          <small class="text-muted mt-1 d-block">
            <i class="bi bi-info-circle"></i>
            {{ 'login.translation.model cached after download' | transloco }}
          </small>
        }
      </div>
    }
  `,
  styles: [
    `
      .auto-translate-options {
        background-color: var(--octra-surface-background);
        font-size: 0.9rem;
      }
    `,
  ],
})
export class AutoTranslateOptionsComponent implements OnInit {
  readonly annotationAlreadyLoaded = input<boolean>(false);
  readonly transcribeWillRun = input<boolean>(false);
  readonly sourceLanguageHint = input<string | undefined>(undefined);
  readonly optionsChange = output<TranslationOptions | null>();

  readonly enabled = signal(false);
  readonly hasWebGpu = signal(false);

  get enabledModel(): boolean {
    return this.enabled();
  }
  set enabledModel(v: boolean) {
    this.enabled.set(v);
  }

  readonly languages = HYMT_LANGUAGES.map((code) => ({
    code,
    label: getEnglishLanguageLabel(code),
  }));

  sourceLanguage = 'en';
  targetLanguage = 'de';
  private userOverrodeSource = false;

  readonly visible = computed(
    () => this.annotationAlreadyLoaded() || this.transcribeWillRun(),
  );

  constructor(
    private readonly transloco: TranslocoService,
    private readonly destroyRef: DestroyRef,
  ) {
    effect(() => {
      this.annotationAlreadyLoaded();
      this.transcribeWillRun();
      this.emitChange();
    });

    effect(() => {
      const hint = this.sourceLanguageHint();
      if (hint && !this.userOverrodeSource) {
        this.applySourceHint(hint);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.applySourceHint(
      this.sourceLanguageHint() ?? this.transloco.getActiveLang(),
    );

    this.transloco.langChanges$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((lang) => {
        if (!this.userOverrodeSource && !this.sourceLanguageHint()) {
          this.applySourceHint(lang);
        }
      });

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

  private applySourceHint(hint: string): void {
    const code = hint.split('-')[0].toLowerCase();
    this.sourceLanguage = HYMT_LANGUAGES.includes(code) ? code : 'en';
    this.targetLanguage = this.sourceLanguage === 'en' ? 'de' : 'en';
    this.emitChange();
  }

  onEnabledChange(): void {
    this.userOverrodeSource = false;
    this.emitChange();
  }

  emitChange(): void {
    if (!this.visible() || !this.enabled() || !this.hasWebGpu()) {
      this.optionsChange.emit(null);
      return;
    }
    if (this.sourceLanguage === this.targetLanguage) {
      this.optionsChange.emit(null);
      return;
    }
    this.optionsChange.emit({
      modelId: HYMT_DEFAULT_MODEL_ID,
      useWebGPU: true,
      dtype: TRANSLATION_DTYPE_WEBGPU,
      sourceLanguage: this.sourceLanguage,
      targetLanguage: this.targetLanguage,
    });
  }
}
