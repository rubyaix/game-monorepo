import * as THREE from "three";

const FIXED_DT = 1 / 60;
const TOTAL_LAPS = 3;
const RACER_COUNT = 8;
const ITEM_CAPACITY = 1;
const BOOST_TIERS = [
  { tier: 1, charge: 0.6, duration: 0.7, multiplier: 1.14 },
  { tier: 2, charge: 1.4, duration: 1.1, multiplier: 1.22 },
  { tier: 3, charge: 2.3, duration: 1.5, multiplier: 1.3 },
];
const ITEMS = [
  "Micro Boost",
  "Triple Burst",
  "Splat Peel",
  "Wobble Pulse",
  "Side Swipe",
  "Goo Cloud",
  "Draft Magnet",
  "Bumper Bubble",
];
const DIFFICULTY_PRESETS = {
  Chill: { speedScale: 0.94, aggression: 0.56, itemRate: 0.42, reaction: 0.78 },
  Standard: { speedScale: 1.0, aggression: 0.82, itemRate: 0.62, reaction: 1.0 },
  Mean: { speedScale: 1.05, aggression: 1.06, itemRate: 0.8, reaction: 1.15 },
};

const CHARACTERS = [
  {
    name: "Axel",
    color: 0xe95b2d,
    stats: { accel: 1.12, topSpeed: 83, handling: 0.95, drift: 0.9, offroad: 0.82, weight: 1.05 },
    ai: { laneBias: 0.2, boldness: 0.85, driftLove: 0.75 },
  },
  {
    name: "Mina",
    color: 0xe5d05d,
    stats: { accel: 1.03, topSpeed: 80, handling: 1.14, drift: 1.15, offroad: 0.8, weight: 0.93 },
    ai: { laneBias: -0.45, boldness: 0.74, driftLove: 1.0 },
  },
  {
    name: "Brick",
    color: 0x8897aa,
    stats: { accel: 0.96, topSpeed: 86, handling: 0.84, drift: 0.76, offroad: 0.9, weight: 1.2 },
    ai: { laneBias: 0.55, boldness: 1.0, driftLove: 0.58 },
  },
  {
    name: "Nova",
    color: 0x6be5d1,
    stats: { accel: 1.08, topSpeed: 81, handling: 1.06, drift: 1.08, offroad: 0.78, weight: 0.9 },
    ai: { laneBias: -0.1, boldness: 0.84, driftLove: 0.9 },
  },
  {
    name: "Rook",
    color: 0x8d79f2,
    stats: { accel: 1.0, topSpeed: 84, handling: 0.9, drift: 0.86, offroad: 0.92, weight: 1.16 },
    ai: { laneBias: 0.4, boldness: 0.95, driftLove: 0.64 },
  },
  {
    name: "Pico",
    color: 0x5fd26d,
    stats: { accel: 1.18, topSpeed: 78, handling: 1.2, drift: 1.22, offroad: 0.74, weight: 0.84 },
    ai: { laneBias: -0.62, boldness: 0.66, driftLove: 1.12 },
  },
  {
    name: "Vera",
    color: 0xf08dc9,
    stats: { accel: 1.1, topSpeed: 82, handling: 1.02, drift: 0.98, offroad: 0.86, weight: 0.99 },
    ai: { laneBias: 0.08, boldness: 0.88, driftLove: 0.82 },
  },
  {
    name: "Torque",
    color: 0x5ca0ff,
    stats: { accel: 0.92, topSpeed: 87, handling: 0.82, drift: 0.72, offroad: 0.94, weight: 1.22 },
    ai: { laneBias: 0.68, boldness: 1.08, driftLove: 0.5 },
  },
];

function vec(x, z) {
  return new THREE.Vector3(x, 0, z);
}

const TRACK_DEFS = [
  {
    name: "Sunset Oval",
    roadHalfWidth: 22,
    wallHalfWidth: 28,
    points: [
      vec(-130, 85),
      vec(-30, 92),
      vec(95, 88),
      vec(145, 35),
      vec(140, -62),
      vec(50, -90),
      vec(-78, -83),
      vec(-145, -28),
    ],
    driftZones: [
      { start: 0.12, end: 0.23 },
      { start: 0.62, end: 0.74 },
    ],
    hazards: [
      { s: 0.34, lane: -0.55, radius: 5.5 },
      { s: 0.88, lane: 0.58, radius: 5.5 },
    ],
    variation: { amp: 0.45, freq: 2.0 },
    music: [261.63, 293.66, 329.63, 349.23, 392.0, 349.23, 329.63, 293.66],
    sky: 0x8fcff0,
  },
  {
    name: "Brick Harbor",
    roadHalfWidth: 21,
    wallHalfWidth: 27,
    points: [
      vec(-135, 65),
      vec(-40, 110),
      vec(66, 95),
      vec(126, 34),
      vec(118, -20),
      vec(58, -56),
      vec(-6, -44),
      vec(-66, -88),
      vec(-134, -36),
    ],
    driftZones: [
      { start: 0.08, end: 0.17 },
      { start: 0.42, end: 0.5 },
      { start: 0.72, end: 0.79 },
    ],
    hazards: [
      { s: 0.24, lane: 0.2, radius: 5.8 },
      { s: 0.57, lane: -0.4, radius: 5.4 },
    ],
    variation: { amp: 0.52, freq: 3.0 },
    music: [220.0, 246.94, 293.66, 329.63, 293.66, 246.94, 196.0, 220.0],
    sky: 0x84b9de,
  },
  {
    name: "Mesa Sprint",
    roadHalfWidth: 20,
    wallHalfWidth: 26,
    points: [
      vec(-150, 70),
      vec(-52, 78),
      vec(52, 112),
      vec(128, 72),
      vec(135, -10),
      vec(88, -78),
      vec(-12, -98),
      vec(-118, -72),
      vec(-150, -12),
    ],
    driftZones: [
      { start: 0.15, end: 0.22 },
      { start: 0.35, end: 0.47 },
      { start: 0.68, end: 0.79 },
    ],
    hazards: [
      { s: 0.28, lane: -0.5, radius: 4.9 },
      { s: 0.82, lane: 0.45, radius: 5.3 },
    ],
    variation: { amp: 0.4, freq: 2.8 },
    music: [293.66, 329.63, 392.0, 440.0, 392.0, 349.23, 329.63, 293.66],
    sky: 0xa8daf5,
  },
  {
    name: "Frost Bite",
    roadHalfWidth: 22,
    wallHalfWidth: 29,
    points: [
      vec(-145, 86),
      vec(-78, 114),
      vec(15, 108),
      vec(95, 82),
      vec(140, 18),
      vec(118, -62),
      vec(52, -96),
      vec(-34, -92),
      vec(-114, -58),
      vec(-150, 16),
    ],
    driftZones: [
      { start: 0.05, end: 0.14 },
      { start: 0.45, end: 0.53 },
      { start: 0.77, end: 0.86 },
    ],
    hazards: [
      { s: 0.3, lane: 0.52, radius: 5.7 },
      { s: 0.64, lane: -0.48, radius: 5.6 },
    ],
    variation: { amp: 0.55, freq: 2.2 },
    music: [246.94, 293.66, 329.63, 369.99, 329.63, 293.66, 261.63, 220.0],
    sky: 0xb6dff4,
  },
  {
    name: "Neon Coil",
    roadHalfWidth: 21,
    wallHalfWidth: 27,
    points: [
      vec(-150, 54),
      vec(-72, 92),
      vec(22, 110),
      vec(108, 82),
      vec(148, 26),
      vec(110, -30),
      vec(26, -48),
      vec(-22, -92),
      vec(-116, -86),
      vec(-152, -20),
    ],
    driftZones: [
      { start: 0.11, end: 0.19 },
      { start: 0.39, end: 0.49 },
      { start: 0.7, end: 0.82 },
    ],
    hazards: [
      { s: 0.22, lane: -0.35, radius: 5.2 },
      { s: 0.58, lane: 0.5, radius: 5.2 },
    ],
    variation: { amp: 0.6, freq: 3.3 },
    music: [261.63, 311.13, 349.23, 392.0, 349.23, 311.13, 293.66, 261.63],
    sky: 0x80c4f0,
  },
  {
    name: "Cinder Ring",
    roadHalfWidth: 20,
    wallHalfWidth: 26,
    points: [
      vec(-130, 92),
      vec(-35, 108),
      vec(68, 92),
      vec(132, 44),
      vec(148, -30),
      vec(94, -88),
      vec(-10, -108),
      vec(-92, -86),
      vec(-146, -28),
    ],
    driftZones: [
      { start: 0.14, end: 0.26 },
      { start: 0.5, end: 0.58 },
      { start: 0.74, end: 0.82 },
    ],
    hazards: [
      { s: 0.35, lane: 0.44, radius: 5.1 },
      { s: 0.86, lane: -0.4, radius: 5.3 },
    ],
    variation: { amp: 0.42, freq: 2.7 },
    music: [233.08, 261.63, 311.13, 349.23, 329.63, 293.66, 261.63, 233.08],
    sky: 0x9fd0ef,
  },
  {
    name: "Grove Dash",
    roadHalfWidth: 23,
    wallHalfWidth: 29,
    points: [
      vec(-152, 78),
      vec(-92, 112),
      vec(-8, 108),
      vec(78, 95),
      vec(140, 56),
      vec(150, -14),
      vec(96, -76),
      vec(18, -102),
      vec(-72, -92),
      vec(-146, -46),
    ],
    driftZones: [
      { start: 0.18, end: 0.28 },
      { start: 0.47, end: 0.57 },
      { start: 0.79, end: 0.89 },
    ],
    hazards: [
      { s: 0.31, lane: -0.42, radius: 5.4 },
      { s: 0.62, lane: 0.36, radius: 5.5 },
    ],
    variation: { amp: 0.48, freq: 2.4 },
    music: [196.0, 220.0, 261.63, 293.66, 261.63, 246.94, 220.0, 196.0],
    sky: 0x9ed3eb,
  },
  {
    name: "Ripple Circuit",
    roadHalfWidth: 21,
    wallHalfWidth: 27,
    points: [
      vec(-150, 62),
      vec(-84, 96),
      vec(-4, 118),
      vec(68, 100),
      vec(132, 58),
      vec(154, -2),
      vec(120, -58),
      vec(44, -88),
      vec(-30, -102),
      vec(-102, -76),
      vec(-152, -26),
    ],
    driftZones: [
      { start: 0.13, end: 0.22 },
      { start: 0.37, end: 0.49 },
      { start: 0.66, end: 0.76 },
    ],
    hazards: [
      { s: 0.26, lane: 0.38, radius: 5.0 },
      { s: 0.55, lane: -0.5, radius: 5.0 },
      { s: 0.88, lane: 0.48, radius: 5.1 },
    ],
    variation: { amp: 0.54, freq: 3.1 },
    music: [207.65, 246.94, 277.18, 311.13, 277.18, 246.94, 233.08, 207.65],
    sky: 0x8fc9ea,
  },
];

