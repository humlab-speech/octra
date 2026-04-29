import { Injectable, inject } from '@angular/core';
import {
  AnnotationAnySegment,
  OctraAnnotationSegment,
} from '@octra/annotation';
import {
  cycleNextSpeaker,
  getSpeakerColor,
  getSpeakerIds,
  getSpeakerTextColor,
  renameSpeakerInAnnotation,
} from '@octra/ngx-components';
import { AnnotationStoreService } from '../../store/login-mode/annotation/annotation.store.service';

@Injectable({ providedIn: 'root' })
export class SpeakerManagementService {
  private annotationStore = inject(AnnotationStoreService);

  getSpeakerIds(): string[] {
    const t = this.annotationStore.transcript;
    return t ? getSpeakerIds(t) : [];
  }

  getColor(speakerId: string): string {
    return getSpeakerColor(speakerId, this.getSpeakerIds());
  }

  getTextColor(bgHex: string): string {
    return getSpeakerTextColor(bgHex);
  }

  cycleNext(currentId: string): string {
    return cycleNextSpeaker(currentId, this.getSpeakerIds());
  }

  rename(oldId: string, newId: string): void {
    const t = this.annotationStore.transcript;
    if (!t || !newId.trim() || newId === oldId) return;
    const renamed = renameSpeakerInAnnotation(oldId, newId.trim(), t);
    this.annotationStore.overwriteTranscript(renamed);
  }

  cycleSpeakerOnSegment(segmentId: number): void {
    const level = this.annotationStore.currentLevel;
    if (!level) return;
    const segment = level.items.find(
      (s) => s.id === segmentId,
    ) as OctraAnnotationSegment | undefined;
    if (!segment) return;
    const current = segment.getLabel('Speaker')?.value ?? '';
    const next = this.cycleNext(current);
    segment.changeLabel('Speaker', next);
    this.annotationStore.changeCurrentLevelItems(
      [...level.items] as AnnotationAnySegment[],
    );
  }
}
