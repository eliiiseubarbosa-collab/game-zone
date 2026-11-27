import * as THREE from 'three';

export interface MaterialTexturePair {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap?: THREE.CanvasTexture;
}

export interface ProceduralTextureSet {
  azulejo: MaterialTexturePair;
  cobblestone: MaterialTexturePair;
  lisbonPlaster: MaterialTexturePair;
  terracotta: MaterialTexturePair;
  concrete: MaterialTexturePair;
  redBrick: MaterialTexturePair;
  snowCobble: MaterialTexturePair;
  woodCrate: MaterialTexturePair;
  metalContainer: MaterialTexturePair;
  dispose: () => void;
}

// Deterministic pseudo-random & 2D value noise for crisp weathering
function hash2(x: number, y: number, seed = 1337): number {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function smoothNoise(x: number, y: number, seed = 1337): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, octaves = 4, seed = 1337): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += smoothNoise(x * freq, y * freq, seed + i * 97) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function makeCanvas(size = 512): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function configureTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
  isColor: boolean,
  created: THREE.CanvasTexture[]
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.max(1, maxAnisotropy);
  tex.needsUpdate = true;
  created.push(tex);
  return tex;
}

function addOrganicNoiseOverlay(
  ctx: CanvasRenderingContext2D,
  size: number,
  strength: number,
  scale: number,
  seed: number
): void {
  const img = ctx.getImageData(0, 0, size, size);
  const data = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const n = (fbm(x / scale, y / scale, 3, seed) - 0.5) * strength;
      const fine = (hash2(x, y, seed + 55) - 0.5) * (strength * 0.45);
      const delta = n + fine;
      data[idx] = Math.max(0, Math.min(255, data[idx] + delta));
      data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + delta));
      data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + delta));
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function createProceduralTextures(maxAnisotropy = 4): ProceduralTextureSet {
  const created: THREE.CanvasTexture[] = [];
  const S = 512;

  // 1. LISBON AZULEJO CERAMIC TILES (Glazed tiles + deep mortar bump + glossy roughness)
  const [azCol, azCtx] = makeCanvas(S);
  const [azBmp, azBmpCtx] = makeCanvas(S);
  const [azRgh, azRghCtx] = makeCanvas(S);
  azCtx.fillStyle = '#c8cfd8';
  azCtx.fillRect(0, 0, S, S);
  azBmpCtx.fillStyle = '#202020';
  azBmpCtx.fillRect(0, 0, S, S);
  azRghCtx.fillStyle = '#e5e5e5'; // rough mortar
  azRghCtx.fillRect(0, 0, S, S);

  const tile = 128;
  for (let ty = 0; ty < S; ty += tile) {
    for (let tx = 0; tx < S; tx += tile) {
      const n = hash2(tx, ty, 11);
      const baseLum = 236 + Math.floor((n - 0.5) * 14);
      azCtx.fillStyle = `rgb(${baseLum - 4}, ${baseLum}, ${baseLum + 5})`;
      azCtx.fillRect(tx + 3, ty + 3, tile - 6, tile - 6);

      // Subtle bevel highlight on tile height & glossy glaze roughness
      azBmpCtx.fillStyle = '#dcdcdc';
      azBmpCtx.fillRect(tx + 4, ty + 4, tile - 8, tile - 8);
      azBmpCtx.fillStyle = '#ffffff';
      azBmpCtx.fillRect(tx + 7, ty + 7, tile - 14, tile - 14);

      azRghCtx.fillStyle = '#383838'; // glossy ceramic surface
      azRghCtx.fillRect(tx + 3, ty + 3, tile - 6, tile - 6);

      // Intricate cobalt blue hand-painted radial medallion
      const cx = tx + tile / 2;
      const cy = ty + tile / 2;
      azCtx.strokeStyle = '#1e40af';
      azCtx.lineWidth = 3;
      azCtx.strokeRect(tx + 10, ty + 10, tile - 20, tile - 20);

      for (let k = 0; k < 8; k++) {
        const ang = (k * Math.PI) / 4;
        azCtx.save();
        azCtx.translate(cx, cy);
        azCtx.rotate(ang);
        azCtx.fillStyle = k % 2 === 0 ? '#1d4ed8' : '#2563eb';
        azCtx.beginPath();
        azCtx.moveTo(0, -10);
        azCtx.quadraticCurveTo(10, -24, 0, -40);
        azCtx.quadraticCurveTo(-10, -24, 0, -10);
        azCtx.fill();
        azCtx.restore();
      }
      azCtx.fillStyle = '#eff6ff';
      azCtx.beginPath();
      azCtx.arc(cx, cy, 11, 0, Math.PI * 2);
      azCtx.fill();
      azCtx.fillStyle = '#1e3a8a';
      azCtx.beginPath();
      azCtx.arc(cx, cy, 5, 0, Math.PI * 2);
      azCtx.fill();
    }
  }
  addOrganicNoiseOverlay(azCtx, S, 14, 24, 101);
  const azulejo: MaterialTexturePair = {
    map: configureTexture(azCol, 2, 2, maxAnisotropy, true, created),
    bumpMap: configureTexture(azBmp, 2, 2, maxAnisotropy, false, created),
    roughnessMap: configureTexture(azRgh, 2, 2, maxAnisotropy, false, created),
  };

  // 2. CALÇADA PORTUGUESA COBBLESTONE (Rounded limestone cobbles + deep dark mortar)
  const [cobCol, cobCtx] = makeCanvas(S);
  const [cobBmp, cobBmpCtx] = makeCanvas(S);
  cobCtx.fillStyle = '#38342f';
  cobCtx.fillRect(0, 0, S, S);
  cobBmpCtx.fillStyle = '#181818';
  cobBmpCtx.fillRect(0, 0, S, S);

  const cRows = 16;
  const cCols = 12;
  const rH = S / cRows;
  const cW = S / cCols;
  for (let r = 0; r < cRows; r++) {
    const off = (r % 2) * (cW * 0.5);
    for (let c = -1; c <= cCols; c++) {
      const jitterX = (hash2(c, r, 21) - 0.5) * 4;
      const jitterY = (hash2(c, r, 22) - 0.5) * 3;
      const x = c * cW + off + 3 + jitterX;
      const y = r * rH + 3 + jitterY;
      const w = cW - 6;
      const h = rH - 6;

      const tone = 140 + Math.floor(hash2(c, r, 23) * 52);
      const isDarkAccent = (r + c) % 7 === 0;
      const rCol = isDarkAccent ? tone - 45 : tone + 8;
      const gCol = isDarkAccent ? tone - 44 : tone + 2;
      const bCol = isDarkAccent ? tone - 40 : tone - 10;

      const grad = cobCtx.createRadialGradient(x + w * 0.4, y + h * 0.35, 2, x + w / 2, y + h / 2, w * 0.7);
      grad.addColorStop(0, `rgb(${Math.min(255, rCol + 18)}, ${Math.min(255, gCol + 18)}, ${Math.min(255, bCol + 15)})`);
      grad.addColorStop(1, `rgb(${Math.max(0, rCol - 28)}, ${Math.max(0, gCol - 28)}, ${Math.max(0, bCol - 28)})`);

      cobCtx.fillStyle = grad;
      cobCtx.beginPath();
      cobCtx.roundRect(x, y, w, h, 5);
      cobCtx.fill();

      const bGrad = cobBmpCtx.createRadialGradient(x + w * 0.5, y + h * 0.5, 2, x + w / 2, y + h / 2, w * 0.7);
      bGrad.addColorStop(0, '#f2f2f2');
      bGrad.addColorStop(0.8, '#a0a0a0');
      bGrad.addColorStop(1, '#303030');
      cobBmpCtx.fillStyle = bGrad;
      cobBmpCtx.beginPath();
      cobBmpCtx.roundRect(x, y, w, h, 5);
      cobBmpCtx.fill();
    }
  }
  addOrganicNoiseOverlay(cobCtx, S, 24, 16, 202);
  addOrganicNoiseOverlay(cobBmpCtx, S, 18, 12, 203);
  const cobblestone: MaterialTexturePair = {
    map: configureTexture(cobCol, 12, 12, maxAnisotropy, true, created),
    bumpMap: configureTexture(cobBmp, 12, 12, maxAnisotropy, false, created),
  };

  // 3. WEATHERED LISBON OCHRE STUCCO PLASTER
  const [plCol, plCtx] = makeCanvas(S);
  const [plBmp, plBmpCtx] = makeCanvas(S);
  plCtx.fillStyle = '#cfa36e';
  plCtx.fillRect(0, 0, S, S);
  plBmpCtx.fillStyle = '#888888';
  plBmpCtx.fillRect(0, 0, S, S);
  // Subtle vertical rain-streaking & base weathering
  const plGrad = plCtx.createLinearGradient(0, 0, 0, S);
  plGrad.addColorStop(0, 'rgba(255,245,225,0.14)');
  plGrad.addColorStop(0.75, 'rgba(180,120,65,0.04)');
  plGrad.addColorStop(1, 'rgba(72,48,28,0.28)');
  plCtx.fillStyle = plGrad;
  plCtx.fillRect(0, 0, S, S);
  addOrganicNoiseOverlay(plCtx, S, 36, 32, 301);
  addOrganicNoiseOverlay(plBmpCtx, S, 54, 18, 302);
  const lisbonPlaster: MaterialTexturePair = {
    map: configureTexture(plCol, 2, 2, maxAnisotropy, true, created),
    bumpMap: configureTexture(plBmp, 2, 2, maxAnisotropy, false, created),
  };

  // 4. TERRACOTTA ROOFING & CORNICE
  const [terCol, terCtx] = makeCanvas(S);
  const [terBmp, terBmpCtx] = makeCanvas(S);
  terCtx.fillStyle = '#8f3f22';
  terCtx.fillRect(0, 0, S, S);
  terBmpCtx.fillStyle = '#303030';
  terBmpCtx.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 32) {
    for (let x = 0; x < S; x += 32) {
      const shade = 148 + Math.floor(hash2(x, y, 41) * 40);
      const grad = terCtx.createLinearGradient(x, y, x + 32, y);
      grad.addColorStop(0, `rgb(${shade - 25}, ${Math.floor(shade * 0.42)}, ${Math.floor(shade * 0.25)})`);
      grad.addColorStop(0.5, `rgb(${shade + 12}, ${Math.floor(shade * 0.55)}, ${Math.floor(shade * 0.34)})`);
      grad.addColorStop(1, `rgb(${shade - 35}, ${Math.floor(shade * 0.38)}, ${Math.floor(shade * 0.22)})`);
      terCtx.fillStyle = grad;
      terCtx.fillRect(x, y + 2, 30, 28);

      const bGrad = terBmpCtx.createLinearGradient(x, y, x + 32, y);
      bGrad.addColorStop(0, '#444');
      bGrad.addColorStop(0.5, '#eee');
      bGrad.addColorStop(1, '#333');
      terBmpCtx.fillStyle = bGrad;
      terBmpCtx.fillRect(x, y + 2, 30, 28);
    }
  }
  addOrganicNoiseOverlay(terCtx, S, 20, 14, 401);
  const terracotta: MaterialTexturePair = {
    map: configureTexture(terCol, 4, 4, maxAnisotropy, true, created),
    bumpMap: configureTexture(terBmp, 4, 4, maxAnisotropy, false, created),
  };

  // 5. SOVIET PRECAST CONCRETE PANELS (Formwork seams + tie holes + weathering)
  const [conCol, conCtx] = makeCanvas(S);
  const [conBmp, conBmpCtx] = makeCanvas(S);
  conCtx.fillStyle = '#7b8087';
  conCtx.fillRect(0, 0, S, S);
  conBmpCtx.fillStyle = '#999999';
  conBmpCtx.fillRect(0, 0, S, S);
  for (let py = 0; py < S; py += 256) {
    for (let px = 0; px < S; px += 256) {
      conCtx.strokeStyle = '#484d54';
      conCtx.lineWidth = 6;
      conCtx.strokeRect(px + 3, py + 3, 250, 250);
      conBmpCtx.strokeStyle = '#202020';
      conBmpCtx.lineWidth = 6;
      conBmpCtx.strokeRect(px + 3, py + 3, 250, 250);
      // Tie-rod dimples
      const holes = [
        [px + 32, py + 32],
        [px + 224, py + 32],
        [px + 32, py + 224],
        [px + 224, py + 224],
      ];
      for (const [hx, hy] of holes) {
        conCtx.fillStyle = '#40454c';
        conCtx.beginPath();
        conCtx.arc(hx, hy, 5, 0, Math.PI * 2);
        conCtx.fill();
        conBmpCtx.fillStyle = '#111111';
        conBmpCtx.beginPath();
        conBmpCtx.arc(hx, hy, 5, 0, Math.PI * 2);
        conBmpCtx.fill();
      }
    }
  }
  addOrganicNoiseOverlay(conCtx, S, 34, 28, 501);
  addOrganicNoiseOverlay(conBmpCtx, S, 42, 20, 502);
  const concrete: MaterialTexturePair = {
    map: configureTexture(conCol, 2, 2, maxAnisotropy, true, created),
    bumpMap: configureTexture(conBmp, 2, 2, maxAnisotropy, false, created),
  };

  // 6. KREMLIN RED-BRICK MASONRY
  const [brCol, brCtx] = makeCanvas(S);
  const [brBmp, brBmpCtx] = makeCanvas(S);
  brCtx.fillStyle = '#8b8378'; // aged lime mortar
  brCtx.fillRect(0, 0, S, S);
  brBmpCtx.fillStyle = '#262626';
  brBmpCtx.fillRect(0, 0, S, S);
  for (let r = 0; r < 16; r++) {
    const off = (r % 2) * 32;
    for (let c = -1; c <= 8; c++) {
      const bx = c * 64 + off + 3;
      const by = r * 32 + 3;
      const tone = 112 + Math.floor(hash2(c, r, 61) * 44);
      brCtx.fillStyle = `rgb(${tone}, ${Math.floor(tone * 0.31)}, ${Math.floor(tone * 0.25)})`;
      brCtx.fillRect(bx, by, 58, 26);
      brBmpCtx.fillStyle = '#d4d4d4';
      brBmpCtx.fillRect(bx, by, 58, 26);
    }
  }
  addOrganicNoiseOverlay(brCtx, S, 28, 14, 601);
  addOrganicNoiseOverlay(brBmpCtx, S, 36, 10, 602);
  const redBrick: MaterialTexturePair = {
    map: configureTexture(brCol, 3, 2, maxAnisotropy, true, created),
    bumpMap: configureTexture(brBmp, 3, 2, maxAnisotropy, false, created),
  };

  // 7. MOSCOW FROST-DUSTED GRANITE SETTS
  const [snCol, snCtx] = makeCanvas(S);
  const [snBmp, snBmpCtx] = makeCanvas(S);
  const [snRgh, snRghCtx] = makeCanvas(S);
  snCtx.fillStyle = '#2c3138';
  snCtx.fillRect(0, 0, S, S);
  snBmpCtx.fillStyle = '#222222';
  snBmpCtx.fillRect(0, 0, S, S);
  snRghCtx.fillStyle = '#c8c8c8';
  snRghCtx.fillRect(0, 0, S, S);
  for (let r = 0; r < 16; r++) {
    const off = (r % 2) * 24;
    for (let c = -1; c <= 11; c++) {
      const x = c * 48 + off + 3;
      const y = r * 32 + 3;
      const v = 64 + Math.floor(hash2(c, r, 71) * 36);
      snCtx.fillStyle = `rgb(${v}, ${v + 5}, ${v + 12})`;
      snCtx.beginPath();
      snCtx.roundRect(x, y, 42, 26, 4);
      snCtx.fill();

      snBmpCtx.fillStyle = '#cbcbcb';
      snBmpCtx.beginPath();
      snBmpCtx.roundRect(x, y, 42, 26, 4);
      snBmpCtx.fill();

      // Frost patches in mortar crevices
      if (fbm(c * 0.5, r * 0.5, 3, 72) > 0.52) {
        snCtx.fillStyle = 'rgba(226, 232, 240, 0.42)';
        snCtx.fillRect(x - 2, y - 2, 46, 7);
        snRghCtx.fillStyle = '#484848'; // damp/icy sheen
        snRghCtx.fillRect(x, y, 42, 26);
      }
    }
  }
  addOrganicNoiseOverlay(snCtx, S, 22, 16, 701);
  const snowCobble: MaterialTexturePair = {
    map: configureTexture(snCol, 12, 12, maxAnisotropy, true, created),
    bumpMap: configureTexture(snBmp, 12, 12, maxAnisotropy, false, created),
    roughnessMap: configureTexture(snRgh, 12, 12, maxAnisotropy, false, created),
  };

  // 8. REALISTIC TIMBER MILITARY CRATE (Wood grain planks + corner bracing + stencil)
  const [wdCol, wdCtx] = makeCanvas(S);
  const [wdBmp, wdBmpCtx] = makeCanvas(S);
  wdCtx.fillStyle = '#7e5932';
  wdCtx.fillRect(0, 0, S, S);
  wdBmpCtx.fillStyle = '#999999';
  wdBmpCtx.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 64) {
    const shade = 122 + Math.floor(hash2(0, y, 81) * 26);
    wdCtx.fillStyle = `rgb(${shade}, ${Math.floor(shade * 0.72)}, ${Math.floor(shade * 0.43)})`;
    wdCtx.fillRect(0, y + 2, S, 60);
    // Horizontal wood grain streaks
    for (let g = 0; g < 16; g++) {
      wdCtx.fillStyle = g % 2 === 0 ? 'rgba(55,32,12,0.16)' : 'rgba(215,175,120,0.10)';
      wdCtx.fillRect(0, y + 4 + g * 3.5, S, 2);
      wdBmpCtx.fillStyle = g % 2 === 0 ? '#787878' : '#b2b2b2';
      wdBmpCtx.fillRect(0, y + 4 + g * 3.5, S, 2);
    }
    wdCtx.fillStyle = '#3d2814';
    wdCtx.fillRect(0, y, S, 3);
    wdBmpCtx.fillStyle = '#242424';
    wdBmpCtx.fillRect(0, y, S, 3);
  }
  // Frame & diagonal batten
  wdCtx.strokeStyle = '#5c3d1e';
  wdCtx.lineWidth = 34;
  wdCtx.strokeRect(17, 17, S - 34, S - 34);
  wdBmpCtx.strokeStyle = '#eaeaea';
  wdBmpCtx.lineWidth = 34;
  wdBmpCtx.strokeRect(17, 17, S - 34, S - 34);
  wdCtx.beginPath();
  wdCtx.moveTo(28, 28);
  wdCtx.lineTo(S - 28, S - 28);
  wdCtx.stroke();
  addOrganicNoiseOverlay(wdCtx, S, 20, 18, 801);
  const woodCrate: MaterialTexturePair = {
    map: configureTexture(wdCol, 1, 1, maxAnisotropy, true, created),
    bumpMap: configureTexture(wdBmp, 1, 1, maxAnisotropy, false, created),
  };

  // 9. CORRUGATED STEEL SHIPPING CONTAINER (Ribbed metal + rivets + metallic roughness)
  const [mtCol, mtCtx] = makeCanvas(S);
  const [mtBmp, mtBmpCtx] = makeCanvas(S);
  const [mtRgh, mtRghCtx] = makeCanvas(S);
  mtCtx.fillStyle = '#334155';
  mtCtx.fillRect(0, 0, S, S);
  mtBmpCtx.fillStyle = '#808080';
  mtBmpCtx.fillRect(0, 0, S, S);
  mtRghCtx.fillStyle = '#686868';
  mtRghCtx.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x += 32) {
    const g = mtCtx.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, '#1e293b');
    g.addColorStop(0.35, '#475569');
    g.addColorStop(0.65, '#3b4a5e');
    g.addColorStop(1, '#1e293b');
    mtCtx.fillStyle = g;
    mtCtx.fillRect(x, 0, 32, S);

    const bg = mtBmpCtx.createLinearGradient(x, 0, x + 32, 0);
    bg.addColorStop(0, '#252525');
    bg.addColorStop(0.5, '#f0f0f0');
    bg.addColorStop(1, '#252525');
    mtBmpCtx.fillStyle = bg;
    mtBmpCtx.fillRect(x, 0, 32, S);
  }
  addOrganicNoiseOverlay(mtCtx, S, 18, 22, 901);
  const metalContainer: MaterialTexturePair = {
    map: configureTexture(mtCol, 2, 1, maxAnisotropy, true, created),
    bumpMap: configureTexture(mtBmp, 2, 1, maxAnisotropy, false, created),
    roughnessMap: configureTexture(mtRgh, 2, 1, maxAnisotropy, false, created),
  };

  return {
    azulejo,
    cobblestone,
    lisbonPlaster,
    terracotta,
    concrete,
    redBrick,
    snowCobble,
    woodCrate,
    metalContainer,
    dispose: () => {
      for (const t of created) t.dispose();
    },
  };
}
