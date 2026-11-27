import React from 'react';
import type { HudState } from '../game/types';

interface Props {
  hud: HudState;
  buyOpen: boolean;
  onRequestLock: () => void;
}

export const CrosshairAndEffects: React.FC<Props> = ({ hud, buyOpen, onRequestLock }) => {
  const isPlaying = hud.phase === 'buy' || hud.phase === 'combat';
  if (!isPlaying) return null;

  const gap = Math.round(6 + Math.min(34, hud.crosshairSpread * 380));

  return (
    <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {/* Directional Damage Vignette */}
      {hud.damageFlash > 0.02 && (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, transparent 52%, rgba(220, 38, 38, ${
              hud.damageFlash * 0.45
            }) 100%)`,
          }}
        />
      )}

      {/* Sniper Scope Overlay */}
      {hud.scoped && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-full h-full"
            style={{
              background:
                'radial-gradient(circle at center, transparent 34%, rgba(5, 8, 12, 0.98) 35.5%)',
            }}
          />
          {/* Crosshair hairlines inside scope */}
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-slate-950/90" />
          <div className="absolute inset-y-0 left-1/2 w-[1px] bg-slate-950/90" />
          <div className="absolute w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
        </div>
      )}

      {/* Standard Tactical Crosshair */}
      {!hud.scoped && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {/* Center micro dot */}
          <div className="w-[2px] h-[2px] bg-emerald-300 mx-auto" />
          {/* Top */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[2px] h-[8px] bg-emerald-300 shadow-[0_0_2px_#000]"
            style={{ bottom: `${gap}px` }}
          />
          {/* Bottom */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[2px] h-[8px] bg-emerald-300 shadow-[0_0_2px_#000]"
            style={{ top: `${gap}px` }}
          />
          {/* Left */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-[2px] w-[8px] bg-emerald-300 shadow-[0_0_2px_#000]"
            style={{ right: `${gap}px` }}
          />
          {/* Right */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-[2px] w-[8px] bg-emerald-300 shadow-[0_0_2px_#000]"
            style={{ left: `${gap}px` }}
          />
        </div>
      )}

      {/* Hitmarker X */}
      {hud.hitmarker !== 'none' && (
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <g
            stroke={
              hud.hitmarker === 'kill'
                ? '#ef4444'
                : hud.hitmarker === 'headshot'
                  ? '#f59e0b'
                  : '#f8fafc'
            }
            strokeWidth={hud.hitmarker === 'kill' ? '2.8' : '2'}
            strokeLinecap="round"
          >
            <line x1="7" y1="7" x2="14" y2="14" />
            <line x1="29" y1="7" x2="22" y2="14" />
            <line x1="7" y1="29" x2="14" y2="22" />
            <line x1="29" y1="29" x2="22" y2="22" />
          </g>
        </svg>
      )}

      {/* Reload progress bar under crosshair */}
      {hud.reloading && (
        <div className="absolute left-1/2 top-[56%] -translate-x-1/2 w-28">
          <div className="text-[10px] font-mono-hud tracking-widest text-amber-300 text-center mb-1">
            RELOADING
          </div>
          <div className="h-1 bg-slate-900/90 border border-slate-600/60 overflow-hidden">
            <div
              className="h-full bg-amber-400"
              style={{ width: `${Math.round(hud.reloadProgress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Click to Lock Aim Banner if unlocked and buy menu is closed */}
      {!hud.pointerLocked && !buyOpen && (
        <div className="pointer-events-auto absolute left-1/2 top-[28%] -translate-x-1/2">
          <button
            data-ui-interactive="true"
            onClick={onRequestLock}
            className="px-5 py-2.5 bg-slate-950/90 border border-amber-400/70 text-amber-300 font-display tracking-wider text-sm uppercase hover:bg-amber-500 hover:text-slate-950 transition-colors cursor-pointer"
          >
            Click to Lock Aim &amp; Shoot
          </button>
        </div>
      )}
    </div>
  );
};
