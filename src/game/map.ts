import * as THREE from 'three';
import type { ProceduralTextureSet } from './textures';
import type { ColliderBox, MapId, TeamId, WaypointNode } from './types';

export interface BuiltMap {
  id: MapId;
  name: string;
  subtitle: string;
  group: THREE.Group;
  colliders: ColliderBox[];
  ramps: Array<{
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    yStart: number;
    yEnd: number;
    axis: 'z'; // ramps along Z
  }>;
  raycastMeshes: THREE.Object3D[];
  spawns: Record<TeamId, THREE.Vector3[]>;
  waypoints: WaypointNode[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  skyColor: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  menuCamPos: THREE.Vector3;
  menuCamTarget: THREE.Vector3;
}

export function buildMap(
  mapId: MapId,
  textures: ProceduralTextureSet,
  castShadows: boolean
): BuiltMap {
  const group = new THREE.Group();
  const colliders: ColliderBox[] = [];
  const ramps: BuiltMap['ramps'] = [];
  const raycastMeshes: THREE.Object3D[] = [];

  const isLisbon = mapId === 'lisbon';
  const skyColor = isLisbon ? 0xd9a87c : 0x7a8899;
  const fogColor = isLisbon ? 0xe0b589 : 0x8693a3;

  // Helper to add solid box with auto AABB collider
  const addSolidBox = (
    x: number,
    yCenter: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    collide = true,
    label?: string
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, yCenter, z);
    mesh.castShadow = castShadows;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (collide) {
      raycastMeshes.push(mesh);
      colliders.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minY: yCenter - h / 2,
        maxY: yCenter + h / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        label,
      });
    }
    return mesh;
  };

  // Helper to add a sloped ramp along Z
  const addRamp = (
    x: number,
    zStart: number,
    zEnd: number,
    width: number,
    yStart: number,
    yEnd: number,
    mat: THREE.Material
  ) => {
    const dz = zEnd - zStart;
    const dy = yEnd - yStart;
    const length = Math.hypot(dz, dy);
    const angle = Math.atan2(dy, Math.abs(dz));
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.25, length), mat);
    mesh.position.set(x, (yStart + yEnd) / 2 - 0.1, (zStart + zEnd) / 2);
    mesh.rotation.x = dz > 0 ? -angle : angle;
    mesh.receiveShadow = true;
    mesh.castShadow = castShadows;
    group.add(mesh);
    raycastMeshes.push(mesh);

    ramps.push({
      minX: x - width / 2,
      maxX: x + width / 2,
      minZ: Math.min(zStart, zEnd),
      maxZ: Math.max(zStart, zEnd),
      yStart: dz > 0 ? yStart : yEnd,
      yEnd: dz > 0 ? yEnd : yStart,
      axis: 'z',
    });
  };

  // Materials with realistic PBR bump and roughness maps
  const groundPair = isLisbon ? textures.cobblestone : textures.snowCobble;
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundPair.map,
    bumpMap: groundPair.bumpMap,
    bumpScale: isLisbon ? 0.06 : 0.05,
    roughnessMap: groundPair.roughnessMap,
    roughness: isLisbon ? 0.85 : 0.72,
    metalness: 0.05,
  });
  const wallPrimaryPair = isLisbon ? textures.lisbonPlaster : textures.concrete;
  const wallPrimaryMat = new THREE.MeshStandardMaterial({
    map: wallPrimaryPair.map,
    bumpMap: wallPrimaryPair.bumpMap,
    bumpScale: 0.04,
    roughness: 0.88,
    metalness: 0.04,
  });
  const wallAccentPair = isLisbon ? textures.azulejo : textures.redBrick;
  const wallAccentMat = new THREE.MeshStandardMaterial({
    map: wallAccentPair.map,
    bumpMap: wallAccentPair.bumpMap,
    bumpScale: isLisbon ? 0.035 : 0.055,
    roughnessMap: wallAccentPair.roughnessMap,
    roughness: isLisbon ? 0.45 : 0.86,
    metalness: isLisbon ? 0.14 : 0.04,
  });
  const roofPair = isLisbon ? textures.terracotta : textures.metalContainer;
  const roofMat = new THREE.MeshStandardMaterial({
    map: roofPair.map,
    bumpMap: roofPair.bumpMap,
    bumpScale: 0.05,
    roughnessMap: roofPair.roughnessMap,
    roughness: 0.75,
    metalness: isLisbon ? 0.08 : 0.45,
  });
  const crateMat = new THREE.MeshStandardMaterial({
    map: textures.woodCrate.map,
    bumpMap: textures.woodCrate.bumpMap,
    bumpScale: 0.045,
    roughness: 0.82,
    metalness: 0.04,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    map: textures.metalContainer.map,
    bumpMap: textures.metalContainer.bumpMap,
    bumpScale: 0.05,
    roughnessMap: textures.metalContainer.roughnessMap,
    roughness: 0.55,
    metalness: 0.68,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: isLisbon ? 0xd6cfc2 : 0x575d66,
    roughness: 0.8,
    metalness: 0.08,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x1e242b,
    roughness: 0.4,
    metalness: 0.8,
  });

  // 1. Extended Ground Plane + Horizon Skirt (prevents void edges)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(180, 180), groundMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);
  raycastMeshes.push(floor);

  if (isLisbon) {
    // Tagus River expanse to the East (+X) beyond the Miradouro viewpoint
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x255c78,
      roughness: 0.18,
      metalness: 0.55,
    });
    const river = new THREE.Mesh(new THREE.PlaneGeometry(140, 220), riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(96, -2.5, 0);
    group.add(river);
  }

  // 2. Arena Perimeter Architecture (bounds: X [-27, 27], Z [-32, 32])
  // West Perimeter (-X) - Tall city buildings
  addSolidBox(-29, 5, 0, 4, 10, 72, wallPrimaryMat, true, 'West Block');
  addSolidBox(-28.6, 4.5, -14, 4.2, 9, 14, wallAccentMat, true);
  addSolidBox(-28.6, 4.5, 14, 4.2, 9, 14, wallAccentMat, true);
  // Terracotta / concrete pitched roofs along West
  addSolidBox(-29.5, 10.6, 0, 5.2, 1.4, 72, roofMat, false);

  // North Perimeter (-Z, behind Directorate spawn)
  addSolidBox(0, 5, -34, 62, 10, 4, wallAccentMat, true, 'North Wall');
  addSolidBox(-14, 4, -33.2, 12, 8, 3.6, wallPrimaryMat, true);
  addSolidBox(14, 4, -33.2, 12, 8, 3.6, wallPrimaryMat, true);

  // South Perimeter (+Z, behind Vanguard spawn)
  addSolidBox(0, 5, 34, 62, 10, 4, wallPrimaryMat, true, 'South Wall');
  addSolidBox(-14, 4, 33.2, 12, 8, 3.6, wallAccentMat, true);
  addSolidBox(14, 4, 33.2, 12, 8, 3.6, wallAccentMat, true);

  // East Perimeter (+X) - Low scenic balustrade for Lisbon Miradouro / fortified wall for Moscow
  if (isLisbon) {
    addSolidBox(27.5, 0.9, 0, 1.2, 1.8, 66, stoneMat, true, 'Miradouro Wall');
    // Distant hillside buildings beyond east wall (visual silhouette)
    for (let z = -30; z <= 30; z += 15) {
      addSolidBox(36, -1.5, z, 8, 7, 10, wallPrimaryMat, false);
      addSolidBox(36, 2.4, z, 8.6, 1.2, 10.6, roofMat, false);
    }
  } else {
    addSolidBox(29, 4.5, 0, 4, 9, 72, wallAccentMat, true, 'East Bastion');
    // Kremlin-style Crenelations + Onion Dome Towers outside perimeter
    for (let z = -28; z <= 28; z += 6) {
      addSolidBox(27.4, 9.6, z, 1.4, 1.2, 2.6, wallAccentMat, false);
    }
    const buildOnionTower = (tx: number, tz: number, domeColor: number) => {
      const tower = new THREE.Group();
      tower.position.set(tx, 0, tz);
      const base = new THREE.Mesh(new THREE.BoxGeometry(5, 13, 5), wallAccentMat);
      base.position.y = 6.5;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 4, 12), stoneMat);
      neck.position.y = 14.5;
      const domeMat = new THREE.MeshStandardMaterial({
        color: domeColor,
        metalness: 0.78,
        roughness: 0.22,
      });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.1, 14, 12), domeMat);
      dome.scale.set(1, 1.35, 1);
      dome.position.y = 18.2;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.45, 3.2, 8), domeMat);
      spire.position.y = 21.8;
      tower.add(base, neck, dome, spire);
      group.add(tower);
    };
    buildOnionTower(34, -22, 0xd4af37);
    buildOnionTower(-34, -34, 0x1d4ed8);
    buildOnionTower(34, 22, 0xb91c1c);
  }

  // 3. LANE DIVIDERS (Creates crisp 3-lane competitive flow: Left / Mid / Right)
  // Left-Mid Divider (X = -10.5) with North/South choke gates & mid connector
  addSolidBox(-10.5, 2.6, -13, 2.8, 5.2, 12, wallPrimaryMat, true, 'West Divider N');
  addSolidBox(-10.5, 2.6, 13, 2.8, 5.2, 12, wallPrimaryMat, true, 'West Divider S');
  // Overhead stone/concrete arch connecting West Divider across Mid-West gap
  addSolidBox(-10.5, 4.4, 0, 2.8, 1.4, 14, wallAccentMat, false);

  // Mid-Right Divider (X = +10.5)
  addSolidBox(10.5, 2.6, -13, 2.8, 5.2, 12, wallAccentMat, true, 'East Divider N');
  addSolidBox(10.5, 2.6, 13, 2.8, 5.2, 12, wallAccentMat, true, 'East Divider S');

  // 4. LEFT LANE ARCHITECTURE (Rua dos Azulejos / Metro Entrance)
  // Archway pillars & tactical cover crates
  addSolidBox(-19.5, 2.2, -16, 3.2, 4.4, 2.4, wallAccentMat, true);
  addSolidBox(-19.5, 2.2, 16, 3.2, 4.4, 2.4, wallAccentMat, true);
  addSolidBox(-18.5, 0.75, 0, 2.4, 1.5, 2.4, crateMat, true, 'Left Mid Crate');
  addSolidBox(-21.5, 1.15, -5.5, 2.2, 2.3, 2.2, crateMat, true);
  addSolidBox(-16.5, 0.75, 6.5, 2.0, 1.5, 2.8, metalMat, true);

  if (!isLisbon) {
    // Moscow Metro "M" Entrance Canopy on Left Lane
    const metroGroup = new THREE.Group();
    metroGroup.position.set(-22, 0, 0);
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 7), metalMat);
    canopy.position.y = 3.6;
    const signBg = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 1.3, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0x7f1d1d, emissiveIntensity: 0.4 })
    );
    signBg.position.set(2.3, 4.3, 0);
    metroGroup.add(canopy, signBg);
    group.add(metroGroup);
  }

  // 5. MID LANE HERO LANDMARK (Lisbon Vintage Tram vs Moscow Plaza Monument)
  if (isLisbon) {
    // Steel tram rails embedded slightly above cobbles (offset y=0.03 to prevent Z-fighting)
    for (const rx of [-1.05, 1.05]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 62), darkIronMat);
      rail.position.set(rx, 0.025, 0);
      group.add(rail);
    }

    // Multi-part Vintage Yellow Lisbon Tram Car parked angled at Mid (0, 0, 0)
    const tramGroup = new THREE.Group();
    tramGroup.position.set(0, 0, 0);
    const tramYellow = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.35,
      metalness: 0.2,
    });
    const tramCream = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.45,
      metalness: 0.1,
    });
    const tramGlass = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.15,
      metalness: 0.85,
    });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.55, 7.6), darkIronMat);
    chassis.position.y = 0.45;
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.55, 1.1, 7.5), tramYellow);
    lowerBody.position.y = 1.25;
    const upperBody = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.95, 7.2), tramCream);
    upperBody.position.y = 2.25;
    const windows = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.72, 6.4), tramGlass);
    windows.position.y = 2.25;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.3, 7.0), stoneMat);
    roof.position.y = 2.85;
    const pantograph = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.65, 1.2), darkIronMat);
    pantograph.position.y = 3.25;
    tramGroup.add(chassis, lowerBody, upperBody, windows, roof, pantograph);
    tramGroup.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        c.castShadow = castShadows;
        c.receiveShadow = true;
      }
    });
    group.add(tramGroup);
    raycastMeshes.push(lowerBody, upperBody, chassis);
    colliders.push({
      minX: -1.35,
      maxX: 1.35,
      minY: 0,
      maxY: 3.1,
      minZ: -3.85,
      maxZ: 3.85,
      label: 'Lisbon Tram',
    });
  } else {
    // Moscow Red-Square Stepped Granite Monument & Armored Supply Carrier
    addSolidBox(0, 0.45, 0, 4.4, 0.9, 4.4, stoneMat, true, 'Plaza Pedestal');
    addSolidBox(0, 1.4, 0, 2.2, 1.8, 2.2, wallAccentMat, true, 'Monument Obelisk');
    addSolidBox(0, 2.6, 0, 1.2, 0.9, 1.2, darkIronMat, true);
  }

  // Mid flank cover crates (symmetric for fair 3v3)
  addSolidBox(-4.8, 0.75, -9.5, 2.2, 1.5, 1.8, crateMat, true);
  addSolidBox(4.8, 0.75, 9.5, 2.2, 1.5, 1.8, crateMat, true);
  addSolidBox(5.2, 0.75, -9.0, 1.8, 1.5, 2.2, metalMat, true);
  addSolidBox(-5.2, 0.75, 9.0, 1.8, 1.5, 2.2, metalMat, true);

  // 6. RIGHT LANE VERTICALITY (Elevated Miradouro Terrace / Metro Overpass, y = 1.6m)
  // Elevated central platform X: [14, 24], Z: [-8, 8]
  addSolidBox(19, 0.8, 0, 10, 1.6, 16, stoneMat, true, 'Elevated Terrace');
  // North Ramp (Z: -15 -> -8, y: 0 -> 1.6)
  addRamp(19, -15, -8, 6.2, 0, 1.6, stoneMat);
  // South Ramp (Z: 15 -> 8, y: 0 -> 1.6)
  addRamp(19, 15, 8, 6.2, 0, 1.6, stoneMat);
  // Cover on the elevated terrace
  addSolidBox(17, 2.25, 0, 1.8, 1.3, 2.6, crateMat, true, 'Terrace Cover');
  addSolidBox(22, 2.15, -4, 1.6, 1.1, 1.6, metalMat, true);
  addSolidBox(22, 2.15, 4, 1.6, 1.1, 1.6, metalMat, true);

  // 7. SPAWN COVER (Prevents instant spawn-to-spawn sniping during freeze phase)
  // Vanguard Spawn (+Z = 25)
  addSolidBox(-5.5, 1.2, 19.5, 3.4, 2.4, 1.6, metalMat, true, 'Vanguard Cover L');
  addSolidBox(5.5, 1.2, 19.5, 3.4, 2.4, 1.6, crateMat, true, 'Vanguard Cover R');
  // Directorate Spawn (-Z = -25)
  addSolidBox(-5.5, 1.2, -19.5, 3.4, 2.4, 1.6, crateMat, true, 'Directorate Cover L');
  addSolidBox(5.5, 1.2, -19.5, 3.4, 2.4, 1.6, metalMat, true, 'Directorate Cover R');

  // Street lamps (atmospheric architectural accents)
  const lampPositions: Array<[number, number]> = [
    [-7, -18],
    [7, -18],
    [-7, 18],
    [7, 18],
    [-23, -10],
    [-23, 10],
  ];
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: isLisbon ? 0xf59e0b : 0xfde047,
    emissiveIntensity: 1.1,
  });
  for (const [lx, lz] of lampPositions) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.2, 8), darkIronMat);
    pole.position.set(lx, 2.1, lz);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), lampBulbMat);
    lantern.position.set(lx, 4.35, lz);
    group.add(pole, lantern);
  }

  // Spawn coordinates (3 per team)
  const spawns: Record<TeamId, THREE.Vector3[]> = {
    vanguard: [
      new THREE.Vector3(-4, 0, 26),
      new THREE.Vector3(0, 0, 27.5),
      new THREE.Vector3(4.5, 0, 26),
    ],
    directorate: [
      new THREE.Vector3(-4, 0, -26),
      new THREE.Vector3(0, 0, -27.5),
      new THREE.Vector3(4.5, 0, -26),
    ],
  };

  // Tactical AI Waypoint Graph covering all 3 lanes & elevated terrace
  const waypoints: WaypointNode[] = [
    { id: 'sv_c', x: 0, y: 0, z: 25, neighbors: ['mid_s', 'left_s', 'right_s'], lane: 'spawn_v' },
    { id: 'sd_c', x: 0, y: 0, z: -25, neighbors: ['mid_n', 'left_n', 'right_n'], lane: 'spawn_d' },

    // Left Lane
    { id: 'left_s', x: -19, y: 0, z: 20, neighbors: ['sv_c', 'left_ms', 'mid_s'], lane: 'left' },
    { id: 'left_ms', x: -18.5, y: 0, z: 9, neighbors: ['left_s', 'left_c', 'mid_ms'], lane: 'left', isCover: true },
    { id: 'left_c', x: -20.5, y: 0, z: 0, neighbors: ['left_ms', 'left_mn', 'mid_w'], lane: 'left', isCover: true },
    { id: 'left_mn', x: -18.5, y: 0, z: -9, neighbors: ['left_c', 'left_n', 'mid_mn'], lane: 'left', isCover: true },
    { id: 'left_n', x: -19, y: 0, z: -20, neighbors: ['sd_c', 'left_mn', 'mid_n'], lane: 'left' },

    // Mid Lane
    { id: 'mid_s', x: 0, y: 0, z: 17, neighbors: ['sv_c', 'mid_ms', 'left_s', 'right_s'], lane: 'mid' },
    { id: 'mid_ms', x: -4.2, y: 0, z: 7, neighbors: ['mid_s', 'mid_w', 'mid_e', 'left_ms'], lane: 'mid', isCover: true },
    { id: 'mid_w', x: -4.8, y: 0, z: 0, neighbors: ['mid_ms', 'mid_mn', 'left_c'], lane: 'mid', isCover: true },
    { id: 'mid_e', x: 4.8, y: 0, z: 0, neighbors: ['mid_ms', 'mid_mn', 'right_s', 'right_n'], lane: 'mid', isCover: true },
    { id: 'mid_mn', x: 4.2, y: 0, z: -7, neighbors: ['mid_n', 'mid_w', 'mid_e', 'left_mn'], lane: 'mid', isCover: true },
    { id: 'mid_n', x: 0, y: 0, z: -17, neighbors: ['sd_c', 'mid_mn', 'left_n', 'right_n'], lane: 'mid' },

    // Right Lane (Elevated Terrace)
    { id: 'right_s', x: 19, y: 0, z: 18, neighbors: ['sv_c', 'right_top_s', 'mid_e'], lane: 'right' },
    { id: 'right_top_s', x: 19, y: 1.6, z: 5, neighbors: ['right_s', 'right_top_n', 'mid_e'], lane: 'right', isCover: true },
    { id: 'right_top_n', x: 19, y: 1.6, z: -5, neighbors: ['right_n', 'right_top_s', 'mid_e'], lane: 'right', isCover: true },
    { id: 'right_n', x: 19, y: 0, z: -18, neighbors: ['sd_c', 'right_top_n', 'mid_e'], lane: 'right' },
  ];

  return {
    id: mapId,
    name: isLisbon ? 'ALFAMA MIRADOURO' : 'KITAY-GOROD PLAZA',
    subtitle: isLisbon
      ? 'Lisbon, Portugal — Golden Hour'
      : 'Moscow, Russia — Late Afternoon Frost',
    group,
    colliders,
    ramps,
    raycastMeshes,
    spawns,
    waypoints,
    bounds: { minX: -26.5, maxX: 26.5, minZ: -31.5, maxZ: 31.5 },
    skyColor,
    fogColor,
    fogNear: 28,
    fogFar: 92,
    menuCamPos: isLisbon ? new THREE.Vector3(21, 9.5, 22) : new THREE.Vector3(-21, 10, 22),
    menuCamTarget: new THREE.Vector3(0, 1.8, 0),
  };
}
