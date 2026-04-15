import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { SubscriptionManager } from '@octra/utilities';
import { IDBApplicationOptionName } from '../../shared/octra-database';
import { RootState } from '../index';
import { ApplicationActions } from './application.actions';
import {
  selectAppConfiguration,
  selectIdb,
  selectInitialized,
  selectLoggedIn,
  selectLoading,
  selectMode,
  selectOptions,
  selectShortcutsEnabled,
} from './application.selectors';

@Injectable({
  providedIn: 'root',
})
export class ApplicationStoreService {
  private _useMode = this.store.selectSignal(selectMode);

  get useMode() {
    return this._useMode();
  }

  private subscrManager = new SubscriptionManager();

  constructor(private store: Store<RootState>) {}

  loading = this.store.selectSignal(selectLoading);
  appconfig = this.store.selectSignal(selectAppConfiguration);
  idb = this.store.selectSignal(selectIdb);
  loggedIn = this.store.selectSignal(selectLoggedIn);
  appInitialized = this.store.selectSignal(selectInitialized);
  shortcutsEnabled = this.store.selectSignal(selectShortcutsEnabled);
  options = this.store.selectSignal(selectOptions);

  public initApplication() {
    this.store.dispatch(ApplicationActions.initApplication.do());
  }

  public destroy() {
    this.subscrManager.destroy();
  }

  setShortcutsEnabled(shortcutsEnabled: boolean) {
    this.store.dispatch(
      ApplicationActions.setShortcutsEnabled.do({
        shortcutsEnabled,
      }),
    );
  }

  changeApplicationOption(
    name: IDBApplicationOptionName,
    value: boolean | number | string,
  ) {
    this.store.dispatch(
      ApplicationActions.changeApplicationOption.do({
        name,
        value,
      }),
    );
  }
}
