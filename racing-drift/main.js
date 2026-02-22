import * as THREE from "three";

// ═══════════════════════════════════════════════════════
// KART DEFINITIONS
// ═══════════════════════════════════════════════════════
const KART_DEFS = [
  {
    id: "cotton", name: "Cotton", nameKr: "코튼", color: 0xffaacc, accent: 0xffffff,
    desc: "Balanced all-rounder", speed: 80, accel: 65, drift: 75, boost: 70, cornering: 70
  },
  {
    id: "burst", name: "Burst", nameKr: "버스트", color: 0xffcc00, accent: 0x222222,
    desc: "Explosive acceleration", speed: 75, accel: 90, drift: 60, boost: 85, cornering: 55
  },
  {
    id: "solid", name: "Solid", nameKr: "솔리드", color: 0x4488ff, accent: 0xaaccdd,
    desc: "Top speed & grip", speed: 90, accel: 55, drift: 55, boost: 65, cornering: 60
  },
  {
    id: "marathon", name: "Marathon", nameKr: "마라톤", color: 0xff5522, accent: 0xff8844,
    desc: "Long boost duration", speed: 78, accel: 60, drift: 70, boost: 95, cornering: 65
  },
  {
    id: "saber", name: "Saber", nameKr: "세이버", color: 0x00ffcc, accent: 0x111111,
    desc: "Sharpest cornering", speed: 72, accel: 70, drift: 85, boost: 60, cornering: 95
  },
];

// ═══════════════════════════════════════════════════════
// TRACK DEFINITIONS
// ═══════════════════════════════════════════════════════
const TRACK_DEFS = [
  {
    id: "village", name: "Village Loop", desc: "Wide roads, gentle curves",
    straightHalf: 90, turnRadius: 60, roadHalfWidth: 18, wallHalfWidth: 28,
    skyColor: 0xdce2e8, fogColor: 0xdce2e8,
    grassColor: 0x88cc66, shoulderColor: 0xa2bac2, roadColor: 0x76879e, wallColor: 0xe6ebf0,
    sunColor: 0xfff1cf, sunIntensity: 0.8
  },
  {
    id: "sunset", name: "Sunset Canyon", desc: "Tight hairpins, desert heat",
    straightHalf: 70, turnRadius: 40, roadHalfWidth: 14, wallHalfWidth: 22,
    skyColor: 0xf5c87a, fogColor: 0xe8b060,
    grassColor: 0xd4a056, shoulderColor: 0xc99048, roadColor: 0x8b6e50, wallColor: 0xf0d8b0,
    sunColor: 0xff9944, sunIntensity: 1.0
  },
  {
    id: "neon", name: "Neon City", desc: "Sharp turns, neon lights",
    straightHalf: 60, turnRadius: 35, roadHalfWidth: 16, wallHalfWidth: 24,
    skyColor: 0x141828, fogColor: 0x141828,
    grassColor: 0x1a1a30, shoulderColor: 0x252545, roadColor: 0x3a3a5e, wallColor: 0x6666ff,
    sunColor: 0x8888ff, sunIntensity: 0.9, ambient: 1.2, fogFar: 350
  },
];

// ═══════════════════════════════════════════════════════
// GAME CONFIG
// ═══════════════════════════════════════════════════════
const FIXED_DT = 1 / 60;
const LAP_COUNT = 3;
const AI_COUNT = 5;
let selectedKartIdx = 0;
let selectedTrackIdx = 0;

let TRACK, TRACK_LENGTH, START_S;

function applyTrackConfig(trackDef) {
  TRACK = {
    straightHalf: trackDef.straightHalf,
    turnRadius: trackDef.turnRadius,
    roadHalfWidth: trackDef.roadHalfWidth,
    wallHalfWidth: trackDef.wallHalfWidth,
  };
  TRACK_LENGTH = 4 * TRACK.straightHalf + 2 * Math.PI * TRACK.turnRadius;
  START_S = 20;
}

function getKartTuning(kartDef) {
  const s = kartDef;
  return {
    baseSpeed: 60 + s.speed * 0.35,
    offroadFactor: 0.5,
    stunDuration: 0.3,
    boosterMultiplier: 1.3 + s.boost * 0.004,
    boosterDuration: 1.2 + s.boost * 0.008,
    instantBoostMultiplier: 1.2 + s.boost * 0.002,
    instantBoostDuration: 0.4 + s.boost * 0.002,
    instantBoostWindow: 0.5,
    startBoostMultiplier: 1.3 + s.boost * 0.002,
    startBoostDuration: 0.8 + s.boost * 0.004,
    startBoostWindow: 0.4,
    draftingMultiplier: 1.15,
    draftingDistance: 30,
    draftingTimeReq: 0.8,
    gaugeMax: 100,
    driftChargeRate: 25 + s.drift * 0.15,
    cuttingBonus: 8 + s.drift * 0.05,
    steerRate: 1.1 + s.cornering * 0.005,
    accelRate: 40 + s.accel * 0.4,
  };
}

let TUNING = getKartTuning(KART_DEFS[0]);

// ═══════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════
const input = { forward: false, left: false, right: false, drift: false, forwardTrigger: false };

