import React from 'react';
import { Shield, Volume2, VolumeX } from 'lucide-react';
import type { HudState, KeyBindings, WeaponSlot } from '../game/types';
import { formatKeyCode } from '../game/main';
import { WEAPONS } from '../game/weapons';

interface Props {
  hud: HudState;
  bindings: KeyBindings;
  muted: boolean;
  onToggleMute: () => void;
  onOpenBuy: () => void;
  onSkipFreeze: () => void;
}

export const HudOverlay: React.FC<Props> = ({
  hud,
  bindings,
  muted,
  onToggleMute,
  onOpenBuy,
  onSkipFreeze,
}) => {
  const active =
    hud.phase === 'buy' || hud.phase === 'combat' || hud.phase === 'round_end';
  if (!active) return null;

  const mins = Math.floor(hud.timerSeconds / 60);
  const secs = hud.timerSeconds % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  const activeWeaponId = hud.weapons[hud.equippedSlot].id || 'knife';
  const activeWeapon = WEAPONS[activeWeaponId];
  const activeSlotState = hud.weapons[hud.equippedSlot];

  const { minX, maxX, minZ, maxZ } = hud.minimapBounds;
  const spanX = Math.max(1, maxX - minX);
  const spanZ = Math.max(1, maxZ - minZ);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      {/* TOP BAR: Minimap (Left) | Score & Timer (Center) | Killfeed (Right) */}
      <div className="flex items-start justify-between gap-4">
        {/* TOP-LEFT: Tactical Minimap */}
        <div className="w-40 h-44 bg-slate-950/85 border border-slate-700/80 p-1.5 flex flex-col">
          <div className="flex items-center justify-between text-[10px] font-mono-hud text-slate-400 px-1 mb-1">
            <span>{hud.mapId === 'lisbon' ? 'ALFAMA' : 'KITAY-GOROD'}</span>
            <span className="text-amber-400">3-LANE</span>
          </div>
          <svg
            viewBox="0 0 100 112"
            className="w-full h-full bg-[#111722] border border-slate-800"
          >
            {/* Lane geometry silhouettes */}
            <rect x="2" y="2" width="96" height="108" fill="#141c28" />
            {/* Left-Mid & Mid-Right Dividers */}
            <rect x="28" y="24" width="5" height="22" fill="#2c384a" />
            <rect x="28" y="66" width="5" height="22" fill="#2c384a" />
            <rect x="67" y="24" width="5" height="22" fill="#2c384a" />
            <rect x="67" y="66" width="5" height="22" fill="#2c384a" />
            {/* Mid landmark */}
            <rect x="47" y="48" width="6" height="16" fill="#475569" />
            {/* Elevated Right Terrace */}
            <rect x="75" y="40" width="18" height="32" fill="#1f2c3d" stroke="#334155" strokeWidth="0.8" />
            {/* Blips */}
            {hud.minimapBlips.map((b) => {
              if (!b.alive || !b.spotted) return null;
              const cx = ((b.x - minX) / spanX) * 92 + 4;
              const cy = ((b.z - minZ) / spanZ) * 104 + 4;
              const isAlly = b.team === hud.playerTeam;
              const fill = b.isPlayer ? '#34d399' : isAlly ? '#38bdf8' : '#ef4444';
              return (
                <g key={b.id} transform={`translate(${cx}, ${cy})`}>
                  {b.isPlayer && (
                    <line
                      x1="0"
                      y1="0"
                      x2={-Math.sin(b.yaw) * 11}
                      y2={-Math.cos(b.yaw) * 11}
                      stroke="#34d399"
                      strokeWidth="1.5"
                      strokeOpacity="0.85"
                    />
                  )}
                  <circle r={b.isPlayer ? 3.5 : 2.8} fill={fill} stroke="#090d14" strokeWidth="1" />
                </g>
              );
            })}
          </svg>
        </div>

        {/* TOP-CENTER: Scoreboard Bar, Timer & Alive Operatives */}
        <div className="flex flex-col items-center">
          <div className="flex items-center bg-slate-950/90 border border-slate-700/80 divide-x divide-slate-800">
            {/* Vanguard Team */}
            <div className="flex items-center gap-2.5 px-3 py-1.5">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-2 h-4 ${
                      i < hud.aliveCounts.vanguard ? 'bg-sky-400' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <span className="font-display text-xs tracking-wider text-sky-300">VAN</span>
              <span className="font-mono-hud text-xl font-bold text-slate-100">
                {hud.vanguardScore}
              </span>
            </div>

            {/* Timer & Round */}
            <div className="px-4 py-1 text-center min-w-[94px]">
              <div className="font-mono-hud text-xl font-bold leading-none text-amber-400">
                {timeStr}
              </div>
              <div className="text-[10px] font-mono-hud uppercase tracking-wider text-slate-400 mt-0.5">
                R{hud.roundNumber}/{hud.maxRounds} · {hud.phase === 'buy' ? 'BUY' : 'LIVE'}
              </div>
            </div>

            {/* Directorate Team */}
            <div className="flex items-center gap-2.5 px-3 py-1.5">
              <span className="font-mono-hud text-xl font-bold text-slate-100">
                {hud.directorateScore}
              </span>
              <span className="font-display text-xs tracking-wider text-rose-400">DIR</span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-2 h-4 ${
                      i < hud.aliveCounts.directorate ? 'bg-rose-500' : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Phase / Tactical Announcement */}
          {hud.announcement && (
            <div className="mt-2 px-4 py-1 bg-slate-950/85 border border-amber-500/50 text-amber-300 font-display text-xs tracking-[0.18em] uppercase">
              {hud.announcement}
            </div>
          )}

          {/* Freeze Phase Action Bar */}
          {hud.phase === 'buy' && (
            <div className="pointer-events-auto mt-2 flex items-center gap-2">
              <button
                data-ui-interactive="true"
                onClick={onOpenBuy}
                className="px-3 py-1 bg-amber-500 text-slate-950 font-display font-bold text-xs tracking-wider uppercase hover:bg-amber-400 cursor-pointer"
              >
                [{formatKeyCode(bindings.buy)}] Buy Armory (${hud.money})
              </button>
              <button
                data-ui-interactive="true"
                onClick={onSkipFreeze}
                className="px-3 py-1 bg-slate-900/90 border border-slate-600 text-slate-200 font-display text-xs tracking-wider uppercase hover:bg-slate-800 cursor-pointer"
              >
                [F] Ready Now
              </button>
            </div>
          )}
        </div>

        {/* TOP-RIGHT: Killfeed & Mute Toggle */}
        <div className="flex flex-col items-end gap-1.5 min-w-[230px]">
          <button
            data-ui-interactive="true"
            onClick={onToggleMute}
            title="Toggle Audio"
            className="pointer-events-auto p-1.5 bg-slate-950/85 border border-slate-700/80 text-slate-300 hover:text-amber-400 cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {hud.killfeed.map((k) => (
            <div
              key={k.id}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950/85 border-r-2 border-amber-400 text-xs font-mono-hud"
            >
              <span
                className={
                  k.killerTeam === 'vanguard' ? 'text-sky-300 font-bold' : 'text-rose-400 font-bold'
                }
              >
                {k.killerName}
              </span>
              <span className="text-slate-400 text-[10px]">[{k.weaponName}]</span>
              {k.headshot && <span className="text-amber-400 text-[10px] font-bold">HS</span>}
              <span
                className={
                  k.victimTeam === 'vanguard' ? 'text-sky-300' : 'text-rose-400'
                }
              >
                {k.victimName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM BAR: HP/Armor/Cash (Left) | Weapon Slots & Ammo (Right) */}
      <div className="flex items-end justify-between gap-4">
        {/* BOTTOM-LEFT: Health, Armor, Cash */}
        <div className="flex items-center gap-3 bg-slate-950/90 border border-slate-700/80 px-4 py-2.5">
          <div>
            <div className="text-[10px] font-mono-hud text-slate-400 tracking-wider">HEALTH</div>
            <div
              className={`font-mono-hud text-3xl font-bold leading-none ${
                hud.hp <= 25 ? 'text-rose-500' : 'text-slate-100'
              }`}
            >
              {hud.hp}
            </div>
          </div>

          <div className="h-9 w-[1px] bg-slate-800" />

          <div>
            <div className="text-[10px] font-mono-hud text-slate-400 tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3 text-sky-400" />
              {hud.hasHelmet ? 'KEVLAR+H' : 'ARMOR'}
            </div>
            <div className="font-mono-hud text-2xl font-bold leading-none text-sky-300">
              {hud.armor}
            </div>
          </div>

          <div className="h-9 w-[1px] bg-slate-800" />

          <div>
            <div className="text-[10px] font-mono-hud text-slate-400 tracking-wider">CREDITS</div>
            <div className="font-mono-hud text-2xl font-bold leading-none text-emerald-400">
              ${hud.money}
            </div>
          </div>
        </div>

        {/* BOTTOM-RIGHT: Weapon Slots & Ammo */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            {([1, 2, 3] as WeaponSlot[]).map((slot) => {
              const wId = hud.weapons[slot].id;
              const isEquipped = hud.equippedSlot === slot;
              return (
                <div
                  key={slot}
                  className={`px-2.5 py-1 border text-[11px] font-mono-hud ${
                    isEquipped
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                      : wId
                        ? 'bg-slate-950/80 border-slate-700 text-slate-400'
                        : 'bg-slate-950/40 border-slate-800/60 text-slate-600'
                  }`}
                >
                  [{slot}] {wId ? WEAPONS[wId].shortName : 'EMPTY'}
                </div>
              );
            })}
          </div>

          <div className="flex items-baseline gap-3 bg-slate-950/90 border border-slate-700/80 px-4 py-2">
            <div className="text-right">
              <div className="font-display text-xs uppercase tracking-wider text-amber-400">
                {activeWeapon.name}
              </div>
              <div className="text-[10px] font-mono-hud text-slate-400">
                [{formatKeyCode(bindings.reload)}] RELOAD · [{formatKeyCode(bindings.scoreboard)}] SCORES
              </div>
            </div>

            {activeWeapon.id === 'knife' ? (
              <div className="font-mono-hud text-2xl font-bold text-slate-200">MELEE</div>
            ) : (
              <div className="flex items-baseline gap-1 font-mono-hud">
                <span
                  className={`text-3xl font-bold leading-none ${
                    activeSlotState.mag <= Math.ceil(activeWeapon.magSize * 0.25)
                      ? 'text-rose-400'
                      : 'text-slate-100'
                  }`}
                >
                  {activeSlotState.mag}
                </span>
                <span className="text-base text-slate-400">/ {activeSlotState.reserve}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
