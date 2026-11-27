import type { GameSettings } from './types';

export const DEFAULT_SETTINGS: GameSettings = {
  sensitivity: 1.0,
  volume: 0.7,
  muted: false,
  graphics: 'high',
  fov: 75,
  bindings: {
    forward: 'KeyW',
    backward: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    jump: 'Space',
    crouch: 'ControlLeft',
    walk: 'ShiftLeft',
    reload: 'KeyR',
    buy: 'KeyB',
    scoreboard: 'Tab',
  },
};

const STORAGE_KEY = 'alfa_sector_settings_v1';

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        ...(parsed.bindings || {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage quota issues
  }
}

export function formatKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'CTRL';
  if (code === 'Space') return 'SPACE';
  if (code === 'Tab') return 'TAB';
  return code.toUpperCase();
}