const canvas = document.getElementById("game-canvas");
const hudEl = document.getElementById("hud");
const preRaceEl = document.getElementById("pre-race");
const optionsEl = document.getElementById("options-menu");
const pauseEl = document.getElementById("pause-menu");
const resultsEl = document.getElementById("results-menu");

const bannerEl = document.getElementById("banner");
const positionEl = document.getElementById("position-text");
const lapEl = document.getElementById("lap-text");
const timerEl = document.getElementById("timer-text");
const splitEl = document.getElementById("split-text");
const itemEl = document.getElementById("item-text");
const speedEl = document.getElementById("speed-text");
const minimapEl = document.getElementById("minimap");
const minimapCtx = minimapEl.getContext("2d");

const trackSelect = document.getElementById("track-select");
const charSelect = document.getElementById("character-select");
const diffSelect = document.getElementById("difficulty-select");
const mirrorToggle = document.getElementById("mirror-toggle");
const clonesToggle = document.getElementById("clones-toggle");

const openOptionsBtn = document.getElementById("open-options");
const startRaceBtn = document.getElementById("start-race");
const closeOptionsBtn = document.getElementById("close-options");
const resumeBtn = document.getElementById("resume-btn");
const restartBtn = document.getElementById("restart-btn");
const quitBtn = document.getElementById("quit-btn");
const resultsRestartBtn = document.getElementById("results-restart");
const resultsQuitBtn = document.getElementById("results-quit");
const resultsText = document.getElementById("results-text");

const masterVolumeInput = document.getElementById("master-volume");
const musicVolumeInput = document.getElementById("music-volume");
const sfxVolumeInput = document.getElementById("sfx-volume");

const input = {
  left: false,
  right: false,
  drift: false,
  itemPressed: false,
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 2500);
camera.position.set(0, 38, -52);
scene.add(new THREE.AmbientLight(0xffffff, 0.72));
const sun = new THREE.DirectionalLight(0xfff1d6, 0.92);
sun.position.set(180, 260, 120);
scene.add(sun);

const worldRoot = new THREE.Group();
scene.add(worldRoot);
const racerRoot = new THREE.Group();
scene.add(racerRoot);
const fxRoot = new THREE.Group();
scene.add(fxRoot);

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.driftNoise = null;
    this.driftGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.pattern = TRACK_DEFS[0].music;
  }

  init() {
    if (this.ctx) {
      return;
    }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.55;
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.7;
    this.musicGain.connect(this.master);
    this.sfxGain.connect(this.master);
    this.master.connect(this.ctx.destination);

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = 120;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0001;
    this.engineOsc.connect(this.engineGain).connect(this.sfxGain);
    this.engineOsc.start();

    this.driftNoise = this.#createNoise();
    this.driftGain = this.ctx.createGain();
    this.driftGain.gain.value = 0.0001;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1000;
    this.driftNoise.connect(filter).connect(this.driftGain).connect(this.sfxGain);
    this.driftNoise.start();

    this.#startMusic();
  }

  #createNoise() {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  async resume() {
    if (!this.ctx) {
      return;
    }
    if (this.ctx.state !== "running") {
      await this.ctx.resume();
    }
  }

  setVolumes(master, music, sfx) {
    if (!this.master) {
      return;
    }
    this.master.gain.value = master;
    this.musicGain.gain.value = music;
    this.sfxGain.gain.value = sfx;
  }

  setPattern(pattern) {
    this.pattern = pattern;
    this.musicStep = 0;
  }

  #startMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
    }
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== "running") {
        return;
      }
      const now = this.ctx.currentTime;
      const freq = this.pattern[this.musicStep % this.pattern.length];
      this.musicStep += 1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.21);
      osc.connect(gain).connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 0.23);
    }, 230);
  }

  setEngine(speedNorm) {
    if (!this.engineOsc || !this.engineGain || !this.ctx) {
      return;
    }
    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(100 + speedNorm * 120, now, 0.03);
    this.engineGain.gain.setTargetAtTime(0.02 + speedNorm * 0.08, now, 0.03);
  }

  setDrift(active, amount) {
    if (!this.driftGain || !this.ctx) {
      return;
    }
    const now = this.ctx.currentTime;
    const target = active ? 0.015 + amount * 0.08 : 0.0001;
    this.driftGain.gain.setTargetAtTime(target, now, 0.03);
  }

  beep(freq, duration = 0.12, level = 0.06, type = "square") {
    if (!this.ctx) {
      return;
    }
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  sfx(name) {
    if (!this.ctx) {
      return;
    }
    if (name === "item") this.beep(520, 0.14, 0.08, "triangle");
    if (name === "boost") {
      this.beep(420, 0.08, 0.08, "sawtooth");
      this.beep(650, 0.12, 0.07, "triangle");
    }
    if (name === "hit") this.beep(160, 0.15, 0.07, "square");
    if (name === "lap") {
      this.beep(620, 0.11, 0.07, "triangle");
      this.beep(740, 0.14, 0.06, "triangle");
    }
    if (name === "finish") {
      this.beep(659.25, 0.14, 0.08, "triangle");
      this.beep(783.99, 0.16, 0.08, "triangle");
      this.beep(987.77, 0.2, 0.08, "triangle");
    }
  }
}

