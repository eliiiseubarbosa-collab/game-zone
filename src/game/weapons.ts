import * as THREE from 'three';
import type { WeaponDef, WeaponId, WeaponSkinDef, WeaponSkinId } from './types';

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  knife: {
    id: 'knife',
    name: 'K-9 Carbon Dagger',
    shortName: 'KNIFE',
    category: 'melee',
    slot: 3,
    price: 0,
    damage: 55,
    headshotMult: 1.5,
    backstabMult: 2.5, // 137.5 damage from behind -> instant elimination
    fireRate: 2.2,
    automatic: false,
    magSize: 0,
    reserveMax: 0,
    reloadTime: 0,
    pellets: 1,
    baseSpread: 0,
    moveSpread: 0,
    crouchSpreadMult: 1,
    recoilPitch: 0.01,
    recoilYaw: 0.01,
    recoilPattern: [[0, 0]],
    rangeFull: 2.6,
    rangeZero: 2.6,
    moveSpeedMult: 1.08,
    killReward: 600,
    description: 'High-mobility melee blade. Deals 2.5x backstab damage.',
  },
  pistol: {
    id: 'pistol',
    name: 'P9 Tactical Sidearm',
    shortName: 'P9 TAC',
    category: 'pistol',
    slot: 2,
    price: 0,
    damage: 34,
    headshotMult: 2.6,
    fireRate: 5.5,
    automatic: false,
    magSize: 15,
    reserveMax: 60,
    reloadTime: 1.5,
    pellets: 1,
    baseSpread: 0.006,
    moveSpread: 0.022,
    crouchSpreadMult: 0.55,
    recoilPitch: 0.022,
    recoilYaw: 0.008,
    recoilPattern: [
      [0, 0.02],
      [0.004, 0.022],
      [-0.005, 0.024],
      [0.006, 0.022],
      [-0.004, 0.025],
    ],
    rangeFull: 22,
    rangeZero: 55,
    moveSpeedMult: 1.0,
    killReward: 300,
    description: 'Standard-issue 9mm tactical sidearm with crisp first-shot accuracy.',
  },
  smg: {
    id: 'smg',
    name: 'MP-74 Viper SMG',
    shortName: 'MP-74',
    category: 'smg',
    slot: 1,
    price: 1250,
    damage: 24,
    headshotMult: 2.2,
    fireRate: 12.0,
    automatic: true,
    magSize: 30,
    reserveMax: 120,
    reloadTime: 1.9,
    pellets: 1,
    baseSpread: 0.014,
    moveSpread: 0.024,
    crouchSpreadMult: 0.65,
    recoilPitch: 0.015,
    recoilYaw: 0.011,
    recoilPattern: [
      [0, 0.012],
      [0.005, 0.015],
      [-0.006, 0.016],
      [0.009, 0.018],
      [-0.011, 0.017],
      [0.012, 0.014],
      [-0.01, 0.013],
      [0.008, 0.014],
    ],
    rangeFull: 16,
    rangeZero: 42,
    moveSpeedMult: 0.96,
    killReward: 400,
    description: 'High-ROF close-quarters submachine gun. Strong eco-round pick.',
  },
  shotgun: {
    id: 'shotgun',
    name: 'M890 Breacher',
    shortName: 'M890',
    category: 'shotgun',
    slot: 1,
    price: 1800,
    damage: 18, // x8 pellets = 144 point-blank
    headshotMult: 1.6,
    fireRate: 1.25,
    automatic: false,
    magSize: 8,
    reserveMax: 32,
    reloadTime: 2.4,
    pellets: 8,
    baseSpread: 0.055,
    moveSpread: 0.025,
    crouchSpreadMult: 0.8,
    recoilPitch: 0.06,
    recoilYaw: 0.018,
    recoilPattern: [
      [0, 0.055],
      [0.012, 0.06],
      [-0.012, 0.058],
    ],
    rangeFull: 8,
    rangeZero: 24,
    moveSpeedMult: 0.93,
    killReward: 500,
    description: '12-gauge pump breacher firing 8 pellets. Lethal in tight alleys.',
  },
  rifle: {
    id: 'rifle',
    name: 'Vektor-47 Assault Rifle',
    shortName: 'VK-47',
    category: 'rifle',
    slot: 1,
    price: 2700,
    damage: 36,
    headshotMult: 3.1, // 111 dmg headshot
    fireRate: 9.5,
    automatic: true,
    magSize: 30,
    reserveMax: 90,
    reloadTime: 2.25,
    pellets: 1,
    baseSpread: 0.005,
    moveSpread: 0.045,
    crouchSpreadMult: 0.5,
    recoilPitch: 0.025,
    recoilYaw: 0.014,
    recoilPattern: [
      [0, 0.018],
      [0.002, 0.022],
      [-0.004, 0.026],
      [0.008, 0.028],
      [0.014, 0.024],
      [-0.016, 0.022],
      [-0.018, 0.018],
      [0.016, 0.018],
      [0.012, 0.016],
      [-0.014, 0.016],
    ],
    rangeFull: 32,
    rangeZero: 75,
    moveSpeedMult: 0.89,
    killReward: 300,
    description: 'Premier 7.62mm tactical rifle. 1-tap headshot potential at range.',
  },
  sniper: {
    id: 'sniper',
    name: 'L115 Longbow Sniper',
    shortName: 'L115',
    category: 'sniper',
    slot: 1,
    price: 4200,
    damage: 115,
    headshotMult: 2.6,
    fireRate: 0.72,
    automatic: false,
    magSize: 5,
    reserveMax: 15,
    reloadTime: 2.9,
    pellets: 1,
    baseSpread: 0.001, // When scoped; unscoped adds penalty in game loop
    moveSpread: 0.085,
    crouchSpreadMult: 0.4,
    recoilPitch: 0.08,
    recoilYaw: 0.012,
    recoilPattern: [[0, 0.075]],
    rangeFull: 80,
    rangeZero: 140,
    moveSpeedMult: 0.82,
    hasScope: true,
    killReward: 250,
    description: 'Heavy bolt-action precision rifle. Right-click to engage 3.5x scope.',
  },
};

