import React, { useEffect, useState } from 'react';
import {
  ChevronRight,
  Crosshair,
  MapPin,
  Play,
  Power,
  RotateCcw,
  Settings,
  Shield,
  Sliders,
  Users,
} from 'lucide-react';
import { CHARACTERS, getCharacterById } from '../game/characters';
import { formatKeyCode } from '../game/main';
import type {
  Difficulty,
  GameSettings,
  HudState,
  KeyBindings,
  MapId,
  SkinVariant,
  TeamId,
  WeaponSkinId,
} from '../game/types';
import { WEAPON_SKINS } from '../game/weapons';

export type MenuTab = 'home' | 'team' | 'skins' | 'settings';

interface Props {
  hud: HudState;
  menuTab: MenuTab;
  setMenuTab: (tab: MenuTab) => void;
  settings: GameSettings;
  onUpdateSettings: (s: GameSettings) => void;
  selectedCharId: string;
  selectedSkin: SkinVariant;
  selectedWeaponSkin: WeaponSkinId;
  onSelectConfig: (opts: {
    team?: TeamId;
    mapId?: MapId;
    difficulty?: Difficulty;
    characterId?: string;
    skin?: SkinVariant;
    weaponSkin?: WeaponSkinId;
  }) => void;
  onStartMatch: () => void;
  onResume: () => void;
  onReturnToMenu: () => void;
  onQuit: () => void;
}

const BINDING_LABELS: Array<{ key: keyof KeyBindings; label: string }> = [
  { key: 'forward', label: 'Move Forward' },
  { key: 'backward', label: 'Move Backward' },
  { key: 'left', label: 'Strafe Left' },
  { key: 'right', label: 'Strafe Right' },
  { key: 'jump', label: 'Jump' },
  { key: 'crouch', label: 'Crouch' },
  { key: 'walk', label: 'Slow Walk' },
  { key: 'reload', label: 'Reload Weapon' },
  { key: 'buy', label: 'Buy Menu' },
  { key: 'scoreboard', label: 'Scoreboard' },
];

const DIFFICULTIES: Array<{ id: Difficulty; label: string; desc: string }> = [
  { id: 'easy', label: 'EASY', desc: 'Slow bot reaction · Casual' },
  { id: 'normal', label: 'NORMAL', desc: 'Balanced tactical bursts' },
  { id: 'hard', label: 'HARD', desc: 'Fast snap aim · Lethal' },
];