const audio = new AudioManager();

const state = {
  mode: "preRace",
  raceTime: 0,
  finishedCount: 0,
  bannerTimer: 0,
  trackIndex: 0,
  characterIndex: 0,
  difficulty: "Standard",
  mirror: false,
  allowClones: false,
  racers: [],
  player: null,
  ranking: [],
  trackRuntime: null,
  worldMeshes: [],
  hazardMeshes: [],
  dynamicHazards: [],
  itemBoxes: [],
  mapBounds: null,
  restartSnapshot: null,
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function wrap(value, max) {
  let r = value % max;
  if (r < 0) {
    r += max;
  }
  return r;
}

function deltaAngle(a, b) {
  let d = (b - a + Math.PI) % (2 * Math.PI);
  if (d < 0) {
    d += Math.PI * 2;
  }
  return d - Math.PI;
}

function lerpAngle(a, b, t) {
  return a + deltaAngle(a, b) * t;
}

function timeToText(seconds) {
  const ms = Math.max(0, Math.floor(seconds * 1000));
  const mins = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  return `${String(mins).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(milli).padStart(3, "0")}`;
}

function createInstancedBox(cells, size, color) {
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const material = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
  const matrix = new THREE.Matrix4();
  cells.forEach((c, idx) => {
    matrix.makeTranslation(c.x, c.y, c.z);
    mesh.setMatrixAt(idx, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function addCell(list, set, x, y, z) {
  const key = `${Math.round(x * 2) / 2}|${Math.round(y * 2) / 2}|${Math.round(z * 2) / 2}`;
  if (set.has(key)) {
    return;
  }
  set.add(key);
  list.push({ x, y, z });
}

function buildTrackRuntime(trackDef, mirrored) {
  const mirroredPoints = trackDef.points.map((p) => vec(mirrored ? -p.x : p.x, p.z));
  const curve = new THREE.CatmullRomCurve3(mirroredPoints, true, "catmullrom", 0.08);
  const pointCount = 900;
  const points = [];
  const tangents = [];
  const normals = [];
  const cumulative = [0];
  for (let i = 0; i <= pointCount; i += 1) {
    const t = i / pointCount;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).setY(0).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x);
    points.push(p);
    tangents.push(tangent);
    normals.push(normal);
    if (i > 0) {
      cumulative.push(cumulative[cumulative.length - 1] + points[i].distanceTo(points[i - 1]));
    }
  }
  const length = cumulative[cumulative.length - 1];

  function sampleAtS(s) {
    const wrapped = wrap(s, length);
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (cumulative[mid] < wrapped) lo = mid + 1;
      else hi = mid;
    }
    const idx = Math.max(1, lo);
    const prevDist = cumulative[idx - 1];
    const nextDist = cumulative[idx];
    const blend = nextDist > prevDist ? (wrapped - prevDist) / (nextDist - prevDist) : 0;
    const p = new THREE.Vector3().lerpVectors(points[idx - 1], points[idx], blend);
    const t = new THREE.Vector3().lerpVectors(tangents[idx - 1], tangents[idx], blend).normalize();
    const n = new THREE.Vector3(-t.z, 0, t.x).normalize();
    return { p, t, n, s: wrapped };
  }

  function nearestInfo(position) {
    let best = 0;
    let bestDistSq = Infinity;
    for (let i = 0; i < points.length; i += 6) {
      const dx = position.x - points[i].x;
      const dz = position.z - points[i].z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        best = i;
      }
    }
    const start = Math.max(0, best - 8);
    const end = Math.min(points.length - 2, best + 8);
    bestDistSq = Infinity;
    let bestS = cumulative[best];
    let bestP = points[best];
    let bestT = tangents[best];
    let bestN = normals[best];
    for (let i = start; i <= end; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      const ab = new THREE.Vector3().subVectors(b, a);
      const ap = new THREE.Vector3().subVectors(position, a);
      const denom = ab.lengthSq();
      const u = denom > 1e-6 ? clamp(ap.dot(ab) / denom, 0, 1) : 0;
      const proj = new THREE.Vector3().lerpVectors(a, b, u);
      const dx = position.x - proj.x;
      const dz = position.z - proj.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestDistSq) {
        bestDistSq = d2;
        bestP = proj;
        const tangent = new THREE.Vector3().subVectors(b, a).setY(0).normalize();
        bestT = tangent;
        bestN = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
        bestS = cumulative[i] + points[i].distanceTo(proj);
      }
    }
    const rel = new THREE.Vector3().subVectors(position, bestP);
    const lateral = rel.dot(bestN);
    return {
      p: bestP,
      t: bestT,
      n: bestN,
      s: wrap(bestS, length),
      lateral,
      distance: Math.sqrt(bestDistSq),
    };
  }

  const mapMin = new THREE.Vector2(Infinity, Infinity);
  const mapMax = new THREE.Vector2(-Infinity, -Infinity);
  points.forEach((p) => {
    mapMin.x = Math.min(mapMin.x, p.x);
    mapMin.y = Math.min(mapMin.y, p.z);
    mapMax.x = Math.max(mapMax.x, p.x);
    mapMax.y = Math.max(mapMax.y, p.z);
  });

  return {
    def: trackDef,
    curve,
    points,
    tangents,
    normals,
    cumulative,
    length,
    sampleAtS,
    nearestInfo,
    mapMin,
    mapMax,
    roadHalfWidth: trackDef.roadHalfWidth,
    wallHalfWidth: trackDef.wallHalfWidth,
  };
}