// ═══════════════════════════════════════════════════════
// DOM ELEMENTS
// ═══════════════════════════════════════════════════════
const canvas = document.getElementById("game-canvas");
const lapCounterEl = document.getElementById("lap-counter");
const lapTimeEl = document.getElementById("lap-time");
const positionEl = document.getElementById("position-display");
const speedEl = document.getElementById("speed");
const gaugeFillEl = document.getElementById("gauge-fill");
const boostersCountEl = document.getElementById("boosters-count");
const dashboardEl = document.getElementById("game-dashboard");
const startScreenEl = document.getElementById("start-screen");
const kartSelectEl = document.getElementById("kart-select-screen");
const trackSelectEl = document.getElementById("track-select-screen");
const finishScreenEl = document.getElementById("finish-screen");
const finishTotalEl = document.getElementById("finish-total");
const finishBestEl = document.getElementById("finish-best");
const finishPosEl = document.getElementById("finish-position");
const finishStandingsEl = document.getElementById("finish-standings");
const startBtn = document.getElementById("start-btn");
const kartConfirmBtn = document.getElementById("kart-confirm-btn");
const trackConfirmBtn = document.getElementById("track-confirm-btn");
const restartBtn = document.getElementById("restart-btn");
const finishRestartBtn = document.getElementById("finish-restart-btn");
const speedDialEl = document.getElementById("speed-dial");
const vfxFlashEl = document.getElementById("vfx-flash");
const vfxSpeedlinesEl = document.getElementById("vfx-speedlines");
const vfxBoostTextEl = document.getElementById("vfx-boost-text");
let vfxBoostTextTimer = 0;

let countdownEl = document.getElementById("countdown-display");
if (!countdownEl) {
  countdownEl = document.createElement("div");
  countdownEl.id = "countdown-display";
  Object.assign(countdownEl.style, {
    position: "absolute", top: "30%", left: "50%",
    transform: "translate(-50%, -50%)", fontSize: "8rem",
    fontWeight: "900", color: "#fff",
    textShadow: "0 0 20px #00ffff, 4px 4px 0px #ff00ff",
    zIndex: "100", pointerEvents: "none", display: "none",
  });
  document.body.appendChild(countdownEl);
}

// ═══════════════════════════════════════════════════════
// RENDERER & SCENE
// ═══════════════════════════════════════════════════════
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdce2e8);
scene.fog = new THREE.Fog(0xdce2e8, 50, 200);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1600);
camera.position.set(0, 22, -32);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
scene.add(ambientLight);
const sun = new THREE.DirectionalLight(0xfff1cf, 0.8);
sun.position.set(120, 200, 70);
scene.add(sun);

// ═══════════════════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════════════════
class AudioManager {
  constructor() { this.ctx = null; this.master = null; this.engineOsc = null; this.engineGain = null; this.driftFilter = null; this.driftGain = null; this.driftNoise = null; this.bgmInterval = null; this.bgmStep = 0; }
  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.22; this.master.connect(this.ctx.destination);
    this.engineOsc = this.ctx.createOscillator(); this.engineOsc.type = "sawtooth"; this.engineOsc.frequency.value = 95;
    this.engineGain = this.ctx.createGain(); this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineGain).connect(this.master); this.engineOsc.start();
    this.driftFilter = this.ctx.createBiquadFilter(); this.driftFilter.type = "bandpass"; this.driftFilter.frequency.value = 960;
    this.driftGain = this.ctx.createGain(); this.driftGain.gain.value = 0;
    this.driftNoise = this.createNoiseSource(); this.driftNoise.connect(this.driftFilter).connect(this.driftGain).connect(this.master); this.driftNoise.start();
    this.startBgm();
  }
  createNoiseSource() {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s;
  }
  async resume() { if (this.ctx && this.ctx.state !== "running") await this.ctx.resume(); }
  startBgm() {
    if (!this.ctx || this.bgmInterval) return;
    const scale = [220, 246.94, 293.66, 329.63, 293.66, 246.94, 196, 246.94];
    this.bgmInterval = setInterval(() => {
      if (!this.ctx || this.ctx.state !== "running") return;
      const freq = scale[this.bgmStep % scale.length]; this.bgmStep++;
      const now = this.ctx.currentTime; const osc = this.ctx.createOscillator(); const g = this.ctx.createGain();
      osc.type = "triangle"; osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.05, now + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.connect(g).connect(this.master); osc.start(now); osc.stop(now + 0.22);
    }, 250);
  }
  setEngine(norm, active) {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    this.engineOsc.frequency.value = 90 + norm * 90;
    this.engineGain.gain.value = active ? 0.06 + norm * 0.1 : 0;
  }
  setDrift(active, intensity) {
    if (!this.driftGain) return;
    this.driftGain.gain.value = active ? 0.05 + intensity * 0.15 : 0;
    if (this.driftFilter) this.driftFilter.frequency.value = 400 + intensity * 1200;
  }
  playFinish() {
    if (!this.ctx || !this.master) return;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const w = this.ctx.currentTime + i * 0.14; const o = this.ctx.createOscillator(); const g = this.ctx.createGain();
      o.type = "square"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, w); g.gain.exponentialRampToValueAtTime(0.1, w + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, w + 0.13);
      o.connect(g).connect(this.master); o.start(w); o.stop(w + 0.14);
    });
  }
}
const audio = new AudioManager();

// ═══════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function wrapS(s) { let r = s % TRACK_LENGTH; if (r < 0) r += TRACK_LENGTH; return r; }

function sampleCenterline(sInput) {
  const s = wrapS(sInput);
  const sL = 2 * TRACK.straightHalf, aL = Math.PI * TRACK.turnRadius;
  if (s < sL) return { x: -TRACK.straightHalf + s, z: TRACK.turnRadius, tangentX: 1, tangentZ: 0 };
  if (s < sL + aL) { const u = s - sL, a = Math.PI / 2 - u / TRACK.turnRadius; return { x: TRACK.straightHalf + TRACK.turnRadius * Math.cos(a), z: TRACK.turnRadius * Math.sin(a), tangentX: Math.sin(a), tangentZ: -Math.cos(a) }; }
  if (s < sL + aL + sL) { const u = s - sL - aL; return { x: TRACK.straightHalf - u, z: -TRACK.turnRadius, tangentX: -1, tangentZ: 0 }; }
  const u = s - sL - aL - sL, a = -Math.PI / 2 - u / TRACK.turnRadius;
  return { x: -TRACK.straightHalf + TRACK.turnRadius * Math.cos(a), z: TRACK.turnRadius * Math.sin(a), tangentX: Math.sin(a), tangentZ: -Math.cos(a) };
}

