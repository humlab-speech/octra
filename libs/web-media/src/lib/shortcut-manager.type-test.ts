import { HotkeysEvent } from 'hotkeys-js';
import { Shortcut } from './shortcut-manager';

const callback = (
  keyboardEvent: KeyboardEvent,
  shortcut: Shortcut,
  hotkeyEvent: HotkeysEvent,
) => {
  void keyboardEvent;
  void shortcut;
  void hotkeyEvent;
};

const shortcut: Shortcut = {
  name: 'play-pause',
  title: 'Play pause',
  keys: {
    mac: 'SPACE',
    pc: 'SPACE',
  },
  callback,
};

void shortcut;
