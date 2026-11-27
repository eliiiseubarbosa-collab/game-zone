import * as THREE from 'three';
import type { OperativeRig } from './characters';
import type { BuiltMap } from './map';
import type { Difficulty, TeamId, WeaponId, WeaponSlot } from './types';
import { WEAPONS } from './weapons';

export interface CombatAgent {
  id: string;
  name: string;
  codename: string;
  team: TeamId;
  isPlayer: boolean;
  characterId: string;
  alive: boolean;
  hp: number;
  armor: number;
  hasHelmet: boolean;
  money: number;
  kills: number;
  deaths: number;
  assists: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  pitch: number;
  crouching: boolean;
  grounded: boolean;
  equippedSlot: WeaponSlot;
  weapons: Record<
    WeaponSlot,
    {
      id: WeaponId | null;
      mag: number;
      reserve: number;
    }
  >;
  reloading: boolean;
  reloadTimer: number;
  fireCooldown: number;
  lastDamagerId: string | null;
  spottedTimer: number; // >0 if recently seen by player team
  rig?: OperativeRig;

  // AI state
  preferredLane: 'left' | 'mid' | 'right';
  targetWaypointId: string | null;
  reactionTimer: number;
  spottedEnemyId: string | null;
  strafeDir: number;
  strafeTimer: number;
  walkCycle: number;
  burstTimer: number;
  stuckTimer?: number;
  lastCheckX?: number;
  lastCheckZ?: number;
}

const _raycaster = new THREE.Raycaster();
const _origin = new THREE.Vector3();
const _target = new THREE.Vector3();
const _dir = new THREE.Vector3();

export const DIFFICULTY_TUNING: Record<
  Difficulty,
  { reactionSec: number; aimJitter: number; headshotChance: number; fireIntervalMult: number }
> = {
  easy: {
    reactionSec: 0.52,
    aimJitter: 0.085,
    headshotChance: 0.08,
    fireIntervalMult: 1.55,
  },
  normal: {
    reactionSec: 0.28,
    aimJitter: 0.042,
    headshotChance: 0.2,
    fireIntervalMult: 1.18,
  },
  hard: {
    reactionSec: 0.14,
    aimJitter: 0.018,
    headshotChance: 0.36,
    fireIntervalMult: 0.95,
  },
};

export function botPerformBuy(bot: CombatAgent): void {
  // Bots buy armor and best affordable primary
  if (bot.money >= 650 && bot.armor < 80) {
    bot.money -= 650;
    bot.armor = 100;
  }
  if (bot.money >= 350 && !bot.hasHelmet && bot.armor > 0) {
    bot.money -= 350;
    bot.hasHelmet = true;
  }

  const currentPrimary = bot.weapons[1].id;
  if (!currentPrimary) {
    let pick: WeaponId | null = null;
    if (bot.money >= 4200 && Math.random() < 0.28) {
      pick = 'sniper';
    } else if (bot.money >= 2700) {
      pick = 'rifle';
    } else if (bot.money >= 1800 && Math.random() < 0.35) {
      pick = 'shotgun';
    } else if (bot.money >= 1250) {
      pick = 'smg';
    }
    if (pick) {
      const def = WEAPONS[pick];
      bot.money -= def.price;
      bot.weapons[1] = { id: pick, mag: def.magSize, reserve: def.reserveMax };
      bot.equippedSlot = 1;
    } else {
      bot.equippedSlot = 2;
    }
  } else {
    // Refill ammo on kept primary
    const def = WEAPONS[currentPrimary];
    bot.weapons[1].mag = def.magSize;
    bot.weapons[1].reserve = def.reserveMax;
    bot.equippedSlot = 1;
  }
  // Always ensure pistol is full
  const pDef = WEAPONS.pistol;
  bot.weapons[2] = { id: 'pistol', mag: pDef.magSize, reserve: pDef.reserveMax };
}

export function hasLineOfSight(
  fromPos: THREE.Vector3,
  toPos: THREE.Vector3,
  map: BuiltMap
): boolean {
  _origin.set(fromPos.x, fromPos.y + 1.45, fromPos.z);
  _target.set(toPos.x, toPos.y + 1.35, toPos.z);
  _dir.subVectors(_target, _origin);
  const dist = _dir.length();
  if (dist < 0.1) return true;
  _dir.divideScalar(dist);

  _raycaster.set(_origin, _dir);
  _raycaster.far = dist - 0.15;
  const hits = _raycaster.intersectObjects(map.raycastMeshes, false);
  return hits.length === 0;
}

export interface BotFireRequest {
  shooter: CombatAgent;
  weaponId: WeaponId;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
}