function clearWorld() {
  state.worldMeshes.forEach((obj) => {
    worldRoot.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  state.hazardMeshes.forEach((obj) => {
    worldRoot.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  });
  state.worldMeshes = [];
  state.hazardMeshes = [];
  state.itemBoxes = [];
  state.dynamicHazards = [];
}

function rebuildTrackWorld() {
  clearWorld();
  const runtime = buildTrackRuntime(TRACK_DEFS[state.trackIndex], state.mirror);
  state.trackRuntime = runtime;
  scene.background = new THREE.Color(runtime.def.sky);

  const grass = [];
  const grassSet = new Set();
  for (let x = -260; x <= 260; x += 8) {
    for (let z = -220; z <= 220; z += 8) {
      addCell(grass, grassSet, x, -2.5, z);
    }
  }

  const road = [];
  const roadSet = new Set();
  const shoulder = [];
  const shoulderSet = new Set();
  const walls = [];
  const wallSet = new Set();

  for (let s = 0; s < runtime.length; s += 2.7) {
    const sample = runtime.sampleAtS(s);
    for (let w = -runtime.wallHalfWidth; w <= runtime.wallHalfWidth; w += 3.2) {
      const px = sample.p.x + sample.n.x * w;
      const pz = sample.p.z + sample.n.z * w;
      if (Math.abs(w) <= runtime.roadHalfWidth) {
        addCell(road, roadSet, px, 0.25, pz);
      } else {
        addCell(shoulder, shoulderSet, px, 0.2, pz);
      }
    }
    const wx1 = sample.p.x + sample.n.x * runtime.wallHalfWidth;
    const wz1 = sample.p.z + sample.n.z * runtime.wallHalfWidth;
    const wx2 = sample.p.x - sample.n.x * runtime.wallHalfWidth;
    const wz2 = sample.p.z - sample.n.z * runtime.wallHalfWidth;
    addCell(walls, wallSet, wx1, 2.0, wz1);
    addCell(walls, wallSet, wx2, 2.0, wz2);
  }

  const grassMesh = createInstancedBox(grass, { x: 8, y: 5, z: 8 }, 0x3d6f34);
  const shoulderMesh = createInstancedBox(shoulder, { x: 3.2, y: 1, z: 3.2 }, 0x5f7d48);
  const roadMesh = createInstancedBox(road, { x: 3.2, y: 1, z: 3.2 }, 0x29303a);
  const wallMesh = createInstancedBox(walls, { x: 3.2, y: 4.2, z: 3.2 }, 0xbbb3a2);
  worldRoot.add(grassMesh, shoulderMesh, roadMesh, wallMesh);
  state.worldMeshes.push(grassMesh, shoulderMesh, roadMesh, wallMesh);

  const startSample = runtime.sampleAtS(8);
  const finishLine = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.8, runtime.roadHalfWidth * 2),
    new THREE.MeshLambertMaterial({ color: 0xf2dd63 }),
  );
  finishLine.position.set(startSample.p.x, 0.9, startSample.p.z);
  finishLine.rotation.y = -Math.atan2(startSample.t.z, startSample.t.x);
  worldRoot.add(finishLine);
  state.worldMeshes.push(finishLine);

  const itemPositions = [];
  for (let i = 1; i <= 12; i += 1) {
    const ratio = i / 12;
    const lane = (i % 3) - 1;
    itemPositions.push({ s: runtime.length * ratio, lane: lane * 0.45 });
  }
  itemPositions.forEach((entry) => {
    const sample = runtime.sampleAtS(entry.s);
    const pos = sample.p.clone().add(sample.n.clone().multiplyScalar(entry.lane * runtime.roadHalfWidth * 0.64));
    pos.y = 2.4;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 2.8, 2.8),
      new THREE.MeshLambertMaterial({ color: 0x62d8ff, emissive: 0x1e4055 }),
    );
    mesh.position.copy(pos);
    worldRoot.add(mesh);
    state.itemBoxes.push({ s: entry.s, lane: entry.lane, mesh, respawn: 0 });
  });

  runtime.def.hazards.forEach((hazardDef) => {
    const s = hazardDef.s * runtime.length;
    const sample = runtime.sampleAtS(s);
    const pos = sample.p.clone().add(sample.n.clone().multiplyScalar(hazardDef.lane * runtime.roadHalfWidth));
    pos.y = 0.8;
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(hazardDef.radius * 0.42, hazardDef.radius * 0.42, 1.2, 8),
      new THREE.MeshLambertMaterial({ color: 0xaa6d2f }),
    );
    mesh.position.copy(pos);
    worldRoot.add(mesh);
    state.hazardMeshes.push(mesh);
    state.dynamicHazards.push({
      type: "static",
      s,
      lane: hazardDef.lane,
      radius: hazardDef.radius,
      x: pos.x,
      z: pos.z,
      life: Infinity,
      mesh,
    });
  });

  state.mapBounds = {
    minX: runtime.mapMin.x,
    maxX: runtime.mapMax.x,
    minZ: runtime.mapMin.y,
    maxZ: runtime.mapMax.y,
  };
}

function createKartMesh(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 1.7, 7.2),
    new THREE.MeshLambertMaterial({ color }),
  );
  body.position.y = 1.8;
  group.add(body);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 1.6, 2.9),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(color).offsetHSL(0, 0, 0.08) }),
  );
  top.position.set(0, 2.9, -0.4);
  group.add(top);

  const dark = new THREE.MeshLambertMaterial({ color: 0x171d27 });
  const wheelOffsets = [
    [-2.2, 0.85, 2.2],
    [2.2, 0.85, 2.2],
    [-2.2, 0.85, -2.2],
    [2.2, 0.85, -2.2],
  ];
  wheelOffsets.forEach((w) => {
    const wheel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), dark);
    wheel.position.set(w[0], w[1], w[2]);
    group.add(wheel);
  });
  return group;
}

function chooseCpuCharacters(playerIndex, allowClones) {
  const cpu = [];
  const pool = CHARACTERS.map((_, idx) => idx);
  if (!allowClones) {
    const filtered = pool.filter((idx) => idx !== playerIndex);
    while (cpu.length < RACER_COUNT - 1 && filtered.length > 0) {
      const pick = Math.floor(Math.random() * filtered.length);
      cpu.push(filtered.splice(pick, 1)[0]);
    }
  } else {
    while (cpu.length < RACER_COUNT - 1) {
      cpu.push(Math.floor(Math.random() * CHARACTERS.length));
    }
  }
  return cpu;
}

function clearRacersFromScene() {
  while (racerRoot.children.length > 0) {
    racerRoot.remove(racerRoot.children[0]);
  }
}

function resetRacersFromSelection() {
  clearRacersFromScene();
  state.racers = [];

  const runtime = state.trackRuntime;
  const start = runtime.sampleAtS(8);
  const heading = Math.atan2(start.t.z, start.t.x);

  const indices = [state.characterIndex, ...chooseCpuCharacters(state.characterIndex, state.allowClones)];

  for (let i = 0; i < RACER_COUNT; i += 1) {
    const charIndex = indices[i];
    const char = CHARACTERS[charIndex];
    const row = Math.floor(i / 2);
    const side = i % 2 === 0 ? -1 : 1;
    const gridBack = row * 8;
    const lateral = side * (4.2 + row * 0.4);

    const base = runtime.sampleAtS(8 - gridBack);
    const pos = base.p.clone().add(base.n.clone().multiplyScalar(lateral));
    pos.y = 1.1;

    const mesh = createKartMesh(char.color);
    mesh.position.copy(pos);
    racerRoot.add(mesh);

    const racer = {
      id: i,
      isPlayer: i === 0,
      charIndex,
      char,
      mesh,
      heading,
      speed: 0,
      lane: side * 0.25,
      laneTarget: char.ai.laneBias,
      aiSeed: Math.random() * 100,
      driftHold: 0,
      drifting: false,
      driftDir: 0,
      boostTier: 0,
      boostTimer: 0,
      boostMult: 1,
      tripleCharges: 0,
      triplePulseTimer: 0,
      item: null,
      itemCooldown: 0,
      statuses: {
        wobble: 0,
        steerDisable: 0,
        spinout: 0,
        shield: 0,
        tractionLoss: 0,
      },
      lapProgress: 0,
      lastS: runtime.nearestInfo(pos).s,
      completedLaps: 0,
      lapStartTime: 0,
      lapTimes: [],
      totalDistance: 0,
      finished: false,
      finishTime: null,
      rank: i + 1,
    };
    state.racers.push(racer);
  }

  state.player = state.racers[0];
}

