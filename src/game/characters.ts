import * as THREE from 'three';
import type { CharacterDef, SkinVariant, TeamId, WeaponId, WeaponSkinId } from './types';
import { WEAPON_SKINS } from './weapons';

export const CHARACTERS: CharacterDef[] = [
  // VANGUARD COALITION
  {
    id: 'v_faro',
    name: 'Duarte Silva',
    codename: 'FARO',
    team: 'vanguard',
    role: 'Assault Breacher',
    backstory: 'Former Lisbon coastal boarding commander specializing in tight-alley entries.',
    silhouette: 'breacher',
    skins: {
      urban: {
        label: 'Alfama Slate',
        primary: 0x2b3a4a,
        secondary: 0x1e293b,
        accent: 0x38bdf8,
        visor: 0x0ea5e9,
        swatch: '#334155',
      },
      desert: {
        label: 'Alentejo Sand',
        primary: 0x9c8259,
        secondary: 0x5c4b35,
        accent: 0xf59e0b,
        visor: 0xfbbf24,
        swatch: '#a3875e',
      },
      winter: {
        label: 'Atlantic Frost',
        primary: 0xcbd5e1,
        secondary: 0x475569,
        accent: 0x0284c7,
        visor: 0x7dd3fc,
        swatch: '#cbd5e1',
      },
    },
  },
  {
    id: 'v_kestrel',
    name: 'Nadia Novak',
    codename: 'KESTREL',
    team: 'vanguard',
    role: 'Recon Marksman',
    backstory: 'Long-range observer trained in elevated rooftop counter-sniping across European capitals.',
    silhouette: 'recon',
    skins: {
      urban: {
        label: 'Night Watch',
        primary: 0x1e293b,
        secondary: 0x334155,
        accent: 0x22d3ee,
        visor: 0x67e8f9,
        swatch: '#1e293b',
      },
      desert: {
        label: 'Dune Recon',
        primary: 0xa68b67,
        secondary: 0x6b563c,
        accent: 0x84cc16,
        visor: 0xfde047,
        swatch: '#b0936b',
      },
      winter: {
        label: 'Glacier Cloak',
        primary: 0xe2e8f0,
        secondary: 0x64748b,
        accent: 0x38bdf8,
        visor: 0x0284c7,
        swatch: '#e2e8f0',
      },
    },
  },
  {
    id: 'v_bastion',
    name: 'Mateo Cruz',
    codename: 'BASTION',
    team: 'vanguard',
    role: 'Heavy Support',
    backstory: 'Combat engineer outfitted with layered ceramic armor to anchor mid-lane choke points.',
    silhouette: 'heavy',
    skins: {
      urban: {
        label: 'Metro Shield',
        primary: 0x374151,
        secondary: 0x1f2937,
        accent: 0x60a5fa,
        visor: 0x93c5fd,
        swatch: '#4b5563',
      },
      desert: {
        label: 'Sirocco Plate',
        primary: 0x8c704c,
        secondary: 0x4a3b28,
        accent: 0xf97316,
        visor: 0xfdba74,
        swatch: '#8c704c',
      },
      winter: {
        label: 'Boreal Armor',
        primary: 0xd1d5db,
        secondary: 0x374151,
        accent: 0x0ea5e9,
        visor: 0xbae6fd,
        swatch: '#d1d5db',
      },
    },
  },
  // IRON DIRECTORATE
  {
    id: 'd_volk',
    name: 'Viktor Morozov',
    codename: 'VOLK',
    team: 'directorate',
    role: 'Shock Commander',
    backstory: 'Veteran mechanized squad leader hardened by northern winter fortification drills.',
    silhouette: 'officer',
    skins: {
      urban: {
        label: 'Granite Guard',
        primary: 0x3a2424,
        secondary: 0x1c1917,
        accent: 0xef4444,
        visor: 0xf87171,
        swatch: '#572a2a',
      },
      desert: {
        label: 'Steppe Ochre',
        primary: 0x8b6e4e,
        secondary: 0x443627,
        accent: 0xea580c,
        visor: 0xfb923c,
        swatch: '#8b6e4e',
      },
      winter: {
        label: 'Siberia Coat',
        primary: 0xd6d3d1,
        secondary: 0x44403c,
        accent: 0xdc2626,
        visor: 0xfca5a5,
        swatch: '#d6d3d1',
      },
    },
  },
  {
    id: 'd_vipera',
    name: 'Elena Koval',
    codename: 'VIPERA',
    team: 'directorate',
    role: 'Covert Infiltrator',
    backstory: 'Subway corridor saboteur using dual-optic headgear for rapid flank eliminations.',
    silhouette: 'infiltrator',
    skins: {
      urban: {
        label: 'Obsidian Red',
        primary: 0x222024,
        secondary: 0x141216,
        accent: 0xf43f5e,
        visor: 0xfb7185,
        swatch: '#2e1f27',
      },
      desert: {
        label: 'Scorpion Tan',
        primary: 0x927553,
        secondary: 0x3f3224,
        accent: 0xe11d48,
        visor: 0xfda4af,
        swatch: '#927553',
      },
      winter: {
        label: 'Blizzard Ghost',
        primary: 0xe5e7eb,
        secondary: 0x334155,
        accent: 0xe11d48,
        visor: 0xf43f5e,
        swatch: '#e5e7eb',
      },
    },
  },
  {
    id: 'd_anvil',
    name: 'Darius Orlov',
    codename: 'ANVIL',
    team: 'directorate',
    role: 'Demolitions Sapper',
    backstory: 'Armored tunnel breacher carrying reinforced chest plating and blast visor.',
    silhouette: 'sapper',
    skins: {
      urban: {
        label: 'Foundry Steel',
        primary: 0x423835,
        secondary: 0x262220,
        accent: 0xf59e0b,
        visor: 0xfcd34d,
        swatch: '#423835',
      },
      desert: {
        label: 'Arid Forge',
        primary: 0x9a7b56,
        secondary: 0x523f2b,
        accent: 0xd97706,
        visor: 0xfef08a,
        swatch: '#9a7b56',
      },
      winter: {
        label: 'Frost Foundry',
        primary: 0xcbd5e1,
        secondary: 0x451a03,
        accent: 0xef4444,
        visor: 0xfecaca,
        swatch: '#cbd5e1',
      },
    },
  },
];

