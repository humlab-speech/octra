import { NgStyle } from '@angular/common';
import { Component, Input, Output, ViewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { OAnnotJSON } from '@octra/annotation';
import { OAudiofile } from '@octra/media';
import { OctraUtilitiesModule } from '@octra/ngx-utilities';
import { FileSize, getFileSize } from '@octra/utilities';
import { AudioManager } from '@octra/web-media';
import { AppInfo } from '../../../app.info';
import { OctraModalService } from '../../modals/octra-modal.service';
import { SupportedFilesModalComponent } from '../../modals/supportedfiles-modal/supportedfiles-modal.component';
import { FileProgress } from '../../obj/objects';
import { TranscriptionOptions } from '../../shared/service/local-transcription.service';
import { DefaultComponent } from '../default.component';
import { DropZoneComponent } from '../drop-zone';
import { DropZoneComponent as DropZoneComponent_1 } from '../drop-zone/drop-zone.component';
import { AutoTranscribeOptionsComponent } from './auto-transcribe-options.component';
import {
  DropzoneStatistics,
  OctraDropzoneService,
} from './octra-dropzone.service';

@Component({
  selector: 'octra-dropzone',
  templateUrl: './octra-dropzone.component.html',
  styleUrls: ['./octra-dropzone.component.scss'],
  providers: [OctraDropzoneService],
  imports: [
    DropZoneComponent_1,
    NgbPopover,
    NgStyle,
    OctraUtilitiesModule,
    TranslocoPipe,
    AutoTranscribeOptionsComponent,
  ],
})
export class OctraDropzoneComponent extends DefaultComponent {
  @ViewChild('dropzone', { static: true }) dropzone!: DropZoneComponent;
  @Input() height = '250px';
  @Input() showAutoTranscribe = false;
  transcribeOptions: TranscriptionOptions | null = null;

  onTranscribeOptionsChange(opts: TranscriptionOptions | null): void {
    this.transcribeOptions = opts;
  }

  setAnnotationFromAnnotJson(annotJson: import('@octra/annotation').OAnnotJSON): void {
    this.octraDropzoneService.setAnnotationFromAnnotJson(annotJson);
  }

  get hasAudio(): boolean {
    return this.octraDropzoneService.hasAudio;
  }

  get hasAnnotation(): boolean {
    return this.octraDropzoneService.hasAnnotation;
  }

  @Input() set oldFiles(
    value: {
      name: string;
      type: string;
      size: number;
    }[],
  ) {
    this.octraDropzoneService.oldFiles = value;
  }
  @Output() filesAdded = this.octraDropzoneService.filesChange;

  get AppInfo(): AppInfo {
    return AppInfo;
  }

  get files(): FileProgress[] {
    return this.octraDropzoneService.files;
  }

  get oaudiofile(): OAudiofile {
    return this.octraDropzoneService.oaudiofile;
  }

  public get audioManager(): AudioManager {
    return this.octraDropzoneService.audioManager;
  }

  public releaseAudioManager(): void {
    this.octraDropzoneService.releaseAudioManager();
  }

  public get statistics(): DropzoneStatistics {
    return this.octraDropzoneService.statistics;
  }

  get oannotation(): OAnnotJSON | undefined {
    return this.octraDropzoneService.oannotation;
  }

  constructor(
    protected octraDropzoneService: OctraDropzoneService,
    private modService: OctraModalService,
  ) {
    super();
  }

  public afterDrop = async () => {
    const files = this.dropzone.files!;
    for (const file of files) {
      this.octraDropzoneService.add(file);
    }
  };

  getDropzoneFileString(file: { name: string; size: number }) {
    const fsize: FileSize = getFileSize(file.size);
    return `${file.name} (${Math.round(fsize.size * 100) / 100} ${
      fsize.label
    })`;
  }

  showSupported() {
    this.modService
      .openModal(
        SupportedFilesModalComponent,
        SupportedFilesModalComponent.options,
      )
      .catch((error) => {
        console.error(error);
      });
  }

  onDeleteEntry($event: MouseEvent, fileProgressID: number) {
    if (fileProgressID) {
      $event.stopImmediatePropagation();
      $event.stopPropagation();

      this.octraDropzoneService.remove(fileProgressID);
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.octraDropzoneService.destroy();
  }

  protected readonly AudioManager = AudioManager;
}