function startRace() {
  state.trackIndex = trackSelect.selectedIndex;
  state.characterIndex = charSelect.selectedIndex;
  state.difficulty = diffSelect.value;
  state.mirror = mirrorToggle.checked;
  state.allowClones = clonesToggle.checked;

  rebuildTrackWorld();
  resetRacersFromSelection();

  state.mode = "racing";
  state.raceTime = 0;
  state.finishedCount = 0;
  state.bannerTimer = 0;
  state.ranking = [...state.racers];
  state.restartSnapshot = {
    trackIndex: state.trackIndex,
    characterIndex: state.characterIndex,
    difficulty: state.difficulty,
    mirror: state.mirror,
    allowClones: state.allowClones,
  };

  audio.init();
  audio.resume();
  audio.setPattern(TRACK_DEFS[state.trackIndex].music);
  audio.sfx("lap");
  setOverlayState();
}

function restartRace() {
  if (!state.restartSnapshot) {
    return;
  }
  trackSelect.selectedIndex = state.restartSnapshot.trackIndex;
  charSelect.selectedIndex = state.restartSnapshot.characterIndex;
  diffSelect.value = state.restartSnapshot.difficulty;
  mirrorToggle.checked = state.restartSnapshot.mirror;
  clonesToggle.checked = state.restartSnapshot.allowClones;
  startRace();
}

function quitToPreRace() {
  state.mode = "preRace";
  clearRacersFromScene();
  state.racers = [];
  state.player = null;
  state.dynamicHazards = state.dynamicHazards.filter((h) => h.type === "static");
  setOverlayState();
}

function setOverlayState() {
  const isPre = state.mode === "preRace";
  const isOptions = state.mode === "options";
  const isRace = state.mode === "racing";
  const isPause = state.mode === "paused";
  const isResult = state.mode === "results";

  preRaceEl.classList.toggle("hidden", !isPre);
  optionsEl.classList.toggle("hidden", !isOptions);
  pauseEl.classList.toggle("hidden", !isPause);
  resultsEl.classList.toggle("hidden", !isResult);
  hudEl.classList.toggle("hidden", !(isRace || isPause));
}

function updateRacerRankings() {
  const sorted = [...state.racers].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.totalDistance - a.totalDistance;
  });
  sorted.forEach((r, idx) => {
    r.rank = idx + 1;
  });
  state.ranking = sorted;
}

function weightedItemPick(rank, total) {
  const ratio = (rank - 1) / Math.max(1, total - 1);
  const behind = ratio;
  const front = 1 - ratio;
  const weights = {
    "Micro Boost": 13 + front * 7,
    "Triple Burst": 10 + behind * 8,
    "Splat Peel": 11 + behind * 2,
    "Wobble Pulse": 8 + behind * 6,
    "Side Swipe": 8 + behind * 5,
    "Goo Cloud": 8 + behind * 6,
    "Draft Magnet": 10 + behind * 9,
    "Bumper Bubble": 12 + front * 5,
  };
  const totalWeight = ITEMS.reduce((sum, item) => sum + weights[item], 0);
  let pick = Math.random() * totalWeight;
  for (const item of ITEMS) {
    pick -= weights[item];
    if (pick <= 0) return item;
  }
  return ITEMS[0];
}

function nearestAheadRacer(source, maxDistance) {
  let best = null;
  let bestGap = Infinity;
  state.racers.forEach((other) => {
    if (other.id === source.id || other.finished) return;
    const gap = other.totalDistance - source.totalDistance;
    if (gap > 0 && gap < maxDistance && gap < bestGap) {
      best = other;
      bestGap = gap;
    }
  });
  return best;
}

function spawnDynamicHazard(type, position, duration, radius) {
  const color = type === "peel" ? 0xf3e26f : 0x5dc2a8;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.34, radius * 0.5, 0.8, 8),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.set(position.x, 0.8, position.z);
  worldRoot.add(mesh);
  state.hazardMeshes.push(mesh);
  state.dynamicHazards.push({
    type,
    x: position.x,
    z: position.z,
    radius,
    life: duration,
    mesh,
  });
}

function applyBoost(racer, tier, duration, mult) {
  racer.boostTier = tier;
  racer.boostTimer = duration;
  racer.boostMult = mult;
  if (racer.isPlayer) {
    audio.sfx("boost");
  }
}

function releaseDrift(racer) {
  if (!racer.drifting) return;
  let tierData = null;
  for (let i = BOOST_TIERS.length - 1; i >= 0; i -= 1) {
    if (racer.driftHold >= BOOST_TIERS[i].charge) {
      tierData = BOOST_TIERS[i];
      break;
    }
  }
  if (tierData) {
    applyBoost(racer, tierData.tier, tierData.duration, tierData.multiplier);
  }
  racer.drifting = false;
  racer.driftHold = 0;
  racer.driftDir = 0;
}

function useItem(racer) {
  if (!racer.item || racer.itemCooldown > 0) return;
  const info = state.trackRuntime.nearestInfo(racer.mesh.position);
  const forward = new THREE.Vector3(Math.cos(racer.heading), 0, Math.sin(racer.heading));

  switch (racer.item) {
    case "Micro Boost":
      applyBoost(racer, 1, 0.95, 1.18);
      break;
    case "Triple Burst":
      racer.tripleCharges = 3;
      racer.triplePulseTimer = 0;
      break;
    case "Splat Peel":
      spawnDynamicHazard("peel", racer.mesh.position.clone().add(forward.clone().multiplyScalar(-4)), 8.0, 4.4);
      break;
    case "Wobble Pulse": {
      const target = nearestAheadRacer(racer, 34);
      if (target) {
        target.statuses.wobble = Math.max(target.statuses.wobble, 1.1);
        target.speed *= 0.9;
      }
      break;
    }
    case "Side Swipe": {
      const target = nearestAheadRacer(racer, 26);
      if (target) {
        target.statuses.steerDisable = Math.max(target.statuses.steerDisable, 0.55);
      }
      break;
    }
    case "Goo Cloud":
      spawnDynamicHazard("goo", info.p.clone().add(forward.clone().multiplyScalar(8)), 7.0, 5.2);
      break;
    case "Draft Magnet":
      applyBoost(racer, 2, 1.2, 1.2);
      break;
    case "Bumper Bubble":
      racer.statuses.shield = Math.max(racer.statuses.shield, 3.0);
      break;
    default:
      break;
  }

  racer.item = null;
  racer.itemCooldown = 0.4;
  if (racer.isPlayer) {
    audio.sfx("item");
  }
}

function isInDriftZone(s) {
  const ratio = s / state.trackRuntime.length;
  return state.trackRuntime.def.driftZones.some((zone) => {
    return ratio >= zone.start && ratio <= zone.end;
  });
}