export const WEAPON_SKINS: Record<WeaponSkinId, WeaponSkinDef> = {
  carbon: {
    id: 'carbon',
    name: 'Factory Carbon',
    primaryHex: 0x262c36,
    accentHex: 0x475569,
    metalness: 0.65,
    roughness: 0.38,
    cssSwatch: '#334155',
  },
  azulejo: {
    id: 'azulejo',
    name: 'Lisbon Azulejo',
    primaryHex: 0x1d4ed8,
    accentHex: 0xe2e8f0,
    metalness: 0.45,
    roughness: 0.25,
    cssSwatch: '#2563eb',
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Hazard',
    primaryHex: 0x991b1b,
    accentHex: 0x18181b,
    metalness: 0.55,
    roughness: 0.3,
    cssSwatch: '#dc2626',
  },
  arctic: {
    id: 'arctic',
    name: 'Arctic Chrome',
    primaryHex: 0xdbe4ee,
    accentHex: 0x38bdf8,
    metalness: 0.78,
    roughness: 0.22,
    cssSwatch: '#cbd5e1',
  },
  coyote: {
    id: 'coyote',
    name: 'Desert Coyote',
    primaryHex: 0xa17c52,
    accentHex: 0x3f2e1e,
    metalness: 0.3,
    roughness: 0.55,
    cssSwatch: '#b48a5a',
  },
  gold: {
    id: 'gold',
    name: 'Gilded Spec-Ops',
    primaryHex: 0xd4af37,
    accentHex: 0x111827,
    metalness: 0.92,
    roughness: 0.18,
    cssSwatch: '#eab308',
  },
};

export const BUYABLE_WEAPONS: WeaponId[] = ['smg', 'shotgun', 'rifle', 'sniper'];

