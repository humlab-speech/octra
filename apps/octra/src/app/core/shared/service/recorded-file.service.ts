import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RecordedFileService {
  recordedFile: File | null = null;

  triggerDownload(): void {
    if (!this.recordedFile) return;
    const url = URL.createObjectURL(this.recordedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.recordedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  clear(): void {
    this.recordedFile = null;
  }
}