function updateAi(racer, dt) {
  const track = state.trackRuntime;
  const diff = DIFFICULTY_PRESETS[state.difficulty];
  const info = track.nearestInfo(racer.mesh.position);

  const lookAhead = 22 + racer.speed * 0.18;
  const variation =
    Math.sin((info.s / track.length) * Math.PI * 2 * track.def.variation.freq + racer.aiSeed) *
    track.def.variation.amp;

  let laneTarget = racer.char.ai.laneBias * 0.55 + variation;

  const ahead = nearestAheadRacer(racer, 22 + diff.aggression * 12);
  if (ahead && Math.abs(ahead.lane - racer.lane) < 0.42) {
    laneTarget += ahead.lane > 0 ? -0.56 : 0.56;
  }

  state.dynamicHazards.forEach((hazard) => {
    if (!Number.isFinite(hazard.life) && hazard.type !== "static") {
      return;
    }
    if (hazard.type === "static" && typeof hazard.s === "number") {
      const d = wrap(hazard.s - info.s, track.length);
      if (d > 0 && d < 20) {
        laneTarget += hazard.lane > 0 ? -0.5 : 0.5;
      }
    }
  });

  racer.laneTarget = clamp(laneTarget, -0.92, 0.92);
  racer.lane = lerp(racer.lane, racer.laneTarget, dt * 1.6 * diff.reaction);

  const targetSample = track.sampleAtS(info.s + lookAhead);
  const targetPos = targetSample.p.clone().add(targetSample.n.clone().multiplyScalar(racer.lane * track.roadHalfWidth * 0.78));
  const toTarget = new THREE.Vector3().subVectors(targetPos, racer.mesh.position);
  let steer = clamp(deltaAngle(racer.heading, Math.atan2(toTarget.z, toTarget.x)) * 1.8, -1, 1);

  if (racer.statuses.steerDisable > 0) {
    steer = 0;
  }
  if (racer.statuses.wobble > 0) {
    steer += Math.sin(state.raceTime * 12 + racer.aiSeed) * 0.25;
  }

  const driftZone = isInDriftZone(info.s);
  if (driftZone && Math.abs(steer) > 0.36 && racer.speed > 48 && racer.statuses.spinout <= 0) {
    racer.drifting = true;
    racer.driftDir = Math.sign(steer) || racer.driftDir || 1;
    racer.driftHold += dt;
  } else if (racer.drifting && (!driftZone || Math.abs(steer) < 0.12)) {
    releaseDrift(racer);
  }

  if (racer.item && Math.random() < dt * (0.25 + diff.itemRate * 0.5)) {
    useItem(racer);
  }

  return steer;
}

function enforceTrackBounds(racer) {
  const track = state.trackRuntime;
  const info = track.nearestInfo(racer.mesh.position);
  const maxLateral = track.roadHalfWidth * 0.94;
  if (Math.abs(info.lateral) > maxLateral) {
    const side = Math.sign(info.lateral) || 1;
    racer.mesh.position.copy(info.p.clone().add(info.n.clone().multiplyScalar(side * maxLateral)));
    racer.speed *= 0.86;
    const tangentHeading = Math.atan2(info.t.z, info.t.x);
    racer.heading = lerpAngle(racer.heading, tangentHeading, 0.58);
  }
  racer.mesh.position.y = 1.1;
}

function updateRacerPhysics(racer, dt) {
  const track = state.trackRuntime;
  const infoBefore = track.nearestInfo(racer.mesh.position);
  const diff = DIFFICULTY_PRESETS[state.difficulty];

  racer.itemCooldown = Math.max(0, racer.itemCooldown - dt);
  racer.statuses.wobble = Math.max(0, racer.statuses.wobble - dt);
  racer.statuses.steerDisable = Math.max(0, racer.statuses.steerDisable - dt);
  racer.statuses.spinout = Math.max(0, racer.statuses.spinout - dt);
  racer.statuses.shield = Math.max(0, racer.statuses.shield - dt);
  racer.statuses.tractionLoss = Math.max(0, racer.statuses.tractionLoss - dt);

  if (racer.boostTimer > 0) {
    racer.boostTimer = Math.max(0, racer.boostTimer - dt);
    if (racer.boostTimer <= 0) {
      racer.boostTier = 0;
      racer.boostMult = 1;
    }
  }

  if (racer.tripleCharges > 0) {
    racer.triplePulseTimer -= dt;
    if (racer.triplePulseTimer <= 0) {
      racer.triplePulseTimer = 0.32;
      racer.tripleCharges -= 1;
      applyBoost(racer, 1, 0.25, 1.16);
    }
  }

  let steer = 0;
  if (racer.isPlayer) {
    steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (racer.statuses.steerDisable > 0) {
      steer = 0;
    }
    if (racer.statuses.wobble > 0) {
      steer += Math.sin(state.raceTime * 16 + racer.id) * 0.35;
    }

    const canDrift = input.drift && Math.abs(steer) > 0.14 && racer.speed > 28 && racer.statuses.spinout <= 0;
    if (canDrift) {
      if (!racer.drifting) {
        racer.drifting = true;
        racer.driftDir = Math.sign(steer) || 1;
      }
      racer.driftHold += dt;
      racer.driftDir = Math.sign(steer) || racer.driftDir;
    } else if (racer.drifting) {
      releaseDrift(racer);
    }

    if (input.itemPressed) {
      useItem(racer);
      input.itemPressed = false;
    }
  } else {
    steer = updateAi(racer, dt);
  }

  const offroad = Math.abs(infoBefore.lateral) > track.roadHalfWidth * 0.95;
  const baseOffroadFactor = 0.67 + (racer.char.stats.offroad - 0.8) * 0.6;
  let offroadFactor = clamp(baseOffroadFactor, 0.62, 0.9);
  if (racer.boostTimer > 0 && offroad) {
    offroadFactor = 1 - (1 - offroadFactor) * 0.5;
  }

  let targetSpeed = racer.char.stats.topSpeed * racer.boostMult;
  if (!racer.isPlayer) {
    targetSpeed *= diff.speedScale;
    const catchUp = clamp((state.player.totalDistance - racer.totalDistance) / 120, -0.08, 0.1);
    targetSpeed *= 1 + catchUp;
  }
  if (offroad) {
    targetSpeed *= offroadFactor;
  }
  if (racer.statuses.spinout > 0) {
    targetSpeed *= 0.72;
  }
  if (racer.statuses.tractionLoss > 0) {
    targetSpeed *= 0.88;
  }

  const accelRate = 38 * racer.char.stats.accel;
  racer.speed += clamp(targetSpeed - racer.speed, -accelRate * dt, accelRate * dt);

  const turnBase = 1.42 * racer.char.stats.handling;
  const driftTurn = racer.drifting ? 0.65 * racer.char.stats.drift : 0;
  const spinBias = racer.statuses.spinout > 0 ? Math.sin(state.raceTime * 20 + racer.id) * 1.1 : 0;
  racer.heading += (steer * (turnBase + driftTurn) + spinBias) * dt;

  const tangentHeading = Math.atan2(infoBefore.t.z, infoBefore.t.x);
  const assistBase = racer.isPlayer ? 0.28 : 0.4;
  const assist = clamp(
    assistBase - Math.abs(steer) * 0.18 + (offroad ? 0.24 : 0),
    0,
    racer.isPlayer ? 0.5 : 0.62,
  );
  racer.heading = lerpAngle(racer.heading, tangentHeading, assist * dt);

  if (racer.drifting && Math.abs(steer) > 0.05) {
    const side = new THREE.Vector3(-Math.sin(racer.heading), 0, Math.cos(racer.heading));
    racer.mesh.position.add(side.multiplyScalar(racer.driftDir * (2.6 + racer.char.stats.drift * 1.2) * dt));
  }

  const fwd = new THREE.Vector3(Math.cos(racer.heading), 0, Math.sin(racer.heading));
  racer.mesh.position.add(fwd.multiplyScalar(racer.speed * dt));

  const infoAfter = track.nearestInfo(racer.mesh.position);
  const overWall = Math.abs(infoAfter.lateral) - track.wallHalfWidth;
  if (overWall > 0) {
    const pushDir = Math.sign(infoAfter.lateral);
    racer.mesh.position.add(infoAfter.n.clone().multiplyScalar(-pushDir * (overWall + 0.35)));

    const desiredHeading = Math.atan2(infoAfter.t.z, infoAfter.t.x);
    const impact = Math.abs(deltaAngle(racer.heading, desiredHeading));
    const glancing = impact < 0.52;
    racer.speed *= glancing ? 0.92 : 0.8;
    racer.heading = lerpAngle(racer.heading, desiredHeading, glancing ? 0.32 : 0.52);

    if (!glancing) {
      racer.statuses.steerDisable = Math.max(racer.statuses.steerDisable, 0.22);
    }
    if (racer.isPlayer) audio.sfx("hit");
  }

  enforceTrackBounds(racer);
  racer.mesh.rotation.y = -racer.heading + Math.PI / 2;

  // Track progress and laps
  const infoProgress = track.nearestInfo(racer.mesh.position);
  let ds = infoProgress.s - racer.lastS;
  if (ds < -track.length * 0.5) ds += track.length;
  if (ds > track.length * 0.5) ds -= track.length;
  racer.lastS = infoProgress.s;
  racer.lapProgress += ds;
  if (racer.lapProgress < 0) racer.lapProgress = 0;

  while (racer.lapProgress >= track.length && !racer.finished) {
    racer.lapProgress -= track.length;
    racer.completedLaps += 1;
    const lapTime = state.raceTime - racer.lapStartTime;
    racer.lapStartTime = state.raceTime;
    racer.lapTimes.push(lapTime);
    if (racer.isPlayer) {
      audio.sfx("lap");
      if (racer.completedLaps === 2) {
        state.bannerTimer = 2.0;
      }
    }
    if (racer.completedLaps >= TOTAL_LAPS) {
      racer.finished = true;
      racer.finishTime = state.raceTime;
      state.finishedCount += 1;
      if (racer.isPlayer) {
        audio.sfx("finish");
      }
      break;
    }
  }

  racer.totalDistance = racer.completedLaps * track.length + racer.lapProgress;

  // Item box checks
  if (!racer.item || ITEM_CAPACITY > 1) {
    for (const box of state.itemBoxes) {
      if (box.respawn > 0) continue;
      const sample = track.sampleAtS(box.s);
      const pos = sample.p.clone().add(sample.n.clone().multiplyScalar(box.lane * track.roadHalfWidth * 0.64));
      const dx = racer.mesh.position.x - pos.x;
      const dz = racer.mesh.position.z - pos.z;
      if (dx * dx + dz * dz < 18) {
        racer.item = weightedItemPick(racer.rank, RACER_COUNT);
        box.respawn = 5.2;
        box.mesh.visible = false;
        if (racer.isPlayer) audio.sfx("item");
        break;
      }
    }
  }

  // Hazards
  state.dynamicHazards.forEach((hazard) => {
    const dx = racer.mesh.position.x - hazard.x;
    const dz = racer.mesh.position.z - hazard.z;
    const distSq = dx * dx + dz * dz;
    if (distSq > hazard.radius * hazard.radius) return;
    if (hazard.type === "static") {
      racer.statuses.wobble = Math.max(racer.statuses.wobble, 0.4);
      racer.speed *= 0.95;
    }
    if (hazard.type === "peel" && racer.statuses.shield <= 0) {
      racer.statuses.spinout = Math.max(racer.statuses.spinout, 0.95);
      racer.speed *= 0.82;
      hazard.life = 0;
      if (racer.isPlayer) audio.sfx("hit");
    }
    if (hazard.type === "goo" && racer.statuses.shield <= 0) {
      racer.statuses.tractionLoss = Math.max(racer.statuses.tractionLoss, 1.0);
      racer.statuses.wobble = Math.max(racer.statuses.wobble, 0.45);
      racer.speed *= 0.88;
    }
  });
}

