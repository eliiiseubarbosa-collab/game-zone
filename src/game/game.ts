import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  botPerformBuy,
  type CombatAgent,
  hasLineOfSight,
  updateBots,
} from './ai';
import { soundEngine } from './audio';
import {
  buildOperativeModel,
  CHARACTERS,
  getCharacterById,
  getTeamCharacters,
  type OperativeRig,
} from './characters';
import { buildMap, type BuiltMap } from './map';
import { createProceduralTextures, type ProceduralTextureSet } from './textures';
import type {
  Difficulty,
  GamePhase,
  GameSettings,
  HudState,
  KillFeedEntry,
  MapId,
  SkinVariant,
  TeamId,
  WeaponId,
  WeaponSkinId,
  WeaponSlot,
} from './types';
import { buildWeaponViewModel, WEAPONS } from './weapons';

// Pre-allocated scratch math objects (Zero GC in render loop)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

interface Tracer {
  line: THREE.Line;
  life: number;
  maxLife: number;
}

interface ImpactParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: ProceduralTextureSet;
  private isSoftwareGl: boolean;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private muzzlePointLight: THREE.PointLight;

  private currentMap: BuiltMap | null = null;
  private agents: CombatAgent[] = [];
  private bots: CombatAgent[] = [];
  private player!: CombatAgent;
  private agentMeshesGroup = new THREE.Group();
  private raycastHitboxes: THREE.Object3D[] = [];

  // First-person Viewmodel
  private viewModelAnchor = new THREE.Group();
  private viewModelGroup: THREE.Group | null = null;
  private viewMuzzleFlash: THREE.Mesh | null = null;
  private muzzleFlashTimer = 0;
  private knifeSwingTimer = 0;
  private bobTimer = 0;

  // Pooled FX & shared spark assets
  private tracers: Tracer[] = [];
  private particles: ImpactParticle[] = [];
  private fxGroup = new THREE.Group();
  private sparkGeo = new THREE.BoxGeometry(0.055, 0.055, 0.055);
  private sparkBloodMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  private sparkGoldMat = new THREE.MeshBasicMaterial({ color: 0xfcd34d });
  private buyMenuOpen = false;

  // Preview mode (for Character / Skins screen)
  private previewActive = false;
  private previewGroup = new THREE.Group();
  private previewRig: OperativeRig | null = null;
  private previewAngle = 0;

  // Match & Round state
  private phase: GamePhase = 'menu';
  private previousActivePhase: 'buy' | 'combat' = 'buy';
  private mapId: MapId = 'lisbon';
  private playerTeam: TeamId = 'vanguard';
  private difficulty: Difficulty = 'normal';
  private selectedCharId = 'v_faro';
  private selectedSkin: SkinVariant = 'urban';
  private selectedWeaponSkin: WeaponSkinId = 'carbon';

  private roundNumber = 1;
  private maxRounds = 3;
  private vanguardScore = 0;
  private directorateScore = 0;
  private lossStreak = { vanguard: 0, directorate: 0 };
  private timerSeconds = 15;
  private roundWinner: TeamId | 'draw' | null = null;
  private roundEndReason = '';
  private matchWinner: TeamId | null = null;
  private announcement = '';
  private announcementTimer = 0;

  // Player FPS state
  private keys: Record<string, boolean> = {};
  private mouseDown = false;
  private justShot = false;
  private scoped = false;
  private pointerLocked = false;
  private recoilPitch = 0;
  private recoilYaw = 0;
  private shotPatternIdx = 0;
  private lastShotTime = 0;
  private cameraShake = 0;
  private footstepAccum = 0;
  private hitmarker: 'none' | 'hit' | 'headshot' | 'kill' = 'none';
  private hitmarkerTimer = 0;
  private damageFlash = 0;
  private damageAngle = 0;

  private killfeed: KillFeedEntry[] = [];
  private killCounter = 0;

  private settings: GameSettings;
  private onHudUpdate: (state: HudState) => void;
  private hudEmitAccum = 0;

  private frameId = 0;
  private lastTime = performance.now();
  private menuOrbitTime = 0;
  private disposed = false;

  constructor(
    container: HTMLElement,
    initialSettings: GameSettings,
    onHudUpdate: (state: HudState) => void
  ) {
    this.container = container;
    this.settings = initialSettings;
    this.onHudUpdate = onHudUpdate;

    // Software WebGL probe
    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && initialSettings.graphics !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && initialSettings.graphics !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    // Studio Environment reflection map for weapon metals and visors
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(initialSettings.fov, w / h, 0.08, 260);
    this.scene.add(this.camera);
    this.camera.add(this.viewModelAnchor);

    // Lighting Rig (Key sun + Hemisphere sky/ground + Muzzle point light)
    this.hemiLight = new THREE.HemisphereLight(0xbcd4f5, 0x5c4738, 0.72);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.85);
    this.sunLight.position.set(28, 42, 22);
    this.sunLight.castShadow = !this.isSoftwareGl && initialSettings.graphics !== 'low';
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 110;
    const d = 40;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.muzzlePointLight = new THREE.PointLight(0xffb703, 0, 8, 2);
    this.camera.add(this.muzzlePointLight);
    this.muzzlePointLight.position.set(0.25, -0.1, -0.7);

    this.scene.add(this.agentMeshesGroup);
    this.scene.add(this.fxGroup);
    this.scene.add(this.previewGroup);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    this.loadMap('lisbon');
    this.initPlayerAgent();
    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    soundEngine.setConfig(initialSettings.volume, initialSettings.muted);
    this.emitHud(true);
    this.startLoop();
  }

  private initPlayerAgent(): void {
    const charDef = getCharacterById(this.selectedCharId);
    this.player = {
      id: 'player',
      name: 'YOU',
      codename: charDef.codename,
      team: this.playerTeam,
      isPlayer: true,
      characterId: this.selectedCharId,
      alive: true,
      hp: 100,
      armor: 0,
      hasHelmet: false,
      money: 1000,
      kills: 0,
      deaths: 0,
      assists: 0,
      position: new THREE.Vector3(0, 0, 26),
      velocity: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      crouching: false,
      grounded: true,
      equippedSlot: 2,
      weapons: {
        1: { id: null, mag: 0, reserve: 0 },
        2: { id: 'pistol', mag: WEAPONS.pistol.magSize, reserve: WEAPONS.pistol.reserveMax },
        3: { id: 'knife', mag: 0, reserve: 0 },
      },
      reloading: false,
      reloadTimer: 0,
      fireCooldown: 0,
      lastDamagerId: null,
      spottedTimer: 0,
      preferredLane: 'mid',
      targetWaypointId: null,
      reactionTimer: 0,
      spottedEnemyId: null,
      strafeDir: 1,
      strafeTimer: 0,
      walkCycle: 0,
      burstTimer: 0,
    };
  }

  public loadMap(mapId: MapId): void {
    this.mapId = mapId;
    if (this.currentMap) {
      this.scene.remove(this.currentMap.group);
    }
    const castShadows = !this.isSoftwareGl && this.settings.graphics !== 'low';
    this.currentMap = buildMap(mapId, this.textures, castShadows);
    this.scene.add(this.currentMap.group);

    this.scene.background = new THREE.Color(this.currentMap.skyColor);
    this.scene.fog = new THREE.Fog(
      this.currentMap.fogColor,
      this.currentMap.fogNear,
      this.currentMap.fogFar
    );

    if (mapId === 'lisbon') {
      this.sunLight.color.setHex(0xffdfba);
      this.sunLight.intensity = 1.95;
      this.sunLight.position.set(30, 38, 18);
      this.hemiLight.color.setHex(0xffe7c7);
      this.hemiLight.groundColor.setHex(0x6b5344);
    } else {
      this.sunLight.color.setHex(0xdce6f2);
      this.sunLight.intensity = 1.55;
      this.sunLight.position.set(-25, 42, -20);
      this.hemiLight.color.setHex(0xa8bbd1);
      this.hemiLight.groundColor.setHex(0x474e59);
    }
  }

  public applySettings(newSettings: GameSettings): void {
    this.settings = newSettings;
    soundEngine.setConfig(newSettings.volume, newSettings.muted);
    if (!this.scoped) {
      this.camera.fov = newSettings.fov;
      this.camera.updateProjectionMatrix();
    }
    const shadowEnabled = !this.isSoftwareGl && newSettings.graphics !== 'low';
    this.renderer.shadowMap.enabled = shadowEnabled;
    this.sunLight.castShadow = shadowEnabled;
    this.renderer.setPixelRatio(
      this.isSoftwareGl
        ? 1
        : newSettings.graphics === 'high'
          ? Math.min(window.devicePixelRatio, 2)
          : 1
    );
  }

  public setSelection(opts: {
    team?: TeamId;
    mapId?: MapId;
    difficulty?: Difficulty;
    characterId?: string;
    skin?: SkinVariant;
    weaponSkin?: WeaponSkinId;
  }): void {
    if (opts.team && opts.team !== this.playerTeam) {
      this.playerTeam = opts.team;
      const teamChars = getTeamCharacters(opts.team);
      if (!teamChars.some((c) => c.id === this.selectedCharId)) {
        this.selectedCharId = teamChars[0].id;
      }
    }
    if (opts.mapId && opts.mapId !== this.mapId) {
      this.loadMap(opts.mapId);
    }
    if (opts.difficulty) this.difficulty = opts.difficulty;
    if (opts.characterId) this.selectedCharId = opts.characterId;
    if (opts.skin) this.selectedSkin = opts.skin;
    if (opts.weaponSkin) this.selectedWeaponSkin = opts.weaponSkin;

    if (this.previewActive) {
      this.rebuildPreviewModel();
    }
    this.emitHud(true);
  }

  public setPreviewMode(active: boolean, weaponId: WeaponId = 'rifle'): void {
    this.previewActive = active;
    this.previewGroup.visible = active;
    if (active) {
      this.rebuildPreviewModel(weaponId);
    }
  }

  private rebuildPreviewModel(weaponId: WeaponId = 'rifle'): void {
    while (this.previewGroup.children.length > 0) {
      this.previewGroup.remove(this.previewGroup.children[0]);
    }
    const rig = buildOperativeModel(
      this.selectedCharId,
      this.selectedSkin,
      'preview',
      weaponId,
      this.selectedWeaponSkin
    );
    // Pedestal ring
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.25, 0.14, 24),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 })
    );
    base.position.set(0, 0.07, 0);
    rig.root.position.set(0, 0.14, 0);
    this.previewGroup.position.set(0, 0, 8);
    this.previewGroup.add(base, rig.root);
    this.previewRig = rig;
  }

  public startMatch(): void {
    this.previewActive = false;
    this.previewGroup.visible = false;
    this.roundNumber = 1;
    this.vanguardScore = 0;
    this.directorateScore = 0;
    this.lossStreak = { vanguard: 0, directorate: 0 };
    this.roundWinner = null;
    this.matchWinner = null;
    this.killfeed = [];

    this.setupRoster(true);
    this.startRound();
    soundEngine.startAmbient(this.mapId);
    this.requestPointerLock();
  }

  private setupRoster(resetEconomy: boolean): void {
    // Clear existing bot meshes
    while (this.agentMeshesGroup.children.length > 0) {
      this.agentMeshesGroup.remove(this.agentMeshesGroup.children[0]);
    }
    this.agents = [];
    this.bots = [];
    this.raycastHitboxes = [];

    const playerChar = getCharacterById(this.selectedCharId);
    if (resetEconomy) {
      this.initPlayerAgent();
    }
    this.player.team = this.playerTeam;
    this.player.characterId = playerChar.id;
    this.player.codename = playerChar.codename;
    this.agents.push(this.player);

    const enemyTeam: TeamId = this.playerTeam === 'vanguard' ? 'directorate' : 'vanguard';
    const alliedChars = getTeamCharacters(this.playerTeam).filter((c) => c.id !== playerChar.id);
    const enemyChars = getTeamCharacters(enemyTeam);

    const lanes: Array<'left' | 'mid' | 'right'> = ['left', 'mid', 'right'];

    const spawnBot = (
      id: string,
      team: TeamId,
      charDef: (typeof CHARACTERS)[number],
      lane: 'left' | 'mid' | 'right'
    ) => {
      const bot: CombatAgent = {
        id,
        name: charDef.codename,
        codename: charDef.codename,
        team,
        isPlayer: false,
        characterId: charDef.id,
        alive: true,
        hp: 100,
        armor: 0,
        hasHelmet: false,
        money: 1000,
        kills: 0,
        deaths: 0,
        assists: 0,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        yaw: 0,
        pitch: 0,
        crouching: false,
        grounded: true,
        equippedSlot: 2,
        weapons: {
          1: { id: null, mag: 0, reserve: 0 },
          2: { id: 'pistol', mag: WEAPONS.pistol.magSize, reserve: WEAPONS.pistol.reserveMax },
          3: { id: 'knife', mag: 0, reserve: 0 },
        },
        reloading: false,
        reloadTimer: 0,
        fireCooldown: 0,
        lastDamagerId: null,
        spottedTimer: 0,
        preferredLane: lane,
        targetWaypointId: null,
        reactionTimer: 0,
        spottedEnemyId: null,
        strafeDir: 1,
        strafeTimer: 0,
        walkCycle: Math.random() * 5,
        burstTimer: 0,
      };

      const rig = buildOperativeModel(
        charDef.id,
        team === this.playerTeam ? this.selectedSkin : 'urban',
        id,
        'rifle',
        'carbon'
      );
      bot.rig = rig;
      this.agentMeshesGroup.add(rig.root);
      this.raycastHitboxes.push(rig.headHitbox, rig.bodyHitbox);
      this.agents.push(bot);
      this.bots.push(bot);
    };

    alliedChars.slice(0, 2).forEach((c, idx) => {
      spawnBot(`ally_${idx}`, this.playerTeam, c, lanes[(idx + 1) % 3]);
    });
    enemyChars.slice(0, 3).forEach((c, idx) => {
      spawnBot(`enemy_${idx}`, enemyTeam, c, lanes[idx % 3]);
    });
  }

  private startRound(): void {
    if (!this.currentMap) return;
    this.phase = 'buy';
    this.previousActivePhase = 'buy';
    this.timerSeconds = 15;
    this.roundWinner = null;
    this.roundEndReason = '';
    this.scoped = false;
    this.camera.fov = this.settings.fov;
    this.camera.updateProjectionMatrix();
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.knifeSwingTimer = 0;
    this.muzzleFlashTimer = 0;
    this.muzzlePointLight.intensity = 0;
    if (this.viewMuzzleFlash) this.viewMuzzleFlash.visible = false;
    this.hitmarker = 'none';
    this.hitmarkerTimer = 0;
    this.damageFlash = 0;

    let vIdx = 0;
    let dIdx = 0;
    for (const agent of this.agents) {
      agent.alive = true;
      agent.hp = 100;
      agent.reloading = false;
      agent.reloadTimer = 0;
      agent.fireCooldown = 0;
      agent.lastDamagerId = null;
      agent.spottedTimer = 0;
      agent.targetWaypointId = null;
      agent.spottedEnemyId = null;
      agent.velocity.set(0, 0, 0);

      // Refill reserves on kept weapons
      for (const s of [1, 2] as WeaponSlot[]) {
        const slot = agent.weapons[s];
        if (slot.id) {
          const def = WEAPONS[slot.id];
          slot.mag = def.magSize;
          slot.reserve = def.reserveMax;
        }
      }

      const spawnList = this.currentMap.spawns[agent.team];
      const idx = agent.team === 'vanguard' ? vIdx++ : dIdx++;
      const pt = spawnList[idx % spawnList.length];
      agent.position.copy(pt);

      // Face center of map
      const lookYaw = agent.team === 'vanguard' ? 0 : Math.PI;
      if (agent.isPlayer) {
        agent.yaw = lookYaw;
        agent.pitch = 0;
      } else {
        agent.yaw = agent.team === 'vanguard' ? Math.PI : 0;
        if (agent.rig) {
          agent.rig.root.visible = true;
          agent.rig.root.position.copy(pt);
          agent.rig.root.rotation.y = agent.yaw;
        }
        botPerformBuy(agent);
      }
    }

    this.rebuildViewModel();
    this.showAnnouncement(`ROUND ${this.roundNumber} — BUY PHASE`, 2.5);
    soundEngine.playRoundCue('start');
    this.emitHud(true);
  }

  public skipFreezePhase(): void {
    if (this.phase === 'buy') {
      this.timerSeconds = 0.1;
    }
  }

  private beginCombatPhase(): void {
    this.phase = 'combat';
    this.previousActivePhase = 'combat';
    this.timerSeconds = 90;
    this.showAnnouncement('COMBAT LIVE — ELIMINATE ENEMY SQUAD', 2.4);
    soundEngine.playRoundCue('start');
    this.emitHud(true);
  }

  public buyWeapon(weaponId: WeaponId): boolean {
    if (this.phase !== 'buy') return false;
    const def = WEAPONS[weaponId];
    if (this.player.money < def.price) return false;

    this.player.money -= def.price;
    this.player.weapons[def.slot] = {
      id: weaponId,
      mag: def.magSize,
      reserve: def.reserveMax,
    };
    this.player.equippedSlot = def.slot;
    this.player.reloading = false;
    this.rebuildViewModel();
    soundEngine.playBuy();
    this.emitHud(true);
    return true;
  }

  public buyArmor(type: 'kevlar' | 'helmet'): boolean {
    if (this.phase !== 'buy') return false;
    if (type === 'kevlar') {
      if (this.player.armor >= 100 || this.player.money < 650) return false;
      this.player.money -= 650;
      this.player.armor = 100;
    } else {
      if (this.player.hasHelmet || this.player.money < 350) return false;
      this.player.money -= 350;
      this.player.hasHelmet = true;
      if (this.player.armor === 0) this.player.armor = 50;
    }
    soundEngine.playBuy();
    this.emitHud(true);
    return true;
  }

  public switchSlot(slot: WeaponSlot): void {
    if (!this.player.alive) return;
    if (!this.player.weapons[slot].id) return;
    if (this.player.equippedSlot === slot) return;

    this.player.equippedSlot = slot;
    this.player.reloading = false;
    this.player.reloadTimer = 0;
    this.scoped = false;
    this.camera.fov = this.settings.fov;
    this.camera.updateProjectionMatrix();
    this.rebuildViewModel();
    this.emitHud(true);
  }

  private rebuildViewModel(): void {
    if (this.viewModelGroup) {
      this.viewModelAnchor.remove(this.viewModelGroup);
      this.viewModelGroup = null;
      this.viewMuzzleFlash = null;
    }
    const weaponId = this.player.weapons[this.player.equippedSlot].id;
    if (!weaponId) return;

    const { group, muzzleFlash } = buildWeaponViewModel(weaponId, this.selectedWeaponSkin);
    group.position.set(0.24, -0.22, -0.42);
    this.viewModelAnchor.add(group);
    this.viewModelGroup = group;
    this.viewMuzzleFlash = muzzleFlash;
  }

  public setBuyMenuOpen(open: boolean): void {
    this.buyMenuOpen = open;
  }

  public pauseGame(): void {
    if (this.phase === 'buy' || this.phase === 'combat') {
      this.previousActivePhase = this.phase;
      this.phase = 'paused';
      this.scoped = false;
      this.camera.fov = this.settings.fov;
      this.camera.updateProjectionMatrix();
      this.exitPointerLock();
      this.emitHud(true);
    }
  }

  public resumeGame(): void {
    if (this.phase === 'paused') {
      this.phase = this.previousActivePhase;
      this.requestPointerLock();
      this.emitHud(true);
    }
  }

  public returnToMenu(): void {
    this.phase = 'menu';
    this.scoped = false;
    this.camera.fov = this.settings.fov;
    this.camera.updateProjectionMatrix();
    this.exitPointerLock();
    soundEngine.stopAmbient();
    while (this.agentMeshesGroup.children.length > 0) {
      this.agentMeshesGroup.remove(this.agentMeshesGroup.children[0]);
    }
    this.emitHud(true);
  }

  public quitSession(): void {
    this.returnToMenu();
    this.phase = 'quit';
    this.emitHud(true);
  }

  public requestPointerLock(): void {
    try {
      const el = this.renderer.domElement;
      if (document.pointerLockElement !== el) {
        el.requestPointerLock?.();
      }
    } catch {
      // ignore
    }
  }

  public exitPointerLock(): void {
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
    } catch {
      // ignore
    }
  }

  private showAnnouncement(text: string, duration: number): void {
    this.announcement = text;
    this.announcementTimer = duration;
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('wheel', this.onWheel, { passive: true });
    document.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  private onResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onBlur = (): void => {
    this.keys = {};
    this.mouseDown = false;
  };

  private onContextMenu = (e: MouseEvent): void => {
    if (this.phase === 'combat' || this.phase === 'buy') {
      e.preventDefault();
    }
  };

  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    if (!this.pointerLocked) {
      this.keys = {};
      this.mouseDown = false;
    }
    this.emitHud(true);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;
    const b = this.settings.bindings;

    if (e.code === 'Digit1') this.switchSlot(1);
    else if (e.code === 'Digit2') this.switchSlot(2);
    else if (e.code === 'Digit3') this.switchSlot(3);
    else if (e.code === b.reload) this.startPlayerReload();
    else if (e.code === 'KeyF' && this.phase === 'buy' && !this.buyMenuOpen) this.skipFreezePhase();
    else if (e.code === 'Escape') {
      if (this.buyMenuOpen) {
        return; // App.tsx closes buy menu cleanly on Escape
      }
      if (this.phase === 'buy' || this.phase === 'combat') {
        this.pauseGame();
      } else if (this.phase === 'paused') {
        this.resumeGame();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  private onWheel = (e: WheelEvent): void => {
    if (this.phase !== 'buy' && this.phase !== 'combat') return;
    const order: WeaponSlot[] = [1, 2, 3].filter((s) => Boolean(this.player.weapons[s as WeaponSlot].id)) as WeaponSlot[];
    if (order.length <= 1) return;
    const idx = order.indexOf(this.player.equippedSlot);
    const nextIdx = (idx + (e.deltaY > 0 ? 1 : -1) + order.length) % order.length;
    this.switchSlot(order[nextIdx]);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.pointerLocked) return;
    if (this.phase !== 'buy' && this.phase !== 'combat') return;
    if (!this.player.alive) return;

    const scopeMult = this.scoped ? 0.42 : 1.0;
    const sens = 0.0022 * this.settings.sensitivity * scopeMult;
    this.player.yaw -= e.movementX * sens;
    this.player.pitch -= e.movementY * sens;
    this.player.pitch = THREE.MathUtils.clamp(this.player.pitch, -1.48, 1.48);
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (this.phase !== 'buy' && this.phase !== 'combat') return;

    // Ignore clicks on UI buttons/overlays
    const target = e.target as HTMLElement | null;
    if (target && target.closest('[data-ui-interactive="true"]')) {
      return;
    }

    if (!this.pointerLocked) {
      this.requestPointerLock();
      return;
    }

    if (e.button === 0) {
      this.mouseDown = true;
      this.justShot = true;
    } else if (e.button === 2) {
      // Sniper Scope toggle
      const wId = this.player.weapons[this.player.equippedSlot].id;
      if (wId && WEAPONS[wId].hasScope && !this.player.reloading) {
        this.scoped = !this.scoped;
        this.camera.fov = this.scoped ? 22 : this.settings.fov;
        this.camera.updateProjectionMatrix();
        this.emitHud(true);
      }
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.mouseDown = false;
    }
  };

  private startPlayerReload(): void {
    if (this.phase !== 'buy' && this.phase !== 'combat') return;
    if (!this.player.alive || this.player.reloading) return;
    const slot = this.player.weapons[this.player.equippedSlot];
    if (!slot.id || slot.id === 'knife') return;
    const def = WEAPONS[slot.id];
    if (slot.mag >= def.magSize || slot.reserve <= 0) return;

    this.player.reloading = true;
    this.player.reloadTimer = def.reloadTime;
    this.scoped = false;
    this.camera.fov = this.settings.fov;
    this.camera.updateProjectionMatrix();
    soundEngine.playReload();
    this.emitHud(true);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } catch {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private update(dt: number): void {
    this.updateFX(dt);

    if (this.phase === 'menu' || this.phase === 'quit') {
      this.viewModelAnchor.visible = false;
      if (this.previewActive && this.previewRig) {
        this.previewAngle += dt * 0.55;
        this.previewRig.root.rotation.y = this.previewAngle;
        this.camera.position.set(0, 1.55, 11.4);
        this.camera.lookAt(0, 1.05, 8);
      } else if (this.currentMap) {
        this.menuOrbitTime += dt * 0.14;
        const radius = 24;
        const cx = Math.sin(this.menuOrbitTime) * radius;
        const cz = Math.cos(this.menuOrbitTime) * radius;
        this.camera.position.set(cx, 10.5 + Math.sin(this.menuOrbitTime * 1.3) * 1.5, cz);
        this.camera.lookAt(this.currentMap.menuCamTarget);
      }
      return;
    }

    if (this.phase === 'paused' || this.phase === 'match_end') {
      this.viewModelAnchor.visible = false;
      return;
    }

    // Active Match Phases: buy, combat, round_end
    this.viewModelAnchor.visible = this.player.alive && !this.scoped;

    if (this.announcementTimer > 0) {
      this.announcementTimer = Math.max(0, this.announcementTimer - dt);
      if (this.announcementTimer === 0) this.announcement = '';
    }
    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer = Math.max(0, this.hitmarkerTimer - dt);
      if (this.hitmarkerTimer === 0) this.hitmarker = 'none';
    }
    if (this.damageFlash > 0) {
      this.damageFlash = Math.max(0, this.damageFlash - dt * 2.2);
    }

    // Timer progression
    this.timerSeconds = Math.max(0, this.timerSeconds - dt);
    if (this.phase === 'buy' && this.timerSeconds <= 0) {
      this.beginCombatPhase();
    } else if (this.phase === 'combat' && this.timerSeconds <= 0) {
      this.finishRoundByTimeout();
    } else if (this.phase === 'round_end' && this.timerSeconds <= 0) {
      this.advanceAfterRoundEnd();
    }

    // Decay spotted timers
    for (const a of this.agents) {
      if (a.spottedTimer > 0) a.spottedTimer = Math.max(0, a.spottedTimer - dt);
    }

    // Player update
    if (this.player.alive) {
      this.updatePlayer(dt);
    } else {
      // Spectate an alive teammate if dead
      const ally = this.agents.find((a) => a.team === this.playerTeam && a.alive);
      if (ally) {
        this.camera.position.set(
          ally.position.x - Math.sin(ally.yaw) * 3.2,
          ally.position.y + 2.4,
          ally.position.z - Math.cos(ally.yaw) * 3.2
        );
        this.camera.lookAt(ally.position.x, ally.position.y + 1.4, ally.position.z);
      }
    }

    // Bots update
    if (this.currentMap) {
      updateBots(
        dt,
        this.bots,
        this.agents,
        this.currentMap,
        this.difficulty,
        this.phase === 'combat',
        this.resolveEntityCollision,
        (req) => this.handleWeaponShot(req.shooter, req.weaponId, req.origin, req.direction)
      );

      // Update enemy spotted timers for player's minimap
      for (const a of this.agents) {
        if (a.alive && a.team !== this.playerTeam) {
          for (const friend of this.agents) {
            if (friend.alive && friend.team === this.playerTeam) {
              if (
                friend.position.distanceTo(a.position) < 42 &&
                hasLineOfSight(friend.position, a.position, this.currentMap)
              ) {
                a.spottedTimer = 1.6;
                break;
              }
            }
          }
        }
      }
    }

    // Check elimination win condition during combat
    if (this.phase === 'combat') {
      const vAlive = this.agents.filter((a) => a.team === 'vanguard' && a.alive).length;
      const dAlive = this.agents.filter((a) => a.team === 'directorate' && a.alive).length;
      if (vAlive === 0 && dAlive === 0) {
        this.finishRound('draw', 'Mutual Elimination');
      } else if (vAlive === 0) {
        this.finishRound('directorate', 'Vanguard Eliminated');
      } else if (dAlive === 0) {
        this.finishRound('vanguard', 'Directorate Eliminated');
      }
    }

    // Throttled HUD updates (~20Hz)
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.05) {
      this.hudEmitAccum = 0;
      this.emitHud(false);
    }
  }

  private updatePlayer(dt: number): void {
    const b = this.settings.bindings;
    const p = this.player;

    if (p.fireCooldown > 0) p.fireCooldown = Math.max(0, p.fireCooldown - dt);

    // Reload timer
    if (p.reloading) {
      p.reloadTimer -= dt;
      if (p.reloadTimer <= 0) {
        p.reloading = false;
        const slot = p.weapons[p.equippedSlot];
        if (slot.id) {
          const def = WEAPONS[slot.id];
          const needed = def.magSize - slot.mag;
          const transfer = Math.min(needed, slot.reserve);
          slot.mag += transfer;
          slot.reserve -= transfer;
        }
      }
    }

    p.crouching = Boolean(this.keys[b.crouch] || this.keys['KeyC']);
    const walking = Boolean(this.keys[b.walk]);

    // Movement vector (locked during buy phase, but look & weapon swap allowed)
    let moveForward = 0;
    let moveRight = 0;
    if (this.phase === 'combat') {
      if (this.keys[b.forward]) moveForward += 1;
      if (this.keys[b.backward]) moveForward -= 1;
      if (this.keys[b.right]) moveRight += 1;
      if (this.keys[b.left]) moveRight -= 1;
    }

    const wId = p.weapons[p.equippedSlot].id || 'knife';
    const wDef = WEAPONS[wId];
    const baseSpeed = 6.3 * wDef.moveSpeedMult * (p.crouching ? 0.56 : walking ? 0.62 : 1.0) * (this.scoped ? 0.55 : 1.0);

    _forward.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    _right.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw));

    _vecA.set(0, 0, 0);
    _vecA.addScaledVector(_forward, moveForward);
    _vecA.addScaledVector(_right, moveRight);
    if (_vecA.lengthSq() > 0) _vecA.normalize();

    p.velocity.x = _vecA.x * baseSpeed;
    p.velocity.z = _vecA.z * baseSpeed;

    // Jump & Gravity
    if (this.phase === 'combat' && this.keys[b.jump] && p.grounded && !p.crouching) {
      p.velocity.y = 6.2;
      p.grounded = false;
    }
    p.velocity.y -= 18.5 * dt;

    this.resolveEntityCollision(p.position, p.velocity, dt, 0.42);
    if (p.position.y <= this.getGroundHeight(p.position.x, p.position.z, p.position.y) + 0.03) {
      p.grounded = true;
    }

    // Footstep sound & viewmodel bob
    const horizSpeed = Math.hypot(p.velocity.x, p.velocity.z);
    if (p.grounded && horizSpeed > 0.8) {
      this.bobTimer += dt * horizSpeed * 1.9;
      if (!walking) {
        this.footstepAccum += dt * horizSpeed;
        if (this.footstepAccum > 2.4) {
          this.footstepAccum = 0;
          soundEngine.playFootstep(p.crouching);
        }
      }
    } else {
      this.bobTimer = 0;
    }

    // Shooting
    if (this.phase === 'combat' && !p.reloading && p.fireCooldown <= 0) {
      const wantsFire = wDef.automatic ? this.mouseDown : this.justShot;
      if (wantsFire) {
        this.firePlayerWeapon();
      }
    }
    this.justShot = false;

    // Recoil & camera shake decay
    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 10, dt);
    this.recoilYaw = THREE.MathUtils.damp(this.recoilYaw, 0, 10, dt);
    this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 14, dt);
    if (performance.now() - this.lastShotTime > 380) {
      this.shotPatternIdx = 0;
    }

    // Eye height + crouch damping
    const targetEye = p.crouching ? 1.05 : 1.56;
    const bobOffset = p.grounded && horizSpeed > 0.6 ? Math.sin(this.bobTimer) * 0.032 : 0;
    this.camera.position.set(p.position.x, p.position.y + targetEye + bobOffset, p.position.z);

    const shakeX = (Math.random() - 0.5) * this.cameraShake;
    const shakeY = (Math.random() - 0.5) * this.cameraShake;
    _euler.set(
      THREE.MathUtils.clamp(p.pitch + this.recoilPitch + shakeX, -1.5, 1.5),
      p.yaw + this.recoilYaw + shakeY,
      0,
      'YXZ'
    );
    this.camera.quaternion.setFromEuler(_euler);

    // Animate viewmodel
    if (this.viewModelGroup) {
      const swayX = Math.cos(this.bobTimer * 0.5) * 0.012 * (horizSpeed > 0.6 ? 1 : 0);
      const swayY = Math.abs(Math.sin(this.bobTimer)) * 0.012 * (horizSpeed > 0.6 ? 1 : 0);
      const reloadDip = p.reloading ? -0.16 * Math.sin((p.reloadTimer / wDef.reloadTime) * Math.PI) : 0;
      const kickZ = Math.min(0.12, this.recoilPitch * 1.4);
      this.viewModelGroup.position.set(0.24 + swayX, -0.22 - swayY + reloadDip, -0.42 + kickZ);

      if (this.knifeSwingTimer > 0) {
        this.knifeSwingTimer = Math.max(0, this.knifeSwingTimer - dt * 5);
        this.viewModelGroup.rotation.set(-0.2 - Math.sin(this.knifeSwingTimer * Math.PI) * 0.9, 0.25, -0.35);
      } else {
        this.viewModelGroup.rotation.set(
          wId === 'knife' ? -0.2 : this.recoilPitch * 0.85,
          wId === 'knife' ? 0.25 : 0,
          wId === 'knife' ? -0.35 : 0
        );
      }
    }
  }

  private firePlayerWeapon(): void {
    const p = this.player;
    const slot = p.weapons[p.equippedSlot];
    if (!slot.id) return;
    const wDef = WEAPONS[slot.id];

    if (slot.id !== 'knife' && slot.mag <= 0) {
      soundEngine.playDryFire();
      p.fireCooldown = 0.2;
      if (slot.reserve > 0) this.startPlayerReload();
      return;
    }

    if (slot.id !== 'knife') {
      slot.mag -= 1;
    } else {
      this.knifeSwingTimer = 1;
    }
    p.fireCooldown = 1 / wDef.fireRate;
    this.lastShotTime = performance.now();

    // Calculate spread & apply recoil pattern
    const horizSpeed = Math.hypot(p.velocity.x, p.velocity.z);
    let spread = wDef.baseSpread + (horizSpeed / 6.3) * wDef.moveSpread;
    if (p.crouching) spread *= wDef.crouchSpreadMult;
    if (wDef.hasScope && !this.scoped) spread += 0.045;
    spread += this.recoilPitch * 0.25;

    const pattern = wDef.recoilPattern[this.shotPatternIdx % wDef.recoilPattern.length];
    this.shotPatternIdx++;
    this.recoilPitch += pattern[1];
    this.recoilYaw += pattern[0];
    this.cameraShake = Math.min(0.03, wDef.recoilPitch * 0.5);

    // Muzzle flash
    if (slot.id !== 'knife') {
      this.muzzleFlashTimer = 0.055;
      this.muzzlePointLight.intensity = 4.5;
      if (this.viewMuzzleFlash) {
        this.viewMuzzleFlash.visible = true;
        this.viewMuzzleFlash.rotation.z = Math.random() * Math.PI;
      }
    }

    // Cast shot(s) from camera center
    _vecB.copy(this.camera.position);
    for (let i = 0; i < wDef.pellets; i++) {
      _vecC.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
      _vecC.x += (Math.random() - 0.5) * spread * 2;
      _vecC.y += (Math.random() - 0.5) * spread * 2;
      _vecC.z += (Math.random() - 0.5) * spread * 2;
      _vecC.normalize();

      this.handleWeaponShot(p, slot.id, _vecB, _vecC, i === 0);
    }

    // Unscope sniper briefly after firing bolt-action
    if (wDef.id === 'sniper' && this.scoped) {
      this.scoped = false;
      this.camera.fov = this.settings.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  private handleWeaponShot(
    shooter: CombatAgent,
    weaponId: WeaponId,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    playSound = true
  ): void {
    if (!this.currentMap) return;
    const wDef = WEAPONS[weaponId];

    if (playSound) {
      const dist = shooter.isPlayer ? 0 : shooter.position.distanceTo(this.player.position);
      const atten = shooter.isPlayer ? 1 : Math.max(0.05, 1 - dist / 60);
      soundEngine.playGunshot(weaponId, atten);
    }

    // Raycast against world geometry
    _raycaster.set(origin, direction);
    _raycaster.far = weaponId === 'knife' ? wDef.rangeFull : 120;
    const wallHits = _raycaster.intersectObjects(this.currentMap.raycastMeshes, false);
    const wallDist = wallHits.length > 0 ? wallHits[0].distance : _raycaster.far;

    // Check hits against opposing agents
    let hitAgent: CombatAgent | null = null;
    let hitZone: 'head' | 'body' = 'body';
    let hitDist = wallDist;
    let hitPoint: THREE.Vector3 | null = wallHits.length > 0 ? wallHits[0].point.clone() : null;

    // 1. Check bot hitboxes (all bots have meshes)
    const botHits = _raycaster.intersectObjects(this.raycastHitboxes, false);
    for (const h of botHits) {
      if (h.distance >= hitDist) break;
      const agentId = h.object.userData.agentId as string;
      const target = this.agents.find((a) => a.id === agentId);
      if (target && target.alive && target.team !== shooter.team) {
        hitAgent = target;
        hitZone = h.object.userData.hitZone === 'head' ? 'head' : 'body';
        hitDist = h.distance;
        hitPoint = h.point.clone();
        break;
      }
    }

    // 2. If shooter is a bot, check ray-cylinder intersection against player!
    if (!shooter.isPlayer && this.player.alive && this.player.team !== shooter.team) {
      const playerHit = this.rayIntersectPlayer(origin, direction, hitDist);
      if (playerHit && playerHit.dist < hitDist) {
        hitAgent = this.player;
        hitZone = playerHit.zone;
        hitDist = playerHit.dist;
        hitPoint = origin.clone().addScaledVector(direction, hitDist);
      }
    }

    // Tracer visual (skip knife)
    if (weaponId !== 'knife') {
      const endPoint = hitPoint || origin.clone().addScaledVector(direction, Math.min(wallDist, 65));
      const tracerOrigin = shooter.isPlayer
        ? origin.clone().add(new THREE.Vector3(0, -0.08, 0)).addScaledVector(direction, 0.7)
        : origin.clone().addScaledVector(direction, 0.5);
      this.spawnTracer(tracerOrigin, endPoint, shooter.team);
    }

    if (hitAgent && hitPoint) {
      this.applyDamage(shooter, hitAgent, wDef, hitZone, hitDist, origin);
      this.spawnImpactSparks(hitPoint, 0xef4444, 5);
    } else if (wallHits.length > 0 && weaponId !== 'knife') {
      this.spawnImpactSparks(wallHits[0].point, 0xfcd34d, 4);
    }
  }

  private rayIntersectPlayer(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxDist: number
  ): { dist: number; zone: 'head' | 'body' } | null {
    const p = this.player.position;
    const eyeY = this.player.crouching ? 1.1 : 1.56;
    // Ray vs Head sphere
    const headCenter = _vecA.set(p.x, p.y + eyeY, p.z);
    const oc = _vecB.subVectors(origin, headCenter);
    const b = oc.dot(dir);
    const c = oc.dot(oc) - 0.22 * 0.22;
    const disc = b * b - c;
    if (disc >= 0) {
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < maxDist) return { dist: t, zone: 'head' };
    }

    // Ray vs Body capsule approximation (2 spheres along torso)
    for (const yOff of [0.55, 1.05]) {
      const center = _vecA.set(p.x, p.y + yOff, p.z);
      const ocB = _vecB.subVectors(origin, center);
      const bB = ocB.dot(dir);
      const cB = ocB.dot(ocB) - 0.36 * 0.36;
      const discB = bB * bB - cB;
      if (discB >= 0) {
        const t = -bB - Math.sqrt(discB);
        if (t > 0 && t < maxDist) return { dist: t, zone: 'body' };
      }
    }
    return null;
  }

  private applyDamage(
    attacker: CombatAgent,
    victim: CombatAgent,
    wDef: (typeof WEAPONS)[WeaponId],
    zone: 'head' | 'body',
    distance: number,
    attackOrigin: THREE.Vector3
  ): void {
    // Distance falloff
    let falloff = 1.0;
    if (distance > wDef.rangeFull) {
      const span = Math.max(1, wDef.rangeZero - wDef.rangeFull);
      falloff = Math.max(0.35, 1 - ((distance - wDef.rangeFull) / span) * 0.65);
    }

    let dmg = wDef.damage * falloff;
    if (zone === 'head') {
      dmg *= wDef.headshotMult;
      if (victim.hasHelmet) dmg *= 0.65;
    }

    // Knife backstab check (player faces -Z at yaw=0, bots face +Z at yaw=0)
    if (wDef.id === 'knife' && wDef.backstabMult) {
      const sign = victim.isPlayer ? -1 : 1;
      const vForwardX = sign * Math.sin(victim.yaw);
      const vForwardZ = sign * Math.cos(victim.yaw);
      const toAttackerX = attacker.position.x - victim.position.x;
      const toAttackerZ = attacker.position.z - victim.position.z;
      const dot = vForwardX * toAttackerX + vForwardZ * toAttackerZ;
      if (dot < 0) {
        dmg *= wDef.backstabMult;
      }
    }

    // Armor absorption
    if (victim.armor > 0 && wDef.id !== 'knife') {
      const absorbed = Math.min(victim.armor, dmg * 0.35);
      victim.armor = Math.max(0, Math.round(victim.armor - absorbed));
      dmg -= absorbed;
    }

    const finalDmg = Math.max(1, Math.round(dmg));
    victim.hp = Math.max(0, victim.hp - finalDmg);
    if (victim.lastDamagerId && victim.lastDamagerId !== attacker.id) {
      // keep previous damager for assist tracking
    } else {
      victim.lastDamagerId = attacker.id;
    }

    if (victim.isPlayer) {
      this.damageFlash = 1.0;
      const dx = attackOrigin.x - victim.position.x;
      const dz = attackOrigin.z - victim.position.z;
      this.damageAngle = Math.atan2(dx, dz) - victim.yaw;
      this.cameraShake = Math.max(this.cameraShake, 0.028);
    }

    const killed = victim.hp <= 0;
    if (attacker.isPlayer) {
      this.hitmarker = killed ? 'kill' : zone === 'head' ? 'headshot' : 'hit';
      this.hitmarkerTimer = 0.22;
      soundEngine.playHitmarker(zone === 'head' || killed);
    }

    if (killed) {
      victim.alive = false;
      victim.deaths += 1;
      attacker.kills += 1;
      attacker.money += wDef.killReward;
      if (victim.lastDamagerId && victim.lastDamagerId !== attacker.id) {
        const assister = this.agents.find((a) => a.id === victim.lastDamagerId);
        if (assister && assister.team === attacker.team) {
          assister.assists += 1;
        }
      }
      if (victim.rig) {
        victim.rig.root.visible = false;
      }
      this.killfeed.unshift({
        id: ++this.killCounter,
        killerName: attacker.isPlayer ? 'YOU' : attacker.codename,
        killerTeam: attacker.team,
        victimName: victim.isPlayer ? 'YOU' : victim.codename,
        victimTeam: victim.team,
        weaponName: wDef.shortName,
        headshot: zone === 'head',
        timestamp: performance.now(),
      });
      if (this.killfeed.length > 5) this.killfeed.pop();
      this.emitHud(true);
    }
  }

  private finishRoundByTimeout(): void {
    const vAlive = this.agents.filter((a) => a.team === 'vanguard' && a.alive).length;
    const dAlive = this.agents.filter((a) => a.team === 'directorate' && a.alive).length;
    if (vAlive > dAlive) {
      this.finishRound('vanguard', 'Time Expired — Squad Advantage');
    } else if (dAlive > vAlive) {
      this.finishRound('directorate', 'Time Expired — Squad Advantage');
    } else {
      const vHp = this.agents.filter((a) => a.team === 'vanguard').reduce((s, a) => s + a.hp, 0);
      const dHp = this.agents.filter((a) => a.team === 'directorate').reduce((s, a) => s + a.hp, 0);
      if (vHp > dHp) this.finishRound('vanguard', 'Time Expired — Health Advantage');
      else if (dHp > vHp) this.finishRound('directorate', 'Time Expired — Health Advantage');
      else this.finishRound('draw', 'Time Expired — Even Draw');
    }
  }

  private finishRound(winner: TeamId | 'draw', reason: string): void {
    this.phase = 'round_end';
    this.roundWinner = winner;
    this.roundEndReason = reason;
    this.timerSeconds = 4.2;

    if (winner === 'vanguard') {
      this.vanguardScore += 1;
      this.lossStreak.vanguard = 0;
      this.lossStreak.directorate += 1;
    } else if (winner === 'directorate') {
      this.directorateScore += 1;
      this.lossStreak.directorate = 0;
      this.lossStreak.vanguard += 1;
    }

    // Economy payout
    for (const a of this.agents) {
      if (winner === 'draw') {
        a.money += 2000;
      } else if (a.team === winner) {
        a.money += 3250;
      } else {
        const streak = Math.min(2, this.lossStreak[a.team]);
        a.money += 1900 + streak * 500;
      }
      a.money = Math.min(16000, a.money);
    }

    if (winner === this.playerTeam) {
      soundEngine.playRoundCue('win');
    } else if (winner !== 'draw') {
      soundEngine.playRoundCue('lose');
    }

    this.emitHud(true);
  }

  private advanceAfterRoundEnd(): void {
    // Best of 3: first to 2 wins
    if (this.vanguardScore >= 2 || this.directorateScore >= 2 || this.roundNumber >= this.maxRounds) {
      if (this.vanguardScore > this.directorateScore) this.matchWinner = 'vanguard';
      else if (this.directorateScore > this.vanguardScore) this.matchWinner = 'directorate';
      else this.matchWinner = this.playerTeam; // tiebreak fallback

      this.phase = 'match_end';
      this.exitPointerLock();
      this.emitHud(true);
      return;
    }

    this.roundNumber += 1;
    this.startRound();
  }

  private getGroundHeight(x: number, z: number, currentY = 0): number {
    if (!this.currentMap) return 0;
    let groundY = 0;
    // Check ramps
    for (const r of this.currentMap.ramps) {
      if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) {
        const t = THREE.MathUtils.clamp((z - r.minZ) / Math.max(0.01, r.maxZ - r.minZ), 0, 1);
        groundY = Math.max(groundY, THREE.MathUtils.lerp(r.yStart, r.yEnd, t));
      }
    }
    // Check standing atop elevated terrace, crates, or pedestals reachable from current height
    for (const box of this.currentMap.colliders) {
      if (
        x >= box.minX - 0.3 &&
        x <= box.maxX + 0.3 &&
        z >= box.minZ - 0.3 &&
        z <= box.maxZ + 0.3
      ) {
        if (box.maxY <= currentY + 0.45 && box.maxY > groundY) {
          groundY = box.maxY;
        }
      }
    }
    return groundY;
  }

  private resolveEntityCollision = (
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    dt: number,
    radius: number
  ): void => {
    if (!this.currentMap) return;

    // X axis step + resolve (allow 0.42m step-up for smooth ramp-to-terrace transition)
    pos.x += vel.x * dt;
    for (const box of this.currentMap.colliders) {
      if (pos.y + 1.65 <= box.minY || pos.y >= box.maxY - 0.42) continue;
      if (
        pos.x + radius > box.minX &&
        pos.x - radius < box.maxX &&
        pos.z + radius > box.minZ &&
        pos.z - radius < box.maxZ
      ) {
        const pushLeft = pos.x + radius - box.minX;
        const pushRight = box.maxX - (pos.x - radius);
        if (pushLeft < pushRight) pos.x = box.minX - radius;
        else pos.x = box.maxX + radius;
      }
    }

    // Z axis step + resolve
    pos.z += vel.z * dt;
    for (const box of this.currentMap.colliders) {
      if (pos.y + 1.65 <= box.minY || pos.y >= box.maxY - 0.42) continue;
      if (
        pos.x + radius > box.minX &&
        pos.x - radius < box.maxX &&
        pos.z + radius > box.minZ &&
        pos.z - radius < box.maxZ
      ) {
        const pushFront = pos.z + radius - box.minZ;
        const pushBack = box.maxZ - (pos.z - radius);
        if (pushFront < pushBack) pos.z = box.minZ - radius;
        else pos.z = box.maxZ + radius;
      }
    }

    // Clamp inside arena bounds
    const b = this.currentMap.bounds;
    pos.x = THREE.MathUtils.clamp(pos.x, b.minX, b.maxX);
    pos.z = THREE.MathUtils.clamp(pos.z, b.minZ, b.maxZ);

    // Y axis / ground
    pos.y += vel.y * dt;
    const groundY = this.getGroundHeight(pos.x, pos.z, pos.y);
    if (pos.y < groundY) {
      pos.y = groundY;
      vel.y = 0;
    }
  };

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, team: TeamId): void {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({
      color: team === 'vanguard' ? 0x93c5fd : 0xfca5a5,
      transparent: true,
      opacity: 0.75,
    });
    const line = new THREE.Line(geo, mat);
    this.fxGroup.add(line);
    this.tracers.push({ line, life: 0.08, maxLife: 0.08 });
  }

  private spawnImpactSparks(point: THREE.Vector3, colorHex: number, count: number): void {
    const mat = colorHex === 0xef4444 ? this.sparkBloodMat : this.sparkGoldMat;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(this.sparkGeo, mat);
      mesh.position.copy(point);
      this.fxGroup.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 4.5,
          Math.random() * 3.5 + 0.5,
          (Math.random() - 0.5) * 4.5
        ),
        life: 0.28,
        maxLife: 0.28,
      });
    }
  }

  private updateFX(dt: number): void {
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzlePointLight.intensity = 0;
        if (this.viewMuzzleFlash) this.viewMuzzleFlash.visible = false;
      }
    }

    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.fxGroup.remove(t.line);
        t.line.geometry.dispose();
        (t.line.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      } else {
        (t.line.material as THREE.LineBasicMaterial).opacity = t.life / t.maxLife;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        this.fxGroup.remove(pt.mesh);
        this.particles.splice(i, 1);
      } else {
        pt.vel.y -= 12 * dt;
        pt.mesh.position.addScaledVector(pt.vel, dt);
        pt.mesh.scale.setScalar(pt.life / pt.maxLife);
      }
    }
  }

  private emitHud(force: boolean): void {
    void force;
    const p = this.player;
    const wId = p.weapons[p.equippedSlot].id;
    const wDef = wId ? WEAPONS[wId] : WEAPONS.knife;
    const horizSpeed = Math.hypot(p.velocity.x, p.velocity.z);
    const spreadVis =
      (wDef.baseSpread + (horizSpeed / 6.3) * wDef.moveSpread + this.recoilPitch * 0.4) *
      (p.crouching ? wDef.crouchSpreadMult : 1);

    const bounds = this.currentMap?.bounds || { minX: -28, maxX: 28, minZ: -32, maxZ: 32 };

    const state: HudState = {
      phase: this.phase,
      previousActivePhase: this.previousActivePhase,
      pointerLocked: this.pointerLocked,
      mapId: this.mapId,
      playerTeam: this.playerTeam,
      difficulty: this.difficulty,
      roundNumber: this.roundNumber,
      maxRounds: this.maxRounds,
      vanguardScore: this.vanguardScore,
      directorateScore: this.directorateScore,
      timerSeconds: Math.ceil(this.timerSeconds),
      hp: p.hp,
      armor: p.armor,
      hasHelmet: p.hasHelmet,
      money: p.money,
      equippedSlot: p.equippedSlot,
      weapons: {
        1: { ...p.weapons[1] },
        2: { ...p.weapons[2] },
        3: { ...p.weapons[3] },
      },
      reloading: p.reloading,
      reloadProgress:
        p.reloading && wDef.reloadTime > 0
          ? 1 - Math.max(0, p.reloadTimer / wDef.reloadTime)
          : 0,
      scoped: this.scoped,
      crosshairSpread: spreadVis,
      hitmarker: this.hitmarker,
      damageFlash: this.damageFlash,
      damageAngle: this.damageAngle,
      killfeed: [...this.killfeed],
      scoreboard: this.agents.map((a) => ({
        id: a.id,
        name: a.isPlayer ? 'YOU' : a.codename,
        codename: a.codename,
        team: a.team,
        isPlayer: a.isPlayer,
        alive: a.alive,
        hp: a.hp,
        armor: a.armor,
        kills: a.kills,
        deaths: a.deaths,
        assists: a.assists,
        money: a.money,
        weaponName: a.weapons[a.equippedSlot].id
          ? WEAPONS[a.weapons[a.equippedSlot].id!].shortName
          : 'KNIFE',
        characterId: a.characterId,
      })),
      minimapBlips: this.agents.map((a) => ({
        id: a.id,
        x: a.position.x,
        z: a.position.z,
        yaw: a.yaw,
        team: a.team,
        isPlayer: a.isPlayer,
        alive: a.alive,
        spotted: a.team === this.playerTeam || a.spottedTimer > 0,
      })),
      minimapBounds: bounds,
      roundWinner: this.roundWinner,
      roundEndReason: this.roundEndReason,
      matchWinner: this.matchWinner,
      aliveCounts: {
        vanguard: this.agents.filter((a) => a.team === 'vanguard' && a.alive).length,
        directorate: this.agents.filter((a) => a.team === 'directorate' && a.alive).length,
      },
      announcement: this.announcement,
    };

    this.onHudUpdate(state);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);

    soundEngine.stopAmbient();
    this.sparkGeo.dispose();
    this.sparkBloodMat.dispose();
    this.sparkGoldMat.dispose();
    this.textures.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
