import { AsyncPipe, DecimalPipe, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import {
  RecordingResult,
  RecordingService,
  RecordingState,
} from '../../shared/service/recording.service';
import {
  RecordingPersistenceService,
  RecoverableSession,
} from '../../shared/service/recording-persistence.service';
import { RecordingRecoveryBannerComponent } from './recording-recovery-banner.component';
import { VuMeterComponent } from './vu-meter.component';

const RECOVERY_PRUNE_AGE_MS = 7 * 24 * 3600 * 1000;

type StagedResult = RecordingResult;

@Component({
  selector: 'octra-recording-panel',
  standalone: true,
  templateUrl: './recording-panel.component.html',
  styleUrls: ['./recording-panel.component.scss'],
  imports: [
    AsyncPipe,
    DecimalPipe,
    NgIf,
    TranslocoPipe,
    RecordingRecoveryBannerComponent,
    VuMeterComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordingPanelComponent implements OnInit, OnDestroy {
  @Input() disabled = false;
  @Output() recordingActiveChange = new EventEmitter<boolean>();
  @Output() useRecording = new EventEmitter<File>();

  staged: StagedResult | null = null;
  errorMessage: string | null = null;
  recoverable: RecoverableSession[] = [];

  private subs = new Subscription();

  constructor(
    public service: RecordingService,
    private persistence: RecordingPersistenceService,
    private cdr: ChangeDetectorRef,
  ) {
    this.subs.add(
      this.service.state$.subscribe((s) => {
        this.recordingActiveChange.emit(
          s === 'recording' || s === 'paused' || s === 'requesting-permission',
        );
      }),
    );
    this.subs.add(
      this.service.error$.subscribe((err) => {
        this.errorMessage = err.message;
        this.cdr.markForCheck();
      }),
    );
    this.subs.add(
      this.persistence.recoverableSessions$.subscribe((list) => {
        this.recoverable = list;
        this.cdr.markForCheck();
      }),
    );
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.persistence.pruneOlderThan(RECOVERY_PRUNE_AGE_MS);
    } catch {
      // ignore prune failures
    }
    await this.persistence.refreshRecoverable();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  async onContinueRecovery(s: RecoverableSession): Promise<void> {
    this.errorMessage = null;
    try {
      await this.service.start({ mode: s.mode, sessionId: s.id });
      await this.persistence.refreshRecoverable();
    } catch {
      // surfaced via error$
    }
  }

  async onDownloadRecovery(s: RecoverableSession): Promise<void> {
    try {
      const file = await this.service.assembleSessionToFile(
        s.id,
        s.mode,
        s.mimeType,
      );
      this.triggerDownload(file);
    } catch (err) {
      this.errorMessage = (err as Error).message;
    }
  }

  async onDiscardRecovery(s: RecoverableSession): Promise<void> {
    await this.persistence.discardSession(s.id);
    await this.persistence.refreshRecoverable();
  }

  private triggerDownload(file: File): void {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async onStart(): Promise<void> {
    this.errorMessage = null;
    this.staged = null;
    try {
      await this.service.start({ mode: 'audio' });
    } catch {
      // error already surfaced via error$
    }
  }

  async onStop(): Promise<void> {
    try {
      this.staged = await this.service.stop();
      await this.persistence.refreshRecoverable();
    } catch (err) {
      this.errorMessage = (err as Error).message;
    }
  }

  onUse(): void {
    if (!this.staged) return;
    this.useRecording.emit(this.staged.file);
    this.staged = null;
  }

  onDownload(): void {
    if (!this.staged) return;
    this.triggerDownload(this.staged.file);
  }

  async onDiscard(): Promise<void> {
    if (this.staged) {
      this.staged = null;
      return;
    }
    await this.service.discard();
  }

  isState(s: RecordingState, current: RecordingState | null): boolean {
    return current === s;
  }

  formatElapsed(ms: number): string {
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
