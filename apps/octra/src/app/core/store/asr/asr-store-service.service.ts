import { Injectable } from '@angular/core';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { map } from 'rxjs';
import { RootState } from '../index';
import { ASRActions } from './asr.actions';
import {
  selectASREnabled,
  selectASRLanguageSettings,
  selectASRLanguages,
  selectASRQueue,
  selectASRSettings,
  selectMausLanguages,
} from './asr.selectors';
import { ASRQueueItemType, ASRStateSettings, ASRTimeInterval } from './index';

@Injectable({
  providedIn: 'root',
})
export class AsrStoreService {
  asrOptions = this.store.selectSignal(selectASRSettings);

  queue = this.store.selectSignal(selectASRQueue);
  languageSettings = this.store.selectSignal(selectASRLanguageSettings);
  mausLanguages = this.store.selectSignal(selectMausLanguages);
  asrLanguages = this.store.selectSignal(selectASRLanguages);
  asrEnabled = this.store.selectSignal(selectASREnabled);
  itemChange$ = this.actions$.pipe(
    ofType(
      ASRActions.processQueueItem.success,
      ASRActions.processQueueItem.fail,
    ),
    map((action) => action.item),
  );

  constructor(
    private store: Store<RootState>,
    private actions$: Actions,
  ) {}

  startProcessing() {
    this.store.dispatch(ASRActions.startProcessing.do());
  }

  stopItemProcessing(time: ASRTimeInterval) {
    this.store.dispatch(
      ASRActions.stopItemProcessing.do({
        time,
      }),
    );
  }

  addToQueue(
    timeInterval: ASRTimeInterval,
    type: ASRQueueItemType,
    transcript?: string,
  ) {
    this.store.dispatch(
      ASRActions.addToQueue.do({
        item: {
          timeInterval,
          type,
          transcript,
        },
      }),
    );
  }

  stopProcessing() {
    this.store.dispatch(ASRActions.stopProcessing.do());
  }

  setASRSettings(settings: ASRStateSettings) {
    this.store.dispatch(ASRActions.setASRSettings.do({ settings }));
  }
}
