import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AccountLoginMethod } from '@octra/api-types';
import { OctraAPIService } from '@octra/ngx-octra-api';
import { FileSize, getFileSize } from '@octra/utilities';
import { Observable, Subscription } from 'rxjs';
import { AuthenticationComponent } from '../../component/authentication-component/authentication-component.component';
import { DefaultComponent } from '../../component/default.component';
import { MaintenanceBannerComponent } from '../../component/maintenance/maintenance-banner/maint-banner.component';
import { OctraDropzoneComponent } from '../../component/octra-dropzone/octra-dropzone.component';
import { AppSettings } from '../../obj';
import { SessionFile } from '../../obj/SessionFile';
import { AudioService, SettingsService } from '../../shared/service';
import { AppStorageService } from '../../shared/service/appstorage.service';
import { CompatibilityService } from '../../shared/service/compatibility.service';
import { KB_WHISPER_MODELS } from '../../component/octra-dropzone/auto-transcribe-options.component';
import { LocalTranscriptionService, TranscriptionEvent } from '../../shared/service/local-transcription.service';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
import { AuthenticationStoreService } from '../../store/authentication';
import { BrowserTestComponent } from '../browser-test/browser-test.component';
import { ComponentCanDeactivate } from './login.deactivateguard';
import { LoginService } from './login.service';

