import React from 'react';
import { Shield, X } from 'lucide-react';
import type { HudState, WeaponId } from '../game/types';
import { BUYABLE_WEAPONS, WEAPONS } from '../game/weapons';

interface Props {
  hud: HudState;
  open: boolean;
  onClose: () => void;
  onBuyWeapon: (id: WeaponId) => void;
  onBuyArmor: (type: 'kevlar' | 'helmet') => void;
}

export const BuyMenu: React.FC<Props> = ({
  hud,
  open,
  onClose,
  onBuyWeapon,
  onBuyArmor,
}) => {
  if (!open || hud.phase !== 'buy') return null;

  return (
    <div
      data-ui-interactive="true"
      onClick={onClose}
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-[#0a0e16] border border-slate-700/90 shadow-2xl tactical-chamfer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-[#121926] to-[#0c111b]">
          <div>
            <div className="text-[10px] font-mono-hud tracking-[0.25em] text-amber-400 uppercase">
              Forward Quartermaster · Round {hud.roundNumber}
            </div>
            <h2 className="font-display text-2xl font-bold tracking-wider text-slate-100 uppercase">
              Tactical Armory
            </h2>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="text-[10px] font-mono-hud text-slate-400">FREEZE TIMER</div>
              <div className="font-mono-hud text-lg font-bold text-amber-300">
                {hud.timerSeconds}s
              </div>
            </div>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div className="text-right">
              <div className="text-[10px] font-mono-hud text-slate-400">AVAILABLE FUNDS</div>
              <div className="font-mono-hud text-2xl font-bold text-emerald-400">
                ${hud.money}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-amber-300 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Primary Weapons */}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BUYABLE_WEAPONS.map((wId) => {
              const w = WEAPONS[wId];
              const owned = hud.weapons[1].id === wId;
              const affordable = hud.money >= w.price && !owned;
              const dmgPct = Math.min(100, Math.round((w.damage * w.pellets) / 1.4));
              const rofPct = Math.min(100, Math.round((w.fireRate / 12) * 100));
              const rangePct = Math.min(100, Math.round((w.rangeFull / 60) * 100));
              return (
                <button
                  key={wId}
                  disabled={!affordable}
                  onClick={() => onBuyWeapon(wId)}
                  className={`text-left p-4 border transition-colors tactical-chamfer-sm ${
                    owned
                      ? 'bg-amber-500/15 border-amber-400 cursor-default'
                      : affordable
                        ? 'bg-[#101622] border-slate-700/80 hover:border-amber-400 hover:bg-[#161f30] cursor-pointer'
                        : 'bg-slate-950/60 border-slate-800/70 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-base text-slate-100">
                      {w.name}
                    </span>
                    <span
                      className={`font-mono-hud text-sm font-bold ${
                        owned ? 'text-amber-300' : affordable ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {owned ? 'EQUIPPED' : `$${w.price}`}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono-hud uppercase text-slate-400 mt-1">
                    {w.category} · {w.magSize}/{w.reserveMax} MAG
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-snug">{w.description}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[9px] font-mono-hud text-slate-400">
                    <div>
                      <div>DMG</div>
                      <div className="h-1 bg-slate-800 mt-0.5">
                        <div className="h-full bg-amber-400" style={{ width: `${dmgPct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div>ROF</div>
                      <div className="h-1 bg-slate-800 mt-0.5">
                        <div className="h-full bg-sky-400" style={{ width: `${rofPct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div>RNG</div>
                      <div className="h-1 bg-slate-800 mt-0.5">
                        <div className="h-full bg-emerald-400" style={{ width: `${rangePct}%` }} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Protection & Gear */}
          <div className="flex flex-col gap-3">
            <div className="text-xs font-mono-hud uppercase tracking-wider text-slate-400">
              Ballistic Protection
            </div>

            <button
              disabled={hud.armor >= 100 || hud.money < 650}
              onClick={() => onBuyArmor('kevlar')}
              className={`text-left p-4 border transition-colors tactical-chamfer-sm ${
                hud.armor >= 100
                  ? 'bg-sky-500/15 border-sky-400 cursor-default'
                  : hud.money >= 650
                    ? 'bg-[#101622] border-slate-700 hover:border-sky-400 cursor-pointer'
                    : 'bg-slate-950/60 border-slate-800 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-slate-100 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-sky-400" />
                  Kevlar Vest
                </span>
                <span className="font-mono-hud text-sm font-bold text-emerald-400">
                  {hud.armor >= 100 ? 'FULL' : '$650'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Restores 100 Armor. Absorbs 35% of incoming body shot damage.
              </p>
            </button>

            <button
              disabled={hud.hasHelmet || hud.money < 350}
              onClick={() => onBuyArmor('helmet')}
              className={`text-left p-4 border transition-colors tactical-chamfer-sm ${
                hud.hasHelmet
                  ? 'bg-sky-500/15 border-sky-400 cursor-default'
                  : hud.money >= 350
                    ? 'bg-[#101622] border-slate-700 hover:border-sky-400 cursor-pointer'
                    : 'bg-slate-950/60 border-slate-800 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-slate-100">
                  Tactical Helmet
                </span>
                <span className="font-mono-hud text-sm font-bold text-emerald-400">
                  {hud.hasHelmet ? 'OWNED' : '$350'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Reduces incoming headshot multiplier by 35%. Includes 50 starter armor.
              </p>
            </button>

            <button
              onClick={onClose}
              className="mt-auto py-3 bg-amber-500 text-slate-950 font-display font-bold uppercase tracking-wider text-sm hover:bg-amber-400 cursor-pointer tactical-chamfer-sm"
            >
              Done Buying [B]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