export const MainMenu: React.FC<Props> = ({
  hud,
  menuTab,
  setMenuTab,
  settings,
  onUpdateSettings,
  selectedCharId,
  selectedSkin,
  selectedWeaponSkin,
  onSelectConfig,
  onStartMatch,
  onResume,
  onReturnToMenu,
  onQuit,
}) => {
  const [rebindingKey, setRebindingKey] = useState<keyof KeyBindings | null>(null);
  const [pauseSettingsOpen, setPauseSettingsOpen] = useState(false);

  // Key capture for rebinding
  useEffect(() => {
    if (!rebindingKey) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code !== 'Escape') {
        onUpdateSettings({
          ...settings,
          bindings: { ...settings.bindings, [rebindingKey]: e.code },
        });
      }
      setRebindingKey(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [rebindingKey, settings, onUpdateSettings]);

  // Enter quick start on Title Screen Home
  useEffect(() => {
    if (hud.phase !== 'menu' || menuTab !== 'home') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        e.preventDefault();
        onStartMatch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hud.phase, menuTab, onStartMatch]);

  // QUIT STANDBY SCREEN
  if (hud.phase === 'quit') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#070a10]/95 p-6 text-center">
        <div className="bg-[#0d121c] border border-slate-700/80 p-10 max-w-md tactical-chamfer">
          <div className="text-[11px] font-mono-hud tracking-[0.28em] text-amber-400 uppercase">
            Terminal Standby
          </div>
          <h2 className="font-display text-3xl font-bold tracking-widest text-slate-100 uppercase mt-2">
            Session Ended
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            ALFA SECTOR tactical simulation standing by. You may safely close this tab or redeploy.
          </p>
          <button
            onClick={onReturnToMenu}
            className="mt-6 w-full py-3 bg-amber-500 text-slate-950 font-display font-bold uppercase tracking-wider hover:bg-amber-400 cursor-pointer tactical-chamfer-sm"
          >
            Return to Title Screen
          </button>
        </div>
      </div>
    );
  }

  // ROUND END OVERLAY
  if (hud.phase === 'round_end') {
    const won = hud.roundWinner === hud.playerTeam;
    const draw = hud.roundWinner === 'draw';
    return (
      <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
        <div className="bg-[#090d14]/92 border-y-2 border-amber-400 px-14 py-7 text-center min-w-[400px] tactical-chamfer">
          <div className="font-mono-hud text-xs tracking-[0.28em] text-slate-400 uppercase">
            Round {hud.roundNumber} Complete
          </div>
          <h2
            className={`font-display text-4xl font-bold tracking-wider uppercase mt-1 ${
              draw ? 'text-amber-300' : won ? 'text-sky-400' : 'text-rose-500'
            }`}
          >
            {draw ? 'ROUND DRAW' : won ? 'ROUND WON' : 'ROUND LOST'}
          </h2>
          <p className="text-sm text-slate-300 mt-1">{hud.roundEndReason}</p>
          <div className="mt-3 font-mono-hud text-lg text-slate-200">
            VANGUARD {hud.vanguardScore} — {hud.directorateScore} DIRECTORATE
          </div>
        </div>
      </div>
    );
  }

  // MATCH END RESULT SCREEN
  if (hud.phase === 'match_end') {
    const victory = hud.matchWinner === hud.playerTeam;
    const playerStats = hud.scoreboard.find((p) => p.isPlayer);
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4">
        <div className="w-full max-w-2xl bg-[#0b1019] border border-slate-700 p-8 text-center tactical-chamfer">
          <div className="font-mono-hud text-xs tracking-[0.28em] text-amber-400 uppercase">
            3v3 Match Concluded · {hud.mapId === 'lisbon' ? 'Lisbon' : 'Moscow'} ·{' '}
            {hud.difficulty.toUpperCase()} AI
          </div>
          <h1
            className={`font-display text-5xl font-bold tracking-wider uppercase mt-2 ${
              victory ? 'text-amber-400' : 'text-rose-500'
            }`}
          >
            {victory ? 'MISSION VICTORY' : 'MISSION DEFEAT'}
          </h1>
          <div className="font-mono-hud text-2xl text-slate-200 mt-2">
            FINAL SCORE: {hud.vanguardScore} — {hud.directorateScore}
          </div>

          {playerStats && (
            <div className="mt-6 grid grid-cols-3 gap-3 bg-[#101624] border border-slate-800 p-4 tactical-chamfer-sm">
              <div>
                <div className="text-[11px] font-mono-hud text-slate-400">YOUR KILLS</div>
                <div className="font-mono-hud text-2xl font-bold text-slate-100">
                  {playerStats.kills}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-mono-hud text-slate-400">DEATHS</div>
                <div className="font-mono-hud text-2xl font-bold text-slate-100">
                  {playerStats.deaths}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-mono-hud text-slate-400">ASSISTS</div>
                <div className="font-mono-hud text-2xl font-bold text-slate-100">
                  {playerStats.assists}
                </div>
              </div>
            </div>
          )}

          <div className="mt-7 flex items-center justify-center gap-4">
            <button
              onClick={onStartMatch}
              className="px-7 py-3 bg-amber-500 text-slate-950 font-display font-bold uppercase tracking-wider hover:bg-amber-400 flex items-center gap-2 cursor-pointer tactical-chamfer-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
            <button
              onClick={onReturnToMenu}
              className="px-7 py-3 bg-slate-800 border border-slate-600 text-slate-100 font-display font-bold uppercase tracking-wider hover:bg-slate-700 cursor-pointer tactical-chamfer-sm"
            >
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SETTINGS PANEL HELPER (shared by Main Menu & Pause Menu)
  const renderSettingsForm = () => (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Sensitivity */}
        <div className="bg-[#101624] border border-slate-800 p-4 tactical-chamfer-sm">
          <div className="flex justify-between text-xs font-mono-hud mb-2">
            <span className="text-slate-300 uppercase">Mouse Sensitivity</span>
            <span className="text-amber-400 font-bold">{settings.sensitivity.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="3.0"
            step="0.05"
            value={settings.sensitivity}
            onChange={(e) =>
              onUpdateSettings({ ...settings, sensitivity: parseFloat(e.target.value) })
            }
            className="w-full tactical-slider"
          />
        </div>

        {/* Volume */}
        <div className="bg-[#101624] border border-slate-800 p-4 tactical-chamfer-sm">
          <div className="flex justify-between text-xs font-mono-hud mb-2">
            <span className="text-slate-300 uppercase">Master Volume</span>
            <span className="text-amber-400 font-bold">
              {settings.muted ? 'MUTED' : `${Math.round(settings.volume * 100)}%`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  volume: parseFloat(e.target.value),
                  muted: false,
                })
              }
              className="w-full tactical-slider"
            />
            <button
              onClick={() => onUpdateSettings({ ...settings, muted: !settings.muted })}
              className="px-2.5 py-1 text-xs font-mono-hud border border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-400 cursor-pointer"
            >
              {settings.muted ? 'UNMUTE' : 'MUTE'}
            </button>
          </div>
        </div>

        {/* Graphics Quality */}
        <div className="bg-[#101624] border border-slate-800 p-4 tactical-chamfer-sm">
          <div className="text-xs font-mono-hud text-slate-300 uppercase mb-2">
            Graphics Quality
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map((q) => (
              <button
                key={q}
                onClick={() => onUpdateSettings({ ...settings, graphics: q })}
                className={`py-1.5 text-xs font-mono-hud uppercase border cursor-pointer ${
                  settings.graphics === q
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Field of View */}
        <div className="bg-[#101624] border border-slate-800 p-4 tactical-chamfer-sm">
          <div className="flex justify-between text-xs font-mono-hud mb-2">
            <span className="text-slate-300 uppercase">Field of View (FOV)</span>
            <span className="text-amber-400 font-bold">{settings.fov}°</span>
          </div>
          <input
            type="range"
            min="65"
            max="100"
            step="1"
            value={settings.fov}
            onChange={(e) =>
              onUpdateSettings({ ...settings, fov: parseInt(e.target.value, 10) })
            }
            className="w-full tactical-slider"
          />
        </div>
      </div>

      {/* Key Bindings */}
      <div className="bg-[#101624] border border-slate-800 p-4 tactical-chamfer-sm">
        <div className="text-xs font-mono-hud text-slate-300 uppercase mb-3">
          Key Bindings {rebindingKey ? '— PRESS ANY KEY TO BIND (ESC CANCELS)' : ''}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {BINDING_LABELS.map((item) => {
            const listening = rebindingKey === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setRebindingKey(item.key)}
                className={`p-2 border text-left transition-colors cursor-pointer ${
                  listening
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="text-[10px] text-slate-400 truncate">{item.label}</div>
                <div className="font-mono-hud text-xs font-bold text-slate-100 mt-0.5">
                  {listening ? '...' : formatKeyCode(settings.bindings[item.key])}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // PAUSE MENU
  if (hud.phase === 'paused') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
        <div className="w-full max-w-2xl bg-[#0a0f18] border border-slate-700 p-7 tactical-chamfer">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
            <div>
              <div className="text-[10px] font-mono-hud tracking-[0.24em] text-amber-400 uppercase">
                Simulation Suspended
              </div>
              <h2 className="font-display text-2xl font-bold tracking-wider uppercase text-slate-100">
                {pauseSettingsOpen ? 'Match Settings' : 'Match Paused'}
              </h2>
            </div>
            <span className="font-mono-hud text-xs text-slate-400">
              {hud.mapId === 'lisbon' ? 'LISBON' : 'MOSCOW'} · R{hud.roundNumber}/{hud.maxRounds}
            </span>
          </div>

          {pauseSettingsOpen ? (
            <div>
              {renderSettingsForm()}
              <button
                onClick={() => setPauseSettingsOpen(false)}
                className="mt-5 px-5 py-2.5 bg-slate-800 border border-slate-600 text-slate-100 font-display uppercase tracking-wider text-sm hover:bg-slate-700 cursor-pointer tactical-chamfer-sm"
              >
                Back to Pause Menu
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-xs mx-auto py-2">
              <button
                onClick={onResume}
                className="py-3 bg-amber-500 text-slate-950 font-display font-bold uppercase tracking-wider hover:bg-amber-400 cursor-pointer tactical-chamfer-sm"
              >
                Resume Match
              </button>
              <button
                onClick={() => setPauseSettingsOpen(true)}
                className="py-3 bg-[#101624] border border-slate-700 text-slate-100 font-display font-bold uppercase tracking-wider hover:border-amber-400 cursor-pointer tactical-chamfer-sm"
              >
                Settings
              </button>
              <button
                onClick={onReturnToMenu}
                className="py-3 bg-[#101624] border border-slate-700 text-rose-400 font-display font-bold uppercase tracking-wider hover:border-rose-500 cursor-pointer tactical-chamfer-sm"
              >
                Abandon to Main Menu
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (hud.phase !== 'menu') return null;

  const activeChar = getCharacterById(selectedCharId);

  // MAIN MENU / TITLE SCREEN SHELL
  return (
    <div
      className={`fixed inset-0 z-30 flex flex-col justify-between p-6 md:p-10 pointer-events-none ${
        menuTab === 'home' ? 'menu-vignette' : ''
      }`}
    >
      {/* TOP BAR */}
      <div className="flex items-start justify-between gap-4">
        {/* Bespoke Inline SVG Title Lockup */}
        <div className="pointer-events-auto">
          <svg width="390" height="82" viewBox="0 0 390 82" className="max-w-full">
            <defs>
              <linearGradient id="alfaGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fde047" />
              </linearGradient>
            </defs>
            <polygon points="0,10 15,10 24,38 9,38" fill="url(#alfaGrad)" />
            <polygon points="19,10 30,10 39,38 28,38" fill="#38bdf8" />
            <text
              x="50"
              y="37"
              fill="#f8fafc"
              fontFamily="Chakra Petch, sans-serif"
              fontWeight="700"
              fontSize="35"
              letterSpacing="5"
            >
              ALFA SECTOR
            </text>
            <rect x="50" y="46" width="265" height="2" fill="#f59e0b" fillOpacity="0.9" />
            <text
              x="50"
              y="66"
              fill="#cbd5e1"
              fontFamily="JetBrains Mono, monospace"
              fontSize="11"
              letterSpacing="2.5"
            >
              3V3 TACTICAL OPERATIONS · LISBON / MOSCOW
            </text>
          </svg>
        </div>

        {/* Active Deployment Telemetry Pill */}
        <div className="pointer-events-auto hidden md:flex items-center gap-4 bg-[#090d16]/90 border border-slate-700/80 px-5 py-2.5 text-xs font-mono-hud tactical-chamfer-sm">
          <div>
            <div className="text-[9px] text-slate-400">SECTOR</div>
            <div className="text-amber-400 font-bold">
              {hud.mapId === 'lisbon' ? 'LISBON · ALFAMA' : 'MOSCOW · PLAZA'}
            </div>
          </div>
          <div className="h-6 w-[1px] bg-slate-700" />
          <div>
            <div className="text-[9px] text-slate-400">FACTION</div>
            <div
              className={
                hud.playerTeam === 'vanguard' ? 'text-sky-400 font-bold' : 'text-rose-400 font-bold'
              }
            >
              {hud.playerTeam === 'vanguard' ? 'VANGUARD' : 'DIRECTORATE'}
            </div>
          </div>
          <div className="h-6 w-[1px] bg-slate-700" />
          <div>
            <div className="text-[9px] text-slate-400">OPERATIVE</div>
            <div className="text-slate-100 font-bold">{activeChar.codename}</div>
          </div>
          <div className="h-6 w-[1px] bg-slate-700" />
          <div>
            <div className="text-[9px] text-slate-400">AI DIFFICULTY</div>
            <div className="text-emerald-400 uppercase font-bold">{hud.difficulty}</div>
          </div>
        </div>
      </div>

      {/* CENTER CONTENT BY TAB */}
      <div className="flex-1 flex items-center my-3">
        {menuTab === 'home' && (
          <div className="pointer-events-auto flex flex-col gap-3 w-full max-w-[340px]">
            {/* Primary Deploy CTA */}
            <button
              onClick={onStartMatch}
              className="group flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-display font-bold text-xl tracking-wider uppercase hover:from-amber-400 hover:to-yellow-300 transition-all cursor-pointer tactical-chamfer"
            >
              <span className="flex items-center gap-3">
                <Play className="w-5 h-5 fill-slate-950" />
                Deploy 3v3
              </span>
              <span className="font-mono-hud text-[11px] bg-slate-950/15 px-2 py-0.5 font-bold">
                ENTER
              </span>
            </button>

            {/* Quick Difficulty Selector directly on Main Menu */}
            <div className="bg-[#0a0f18]/92 border border-slate-700/85 p-3 tactical-chamfer-sm">
              <div className="flex items-center justify-between text-[10px] font-mono-hud text-slate-400 uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3 h-3 text-amber-400" />
                  Bot AI Difficulty
                </span>
                <span className="text-amber-300 font-bold">{hud.difficulty.toUpperCase()}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {DIFFICULTIES.map((d) => {
                  const active = hud.difficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => onSelectConfig({ difficulty: d.id })}
                      className={`py-2 px-1 text-[11px] font-mono-hud font-bold uppercase border transition-colors cursor-pointer ${
                        active
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] text-slate-400 mt-1.5 font-mono-hud">
                {DIFFICULTIES.find((d) => d.id === hud.difficulty)?.desc}
              </div>
            </div>

            {/* Secondary Navigation Stack */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setMenuTab('team')}
                className="flex items-center justify-between px-5 py-3 bg-[#0a0f18]/90 border-l-2 border-l-amber-400 border border-slate-700/80 text-slate-100 font-display font-semibold tracking-wider uppercase hover:bg-[#131b2b] hover:text-amber-300 transition-colors cursor-pointer tactical-chamfer-sm"
              >
                <span className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  Choose Team &amp; Map
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => setMenuTab('skins')}
                className="flex items-center justify-between px-5 py-3 bg-[#0a0f18]/90 border-l-2 border-l-sky-400 border border-slate-700/80 text-slate-100 font-display font-semibold tracking-wider uppercase hover:bg-[#131b2b] hover:text-sky-300 transition-colors cursor-pointer tactical-chamfer-sm"
              >
                <span className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-sky-400" />
                  Character &amp; Skins
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => setMenuTab('settings')}
                className="flex items-center justify-between px-5 py-3 bg-[#0a0f18]/90 border-l-2 border-l-slate-500 border border-slate-700/80 text-slate-100 font-display font-semibold tracking-wider uppercase hover:bg-[#131b2b] hover:text-amber-300 transition-colors cursor-pointer tactical-chamfer-sm"
              >
                <span className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-slate-400" />
                  Settings
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={onQuit}
                className="flex items-center justify-between px-5 py-2.5 bg-[#090c13]/85 border border-slate-800/90 text-slate-400 font-display font-semibold tracking-wider uppercase hover:border-rose-500/80 hover:text-rose-400 transition-colors cursor-pointer tactical-chamfer-sm"
              >
                <span className="flex items-center gap-3">
                  <Power className="w-4 h-4" />
                  Quit
                </span>
              </button>
            </div>
          </div>
        )}

        {/* CHOOSE TEAM / MAP / DIFFICULTY */}
        {menuTab === 'team' && (
          <div className="pointer-events-auto w-full max-w-3xl bg-[#0a0f18]/95 border border-slate-700 p-6 tactical-chamfer">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
              <div>
                <div className="text-[10px] font-mono-hud tracking-[0.22em] text-amber-400 uppercase">
                  Tactical Briefing
                </div>
                <h2 className="font-display text-xl font-bold uppercase tracking-wider text-slate-100">
                  Team, Sector Map &amp; AI Difficulty
                </h2>
              </div>
              <button
                onClick={() => setMenuTab('home')}
                className="px-3.5 py-1.5 bg-slate-800 border border-slate-600 text-xs font-mono-hud text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                BACK
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Map Selection */}
              <div>
                <div className="text-xs font-mono-hud uppercase text-slate-400 mb-2">
                  European Capital Sector
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => onSelectConfig({ mapId: 'lisbon' })}
                    className={`text-left p-4 border cursor-pointer tactical-chamfer-sm ${
                      hud.mapId === 'lisbon'
                        ? 'bg-amber-500/15 border-amber-400'
                        : 'bg-[#101624] border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-slate-100">
                        LISBON — ALFAMA MIRADOURO
                      </span>
                      <span className="text-[10px] font-mono-hud text-amber-300">GOLDEN HOUR</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Azulejo tiled facades, cobblestone lanes, vintage tram mid-lane, Tagus terrace.
                    </div>
                  </button>

                  <button
                    onClick={() => onSelectConfig({ mapId: 'moscow' })}
                    className={`text-left p-4 border cursor-pointer tactical-chamfer-sm ${
                      hud.mapId === 'moscow'
                        ? 'bg-amber-500/15 border-amber-400'
                        : 'bg-[#101624] border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-slate-100">
                        MOSCOW — KITAY-GOROD PLAZA
                      </span>
                      <span className="text-[10px] font-mono-hud text-sky-300">WINTER FROST</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Soviet concrete metro canopy, red-brick plaza monument, onion-dome skyline.
                    </div>
                  </button>
                </div>
              </div>

              {/* Team & Bot Difficulty */}
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-xs font-mono-hud uppercase text-slate-400 mb-2">
                    Select Faction
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => onSelectConfig({ team: 'vanguard' })}
                      className={`p-3.5 border text-left cursor-pointer tactical-chamfer-sm ${
                        hud.playerTeam === 'vanguard'
                          ? 'bg-sky-500/20 border-sky-400'
                          : 'bg-[#101624] border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-display font-bold text-sky-300 flex items-center gap-1.5">
                        <Shield className="w-4 h-4" />
                        VANGUARD
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">South Spawn · Slate</div>
                    </button>

                    <button
                      onClick={() => onSelectConfig({ team: 'directorate' })}
                      className={`p-3.5 border text-left cursor-pointer tactical-chamfer-sm ${
                        hud.playerTeam === 'directorate'
                          ? 'bg-rose-500/20 border-rose-400'
                          : 'bg-[#101624] border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-display font-bold text-rose-400 flex items-center gap-1.5">
                        <Crosshair className="w-4 h-4" />
                        DIRECTORATE
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">North Spawn · Crimson</div>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-mono-hud uppercase text-slate-400 mb-2">
                    Bot AI Difficulty
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {DIFFICULTIES.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => onSelectConfig({ difficulty: d.id })}
                        className={`py-2.5 text-xs font-mono-hud uppercase border cursor-pointer ${
                          hud.difficulty === d.id
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                            : 'bg-[#101624] text-slate-300 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={onStartMatch}
                  className="mt-auto py-3 bg-amber-500 text-slate-950 font-display font-bold uppercase tracking-wider hover:bg-amber-400 cursor-pointer tactical-chamfer-sm"
                >
                  Deploy Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CHARACTERS & SKINS (Leaves right side open for live 3D operative preview!) */}
        {menuTab === 'skins' && (
          <div className="pointer-events-auto w-full max-w-md bg-[#0a0f18]/94 border border-slate-700 p-5 tactical-chamfer">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <div className="text-[10px] font-mono-hud tracking-[0.2em] text-sky-400 uppercase">
                  3D Live Inspection
                </div>
                <h2 className="font-display text-lg font-bold uppercase tracking-wider text-slate-100">
                  Operatives &amp; Armory Skins
                </h2>
              </div>
              <button
                onClick={() => setMenuTab('home')}
                className="px-3 py-1 bg-slate-800 border border-slate-600 text-xs font-mono-hud text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                BACK
              </button>
            </div>

            {/* 6 Operatives Grid */}
            <div className="text-[11px] font-mono-hud uppercase text-slate-400 mb-1.5">
              Select Operative (6 Roster)
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {CHARACTERS.map((c) => {
                const selected = c.id === selectedCharId;
                return (
                  <button
                    key={c.id}
                    onClick={() => onSelectConfig({ characterId: c.id, team: c.team })}
                    className={`p-2 border text-left cursor-pointer ${
                      selected
                        ? 'bg-amber-500/20 border-amber-400'
                        : 'bg-[#101624] border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div
                      className={`font-display text-xs font-bold ${
                        c.team === 'vanguard' ? 'text-sky-300' : 'text-rose-400'
                      }`}
                    >
                      {c.codename}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{c.role}</div>
                  </button>
                );
              })}
            </div>

            {/* Selected Operative Bio */}
            <div className="bg-[#101624] border border-slate-800 p-3 mb-4 tactical-chamfer-sm">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-slate-100">
                  {activeChar.name} &ldquo;{activeChar.codename}&rdquo;
                </span>
                <span className="text-[10px] font-mono-hud uppercase text-amber-400">
                  {activeChar.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{activeChar.backstory}</p>
            </div>

            {/* 3 Character Uniform Skins */}
            <div className="text-[11px] font-mono-hud uppercase text-slate-400 mb-1.5">
              Uniform Camo Variant
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(['urban', 'desert', 'winter'] as SkinVariant[]).map((sv) => {
                const s = activeChar.skins[sv];
                return (
                  <button
                    key={sv}
                    onClick={() => onSelectConfig({ skin: sv })}
                    className={`p-2 border flex items-center gap-2 cursor-pointer ${
                      selectedSkin === sv
                        ? 'bg-amber-500/15 border-amber-400 text-slate-100'
                        : 'bg-[#101624] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 border border-slate-500 shrink-0"
                      style={{ backgroundColor: s.swatch }}
                    />
                    <span className="text-[11px] font-mono-hud capitalize truncate">{sv}</span>
                  </button>
                );
              })}
            </div>

            {/* Weapon Skins */}
            <div className="text-[11px] font-mono-hud uppercase text-slate-400 mb-1.5">
              Weapon Finish
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.values(WEAPON_SKINS).map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => onSelectConfig({ weaponSkin: ws.id })}
                  className={`p-2 border flex items-center gap-2 cursor-pointer ${
                    selectedWeaponSkin === ws.id
                      ? 'bg-amber-500/15 border-amber-400 text-slate-100'
                      : 'bg-[#101624] border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span
                    className="w-3 h-3 border border-slate-500 shrink-0"
                    style={{ backgroundColor: ws.cssSwatch }}
                  />
                  <span className="text-[10px] font-mono-hud truncate">{ws.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {menuTab === 'settings' && (
          <div className="pointer-events-auto w-full max-w-3xl bg-[#0a0f18]/95 border border-slate-700 p-6 tactical-chamfer">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
              <div>
                <div className="text-[10px] font-mono-hud tracking-[0.22em] text-amber-400 uppercase">
                  Configuration
                </div>
                <h2 className="font-display text-xl font-bold uppercase tracking-wider text-slate-100">
                  System &amp; Controls Settings
                </h2>
              </div>
              <button
                onClick={() => setMenuTab('home')}
                className="px-3.5 py-1.5 bg-slate-800 border border-slate-600 text-xs font-mono-hud text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                BACK
              </button>
            </div>
            {renderSettingsForm()}
          </div>
        )}
      </div>

      {/* Bottom Flat Control-Hint Line */}
      <div className="flex items-center justify-between text-[11px] font-mono-hud text-slate-300 bg-[#090d16]/85 border border-slate-800/90 px-4 py-2 w-fit tactical-chamfer-sm">
        <span>
          WASD Move · Mouse Aim · LMB Fire · RMB Scope · R Reload · 1/2/3 Weapons · Shift Walk · Ctrl
          Crouch · Space Jump · B Buy · Tab Scoreboard · Esc Pause
        </span>
      </div>
    </div>
  );
};
