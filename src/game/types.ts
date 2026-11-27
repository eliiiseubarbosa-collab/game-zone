export type TeamId = 'vanguard' | 'directorate';
export type MapId = 'lisbon' | 'moscow';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type SkinVariant = 'urban' | 'desert' | 'winter';
export type WeaponSlot = 1 | 2 | 3; // 1: primary, 2: pistol, 3: knife
export type WeaponId = 'knife' | 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper';
export type WeaponSkinId = 'carbon' | 'azulejo' | 'crimson' | 'arctic' | 'coyote' | 'gold';

export type GamePhase =
  | 'menu'
  | 'buy'
  | 'combat'
  | 'round_end'
  | 'match_end'
  | 'paused'
  | 'quit';

export interface KeyBindings {
  forward: string;
  backward: string;
  left: string;
  right: string;
  jump: string;
  crouch: string;
  walk: string;
  reload: string;
  buy: string;
  scoreboard: string;
}

export interface GameSettings {
  sensitivity: number; // 0.2 - 3.0
  volume: number; // 0 - 1
  muted: boolean;
  graphics: GraphicsQuality;
  fov: number;
  bindings: KeyBindings;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  shortName: string;
  category: 'melee' | 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper';
  slot: WeaponSlot;
  price: number;
  damage: number;
  headshotMult: number;
  backstabMult?: number;
  fireRate: number; // shots per second
  automatic: boolean;
  magSize: number;
  reserveMax: number;
  reloadTime: number; // seconds
  pellets: number; // >1 for shotgun
  baseSpread: number; // radians
  moveSpread: number;
  crouchSpreadMult: number;
  recoilPitch: number;
  recoilYaw: number;
  recoilPattern: Array<[number, number]>; // [yawOffset, pitchOffset]
  rangeFull: number; // meters before falloff
  rangeZero: number; // meters where falloff floors at 0.35
  moveSpeedMult: number;
  hasScope?: boolean;
  killReward: number;
  description: string;
}

export interface WeaponSkinDef {
  id: WeaponSkinId;
  name: string;
  primaryHex: number;
  accentHex: number;
  metalness: number;
  roughness: number;
  cssSwatch: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  codename: string;
  team: TeamId;
  role: string;
  backstory: string;
  silhouette: 'heavy' | 'recon' | 'breacher' | 'officer' | 'infiltrator' | 'sapper';
  skins: Record<
    SkinVariant,
    {
      label: string;
      primary: number;
      secondary: number;
      accent: number;
      visor: number;
      swatch: string;
    }
  >;
}

export interface KillFeedEntry {
  id: number;
  killerName: string;
  killerTeam: TeamId;
  victimName: string;
  victimTeam: TeamId;
  weaponName: string;
  headshot: boolean;
  timestamp: number;
}

export interface ScoreboardPlayer {
  id: string;
  name: string;
  codename: string;
  team: TeamId;
  isPlayer: boolean;
  alive: boolean;
  hp: number;
  armor: number;
  kills: number;
  deaths: number;
  assists: number;
  money: number;
  weaponName: string;
  characterId: string;
}

export interface MinimapBlip {
  id: string;
  x: number;
  z: number;
  yaw: number;
  team: TeamId;
  isPlayer: boolean;
  alive: boolean;
  spotted: boolean;
}

export interface HudState {
  phase: GamePhase;
  previousActivePhase: 'buy' | 'combat';
  pointerLocked: boolean;
  mapId: MapId;
  playerTeam: TeamId;
  difficulty: Difficulty;
  roundNumber: number;
  maxRounds: number; // Best of 3 => first to 2
  vanguardScore: number;
  directorateScore: number;
  timerSeconds: number;
  hp: number;
  armor: number;
  hasHelmet: boolean;
  money: number;
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
  reloadProgress: number;
  scoped: boolean;
  crosshairSpread: number;
  hitmarker: 'none' | 'hit' | 'headshot' | 'kill';
  damageFlash: number; // 0..1
  damageAngle: number; // radians relative to player forward
  killfeed: KillFeedEntry[];
  scoreboard: ScoreboardPlayer[];
  minimapBlips: MinimapBlip[];
  minimapBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  roundWinner: TeamId | 'draw' | null;
  roundEndReason: string;
  matchWinner: TeamId | null;
  aliveCounts: { vanguard: number; directorate: number };
  announcement: string;
}

export interface ColliderBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  label?: string;
}

export interface WaypointNode {
  id: string;
  x: number;
  y: number;
  z: number;
  neighbors: string[];
  lane: 'left' | 'mid' | 'right' | 'spawn_v' | 'spawn_d';
  isCover?: boolean;
}