function nearestCenterlineInfo(x, z) {
  const cands = [];
  const tX = clamp(x, -TRACK.straightHalf, TRACK.straightHalf);
  cands.push({ x: tX, z: TRACK.turnRadius, tangentX: 1, tangentZ: 0, s: tX + TRACK.straightHalf });
  const rR = Math.atan2(z, x - TRACK.straightHalf), rA = clamp(rR, -Math.PI / 2, Math.PI / 2);
  cands.push({ x: TRACK.straightHalf + TRACK.turnRadius * Math.cos(rA), z: TRACK.turnRadius * Math.sin(rA), tangentX: Math.sin(rA), tangentZ: -Math.cos(rA), s: 2 * TRACK.straightHalf + (Math.PI / 2 - rA) * TRACK.turnRadius });
  const bX = clamp(x, -TRACK.straightHalf, TRACK.straightHalf);
  cands.push({ x: bX, z: -TRACK.turnRadius, tangentX: -1, tangentZ: 0, s: 2 * TRACK.straightHalf + Math.PI * TRACK.turnRadius + (TRACK.straightHalf - bX) });
  let lR = Math.atan2(z, x + TRACK.straightHalf); if (lR > -Math.PI / 2) lR -= Math.PI * 2;
  const lA = clamp(lR, -1.5 * Math.PI, -Math.PI / 2);
  cands.push({ x: -TRACK.straightHalf + TRACK.turnRadius * Math.cos(lA), z: TRACK.turnRadius * Math.sin(lA), tangentX: Math.sin(lA), tangentZ: -Math.cos(lA), s: 4 * TRACK.straightHalf + Math.PI * TRACK.turnRadius + (-Math.PI / 2 - lA) * TRACK.turnRadius });
  let best = null, bd = Infinity;
  for (const c of cands) { const d2 = (x - c.x) ** 2 + (z - c.z) ** 2; if (d2 < bd) { best = c; bd = d2; } }
  const off = Math.sqrt(bd), inv = off > 1e-6 ? 1 / off : 0;
  return { pointX: best.x, pointZ: best.z, tangentX: best.tangentX, tangentZ: best.tangentZ, normalX: (x - best.x) * inv, normalZ: (z - best.z) * inv, s: wrapS(best.s), offset: off };
}

// ═══════════════════════════════════════════════════════
// TRACK VISUALS
// ═══════════════════════════════════════════════════════
let trackMeshes = [];

function clearTrackVisuals() {
  trackMeshes.forEach(m => scene.remove(m));
  trackMeshes = [];
}

function createInstancedBoxes(positions, size, color) {
  const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.InstancedMesh(geo, mat, positions.length);
  const mx = new THREE.Matrix4();
  positions.forEach((p, i) => { mx.makeTranslation(p.x, p.y, p.z); mesh.setMatrixAt(i, mx); });
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  trackMeshes.push(mesh);
}

function addCell(list, set, x, y, z) {
  const k = `${Math.round(x * 2) / 2}|${Math.round(y * 2) / 2}|${Math.round(z * 2) / 2}`;
  if (set.has(k)) return; set.add(k); list.push({ x, y, z });
}

function buildTrackVisuals(trackDef) {
  clearTrackVisuals();
  const grassC = [], grassS = new Set();
  const extent = Math.max(TRACK.straightHalf + TRACK.turnRadius + 60, 220);
  for (let gx = -extent; gx <= extent; gx += 6) for (let gz = -extent; gz <= extent; gz += 6) addCell(grassC, grassS, gx, -2.5, gz);
  const roadC = [], roadS = new Set(), shC = [], shS = new Set(), wC = [], wS = new Set();
  for (let s = 0; s < TRACK_LENGTH; s += 2.8) {
    const c = sampleCenterline(s), nx = -c.tangentZ, nz = c.tangentX;
    for (let w = -TRACK.wallHalfWidth; w <= TRACK.wallHalfWidth; w += 3) {
      const px = c.x + nx * w, pz = c.z + nz * w;
      if (Math.abs(w) <= TRACK.roadHalfWidth) addCell(roadC, roadS, px, 0.3, pz);
      else addCell(shC, shS, px, 0.2, pz);
    }
    addCell(wC, wS, c.x + nx * TRACK.wallHalfWidth, 2.4, c.z + nz * TRACK.wallHalfWidth);
    addCell(wC, wS, c.x - nx * TRACK.wallHalfWidth, 2.4, c.z - nz * TRACK.wallHalfWidth);
  }
  createInstancedBoxes(grassC, { x: 6, y: 3, z: 6 }, trackDef.grassColor);
  createInstancedBoxes(shC, { x: 3, y: 1, z: 3 }, trackDef.shoulderColor);
  createInstancedBoxes(roadC, { x: 3, y: 1, z: 3 }, trackDef.roadColor);
  createInstancedBoxes(wC, { x: 3, y: 5, z: 3 }, trackDef.wallColor);
  // Finish line
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(3, TRACK.roadHalfWidth * 2), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
  fl.rotation.x = -Math.PI / 2; const fp = sampleCenterline(START_S); fl.position.set(fp.x, 0.4, fp.z);
  scene.add(fl); trackMeshes.push(fl);
  // Apply sky/sun
  scene.background = new THREE.Color(trackDef.skyColor);
  scene.fog = new THREE.Fog(trackDef.fogColor, 60, trackDef.fogFar || 250);
  sun.color.set(trackDef.sunColor); sun.intensity = trackDef.sunIntensity;
  ambientLight.intensity = trackDef.ambient || 0.85;
}

