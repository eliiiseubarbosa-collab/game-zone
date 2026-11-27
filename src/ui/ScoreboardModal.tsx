import React from 'react';
import type { HudState, TeamId } from '../game/types';

interface Props {
  hud: HudState;
  visible: boolean;
}

export const ScoreboardModal: React.FC<Props> = ({ hud, visible }) => {
  if (!visible) return null;

  const renderTeamTable = (team: TeamId, title: string, accentClass: string) => {
    const members = hud.scoreboard.filter((p) => p.team === team);
    return (
      <div className="bg-[#0e131c] border border-slate-700/90">
        <div className={`px-4 py-2 border-b border-slate-800 flex justify-between ${accentClass}`}>
          <span className="font-display font-bold tracking-wider uppercase text-sm">{title}</span>
          <span className="font-mono-hud font-bold text-sm">
            SCORE: {team === 'vanguard' ? hud.vanguardScore : hud.directorateScore}
          </span>
        </div>
        <table className="w-full text-left font-mono-hud text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-800/80">
              <th className="py-2 px-4">OPERATIVE</th>
              <th className="py-2 px-2 text-center">STATUS</th>
              <th className="py-2 px-2 text-center">WEAPON</th>
              <th className="py-2 px-2 text-center">K</th>
              <th className="py-2 px-2 text-center">D</th>
              <th className="py-2 px-2 text-center">A</th>
              <th className="py-2 px-4 text-right">CASH</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.id}
                className={`border-b border-slate-800/40 ${
                  m.isPlayer ? 'bg-amber-500/10 text-amber-200' : 'text-slate-200'
                } ${!m.alive ? 'opacity-50' : ''}`}
              >
                <td className="py-2.5 px-4 font-bold">
                  {m.name} {m.isPlayer ? `(${m.codename})` : ''}
                </td>
                <td className="py-2.5 px-2 text-center">
                  {m.alive ? `${m.hp} HP` : 'DEAD'}
                </td>
                <td className="py-2.5 px-2 text-center text-slate-300">{m.weaponName}</td>
                <td className="py-2.5 px-2 text-center font-bold">{m.kills}</td>
                <td className="py-2.5 px-2 text-center">{m.deaths}</td>
                <td className="py-2.5 px-2 text-center">{m.assists}</td>
                <td className="py-2.5 px-4 text-right text-emerald-400">${m.money}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-slate-950/65 p-4">
      <div className="w-full max-w-2xl flex flex-col gap-3">
        <div className="text-center font-display text-sm tracking-[0.25em] text-slate-300 uppercase">
          {hud.mapId === 'lisbon' ? 'ALFAMA MIRADOURO — LISBON' : 'KITAY-GOROD PLAZA — MOSCOW'} ·
          ROUND {hud.roundNumber} / {hud.maxRounds}
        </div>
        {renderTeamTable('vanguard', 'Vanguard Coalition', 'bg-sky-950/50 text-sky-300')}
        {renderTeamTable('directorate', 'Iron Directorate', 'bg-rose-950/50 text-rose-300')}
      </div>
    </div>
  );
};