@Component({
  selector: 'octra-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  providers: [LoginService],
  imports: [
    MaintenanceBannerComponent,
    AuthenticationComponent,
    OctraDropzoneComponent,
    BrowserTestComponent,
    AsyncPipe,
    DecimalPipe,
    TranslocoPipe,
    RouterLink,
  ],
})
export class LoginComponent
  extends DefaultComponent
  implements ComponentCanDeactivate
{
  @ViewChild('f', { static: false }) loginform?: NgForm;
  @ViewChild('dropzone', { static: false }) dropzone?: OctraDropzoneComponent;
  @ViewChild('agreement', { static: false }) agreement?: ElementRef;
  @ViewChild('localmode', { static: true }) localmode?: ElementRef;
  @ViewChild('onlinemode', { static: true }) onlinemode?: ElementRef;

  email_link = '';

  transcription: {
    active: boolean;
    phase: 'downloading' | 'transcribing' | 'idle';
    downloadLoaded: number;
    downloadTotal: number;
    downloadExpectedBytes: number;
    downloadFile: string;
    elapsedMs: number;
    audioDurationS: number;
    segmentEndS: number;
    error: string | null;
  } = {
    active: false,
    phase: 'idle',
    downloadLoaded: 0,
    downloadTotal: 0,
    downloadExpectedBytes: 0,
    downloadFile: '',
    elapsedMs: 0,
    audioDurationS: 0,
    segmentEndS: 0,
    error: null,
  };

  private _elapsedIntervalId: ReturnType<typeof setInterval> | null = null;
  private _transcriptionStartTime = 0;

  readonly formatDuration = formatDuration;

  private _transcriptionSub: Subscription | null = null;
  private _pendingRemoveData = false;

  state: {
    online: {
      apiStatus: 'init' | 'available' | 'unavailable';
      user: {
        nameOrEmail: string;
        password: string;
      };
      form: {
        valid: boolean;
        err: string;
      };
    };
  } = {
    online: {
      apiStatus: 'available',
      user: {
        nameOrEmail: '',
        password: '',
      },
      form: {
        valid: false,
        err: '',
      },
    },
  };

  get sessionfile(): SessionFile {
    return this.appStorage.sessionfile;
  }

  get apc(): AppSettings {
    return this.settingsService.appSettings;
  }

  public get Math(): Math {
    return Math;
  }

  compatibleBrowser?: boolean;

  constructor(
    private elementRef: ElementRef,
    public appStorage: AppStorageService,
    public api: OctraAPIService,
    public settingsService: SettingsService,
    private audioService: AudioService,
    public authStoreService: AuthenticationStoreService,
    protected compatibilityService: CompatibilityService,
    private localTranscriptionService: LocalTranscriptionService,
  ) {
    super();
    this.compatibilityService.testCompability().then((result) => {
      this.compatibleBrowser = result;
      setTimeout(() => {
        elementRef.nativeElement.scroll({
          top: 0,
          left: 0,
        });
      }, 0);
    });
    const subject = 'Octra Server is offline';
    const body = `Hello,

I just want to let you know, that the OCTRA server is currently offline.

 Best,
 an OCTRA user
 `;
    const url = `mailto:${
      this.settingsService.appSettings.octra.supportEmail
    }?subject=${encodeURI(subject)}&body=${encodeURI(body)}`;

    this.email_link = `<br/><a href="${url}">${this.settingsService.appSettings.octra.supportEmail}</a>`;
  }

  onOfflineSubmit = (removeData: boolean) => {
    const opts = this.dropzone?.transcribeOptions;
    if (opts && this.dropzone?.hasAudio && !this.dropzone?.hasAnnotation) {
      this._pendingRemoveData = removeData;
      const modelMeta = KB_WHISPER_MODELS.find((m) => m.modelId === opts.modelId);
      this.transcription = {
        active: true,
        phase: 'downloading',
        downloadLoaded: 0,
        downloadTotal: 0,
        downloadExpectedBytes: (modelMeta?.sizeMb ?? 0) * 1024 * 1024,
        downloadFile: '',
        elapsedMs: 0,
        audioDurationS: 0,
        segmentEndS: 0,
        error: null,
      };
      this._transcriptionSub = this.localTranscriptionService
        .transcribe(this.dropzone.audioManager, this.dropzone.oaudiofile, opts)
        .subscribe({
          next: (event: TranscriptionEvent) => this.onTranscriptionEvent(event),
          error: (err: Error) => {
            this._clearElapsedInterval();
            this.transcription.error = err.message;
            this.transcription.active = false;
          },
        });
    } else {
      this.proceedWithLogin(removeData);
    }
  };

  private onTranscriptionEvent(event: TranscriptionEvent): void {
    if (event.type === 'download-progress') {
      this.transcription.phase = 'downloading';
      this.transcription.downloadLoaded = event.loaded;
      this.transcription.downloadTotal = event.total;
      this.transcription.downloadFile = event.file;
    } else if (event.type === 'transcribe-start') {
      this.transcription.phase = 'transcribing';
      this.transcription.audioDurationS = event.audioDurationS;
      this.transcription.elapsedMs = 0;
      this.transcription.segmentEndS = 0;
      this._transcriptionStartTime = Date.now();
      this._elapsedIntervalId = setInterval(() => {
        this.transcription.elapsedMs = Date.now() - this._transcriptionStartTime;
      }, 1000);
    } else if (event.type === 'segment-progress') {
      this.transcription.segmentEndS = event.segmentEndS;
    } else if (event.type === 'result') {
      this._clearElapsedInterval();
      this.dropzone?.setAnnotationFromAnnotJson(event.annotJson);
      this.transcription.active = false;
      this._transcriptionSub = null;
      this.proceedWithLogin(this._pendingRemoveData);
    }
  }

  private _clearElapsedInterval(): void {
    if (this._elapsedIntervalId !== null) {
      clearInterval(this._elapsedIntervalId);
      this._elapsedIntervalId = null;
    }
  }

  cancelTranscription(): void {
    this._clearElapsedInterval();
    this.localTranscriptionService.cancel();
    this._transcriptionSub?.unsubscribe();
    this._transcriptionSub = null;
    this.transcription.active = false;
  }

  dismissTranscriptionError(): void {
    if (this.transcription.active) {
      this.cancelTranscription();
    } else {
      this._clearElapsedInterval();
      this.transcription.error = null;
    }
  }

  private proceedWithLogin(removeData: boolean): void {
    this.audioService.registerAudioManager(this.dropzone!.audioManager!);
    this.authStoreService.loginLocal(
      this.dropzone!.files.map((a) => a.file.file!),
      this.dropzone!.hasAnnotation ? this.dropzone!.oannotation : undefined,
      removeData,
    );
  }

  onOnlineSubmit($event: {
    type: AccountLoginMethod;
    credentials?: {
      usernameEmail: string;
      password: string;
    };
  }) {
    this.authStoreService.loginOnline(
      $event.type,
      $event.credentials?.usernameEmail,
      $event.credentials?.password,
    );
  }

  onOnlineCredentialsSubmit() {
    this.authStoreService.loginOnline(
      AccountLoginMethod.local,
      this.state.online.user.nameOrEmail,
      this.state.online.user.password,
    );
  }

  canDeactivate(): Observable<boolean> | boolean {
    return this.state.online.form.valid;
  }

  getDropzoneFileString(file: File | SessionFile) {
    if (file !== undefined) {
      const fsize: FileSize = getFileSize(file.size);
      return `${file.name} (${Math.round(fsize.size * 100) / 100} ${
        fsize.label
      })`;
    }
    return '';
  }

  public startDemo() {
    this.authStoreService.loginDemo();
  }
}
