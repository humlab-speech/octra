import { AsyncPipe, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import {
  RecordingResult,
  RecordingService,
  RecordingState,
} from '../../shared/service/recording.service';

type StagedResult = RecordingResult;

@Component({
  selector: 'octra-recording-panel',
  standalone: true,
  templateUrl: './recording-panel.component.html',
  styleUrls: ['./recording-panel.component.scss'],
  imports: [AsyncPipe, NgIf, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordingPanelComponent implements OnDestroy {
  @Input() disabled = false;
  @Output() recordingActiveChange = new EventEmitter<boolean>();
  @Output() useRecording = new EventEmitter<File>();

  staged: StagedResult | null = null;
  errorMessage: string | null = null;

  private subs = new Subscription();

  constructor(public service: RecordingService) {
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
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
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
    const url = URL.createObjectURL(this.staged.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.staged.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
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
