import { createCustomElement } from '@angular/elements';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { AudioplayerComponent } from '@octra/ngx-components';
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(AudioplayerComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideHttpClient()
  ]
}).then(appRef => {
  const element = createCustomElement(AudioplayerComponent, { injector: appRef.injector });
  customElements.define('octra-audio-player', element);
}).catch(err => console.error(err));