export function updateBots(
  dt: number,
  bots: CombatAgent[],
  allAgents: CombatAgent[],
  map: BuiltMap,
  difficulty: Difficulty,
  canCombat: boolean,
  resolveCollision: (pos: THREE.Vector3, vel: THREE.Vector3, dt: number, radius: number) => void,
  onBotFire: (req: BotFireRequest) => void
): void {
  const tuning = DIFFICULTY_TUNING[difficulty];

  for (const bot of bots) {
    if (!bot.alive) continue;

    // Tick reload & weapon cooldown
    if (bot.fireCooldown > 0) bot.fireCooldown = Math.max(0, bot.fireCooldown - dt);
    if (bot.reloading) {
      bot.reloadTimer -= dt;
      if (bot.reloadTimer <= 0) {
        bot.reloading = false;
        const slot = bot.weapons[bot.equippedSlot];
        if (slot.id) {
          const def = WEAPONS[slot.id];
          const needed = def.magSize - slot.mag;
          const transfer = Math.min(needed, slot.reserve);
          slot.mag += transfer;
          slot.reserve -= transfer;
        }
      }
    }

    // Freeze / Buy phase: stand ready in spawn
    if (!canCombat) {
      bot.velocity.set(0, 0, 0);
      resolveCollision(bot.position, bot.velocity, dt, 0.45);
      animateBotRig(bot, 0, dt);
      continue;
    }

    // Apply gravity so bots descend ledges/ramps naturally
    bot.velocity.y -= 18.5 * dt;

    // Reload if current mag is empty
    const activeSlot = bot.weapons[bot.equippedSlot];
    if (activeSlot.id && activeSlot.id !== 'knife' && activeSlot.mag === 0 && !bot.reloading) {
      if (activeSlot.reserve > 0) {
        bot.reloading = true;
        bot.reloadTimer = WEAPONS[activeSlot.id].reloadTime;
      } else if (bot.equippedSlot === 1 && bot.weapons[2].mag > 0) {
        bot.equippedSlot = 2;
      } else {
        bot.equippedSlot = 3;
      }
    }

    // Find closest visible enemy
    let visibleEnemy: CombatAgent | null = null;
    let bestDist = Infinity;
    for (const other of allAgents) {
      if (!other.alive || other.team === bot.team) continue;
      const d = bot.position.distanceTo(other.position);
      if (d < 52 && d < bestDist && hasLineOfSight(bot.position, other.position, map)) {
        bestDist = d;
        visibleEnemy = other;
      }
    }

    if (visibleEnemy) {
      // Mark spotted for minimap if seen by a vanguard teammate when player is vanguard, etc.
      if (bot.spottedEnemyId !== visibleEnemy.id) {
        bot.spottedEnemyId = visibleEnemy.id;
        bot.reactionTimer = tuning.reactionSec;
      } else {
        bot.reactionTimer = Math.max(0, bot.reactionTimer - dt);
      }

      // Face enemy smoothly
      const dx = visibleEnemy.position.x - bot.position.x;
      const dz = visibleEnemy.position.z - bot.position.z;
      const desiredYaw = Math.atan2(dx, dz);
      bot.yaw = dampAngle(bot.yaw, desiredYaw, 10, dt);

      // Strafe tactically during duel
      bot.strafeTimer -= dt;
      if (bot.strafeTimer <= 0) {
        bot.strafeDir = Math.random() < 0.5 ? -1 : 1;
        bot.strafeTimer = 0.55 + Math.random() * 0.7;
      }

      const strafeSpeed = bestDist < 8 ? 2.4 : 1.7;
      const moveX = Math.cos(bot.yaw) * bot.strafeDir * strafeSpeed;
      const moveZ = -Math.sin(bot.yaw) * bot.strafeDir * strafeSpeed;
      // Close distance slightly if using shotgun or knife
      const wId = activeSlot.id || 'pistol';
      const approach = wId === 'shotgun' || wId === 'knife' ? 2.6 : bestDist > 22 ? 1.5 : 0;
      bot.velocity.x = moveX + Math.sin(bot.yaw) * approach;
      bot.velocity.z = moveZ + Math.cos(bot.yaw) * approach;

      applyAgentSeparation(bot, allAgents);
      resolveCollision(bot.position, bot.velocity, dt, 0.45);
      animateBotRig(bot, Math.hypot(bot.velocity.x, bot.velocity.z), dt);

      // Fire when reaction timer elapsed & not reloading
      if (bot.reactionTimer <= 0 && !bot.reloading && bot.fireCooldown <= 0 && activeSlot.id) {
        const wDef = WEAPONS[activeSlot.id];
        if (activeSlot.id === 'knife' && bestDist > 2.6) {
          continue;
        }
        if (activeSlot.id === 'knife' || activeSlot.mag > 0) {
          if (activeSlot.id !== 'knife') activeSlot.mag -= 1;
          bot.fireCooldown = (1 / wDef.fireRate) * tuning.fireIntervalMult;

          const aimHead = Math.random() < tuning.headshotChance;
          const targetY = visibleEnemy.position.y + (aimHead ? 1.52 : 1.08);
          _origin.set(bot.position.x, bot.position.y + 1.45, bot.position.z);
          _target.set(visibleEnemy.position.x, targetY, visibleEnemy.position.z);
          _dir.subVectors(_target, _origin).normalize();

          // Apply difficulty-scaled aim jitter
          _dir.x += (Math.random() - 0.5) * tuning.aimJitter;
          _dir.y += (Math.random() - 0.5) * tuning.aimJitter * 0.65;
          _dir.z += (Math.random() - 0.5) * tuning.aimJitter;
          _dir.normalize();

          onBotFire({
            shooter: bot,
            weaponId: activeSlot.id,
            origin: _origin.clone(),
            direction: _dir.clone(),
          });
        }
      }
      continue;
    }

    // No enemy in sight: reset reaction and patrol waypoints along preferred lane
    bot.spottedEnemyId = null;
    if (!bot.targetWaypointId) {
      bot.targetWaypointId = pickNextWaypoint(bot, map);
    }

    const wp = map.waypoints.find((w) => w.id === bot.targetWaypointId);
    if (wp) {
      const dx = wp.x - bot.position.x;
      const dz = wp.z - bot.position.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < 2.2) {
        bot.stuckTimer = 0;
        bot.targetWaypointId = pickNextWaypoint(bot, map, wp.id);
      } else {
        // Anti-stuck recovery if blocked by corner/crate
        bot.stuckTimer = (bot.stuckTimer ?? 0) + dt;
        if (bot.stuckTimer > 1.1) {
          const moved = Math.hypot(
            bot.position.x - (bot.lastCheckX ?? bot.position.x),
            bot.position.z - (bot.lastCheckZ ?? bot.position.z)
          );
          bot.lastCheckX = bot.position.x;
          bot.lastCheckZ = bot.position.z;
          bot.stuckTimer = 0;
          if (moved < 0.35) {
            bot.targetWaypointId = pickNextWaypoint(bot, map, wp.id);
          }
        }

        const desiredYaw = Math.atan2(dx, dz);
        bot.yaw = dampAngle(bot.yaw, desiredYaw, 7, dt);
        const speed = 3.8 * (activeSlot.id ? WEAPONS[activeSlot.id].moveSpeedMult : 1);
        bot.velocity.x = Math.sin(bot.yaw) * speed;
        bot.velocity.z = Math.cos(bot.yaw) * speed;
        applyAgentSeparation(bot, allAgents);
        resolveCollision(bot.position, bot.velocity, dt, 0.45);
        animateBotRig(bot, speed, dt);
      }
    }
  }
}

