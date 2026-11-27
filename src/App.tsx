/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/game';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './game/main';
import type {
  Difficulty,
  GameSettings,
  HudState,
  MapId,
  SkinVariant,
  TeamId,
  WeaponId,
  WeaponSkinId,
} from './game/types';
import { BuyMenu } from './ui/BuyMenu';
import { CrosshairAndEffects } from './ui/CrosshairAndEffects';
import { HudOverlay } from './ui/HudOverlay';
import { MainMenu, type MenuTab } from './ui/MainMenu';
import { ScoreboardModal } from './ui/ScoreboardModal';

const INITIAL_HUD: HudState = {
  phase: 'menu',
  previousActivePhase: 'buy',
  pointerLocked: false,
  mapId: 'lisbon',
  playerTeam: 'vanguard',
  difficulty: 'normal',
  roundNumber: 1,
  maxRounds: 3,
  vanguardScore: 0,
  directorateScore: 0,
  timerSeconds: 15,
  hp: 100,
  armor: 0,
  hasHelmet: false,
  money: 1000,
  equippedSlot: 2,
  weapons: {
    1: { id: null, mag: 0, reserve: 0 },
    2: { id: 'pistol', mag: 15, reserve: 60 },
    3: { id: 'knife', mag: 0, reserve: 0 },
  },
  reloading: false,
  reloadProgress: 0,
  scoped: false,
  crosshairSpread: 0.01,
  hitmarker: 'none',
  damageFlash: 0,
  damageAngle: 0,
  killfeed: [],
  scoreboard: [],
  minimapBlips: [],
  minimapBounds: { minX: -28, maxX: 28, minZ: -32, maxZ: 32 },
  roundWinner: null,
  roundEndReason: '',
  matchWinner: null,
  aliveCounts: { vanguard: 3, directorate: 3 },
  announcement: '',
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [menuTab, setMenuTab] = useState<MenuTab>('home');
  const [buyOpen, setBuyOpen] = useState(false);
  const [scoreboardOpen, setScoreboardOpen] = useState(false);

  const [selectedCharId, setSelectedCharId] = useState('v_faro');
  const [selectedSkin, setSelectedSkin] = useState<SkinVariant>('urban');
  const [selectedWeaponSkin, setSelectedWeaponSkin] = useState<WeaponSkinId>('carbon');

  // Initialize isolated WebGL engine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;
    const engine = new GameEngine(mount, settings, (nextHud) => {
      setHud(nextHud);
    });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync live 3D operative preview when Skins tab is open
  useEffect(() => {
    engineRef.current?.setPreviewMode(hud.phase === 'menu' && menuTab === 'skins');
  }, [hud.phase, menuTab]);

  // Sync buyOpen state & close Buy Menu automatically when buy phase ends
  useEffect(() => {
    engineRef.current?.setBuyMenuOpen(buyOpen);
    if (hud.phase !== 'buy' && buyOpen) {
      setBuyOpen(false);
    }
  }, [hud.phase, buyOpen]);

  // Global Buy Menu (B), Escape, and Scoreboard (Tab) shortcuts
  useEffect(() => {
    const buyCode = settings.bindings.buy || DEFAULT_SETTINGS.bindings.buy;
    const scoreCode = settings.bindings.scoreboard || DEFAULT_SETTINGS.bindings.scoreboard;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && buyOpen) {
        e.preventDefault();
        setBuyOpen(false);
        engineRef.current?.requestPointerLock();
        return;
      }
      if (e.code === buyCode && hud.phase === 'buy') {
        e.preventDefault();
        setBuyOpen((prev) => {
          const next = !prev;
          if (next) engineRef.current?.exitPointerLock();
          else engineRef.current?.requestPointerLock();
          return next;
        });
      } else if (
        e.code === scoreCode &&
        (hud.phase === 'buy' || hud.phase === 'combat' || hud.phase === 'round_end')
      ) {
        e.preventDefault();
        setScoreboardOpen(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === scoreCode) {
        setScoreboardOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [settings.bindings, hud.phase]);

  const handleUpdateSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    saveSettings(next);
    engineRef.current?.applySettings(next);
  }, []);

  const handleSelectConfig = useCallback(
    (opts: {
      team?: TeamId;
      mapId?: MapId;
      difficulty?: Difficulty;
      characterId?: string;
      skin?: SkinVariant;
      weaponSkin?: WeaponSkinId;
    }) => {
      if (opts.characterId) setSelectedCharId(opts.characterId);
      if (opts.skin) setSelectedSkin(opts.skin);
      if (opts.weaponSkin) setSelectedWeaponSkin(opts.weaponSkin);
      engineRef.current?.setSelection(opts);
    },
    []
  );

  const handleToggleMute = useCallback(() => {
    handleUpdateSettings({ ...settings, muted: !settings.muted });
  }, [settings, handleUpdateSettings]);

  const handleBuyWeapon = useCallback((id: WeaponId) => {
    engineRef.current?.buyWeapon(id);
  }, []);

  const handleBuyArmor = useCallback((type: 'kevlar' | 'helmet') => {
    engineRef.current?.buyArmor(type);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b0e14]">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="fixed inset-0 w-full h-full" />

      {/* Tactical HUD */}
      <HudOverlay
        hud={hud}
        bindings={settings.bindings}
        muted={settings.muted}
        onToggleMute={handleToggleMute}
        onOpenBuy={() => {
          setBuyOpen(true);
          engineRef.current?.exitPointerLock();
        }}
        onSkipFreeze={() => engineRef.current?.skipFreezePhase()}
      />

      {/* Crosshair, Scope, Hitmarkers & Pointer Lock Prompt */}
      <CrosshairAndEffects
        hud={hud}
        buyOpen={buyOpen}
        onRequestLock={() => engineRef.current?.requestPointerLock()}
      />

      {/* Armory Buy Menu */}
      <BuyMenu
        hud={hud}
        open={buyOpen}
        onClose={() => {
          setBuyOpen(false);
          engineRef.current?.requestPointerLock();
        }}
        onBuyWeapon={handleBuyWeapon}
        onBuyArmor={handleBuyArmor}
      />

      {/* Tab Scoreboard */}
      <ScoreboardModal hud={hud} visible={scoreboardOpen} />

      {/* Main Menu, Skins, Settings, Pause, Round End & Match Result */}
      <MainMenu
        hud={hud}
        menuTab={menuTab}
        setMenuTab={setMenuTab}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        selectedCharId={selectedCharId}
        selectedSkin={selectedSkin}
        selectedWeaponSkin={selectedWeaponSkin}
        onSelectConfig={handleSelectConfig}
        onStartMatch={() => {
          setMenuTab('home');
          setBuyOpen(false);
          engineRef.current?.startMatch();
        }}
        onResume={() => engineRef.current?.resumeGame()}
        onReturnToMenu={() => {
          setMenuTab('home');
          setBuyOpen(false);
          engineRef.current?.returnToMenu();
        }}
        onQuit={() => engineRef.current?.quitSession()}
      />
    </div>
  );
}