// ═══════════════════════════════════════════════════════
// KART MESH
// ═══════════════════════════════════════════════════════
function createKartMesh(bodyColor = 0xff00ff, accentColor = 0x00ffff, opacity = 1) {
  const mat = new THREE.MeshLambertMaterial({ color: bodyColor, transparent: opacity < 1, opacity });
  const dark = new THREE.MeshLambertMaterial({ color: 0x111625, transparent: opacity < 1, opacity });
  const accentMat = new THREE.MeshLambertMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.5, transparent: opacity < 1, opacity });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.6, 7.2), mat); body.position.y = 1.8; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 2.8), mat); cabin.position.set(0, 3, -0.4); g.add(cabin);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.8, 1.4), accentMat); bumper.position.set(0, 1.1, 3.8); g.add(bumper);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.4, 2.0), accentMat); spoiler.position.set(0, 3.5, -3.2); g.add(spoiler);
  [[-2.3, 0.9, 2.2], [2.3, 0.9, 2.2], [-2.3, 0.9, -2.2], [2.3, 0.9, -2.2]].forEach(([x, y, z]) => { const w = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), dark); w.position.set(x, y, z); g.add(w); });
  // Exhaust flames
  const flameMat = new THREE.MeshLambertMaterial({ color: 0x00ffff, emissive: 0x0055ff, emissiveIntensity: 2, transparent: true, opacity: 0.8 });
  const flames = new THREE.Group(); flames.name = "boosterFlames";
  const lf = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3.5, 4), flameMat); lf.rotation.x = Math.PI / 2; lf.position.set(-1.2, 1.5, 5);
  const rf = lf.clone(); rf.position.set(1.2, 1.5, 5);
  flames.add(lf); flames.add(rf); flames.scale.set(0, 0, 0); g.add(flames);
  return g;
}

// ═══════════════════════════════════════════════════════
// SETUP SCENE OBJECTS
// ═══════════════════════════════════════════════════════
applyTrackConfig(TRACK_DEFS[0]);
let kartMesh = createKartMesh(KART_DEFS[0].color, KART_DEFS[0].accent);
scene.add(kartMesh);
const ghostKart = createKartMesh(0x00ffff, 0x00ffff, 0.25);
ghostKart.visible = false;
scene.add(ghostKart);

// AI Karts
const aiKarts = [];
function spawnAIKarts() {
  aiKarts.forEach(ai => scene.remove(ai.mesh));
  aiKarts.length = 0;
  const availableKarts = [...KART_DEFS];
  for (let i = 0; i < AI_COUNT; i++) {
    const kartDef = availableKarts[Math.floor(Math.random() * availableKarts.length)];
    const mesh = createKartMesh(kartDef.color, kartDef.accent);
    scene.add(mesh);
    aiKarts.push({
      mesh, s: 0, speed: 0, heading: 0, offset: 0,
      kartDef, tuning: getKartTuning(kartDef),
      baseSpeed: 0, started: false, boostTimer: 0,
      lapProgress: 0, lap: 1, totalTime: 0, finished: false, finishTime: Infinity,
      name: kartDef.name + " " + (i + 1),
    });
  }
}

// ═══════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════
const state = {
  mode: "start", position: new THREE.Vector3(), heading: 0, moveHeading: 0,
  speed: 0, lap: 1, lapStartTime: 0, currentLapTime: 0, totalTime: 0,
  lapProgress: 0, lapTimes: [], bestLapInRun: Infinity, bestSessionTotal: Infinity,
  driftActive: false, driftCharge: 0, boostTimeLeft: 0, boostMultiplier: 1,
  boosterGauge: 0, boostersCount: 0, instantBoostWindowLeft: 0,
  draftingTime: 0, stunTimeLeft: 0, offroad: false, lastS: 20,
  runFrames: [], bestGhostFrames: null, ghostEnabled: false,
  countdown: 0, finished: false,
};

function resetKartPose() {
  const start = sampleCenterline(START_S);
  state.position.set(start.x, 1.1, start.z);
  state.heading = Math.atan2(start.tangentZ, start.tangentX);
  state.moveHeading = state.heading;
  state.lastS = START_S;
}

function resetAIKarts() {
  for (let i = 0; i < aiKarts.length; i++) {
    const ai = aiKarts[i];
    const row = Math.floor(i / 2), col = (i % 2 === 0) ? -1 : 1;
    ai.s = START_S - (row + 1) * 12;
    ai.speed = 0; ai.started = false; ai.boostTimer = 0;
    ai.offset = col * (TRACK.roadHalfWidth * 0.35);
    ai.baseSpeed = ai.tuning.baseSpeed * (0.92 + Math.random() * 0.16);
    ai.lapProgress = 0; ai.lap = 1; ai.totalTime = 0; ai.finished = false; ai.finishTime = Infinity;
    ai.lastS = ai.s;
    const c = sampleCenterline(ai.s), nx = -c.tangentZ, nz = c.tangentX;
    ai.mesh.position.set(c.x + nx * ai.offset, 1.1, c.z + nz * ai.offset);
    ai.heading = Math.atan2(c.tangentZ, c.tangentX);
    ai.mesh.rotation.y = -ai.heading + Math.PI / 2;
  }
}