export function buildWeaponViewModel(
  weaponId: WeaponId,
  skinId: WeaponSkinId
): { group: THREE.Group; muzzleFlash: THREE.Mesh } {
  const skin = WEAPON_SKINS[skinId];
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: skin.primaryHex,
    metalness: skin.metalness,
    roughness: skin.roughness,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x181c22,
    metalness: 0.85,
    roughness: 0.28,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: skin.accentHex,
    metalness: 0.15,
    roughness: 0.78,
  });
  const opticGlassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.6,
    metalness: 0.9,
    roughness: 0.1,
  });

  let muzzleZ = -0.5;
  let muzzleY = 0.04;

  if (weaponId === 'knife') {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.036, 0.14), gripMat);
    handle.position.set(0, 0, 0.04);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.045, 0.016), darkMetalMat);
    guard.position.set(0, 0, -0.035);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.038, 0.22), bodyMat);
    blade.position.set(0, 0.005, -0.15);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 4), darkMetalMat);
    tip.rotation.x = -Math.PI / 2;
    tip.position.set(0, 0.005, -0.285);
    group.add(handle, guard, blade, tip);
    group.rotation.set(-0.2, 0.25, -0.35);
    muzzleZ = -0.3;
  } else if (weaponId === 'pistol') {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.052, 0.24), bodyMat);
    slide.position.set(0, 0.04, -0.04);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.028, 0.22), darkMetalMat);
    frame.position.set(0, 0.005, -0.03);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.11, 0.055), gripMat);
    grip.position.set(0, -0.055, 0.045);
    grip.rotation.x = 0.22;
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.08, 12),
      darkMetalMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.038, -0.18);
    const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.014), opticGlassMat);
    frontSight.position.set(0, 0.072, -0.14);
    group.add(slide, frame, grip, barrel, frontSight);
    muzzleZ = -0.24;
  } else if (weaponId === 'smg') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.34), bodyMat);
    receiver.position.set(0, 0.03, -0.06);
    const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.055, 0.16), darkMetalMat);
    shroud.position.set(0, 0.032, -0.28);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, 0.14, 12),
      darkMetalMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.032, -0.4);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.17, 0.045), gripMat);
    mag.position.set(0, -0.08, -0.1);
    mag.rotation.x = -0.15;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.11, 0.05), gripMat);
    grip.position.set(0, -0.055, 0.05);
    grip.rotation.x = 0.2;
    const reflexHousing = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.035, 0.065), darkMetalMat);
    reflexHousing.position.set(0, 0.085, -0.04);
    const reflexLens = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.022, 0.01), opticGlassMat);
    reflexLens.position.set(0, 0.086, -0.072);
    group.add(receiver, shroud, barrel, mag, grip, reflexHousing, reflexLens);
    muzzleZ = -0.49;
  } else if (weaponId === 'shotgun') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.072, 0.34), bodyMat);
    receiver.position.set(0, 0.025, -0.05);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.48, 12),
      darkMetalMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.042, -0.44);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 10), darkMetalMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.01, -0.41);
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.048, 0.18), gripMat);
    pump.position.set(0, 0.008, -0.34);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.085, 0.22), gripMat);
    stock.position.set(0, -0.01, 0.18);
    group.add(receiver, barrel, tube, pump, stock);
    muzzleZ = -0.7;
  } else if (weaponId === 'rifle') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.078, 0.38), bodyMat);
    receiver.position.set(0, 0.03, -0.05);
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.24), gripMat);
    handguard.position.set(0, 0.028, -0.34);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, 0.28, 12),
      darkMetalMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.036, -0.56);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.18, 0.062), darkMetalMat);
    mag.position.set(0, -0.09, -0.12);
    mag.rotation.x = -0.22;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.11, 0.05), gripMat);
    grip.position.set(0, -0.055, 0.06);
    grip.rotation.x = 0.22;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.08, 0.2), darkMetalMat);
    stock.position.set(0, 0.015, 0.21);
    const holo = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.038, 0.08), darkMetalMat);
    holo.position.set(0, 0.088, -0.04);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.024, 0.008), opticGlassMat);
    lens.position.set(0, 0.088, -0.08);
    group.add(receiver, handguard, barrel, mag, grip, stock, holo, lens);
    muzzleZ = -0.72;
  } else if (weaponId === 'sniper') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.074, 0.42), bodyMat);
    receiver.position.set(0, 0.028, -0.04);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.018, 0.62, 14),
      darkMetalMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, -0.54);
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.032, 0.07), darkMetalMat);
    brake.position.set(0, 0.04, -0.86);
    const scopeTube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.28, 14),
      darkMetalMat
    );
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.095, -0.06);
    const scopeBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.024, 0.08, 14),
      darkMetalMat
    );
    scopeBell.rotation.x = Math.PI / 2;
    scopeBell.position.set(0, 0.095, -0.22);
    const scopeLens = new THREE.Mesh(new THREE.CircleGeometry(0.026, 14), opticGlassMat);
    scopeLens.position.set(0, 0.095, -0.261);
    scopeLens.rotation.y = Math.PI;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.095, 0.25), gripMat);
    stock.position.set(0, 0.01, 0.22);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.09, 0.075), darkMetalMat);
    mag.position.set(0, -0.045, -0.08);
    group.add(receiver, barrel, brake, scopeTube, scopeBell, scopeLens, stock, mag);
    muzzleZ = -0.92;
  }

  // Muzzle flash star mesh
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffd166,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const muzzleFlash = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), flashMat);
  muzzleFlash.position.set(0, muzzleY, muzzleZ);
  muzzleFlash.scale.set(1, 1, 2.2);
  muzzleFlash.visible = false;
  group.add(muzzleFlash);

  return { group, muzzleFlash };
}