export function getCharacterById(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

export function getTeamCharacters(team: TeamId): CharacterDef[] {
  return CHARACTERS.filter((c) => c.team === team);
}

export interface OperativeRig {
  root: THREE.Group;
  headHitbox: THREE.Mesh;
  bodyHitbox: THREE.Mesh;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  torsoGroup: THREE.Group;
  weaponMount: THREE.Group;
  muzzlePoint: THREE.Object3D;
}

export function buildOperativeModel(
  characterId: string,
  skinVariant: SkinVariant,
  agentId: string,
  weaponId: WeaponId = 'rifle',
  weaponSkinId: WeaponSkinId = 'carbon'
): OperativeRig {
  const charDef = getCharacterById(characterId);
  const skin = charDef.skins[skinVariant];
  const weaponSkin = WEAPON_SKINS[weaponSkinId];

  const root = new THREE.Group();

  const primaryMat = new THREE.MeshStandardMaterial({
    color: skin.primary,
    roughness: 0.72,
    metalness: 0.1,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: skin.secondary,
    roughness: 0.85,
    metalness: 0.08,
  });
  const armorMat = new THREE.MeshStandardMaterial({
    color: skin.secondary,
    roughness: 0.42,
    metalness: 0.45,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: skin.accent,
    roughness: 0.35,
    metalness: 0.55,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: skin.visor,
    emissive: skin.visor,
    emissiveIntensity: 0.45,
    roughness: 0.15,
    metalness: 0.85,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd6b092,
    roughness: 0.65,
    metalness: 0.02,
  });

  // Silhouette proportions
  const isHeavy = charDef.silhouette === 'heavy' || charDef.silhouette === 'sapper';
  const isSlim = charDef.silhouette === 'recon' || charDef.silhouette === 'infiltrator';
  const torsoW = isHeavy ? 0.52 : isSlim ? 0.4 : 0.45;
  const torsoD = isHeavy ? 0.32 : 0.25;

  // 1-2. Legs (pivoted at hip y = 0.85 so boots touch y = 0)
  const makeLeg = (xOff: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(xOff, 0.85, 0);
    const thigh = new THREE.Mesh(
      new THREE.BoxGeometry(isHeavy ? 0.18 : 0.15, 0.42, isHeavy ? 0.19 : 0.16),
      primaryMat
    );
    thigh.position.y = -0.21;
    thigh.castShadow = true;
    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.15), secondaryMat);
    shin.position.y = -0.56;
    shin.castShadow = true;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.22), armorMat);
    boot.position.set(0, -0.79, 0.03);
    boot.castShadow = true;
    legGroup.add(thigh, shin, boot);
    return legGroup;
  };
  const leftLeg = makeLeg(-0.13);
  const rightLeg = makeLeg(0.13);
  root.add(leftLeg, rightLeg);

  // 3. Torso & Armor Rig
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.85, 0);
  root.add(torsoGroup);

  const waist = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 0.9, 0.16, torsoD), secondaryMat);
  waist.position.y = 0.08;
  waist.castShadow = true;
  const chest = new THREE.Mesh(new THREE.BoxGeometry(torsoW, 0.44, torsoD), primaryMat);
  chest.position.y = 0.36;
  chest.castShadow = true;
  const vest = new THREE.Mesh(
    new THREE.BoxGeometry(torsoW + 0.04, 0.36, torsoD + 0.05),
    armorMat
  );
  vest.position.y = 0.36;
  vest.castShadow = true;
  const chestBadge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.02), accentMat);
  chestBadge.position.set(0.1, 0.44, (torsoD + 0.06) / 2);
  torsoGroup.add(waist, chest, vest, chestBadge);

  // Silhouette-specific torso gear
  if (isHeavy) {
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.28), armorMat);
    collar.position.set(0, 0.6, 0);
    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.16), secondaryMat);
    backpack.position.set(0, 0.38, -(torsoD / 2 + 0.09));
    torsoGroup.add(collar, backpack);
  } else if (charDef.silhouette === 'recon') {
    const poncho = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.26, 8), secondaryMat);
    poncho.position.set(0, 0.48, 0);
    torsoGroup.add(poncho);
  } else if (charDef.silhouette === 'officer') {
    const coat = new THREE.Mesh(new THREE.BoxGeometry(torsoW + 0.03, 0.24, torsoD + 0.02), primaryMat);
    coat.position.set(0, -0.02, 0);
    torsoGroup.add(coat);
  }

  // 4. Head & Helmet / Visor (neck at y = 0.62 inside torsoGroup => world y = 1.47)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.68, 0);
  torsoGroup.add(headGroup);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.22), skinMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  if (charDef.silhouette === 'officer') {
    // Tactical Ushanka-style armored cap
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.15, 0.26), secondaryMat);
    cap.position.y = 0.09;
    const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.02), accentMat);
    emblem.position.set(0, 0.1, 0.135);
    const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.04), visorMat);
    goggles.position.set(0, 0.02, 0.115);
    headGroup.add(cap, emblem, goggles);
  } else if (charDef.silhouette === 'infiltrator') {
    const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.25, 0.24), secondaryMat);
    const nvgLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 10), visorMat);
    nvgLeft.rotation.x = Math.PI / 2;
    nvgLeft.position.set(-0.055, 0.03, 0.13);
    const nvgRight = nvgLeft.clone();
    nvgRight.position.x = 0.055;
    headGroup.add(cowl, nvgLeft, nvgRight);
  } else {
    const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.14, 0.25), armorMat);
    helmet.position.y = 0.08;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.07, 0.04), visorMat);
    visor.position.set(0, 0.03, 0.12);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.26), accentMat);
    rim.position.y = 0.14;
    headGroup.add(helmet, visor, rim);
  }

  // 5-6. Arms & Weapon Mount
  const makeArm = (xOff: number) => {
    const arm = new THREE.Group();
    arm.position.set(xOff, 0.52, 0);
    const pauldron = new THREE.Mesh(
      new THREE.BoxGeometry(isHeavy ? 0.18 : 0.14, 0.14, 0.16),
      armorMat
    );
    pauldron.position.y = -0.02;
    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.12), primaryMat);
    sleeve.position.y = -0.24;
    sleeve.castShadow = true;
    const glove = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.12), secondaryMat);
    glove.position.y = -0.46;
    arm.add(pauldron, sleeve, glove);
    return arm;
  };
  const leftArm = makeArm(-(torsoW / 2 + 0.07));
  const rightArm = makeArm(torsoW / 2 + 0.07);
  // Pose arms forward holding rifle
  leftArm.rotation.x = -0.75;
  leftArm.rotation.z = -0.25;
  rightArm.rotation.x = -0.9;
  rightArm.rotation.z = 0.12;
  torsoGroup.add(leftArm, rightArm);

  // World-space weapon attached to right hand/torso
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0.14, 0.34, 0.28);
  const wMat = new THREE.MeshStandardMaterial({
    color: weaponSkin.primaryHex,
    metalness: weaponSkin.metalness,
    roughness: weaponSkin.roughness,
  });
  const wDark = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.8,
    roughness: 0.3,
  });
  const wBodyLen = weaponId === 'sniper' ? 0.72 : weaponId === 'pistol' ? 0.24 : 0.52;
  const wBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, wBodyLen), wMat);
  wBody.position.z = wBodyLen * 0.35;
  const wBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8), wDark);
  wBarrel.rotation.x = Math.PI / 2;
  wBarrel.position.set(0, 0.02, wBodyLen * 0.75);
  weaponMount.add(wBody, wBarrel);

  const muzzlePoint = new THREE.Object3D();
  muzzlePoint.position.set(0, 0.02, wBodyLen + 0.12);
  weaponMount.add(muzzlePoint);
  torsoGroup.add(weaponMount);

  // Invisible generous capsule/box hitboxes for reliable raycast hit detection
  const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
  const bodyHitbox = new THREE.Mesh(new THREE.BoxGeometry(0.58, 1.38, 0.42), hitboxMat);
  bodyHitbox.position.set(0, 0.69, 0);
  bodyHitbox.userData = { agentId, hitZone: 'body' };

  const headHitbox = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 10), hitboxMat);
  headHitbox.position.set(0, 1.54, 0);
  headHitbox.userData = { agentId, hitZone: 'head' };

  root.add(bodyHitbox, headHitbox);

  return {
    root,
    headHitbox,
    bodyHitbox,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    torsoGroup,
    weaponMount,
    muzzlePoint,
  };
}