function resetRunState() {
  state.mode = "running"; state.speed = 0; state.lap = 1;
  state.lapStartTime = 0; state.currentLapTime = 0; state.totalTime = 0;
  state.lapProgress = 0; state.lapTimes = []; state.bestLapInRun = Infinity;
  state.driftActive = false; state.driftCharge = 0; state.boostTimeLeft = 0; state.boostMultiplier = 1;
  state.boosterGauge = 0; state.boostersCount = 0; state.instantBoostWindowLeft = 0;
  state.draftingTime = 0; state.stunTimeLeft = 0; state.offroad = false;
  state.runFrames = []; state.countdown = 3.99; state.finished = false;
  resetKartPose(); resetAIKarts();
}

// ═══════════════════════════════════════════════════════
// HUD
// ═══════════════════════════════════════════════════════
function formatTime(s) {
  const ms = Math.max(0, Math.floor(s * 1000));
  return `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
}

function getPlayerPosition() {
  const playerProgress = (state.lap - 1) * TRACK_LENGTH + state.lapProgress;
  let pos = 1;
  for (const ai of aiKarts) {
    if (ai.finished) { pos++; continue; }
    const aiProgress = (ai.lap - 1) * TRACK_LENGTH + ai.lapProgress;
    if (aiProgress > playerProgress) pos++;
  }
  return pos;
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function updateHUD() {
  lapCounterEl.textContent = `LAP ${Math.min(state.lap, LAP_COUNT)} / ${LAP_COUNT}`;
  lapTimeEl.textContent = formatTime(state.currentLapTime);
  speedEl.textContent = `${Math.floor(state.speed)}`;
  const pos = getPlayerPosition();
  positionEl.textContent = `${ordinal(pos)} / ${AI_COUNT + 1}`;
  positionEl.style.color = pos === 1 ? "#ffea00" : pos <= 3 ? "#00ffff" : "#ff6666";
  const maxDial = TUNING.baseSpeed * 2;
  if (speedDialEl) speedDialEl.style.setProperty('--speed-deg', `${clamp(state.speed / maxDial * 280, 0, 280)}deg`);
  const gp = clamp(state.boosterGauge, 0, TUNING.gaugeMax) / TUNING.gaugeMax * 100;
  gaugeFillEl.style.width = `${gp}%`;
  gaugeFillEl.classList.toggle("booster-ready", state.boosterGauge >= TUNING.gaugeMax);
  boostersCountEl.textContent = `x ${state.boostersCount}`;
}

// ═══════════════════════════════════════════════════════
// RACE LOGIC
// ═══════════════════════════════════════════════════════
function onLapComplete() {
  const lt = state.totalTime - state.lapStartTime;
  state.lapTimes.push(lt); state.bestLapInRun = Math.min(state.bestLapInRun, lt);
  state.lapStartTime = state.totalTime;
  if (state.lap >= LAP_COUNT) {
    state.finished = true;
    // Don't end race until all AI finish or timeout
    checkRaceEnd();
    return;
  }
  state.lap++;
}

function checkRaceEnd() {
  const allDone = aiKarts.every(ai => ai.finished) || state.totalTime > 300;
  if (state.finished && allDone) {
    state.mode = "finished";
    showFinishScreen();
  } else if (state.finished && !allDone) {
    // Wait a bit for AI to finish
    setTimeout(() => {
      aiKarts.forEach(ai => { if (!ai.finished) { ai.finished = true; ai.finishTime = ai.totalTime; } });
      state.mode = "finished";
      showFinishScreen();
    }, 3000);
  }
}

function showFinishScreen() {
  const playerPos = getPlayerPosition();
  finishPosEl.textContent = ordinal(playerPos);
  finishPosEl.style.color = playerPos === 1 ? "#ffea00" : playerPos <= 3 ? "#00ffff" : "#ff6666";
  finishTotalEl.textContent = `Total: ${formatTime(state.totalTime)}`;
  finishBestEl.textContent = `Best Lap: ${formatTime(state.bestLapInRun)}`;
  // Build standings
  const standings = [{ name: "YOU", color: KART_DEFS[selectedKartIdx].color, time: state.totalTime, isPlayer: true }];
  aiKarts.forEach(ai => standings.push({ name: ai.name, color: ai.kartDef.color, time: ai.finishTime, isPlayer: false }));
  standings.sort((a, b) => a.time - b.time);
  finishStandingsEl.innerHTML = standings.map((s, i) => `
    <div class="standing-row ${s.isPlayer ? 'player-row' : ''}">
      <span class="standing-pos">${ordinal(i + 1)}</span>
      <span class="standing-color" style="background:#${s.color.toString(16).padStart(6, '0')}"></span>
      <span class="standing-name">${s.name}</span>
      <span class="standing-time">${s.time < Infinity ? formatTime(s.time) : 'DNF'}</span>
    </div>`).join('');
  finishScreenEl.classList.remove("hidden");
  if (dashboardEl) dashboardEl.classList.add("hidden");
  audio.setEngine(0, false); audio.setDrift(false, 0); audio.playFinish();
}

// ═══════════════════════════════════════════════════════
// DRIFT & BOOST
// ═══════════════════════════════════════════════════════
function releaseDrift() {
  if (!state.driftActive) return;
  if (state.driftCharge > 0.1 && state.driftCharge < 0.4) {
    state.boosterGauge = Math.min(TUNING.gaugeMax, state.boosterGauge + TUNING.cuttingBonus);
  }
  state.moveHeading = state.heading;
  if (state.driftCharge > 0.4) state.instantBoostWindowLeft = TUNING.instantBoostWindow;
  state.driftActive = false; state.driftCharge = 0;
}

function triggerBoostVFX(type) {
  vfxFlashEl.style.opacity = "1"; vfxFlashEl.style.transition = "none";
  setTimeout(() => { vfxFlashEl.style.transition = "opacity 0.4s ease-out"; vfxFlashEl.style.opacity = "0"; }, 30);
  if (type) {
    vfxBoostTextEl.textContent = type; vfxBoostTextEl.style.opacity = "1";
    vfxBoostTextEl.style.transform = "translate(-50%, -50%) scale(1.2) skewX(-10deg)";
    vfxBoostTextTimer = 0.8;
  }
}

// ═══════════════════════════════════════════════════════
// PLAYER UPDATE
// ═══════════════════════════════════════════════════════
function updateKart(dt) {
  if (state.mode !== "running" || state.finished) return;
  state.totalTime += dt; state.currentLapTime = state.totalTime - state.lapStartTime;
  if (vfxBoostTextTimer > 0) {
    vfxBoostTextTimer -= dt;
    vfxBoostTextEl.style.transform = `translate(-50%, -50%) scale(${1 + (0.8 - vfxBoostTextTimer) * 0.5}) skewX(-10deg)`;
    if (vfxBoostTextTimer <= 0) vfxBoostTextEl.style.opacity = "0";
  }
  if (state.instantBoostWindowLeft > 0) state.instantBoostWindowLeft -= dt;
  if (state.stunTimeLeft > 0) { state.stunTimeLeft -= dt; return; }
  // Boost triggers
  if (input.forwardTrigger) {
    input.forwardTrigger = false;
    if (state.instantBoostWindowLeft > 0) {
      state.boostTimeLeft = TUNING.instantBoostDuration; state.boostMultiplier = TUNING.instantBoostMultiplier;
      state.instantBoostWindowLeft = 0; audio.setDrift(true, 1); triggerBoostVFX("INSTANT BOOST!");
    } else if (state.boostersCount > 0 && state.boostTimeLeft <= 0) {
      state.boostersCount--; state.boostTimeLeft = TUNING.boosterDuration;
      state.boostMultiplier = TUNING.boosterMultiplier; audio.setDrift(true, 1); triggerBoostVFX("BOOST!");
    } else if (state.currentLapTime < TUNING.startBoostWindow && state.lap === 1 && state.countdown <= 0) {
      state.boostTimeLeft = TUNING.startBoostDuration; state.boostMultiplier = TUNING.startBoostMultiplier;
      audio.setDrift(true, 1); triggerBoostVFX("START BOOST!");
    }
  }
  if (state.boostTimeLeft > 0) { state.boostTimeLeft -= dt; if (state.boostTimeLeft <= 0) state.boostMultiplier = 1; }
  // Drift
  let steerInput = 0;
  if (input.left) steerInput -= 1; if (input.right) steerInput += 1;
  if (input.drift && state.speed > 20 && steerInput !== 0 && !state.driftActive) state.driftActive = true;
  if (state.driftActive && !input.drift) releaseDrift();
  if (state.driftActive) {
    state.driftCharge += dt;
    state.boosterGauge += TUNING.driftChargeRate * dt;
    if (state.boosterGauge >= TUNING.gaugeMax) { state.boostersCount++; state.boosterGauge -= TUNING.gaugeMax; }
  }
  // Drafting
  let draftingMult = 1;
  if (state.boostTimeLeft <= 0) {
    let nearAI = false;
    for (const ai of aiKarts) {
      const d = state.position.distanceTo(ai.mesh.position);
      if (d < TUNING.draftingDistance && d > 5) { nearAI = true; break; }
    }
    if (nearAI) { state.draftingTime += dt; if (state.draftingTime >= TUNING.draftingTimeReq) draftingMult = TUNING.draftingMultiplier; }
    else state.draftingTime = 0;
  }
  // Speed
  let targetSpeed = TUNING.baseSpeed * state.boostMultiplier * draftingMult;
  const ci = nearestCenterlineInfo(state.position.x, state.position.z);
  state.offroad = ci.offset > TRACK.roadHalfWidth;
  if (state.offroad) targetSpeed *= TUNING.offroadFactor;
  let accel = state.boostTimeLeft > 0 ? TUNING.accelRate * 2 : TUNING.accelRate;
  if (!input.forward && state.lapStartTime > 0) { targetSpeed = 0; accel = 40; }
  state.speed = state.speed < targetSpeed ? Math.min(targetSpeed, state.speed + accel * dt) : Math.max(targetSpeed, state.speed - Math.max(20, accel * 0.5) * dt);
  // Steer
  let steerRate = state.driftActive ? 2.5 : TUNING.steerRate;
  state.heading += steerInput * steerRate * dt;
  // Grip
  if (state.driftActive) {
    let penalty = steerInput === 0 ? 5 : 45;
    if (state.boostTimeLeft > 0) penalty *= 0.15;
    state.speed = Math.max(20, state.speed - penalty * dt);
  }
  const gripFactor = state.driftActive ? 0.88 : 0.98;
  state.moveHeading += (state.heading - state.moveHeading) * (1 - Math.pow(1 - gripFactor, dt * 60));
  // Move
  const vx = Math.cos(state.moveHeading) * state.speed * dt;
  const vz = Math.sin(state.moveHeading) * state.speed * dt;
  state.position.x += vx; state.position.z += vz;
  // Wall collision
  if (ci.offset > TRACK.wallHalfWidth - 2) {
    state.position.x -= ci.normalX * (ci.offset - TRACK.wallHalfWidth + 2);
    state.position.z -= ci.normalZ * (ci.offset - TRACK.wallHalfWidth + 2);
    state.stunTimeLeft = TUNING.stunDuration; state.speed = 0;
    state.boostTimeLeft = 0; state.boostMultiplier = 1; state.driftActive = false; state.driftCharge = 0;
  }
  // Lap tracking
  let ds = ci.s - state.lastS;
  if (ds < -TRACK_LENGTH * 0.5) ds += TRACK_LENGTH; else if (ds > TRACK_LENGTH * 0.5) ds -= TRACK_LENGTH;
  state.lastS = ci.s; state.lapProgress += ds;
  if (state.lapProgress >= TRACK_LENGTH) { state.lapProgress -= TRACK_LENGTH; onLapComplete(); }
  else if (state.lapProgress < 0) state.lapProgress = 0;
  state.runFrames.push({ t: state.totalTime, x: state.position.x, y: state.position.y, z: state.position.z, heading: state.heading });
  audio.setEngine(clamp(state.speed / (TUNING.baseSpeed * 1.5), 0, 1), true);
  audio.setDrift(state.driftActive, clamp(state.driftCharge / 2, 0, 1));
}

// ═══════════════════════════════════════════════════════
// AI UPDATE (with rubber-banding)
// ═══════════════════════════════════════════════════════
function updateAIKarts(dt) {
  if (state.countdown > 0) return;
  const playerProgress = (state.lap - 1) * TRACK_LENGTH + state.lapProgress;

  for (const ai of aiKarts) {
    if (ai.finished) continue;
    ai.totalTime += dt;
    if (!ai.started) { ai.started = true; ai.speed = 0; }

    // Rubber-banding: aggressive catch-up and slow-down for tension
    const aiProgress = (ai.lap - 1) * TRACK_LENGTH + ai.lapProgress;
    const gap = playerProgress - aiProgress; // positive = player is ahead
    let rubberBand = 1.0;
    if (gap > 120) rubberBand = 1.25;       // AI very far behind → sprint
    else if (gap > 60) rubberBand = 1.15;    // AI far behind → speed up
    else if (gap > 25) rubberBand = 1.06;    // AI behind → gentle catch-up
    else if (gap < -120) rubberBand = 0.65;  // AI very far ahead → heavy brake
    else if (gap < -60) rubberBand = 0.78;   // AI far ahead → slow down a lot
    else if (gap < -25) rubberBand = 0.88;   // AI ahead → ease off
    else rubberBand = 0.98 + Math.random() * 0.08; // Close race → natural variation

    const targetSpeed = ai.baseSpeed * rubberBand;
    const accelR = rubberBand > 1 ? 80 : 50; // Faster acceleration when catching up
    if (ai.speed < targetSpeed) ai.speed = Math.min(targetSpeed, ai.speed + accelR * dt);
    else ai.speed = Math.max(targetSpeed, ai.speed - 40 * dt);

    // Random boost (occasional speed bursts, only when near player)
    ai.boostTimer -= dt;
    if (ai.boostTimer <= 0) {
      ai.boostTimer = 4 + Math.random() * 8;
      if (Math.random() < 0.3 && Math.abs(gap) < 50) ai.speed = Math.min(ai.speed * 1.2, 110);
    }

    ai.speed += (Math.random() - 0.5) * 8 * dt;
    ai.speed = clamp(ai.speed, 0, 120);
    ai.s = wrapS(ai.s + ai.speed * dt);

    // Track AI lap progress
    const c = sampleCenterline(ai.s);
    const newS = nearestCenterlineInfo(c.x, c.z).s;
    let dds = newS - (ai.lastS || ai.s);
    if (dds < -TRACK_LENGTH * 0.5) dds += TRACK_LENGTH;
    else if (dds > TRACK_LENGTH * 0.5) dds -= TRACK_LENGTH;
    ai.lastS = newS;
    ai.lapProgress += dds;
    if (ai.lapProgress >= TRACK_LENGTH) {
      ai.lapProgress -= TRACK_LENGTH;
      ai.lap++;
      if (ai.lap > LAP_COUNT) { ai.finished = true; ai.finishTime = ai.totalTime; }
    }

    const nx = -c.tangentZ, nz = c.tangentX;
    ai.mesh.position.set(c.x + nx * ai.offset, 1.1, c.z + nz * ai.offset);
    ai.heading = Math.atan2(c.tangentZ, c.tangentX);
    ai.mesh.rotation.y = -ai.heading + Math.PI / 2;
  }
}

// ═══════════════════════════════════════════════════════
// GHOST
// ═══════════════════════════════════════════════════════
function updateGhost() {
  if (state.mode !== "running" || !state.ghostEnabled || !state.bestGhostFrames || !state.bestGhostFrames.length) { ghostKart.visible = false; return; }
  const idx = clamp(Math.floor(state.totalTime / FIXED_DT), 0, state.bestGhostFrames.length - 1);
  const f = state.bestGhostFrames[idx];
  ghostKart.visible = true; ghostKart.position.set(f.x, f.y, f.z);
  ghostKart.rotation.y = -f.heading + Math.PI / 2;
}

// ═══════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════
function render() {
  kartMesh.position.copy(state.position);
  kartMesh.rotation.y = -state.heading + Math.PI / 2;
  const flames = kartMesh.getObjectByName("boosterFlames");
  if (flames) { const ts = state.boostTimeLeft > 0 ? 1 + Math.random() * 0.3 : 0; flames.scale.lerp(new THREE.Vector3(ts, ts, ts), 0.2); }
  if (state.boostTimeLeft > 0 && state.speed > TUNING.baseSpeed) vfxSpeedlinesEl.style.opacity = Math.min(1, state.speed / (TUNING.baseSpeed * 2));
  else vfxSpeedlinesEl.style.opacity = "0";
  updateAIKarts(FIXED_DT);
  updateGhost();
  camera.fov = THREE.MathUtils.lerp(camera.fov, state.boostTimeLeft > 0 ? 85 : 62, 0.1);
  camera.updateProjectionMatrix();
  const sway = Math.sin(state.totalTime * 30) * (state.boostTimeLeft > 0 ? 0.3 : 0);
  const ct = new THREE.Vector3(state.position.x - Math.cos(state.heading) * 22 + sway, 16 + (state.boostTimeLeft > 0 ? -2 : 0), state.position.z - Math.sin(state.heading) * 22 + sway);
  camera.position.lerp(ct, 0.15);
  camera.lookAt(state.position.x + Math.cos(state.heading) * 9, state.position.y + 4, state.position.z + Math.sin(state.heading) * 9);
  updateHUD();
  renderer.render(scene, camera);
}

// ═══════════════════════════════════════════════════════
// SELECTION UI
// ═══════════════════════════════════════════════════════
function buildKartSelectUI() {
  const grid = document.getElementById("kart-grid");
  grid.innerHTML = KART_DEFS.map((k, i) => {
    const stats = [
      { label: "SPD", val: k.speed, color: "#00ffff" },
      { label: "ACC", val: k.accel, color: "#ffcc00" },
      { label: "DFT", val: k.drift, color: "#ff00ff" },
      { label: "BST", val: k.boost, color: "#00ff88" },
      { label: "CRN", val: k.cornering, color: "#ff6644" },
    ];
    return `<div class="select-card ${i === selectedKartIdx ? 'selected' : ''}" data-idx="${i}">
      <div class="card-color-preview" style="background:#${k.color.toString(16).padStart(6, '0')}"></div>
      <div class="card-name" style="color:#${k.color.toString(16).padStart(6, '0')}">${k.name}</div>
      <div class="card-desc">${k.desc}</div>
      <div class="card-stats">${stats.map(s => `<div class="stat-row"><span class="stat-label">${s.label}</span><div class="stat-bar-bg"><div class="stat-bar" style="width:${s.val}%;background:${s.color}"></div></div></div>`).join('')}</div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.select-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedKartIdx = parseInt(card.dataset.idx);
      grid.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });
}