function applyAgentSeparation(bot: CombatAgent, allAgents: CombatAgent[]): void {
  for (const other of allAgents) {
    if (!other.alive || other.id === bot.id) continue;
    const dx = bot.position.x - other.position.x;
    const dz = bot.position.z - other.position.z;
    const dSq = dx * dx + dz * dz;
    if (dSq > 0.0001 && dSq < 0.85 * 0.85) {
      const d = Math.sqrt(dSq);
      const push = (0.85 - d) * 3.5;
      bot.velocity.x += (dx / d) * push;
      bot.velocity.z += (dz / d) * push;
    }
  }
}

function pickNextWaypoint(bot: CombatAgent, map: BuiltMap, currentId?: string): string {
  const current = currentId ? map.waypoints.find((w) => w.id === currentId) : null;
  if (!current) {
    // Pick nearest waypoint in preferred lane
    let best = map.waypoints[0];
    let bestScore = Infinity;
    for (const w of map.waypoints) {
      const d = Math.hypot(w.x - bot.position.x, w.z - bot.position.z);
      const laneBonus = w.lane === bot.preferredLane ? -8 : 0;
      if (d + laneBonus < bestScore) {
        bestScore = d + laneBonus;
        best = w;
      }
    }
    return best.id;
  }

  // Advance toward enemy side (Directorate wants +Z, Vanguard wants -Z)
  const targetDirZ = bot.team === 'vanguard' ? -1 : 1;
  const candidates = current.neighbors
    .map((id) => map.waypoints.find((w) => w.id === id))
    .filter((w): w is NonNullable<typeof w> => Boolean(w));

  if (candidates.length === 0) return current.id;

  // Prefer neighbors moving forward or along preferred lane
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const c of candidates) {
    const progress = (c.z - current.z) * targetDirZ;
    const laneBonus = c.lane === bot.preferredLane ? 4 : c.lane === 'mid' ? 2 : 0;
    const noise = Math.random() * 5;
    const score = progress * 0.4 + laneBonus + noise;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best.id;
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

function animateBotRig(bot: CombatAgent, speed: number, dt: number): void {
  const rig = bot.rig;
  if (!rig) return;
  rig.root.position.copy(bot.position);
  rig.root.rotation.y = bot.yaw;

  if (speed > 0.3) {
    bot.walkCycle += dt * speed * 2.2;
    const swing = Math.sin(bot.walkCycle) * 0.48;
    rig.leftLeg.rotation.x = swing;
    rig.rightLeg.rotation.x = -swing;
  } else {
    rig.leftLeg.rotation.x = THREE.MathUtils.damp(rig.leftLeg.rotation.x, 0, 10, dt);
    rig.rightLeg.rotation.x = THREE.MathUtils.damp(rig.rightLeg.rotation.x, 0, 10, dt);
  }
}