function updateRacerCollisions() {
  for (let i = 0; i < state.racers.length; i += 1) {
    for (let j = i + 1; j < state.racers.length; j += 1) {
      const a = state.racers[i];
      const b = state.racers[j];
      const dx = b.mesh.position.x - a.mesh.position.x;
      const dz = b.mesh.position.z - a.mesh.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 25) continue;
      const dist = Math.sqrt(Math.max(1e-6, d2));
      const nx = dx / dist;
      const nz = dz / dist;
      const push = (5 - dist) * 0.5;
      a.mesh.position.x -= nx * push;
      a.mesh.position.z -= nz * push;
      b.mesh.position.x += nx * push;
      b.mesh.position.z += nz * push;

      if (a.statuses.shield > 0 && b.statuses.shield <= 0) {
        b.statuses.wobble = Math.max(b.statuses.wobble, 0.35);
        b.speed *= 0.94;
      }
      if (b.statuses.shield > 0 && a.statuses.shield <= 0) {
        a.statuses.wobble = Math.max(a.statuses.wobble, 0.35);
        a.speed *= 0.94;
      }

      enforceTrackBounds(a);
      enforceTrackBounds(b);
    }
  }
}

function updateItemBoxes(dt) {
  state.itemBoxes.forEach((box) => {
    box.mesh.rotation.y += dt * 1.4;
    box.mesh.position.y = 2.4 + Math.sin(state.raceTime * 2.8 + box.s * 0.01) * 0.25;
    if (box.respawn > 0) {
      box.respawn = Math.max(0, box.respawn - dt);
      if (box.respawn <= 0) {
        box.mesh.visible = true;
      }
    }
  });
}

function updateDynamicHazards(dt) {
  const keep = [];
  for (const hazard of state.dynamicHazards) {
    if (!Number.isFinite(hazard.life)) {
      keep.push(hazard);
      continue;
    }
    hazard.life -= dt;
    if (hazard.life > 0) {
      keep.push(hazard);
    } else if (hazard.mesh) {
      worldRoot.remove(hazard.mesh);
      if (hazard.mesh.geometry) hazard.mesh.geometry.dispose();
      if (hazard.mesh.material) hazard.mesh.material.dispose();
    }
  }
  state.dynamicHazards = keep;
}

function updateCamera(dt) {
  if (!state.player) return;
  const forward = new THREE.Vector3(Math.cos(state.player.heading), 0, Math.sin(state.player.heading));
  const back = forward.clone().multiplyScalar(-28);
  const camTarget = state.player.mesh.position.clone().add(new THREE.Vector3(0, 15, 0)).add(back);
  camera.position.lerp(camTarget, clamp(dt * 7, 0, 1));
  camera.lookAt(state.player.mesh.position.x + forward.x * 10, state.player.mesh.position.y + 3.2, state.player.mesh.position.z + forward.z * 10);
}