function buildTrackSelectUI() {
  const grid = document.getElementById("track-grid");
  grid.innerHTML = TRACK_DEFS.map((t, i) => `
    <div class="select-card ${i === selectedTrackIdx ? 'selected' : ''}" data-idx="${i}">
      <div class="card-name">${t.name}</div>
      <div class="card-desc">${t.desc}</div>
      <div class="track-card-colors">
        <div class="track-swatch" style="background:#${t.grassColor.toString(16).padStart(6, '0')}"></div>
        <div class="track-swatch" style="background:#${t.roadColor.toString(16).padStart(6, '0')}"></div>
        <div class="track-swatch" style="background:#${t.wallColor.toString(16).padStart(6, '0')}"></div>
        <div class="track-swatch" style="background:#${t.skyColor.toString(16).padStart(6, '0')}"></div>
      </div>
    </div>`).join('');
  grid.querySelectorAll('.select-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedTrackIdx = parseInt(card.dataset.idx);
      grid.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });
}

// ═══════════════════════════════════════════════════════
// FLOW
// ═══════════════════════════════════════════════════════
function showScreen(id) {
  [startScreenEl, kartSelectEl, trackSelectEl, finishScreenEl, dashboardEl].forEach(el => { if (el) el.classList.add("hidden"); });
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}

