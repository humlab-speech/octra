import { createCustomElement } from '@angular/elements';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { AudioViewerComponent } from '@octra/ngx-components';
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(AudioViewerComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideHttpClient()
  ]
}).then(appRef => {
  const element = createCustomElement(AudioViewerComponent, { injector: appRef.injector });
  customElements.define('octra-audio-viewer', element);
}).catch(err => console.error(err));