function drawMinimap() {
  if (!state.trackRuntime || !state.mapBounds) {
    return;
  }
  const ctx = minimapCtx;
  const w = minimapEl.width;
  const h = minimapEl.height;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "rgba(10, 18, 24, 0.82)";
  ctx.fillRect(0, 0, w, h);

  const pad = 14;
  const bw = state.mapBounds.maxX - state.mapBounds.minX;
  const bh = state.mapBounds.maxZ - state.mapBounds.minZ;
  const scale = Math.min((w - pad * 2) / bw, (h - pad * 2) / bh);

  function mapPoint(x, z) {
    return {
      x: pad + (x - state.mapBounds.minX) * scale,
      y: h - (pad + (z - state.mapBounds.minZ) * scale),
    };
  }

  ctx.strokeStyle = "#5a6672";
  ctx.lineWidth = 5;
  ctx.beginPath();
  const pts = state.trackRuntime.points;
  for (let i = 0; i < pts.length; i += 7) {
    const p = mapPoint(pts[i].x, pts[i].z);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.stroke();

  state.racers.forEach((racer) => {
    const p = mapPoint(racer.mesh.position.x, racer.mesh.position.z);
    ctx.fillStyle = racer.isPlayer ? "#ffd447" : "#d4e2ef";
    ctx.beginPath();
    ctx.arc(p.x, p.y, racer.isPlayer ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateHud() {
  if (!state.player) return;
  positionEl.textContent = `POS ${state.player.rank}/${RACER_COUNT}`;
  const lapNum = Math.min(TOTAL_LAPS, state.player.completedLaps + 1);
  lapEl.textContent = `LAP ${lapNum}/${TOTAL_LAPS}`;
  timerEl.textContent = timeToText(state.raceTime);

  const last = state.player.lapTimes.at(-1);
  let best = null;
  state.player.lapTimes.forEach((t) => {
    best = best == null ? t : Math.min(best, t);
  });
  splitEl.textContent = `LAST ${last != null ? timeToText(last) : "--:--.---"} / BEST ${best != null ? timeToText(best) : "--:--.---"}`;
  itemEl.textContent = `ITEM: ${state.player.item || "NONE"}`;
  speedEl.textContent = `SPD ${state.player.speed.toFixed(0)}`;

  if (state.bannerTimer > 0) {
    bannerEl.classList.remove("hidden");
  } else {
    bannerEl.classList.add("hidden");
  }

  drawMinimap();
}

function updateRace(dt) {
  if (state.mode !== "racing") return;

  state.raceTime += dt;
  state.bannerTimer = Math.max(0, state.bannerTimer - dt);

  updateItemBoxes(dt);
  updateDynamicHazards(dt);

  state.racers.forEach((racer) => {
    if (!racer.finished) {
      updateRacerPhysics(racer, dt);
    }
  });

  updateRacerCollisions();
  updateRacerRankings();

  if (state.player) {
    const speedNorm = clamp(state.player.speed / 110, 0, 1);
    audio.setEngine(speedNorm);
    audio.setDrift(state.player.drifting, clamp(state.player.driftHold / BOOST_TIERS[2].charge, 0, 1));
  }

  if (state.player && state.player.finished && state.mode === "racing") {
    state.mode = "results";
    const bestLap = state.player.lapTimes.reduce((m, t) => Math.min(m, t), Infinity);
    resultsText.innerHTML = `
      <p>Track: ${TRACK_DEFS[state.trackIndex].name}</p>
      <p>Finish: ${state.player.rank}/${RACER_COUNT}</p>
      <p>Total: ${timeToText(state.player.finishTime)}</p>
      <p>Best Lap: ${Number.isFinite(bestLap) ? timeToText(bestLap) : "--:--.---"}</p>
    `;
    setOverlayState();
  }
}

function render() {
  updateCamera(FIXED_DT);
  updateHud();
  renderer.render(scene, camera);
}

function advanceSimulation(ms) {
  const steps = Math.max(1, Math.round(ms / (FIXED_DT * 1000)));
  for (let i = 0; i < steps; i += 1) {
    if (state.mode === "racing") {
      updateRace(FIXED_DT);
    }
  }
  render();
}

window.advanceTime = (ms) => {
  advanceSimulation(ms);
};

window.render_game_to_text = () => {
  const player = state.player;
  const payload = {
    coordinateSystem: {
      origin: "world center",
      x: "east(+), west(-)",
      z: "south(+), north(-)",
      y: "up(+)"
    },
    mode: state.mode,
    selection: {
      track: TRACK_DEFS[state.trackIndex]?.name || null,
      character: CHARACTERS[state.characterIndex]?.name || null,
      difficulty: state.difficulty,
      mirror: state.mirror,
      allowClones: state.allowClones,
    },
    race: {
      time: Number(state.raceTime.toFixed(3)),
      finishedCount: state.finishedCount,
      totalRacers: state.racers.length,
    },
    player: player
      ? {
          name: player.char.name,
          rank: player.rank,
          lap: Math.min(TOTAL_LAPS, player.completedLaps + 1),
          completedLaps: player.completedLaps,
          speed: Number(player.speed.toFixed(2)),
          item: player.item,
          boostTier: player.boostTier,
          boostTimer: Number(player.boostTimer.toFixed(3)),
          drifting: player.drifting,
          driftHold: Number(player.driftHold.toFixed(3)),
          status: {
            wobble: Number(player.statuses.wobble.toFixed(3)),
            steerDisable: Number(player.statuses.steerDisable.toFixed(3)),
            spinout: Number(player.statuses.spinout.toFixed(3)),
          },
          pos: {
            x: Number(player.mesh.position.x.toFixed(2)),
            y: Number(player.mesh.position.y.toFixed(2)),
            z: Number(player.mesh.position.z.toFixed(2)),
          },
        }
      : null,
    top3: state.ranking.slice(0, 3).map((r) => ({
      name: r.char.name,
      rank: r.rank,
      laps: r.completedLaps,
      finished: r.finished,
      distance: Number(r.totalDistance.toFixed(2)),
    })),
  };
  return JSON.stringify(payload);
};

function togglePause() {
  if (state.mode === "racing") {
    state.mode = "paused";
  } else if (state.mode === "paused") {
    state.mode = "racing";
  }
  setOverlayState();
}

function initMenus() {
  TRACK_DEFS.forEach((track) => {
    const option = document.createElement("option");
    option.textContent = track.name;
    trackSelect.append(option);
  });
  CHARACTERS.forEach((char) => {
    const option = document.createElement("option");
    option.textContent = `${char.name} (SPD ${char.stats.topSpeed.toFixed(0)} / DRF ${char.stats.drift.toFixed(2)})`;
    charSelect.append(option);
  });
  charSelect.selectedIndex = 0;
}

openOptionsBtn.addEventListener("click", () => {
  state.mode = "options";
  setOverlayState();
});

closeOptionsBtn.addEventListener("click", () => {
  state.mode = "preRace";
  setOverlayState();
});

startRaceBtn.addEventListener("click", async () => {
  audio.init();
  await audio.resume();
  startRace();
});

resumeBtn.addEventListener("click", () => {
  if (state.mode === "paused") {
    state.mode = "racing";
    setOverlayState();
  }
});

restartBtn.addEventListener("click", () => {
  restartRace();
});

quitBtn.addEventListener("click", () => {
  quitToPreRace();
});

resultsRestartBtn.addEventListener("click", () => {
  restartRace();
});

resultsQuitBtn.addEventListener("click", () => {
  quitToPreRace();
});

function updateVolumeFromInputs() {
  const master = Number(masterVolumeInput.value) / 100;
  const music = Number(musicVolumeInput.value) / 100;
  const sfx = Number(sfxVolumeInput.value) / 100;
  audio.setVolumes(master, music, sfx);
}

masterVolumeInput.addEventListener("input", updateVolumeFromInputs);
musicVolumeInput.addEventListener("input", updateVolumeFromInputs);
sfxVolumeInput.addEventListener("input", updateVolumeFromInputs);

window.addEventListener("keydown", (event) => {
  if (event.code === "ArrowLeft" || event.code === "KeyA") input.left = true;
  if (event.code === "ArrowRight" || event.code === "KeyD") input.right = true;
  if (event.code === "ShiftLeft" || event.code === "ShiftRight" || event.code === "Space") input.drift = true;
  if (event.code === "KeyQ" || event.code === "KeyE" || event.code === "KeyB") input.itemPressed = true;

  if (event.code === "Enter" && (state.mode === "racing" || state.mode === "paused")) {
    togglePause();
  }

  if (event.code === "Escape") {
    if (state.mode === "racing" || state.mode === "paused") {
      togglePause();
    } else if (state.mode === "options") {
      state.mode = "preRace";
      setOverlayState();
    }
  }

  if (event.code === "KeyF") {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft" || event.code === "KeyA") input.left = false;
  if (event.code === "ArrowRight" || event.code === "KeyD") input.right = false;
  if (event.code === "ShiftLeft" || event.code === "ShiftRight" || event.code === "Space") {
    input.drift = false;
    if (state.player) releaseDrift(state.player);
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

initMenus();
rebuildTrackWorld();
setOverlayState();

let last = performance.now();
let accumulator = 0;

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  accumulator += dt;

  while (accumulator >= FIXED_DT) {
    if (state.mode === "racing") {
      updateRace(FIXED_DT);
    }
    accumulator -= FIXED_DT;
  }

  render();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