startBtn.addEventListener("click", () => {
  buildKartSelectUI();
  showScreen("kart-select-screen");
});

kartConfirmBtn.addEventListener("click", () => {
  buildTrackSelectUI();
  showScreen("track-select-screen");
});

trackConfirmBtn.addEventListener("click", async () => {
  showScreen("game-dashboard");
  // Apply selections
  const kd = KART_DEFS[selectedKartIdx];
  const td = TRACK_DEFS[selectedTrackIdx];
  TUNING = getKartTuning(kd);
  applyTrackConfig(td);
  buildTrackVisuals(td);
  // Replace player kart mesh
  scene.remove(kartMesh);
  kartMesh = createKartMesh(kd.color, kd.accent);
  scene.add(kartMesh);
  // Spawn AI with random karts
  spawnAIKarts();
  // Start race
  audio.init(); await audio.resume();
  resetRunState();
});

restartBtn.addEventListener("click", async () => {
  audio.init(); await audio.resume();
  showScreen("game-dashboard");
  resetRunState();
});

finishRestartBtn.addEventListener("click", () => {
  showScreen("start-screen");
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (e) => {
  if (e.code === "ArrowUp" || e.code === "KeyW") { if (!e.repeat) input.forwardTrigger = true; input.forward = true; }
  if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = true;
  if (e.code === "ArrowRight" || e.code === "KeyD") input.right = true;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "Space") input.drift = true;
  if (e.code === "KeyF") { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { }); else document.exitFullscreen().catch(() => { }); }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowUp" || e.code === "KeyW") input.forward = false;
  if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = false;
  if (e.code === "ArrowRight" || e.code === "KeyD") input.right = false;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight" || e.code === "Space") { input.drift = false; releaseDrift(); }
});

// ═══════════════════════════════════════════════════════
// INIT & GAME LOOP
// ═══════════════════════════════════════════════════════
buildTrackVisuals(TRACK_DEFS[0]);
resetKartPose();
render();

let lastTime = performance.now(), accumulator = 0;

function gameLoop(now) {
  const frameDt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now; accumulator += frameDt;
  while (accumulator >= FIXED_DT) {
    if (state.mode === "running" && state.countdown > 0) {
      state.countdown -= FIXED_DT;
      if (state.countdown <= 0) { countdownEl.style.display = "none"; state.lapStartTime = 0; state.totalTime = 0; }
      else {
        countdownEl.style.display = "block";
        const ci = Math.ceil(state.countdown);
        countdownEl.textContent = ci > 1 ? (ci - 1).toString() : "GO!";
        countdownEl.style.color = ci === 1 ? "#00ff00" : "#fff";
      }
    } else if (state.mode === "running") {
      updateKart(FIXED_DT);
    }
    accumulator -= FIXED_DT;
  }
  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
