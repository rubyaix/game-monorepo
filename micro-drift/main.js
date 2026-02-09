import * as THREE from "three";

const FIXED_DT = 1 / 60;
const BASE_SPEED = 80;
const OFFROAD_FACTOR = 0.5;
const STUN_DURATION = 0.3;
const TRACK = {
  straightHalf: 90,
  turnRadius: 60,
  roadHalfWidth: 18,
  wallHalfWidth: 28,
};
const TRACK_LENGTH =
  4 * TRACK.straightHalf + 2 * Math.PI * TRACK.turnRadius;
const LAP_COUNT = 3;
const DRIFT_TIER_1 = { charge: 1.0, duration: 0.5, multiplier: 1.2 };
const DRIFT_TIER_2 = { charge: 2.0, duration: 0.8, multiplier: 1.3 };
const START_S = 20;

const input = {
  left: false,
  right: false,
  drift: false,
};

const canvas = document.getElementById("game-canvas");
const lapCounterEl = document.getElementById("lap-counter");
const lapTimeEl = document.getElementById("lap-time");
const totalTimeEl = document.getElementById("total-time");
const speedEl = document.getElementById("speed");
const hudEl = document.getElementById("hud");
const startScreenEl = document.getElementById("start-screen");
const finishScreenEl = document.getElementById("finish-screen");
const finishTotalEl = document.getElementById("finish-total");
const finishBestEl = document.getElementById("finish-best");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const finishRestartBtn = document.getElementById("finish-restart-btn");
const ghostToggleEl = document.getElementById("ghost-toggle");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9dc);

const camera = new THREE.PerspectiveCamera(
  62,
  window.innerWidth / window.innerHeight,
  0.1,
  1600,
);
camera.position.set(0, 22, -32);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const sun = new THREE.DirectionalLight(0xfff1cf, 0.95);
sun.position.set(120, 200, 70);
scene.add(sun);

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.driftFilter = null;
    this.driftGain = null;
    this.driftNoise = null;
    this.bgmInterval = null;
    this.bgmStep = 0;
  }

  init() {
    if (this.ctx) {
      return;
    }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = 95;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineGain).connect(this.master);
    this.engineOsc.start();

    this.driftFilter = this.ctx.createBiquadFilter();
    this.driftFilter.type = "bandpass";
    this.driftFilter.frequency.value = 960;
    this.driftGain = this.ctx.createGain();
    this.driftGain.gain.value = 0;
    this.driftNoise = this.createNoiseSource();
    this.driftNoise.connect(this.driftFilter).connect(this.driftGain).connect(this.master);
    this.driftNoise.start();

    this.startBgm();
  }

  createNoiseSource() {
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

  startBgm() {
    if (!this.ctx || this.bgmInterval) {
      return;
    }
    const scale = [220.0, 246.94, 293.66, 329.63, 293.66, 246.94, 196.0, 246.94];
    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx || this.ctx.state !== "running") {
        return;
      }
      const freq = scale[this.bgmStep % scale.length];
      this.bgmStep += 1;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      osc.connect(gain).connect(this.master);
      osc.start(now);
      osc.stop(now + 0.22);
    }, 250);
  }

  setEngine(speedNorm, active) {
    if (!this.ctx || !this.engineOsc || !this.engineGain) {
      return;
    }
    const now = this.ctx.currentTime;
    const targetGain = active ? 0.03 + 0.07 * speedNorm : 0.0001;
    const targetFreq = 90 + speedNorm * 90;
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.03);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.04);
  }

  setDrift(active, chargeNorm) {
    if (!this.ctx || !this.driftGain || !this.driftFilter) {
      return;
    }
    const now = this.ctx.currentTime;
    const target = active ? 0.025 + chargeNorm * 0.08 : 0.0001;
    this.driftGain.gain.setTargetAtTime(target, now, 0.02);
    this.driftFilter.frequency.setTargetAtTime(700 + chargeNorm * 900, now, 0.06);
  }

  playFinish() {
    if (!this.ctx || !this.master) {
      return;
    }
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const when = this.ctx.currentTime + idx * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(0.1, when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.13);
      osc.connect(gain).connect(this.master);
      osc.start(when);
      osc.stop(when + 0.14);
    });
  }
}

const audio = new AudioManager();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrapS(s) {
  let result = s % TRACK_LENGTH;
  if (result < 0) {
    result += TRACK_LENGTH;
  }
  return result;
}

function sampleCenterline(sInput) {
  const s = wrapS(sInput);
  const straightLen = 2 * TRACK.straightHalf;
  const arcLen = Math.PI * TRACK.turnRadius;

  if (s < straightLen) {
    return {
      x: -TRACK.straightHalf + s,
      z: TRACK.turnRadius,
      tangentX: 1,
      tangentZ: 0,
    };
  }

  if (s < straightLen + arcLen) {
    const u = s - straightLen;
    const angle = Math.PI / 2 - u / TRACK.turnRadius;
    return {
      x: TRACK.straightHalf + TRACK.turnRadius * Math.cos(angle),
      z: TRACK.turnRadius * Math.sin(angle),
      tangentX: Math.sin(angle),
      tangentZ: -Math.cos(angle),
    };
  }

  if (s < straightLen + arcLen + straightLen) {
    const u = s - straightLen - arcLen;
    return {
      x: TRACK.straightHalf - u,
      z: -TRACK.turnRadius,
      tangentX: -1,
      tangentZ: 0,
    };
  }

  const u = s - straightLen - arcLen - straightLen;
  const angle = -Math.PI / 2 - u / TRACK.turnRadius;
  return {
    x: -TRACK.straightHalf + TRACK.turnRadius * Math.cos(angle),
    z: TRACK.turnRadius * Math.sin(angle),
    tangentX: Math.sin(angle),
    tangentZ: -Math.cos(angle),
  };
}

function nearestCenterlineInfo(x, z) {
  const candidates = [];

  const topX = clamp(x, -TRACK.straightHalf, TRACK.straightHalf);
  candidates.push({
    x: topX,
    z: TRACK.turnRadius,
    tangentX: 1,
    tangentZ: 0,
    s: topX + TRACK.straightHalf,
  });

  const rightRaw = Math.atan2(z, x - TRACK.straightHalf);
  const rightAngle = clamp(rightRaw, -Math.PI / 2, Math.PI / 2);
  candidates.push({
    x: TRACK.straightHalf + TRACK.turnRadius * Math.cos(rightAngle),
    z: TRACK.turnRadius * Math.sin(rightAngle),
    tangentX: Math.sin(rightAngle),
    tangentZ: -Math.cos(rightAngle),
    s:
      2 * TRACK.straightHalf +
      (Math.PI / 2 - rightAngle) * TRACK.turnRadius,
  });

  const bottomX = clamp(x, -TRACK.straightHalf, TRACK.straightHalf);
  candidates.push({
    x: bottomX,
    z: -TRACK.turnRadius,
    tangentX: -1,
    tangentZ: 0,
    s:
      2 * TRACK.straightHalf +
      Math.PI * TRACK.turnRadius +
      (TRACK.straightHalf - bottomX),
  });

  let leftRaw = Math.atan2(z, x + TRACK.straightHalf);
  if (leftRaw > -Math.PI / 2) {
    leftRaw -= Math.PI * 2;
  }
  const leftAngle = clamp(leftRaw, -1.5 * Math.PI, -Math.PI / 2);
  candidates.push({
    x: -TRACK.straightHalf + TRACK.turnRadius * Math.cos(leftAngle),
    z: TRACK.turnRadius * Math.sin(leftAngle),
    tangentX: Math.sin(leftAngle),
    tangentZ: -Math.cos(leftAngle),
    s:
      4 * TRACK.straightHalf +
      Math.PI * TRACK.turnRadius +
      (-Math.PI / 2 - leftAngle) * TRACK.turnRadius,
  });

  let best = null;
  let bestDistSq = Infinity;
  for (const c of candidates) {
    const dx = x - c.x;
    const dz = z - c.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestDistSq) {
      best = c;
      bestDistSq = d2;
    }
  }

  const dx = x - best.x;
  const dz = z - best.z;
  const offset = Math.sqrt(bestDistSq);
  const inv = offset > 1e-6 ? 1 / offset : 0;

  return {
    pointX: best.x,
    pointZ: best.z,
    tangentX: best.tangentX,
    tangentZ: best.tangentZ,
    normalX: dx * inv,
    normalZ: dz * inv,
    s: wrapS(best.s),
    offset,
  };
}

function createInstancedBoxes(sceneRef, positions, size, color) {
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const material = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
  const matrix = new THREE.Matrix4();
  positions.forEach((pos, idx) => {
    matrix.makeTranslation(pos.x, pos.y, pos.z);
    mesh.setMatrixAt(idx, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  sceneRef.add(mesh);
}

function addUniqueCell(list, set, x, y, z = 0) {
  const key = `${Math.round(x * 2) / 2}|${Math.round(y * 2) / 2}|${Math.round(z * 2) / 2}`;
  if (set.has(key)) {
    return;
  }
  set.add(key);
  list.push({ x, y, z });
}

function buildTrackVisuals() {
  const grassCells = [];
  const grassSet = new Set();
  for (let gx = -220; gx <= 220; gx += 6) {
    for (let gz = -180; gz <= 180; gz += 6) {
      addUniqueCell(grassCells, grassSet, gx, -2.5, gz);
    }
  }

  const roadCells = [];
  const roadSet = new Set();
  const shoulderCells = [];
  const shoulderSet = new Set();
  const wallCells = [];
  const wallSet = new Set();

  for (let s = 0; s < TRACK_LENGTH; s += 2.8) {
    const center = sampleCenterline(s);
    const nx = -center.tangentZ;
    const nz = center.tangentX;

    for (let w = -TRACK.wallHalfWidth; w <= TRACK.wallHalfWidth; w += 3) {
      const px = center.x + nx * w;
      const pz = center.z + nz * w;
      if (Math.abs(w) <= TRACK.roadHalfWidth) {
        addUniqueCell(roadCells, roadSet, px, 0.3, pz);
      } else {
        addUniqueCell(shoulderCells, shoulderSet, px, 0.2, pz);
      }
    }

    const outerX = center.x + nx * TRACK.wallHalfWidth;
    const outerZ = center.z + nz * TRACK.wallHalfWidth;
    const innerX = center.x - nx * TRACK.wallHalfWidth;
    const innerZ = center.z - nz * TRACK.wallHalfWidth;
    addUniqueCell(wallCells, wallSet, outerX, 2.4, outerZ);
    addUniqueCell(wallCells, wallSet, innerX, 2.4, innerZ);
  }

  createInstancedBoxes(scene, grassCells, { x: 6, y: 3, z: 6 }, 0x4f8a4e);
  createInstancedBoxes(scene, shoulderCells, { x: 3, y: 1, z: 3 }, 0x6d8d57);
  createInstancedBoxes(scene, roadCells, { x: 3, y: 1, z: 3 }, 0x3f4551);
  createInstancedBoxes(scene, wallCells, { x: 3, y: 5, z: 3 }, 0xcfc8b8);

  const finishLine = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.6, TRACK.roadHalfWidth * 2),
    new THREE.MeshLambertMaterial({ color: 0xfce882 }),
  );
  const finishPos = sampleCenterline(START_S);
  finishLine.position.set(finishPos.x, 0.8, finishPos.z);
  scene.add(finishLine);
}

function createKartMesh(color = 0xff6b35, opacity = 1) {
  const material = new THREE.MeshLambertMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  });
  const dark = new THREE.MeshLambertMaterial({
    color: 0x22252d,
    transparent: opacity < 1,
    opacity,
  });
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.6, 7.2), material);
  body.position.y = 1.8;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 2.8), material);
  cabin.position.set(0, 3, -0.4);
  group.add(cabin);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.8, 1.4), dark);
  bumper.position.set(0, 1.1, 3.8);
  group.add(bumper);

  const wheelOffsets = [
    [-2.3, 0.9, 2.2],
    [2.3, 0.9, 2.2],
    [-2.3, 0.9, -2.2],
    [2.3, 0.9, -2.2],
  ];
  wheelOffsets.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), dark);
    wheel.position.set(x, y, z);
    group.add(wheel);
  });

  return group;
}

buildTrackVisuals();
const kartMesh = createKartMesh();
scene.add(kartMesh);
const ghostKart = createKartMesh(0x8ee6ff, 0.35);
ghostKart.visible = false;
scene.add(ghostKart);

const state = {
  mode: "start",
  position: new THREE.Vector3(),
  heading: 0,
  speed: 0,
  lap: 1,
  lapStartTime: 0,
  currentLapTime: 0,
  totalTime: 0,
  lapProgress: 0,
  lapTimes: [],
  bestLapInRun: Infinity,
  bestSessionTotal: Infinity,
  driftActive: false,
  driftCharge: 0,
  boostTimeLeft: 0,
  boostMultiplier: 1,
  stunTimeLeft: 0,
  offroad: false,
  lastS: START_S,
  runFrames: [],
  bestGhostFrames: null,
  ghostEnabled: true,
};

function resetKartPose() {
  const start = sampleCenterline(START_S);
  state.position.set(start.x, 1.1, start.z);
  state.heading = Math.atan2(start.tangentZ, start.tangentX);
  state.lastS = START_S;
}

function resetRunState() {
  state.mode = "running";
  state.speed = 0;
  state.lap = 1;
  state.lapStartTime = 0;
  state.currentLapTime = 0;
  state.totalTime = 0;
  state.lapProgress = 0;
  state.lapTimes = [];
  state.bestLapInRun = Infinity;
  state.driftActive = false;
  state.driftCharge = 0;
  state.boostTimeLeft = 0;
  state.boostMultiplier = 1;
  state.stunTimeLeft = 0;
  state.offroad = false;
  state.runFrames = [];
  resetKartPose();
}

function formatTime(seconds) {
  const totalMs = Math.max(0, Math.floor(seconds * 1000));
  const minutes = Math.floor(totalMs / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function updateHUD() {
  lapCounterEl.textContent = `Lap ${Math.min(state.lap, LAP_COUNT)} / ${LAP_COUNT}`;
  lapTimeEl.textContent = `Lap: ${formatTime(state.currentLapTime)}`;
  totalTimeEl.textContent = `Total: ${formatTime(state.totalTime)}`;
  speedEl.textContent = `Speed: ${state.speed.toFixed(1)}`;
}

function onLapComplete() {
  const lapTime = state.totalTime - state.lapStartTime;
  state.lapTimes.push(lapTime);
  state.bestLapInRun = Math.min(state.bestLapInRun, lapTime);
  state.lapStartTime = state.totalTime;

  if (state.lap >= LAP_COUNT) {
    state.mode = "finished";
    finishTotalEl.textContent = `Total Time: ${formatTime(state.totalTime)}`;
    finishBestEl.textContent = `Best Lap: ${formatTime(state.bestLapInRun)}`;
    finishScreenEl.classList.remove("hidden");
    audio.setEngine(0, false);
    audio.setDrift(false, 0);
    audio.playFinish();

    if (state.totalTime < state.bestSessionTotal) {
      state.bestSessionTotal = state.totalTime;
      state.bestGhostFrames = state.runFrames.map((f) => ({ ...f }));
    }
    return;
  }

  state.lap += 1;
}

function releaseDrift() {
  if (!state.driftActive) {
    return;
  }

  if (state.driftCharge >= DRIFT_TIER_2.charge) {
    state.boostTimeLeft = DRIFT_TIER_2.duration;
    state.boostMultiplier = DRIFT_TIER_2.multiplier;
  } else if (state.driftCharge >= DRIFT_TIER_1.charge) {
    state.boostTimeLeft = DRIFT_TIER_1.duration;
    state.boostMultiplier = DRIFT_TIER_1.multiplier;
  }

  state.driftActive = false;
  state.driftCharge = 0;
}

function updateKart(dt) {
  if (state.mode !== "running") {
    return;
  }

  state.totalTime += dt;
  state.currentLapTime = state.totalTime - state.lapStartTime;

  if (state.boostTimeLeft > 0) {
    state.boostTimeLeft = Math.max(0, state.boostTimeLeft - dt);
    if (state.boostTimeLeft <= 0) {
      state.boostMultiplier = 1;
    }
  }

  const steerInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const canChargeDrift = input.drift;
  if (canChargeDrift && state.stunTimeLeft <= 0) {
    state.driftActive = true;
    state.driftCharge += dt;
  } else if (!canChargeDrift) {
    releaseDrift();
  }

  if (state.stunTimeLeft > 0) {
    state.stunTimeLeft = Math.max(0, state.stunTimeLeft - dt);
    state.speed = 0;
    audio.setEngine(0, true);
    audio.setDrift(false, 0);
    return;
  }

  const nearestBefore = nearestCenterlineInfo(state.position.x, state.position.z);
  state.offroad = nearestBefore.offset > TRACK.roadHalfWidth;

  let speed = BASE_SPEED * state.boostMultiplier;
  if (state.offroad) {
    speed *= OFFROAD_FACTOR;
  }
  state.speed = speed;

  const steerRate = state.driftActive ? 1.55 : 1.25;
  state.heading += steerInput * steerRate * dt;

  if (state.driftActive && steerInput !== 0) {
    const sideAngle = state.heading + Math.PI / 2;
    state.position.x += Math.cos(sideAngle) * steerInput * 2.8 * dt;
    state.position.z += Math.sin(sideAngle) * steerInput * 2.8 * dt;
  }

  state.position.x += Math.cos(state.heading) * speed * dt;
  state.position.z += Math.sin(state.heading) * speed * dt;

  const nearestAfter = nearestCenterlineInfo(state.position.x, state.position.z);

  if (nearestAfter.offset > TRACK.wallHalfWidth) {
    const nx = nearestAfter.normalX || -Math.cos(state.heading);
    const nz = nearestAfter.normalZ || -Math.sin(state.heading);
    state.position.x = nearestAfter.pointX + nx * (TRACK.wallHalfWidth - 0.2);
    state.position.z = nearestAfter.pointZ + nz * (TRACK.wallHalfWidth - 0.2);
    state.heading += Math.PI;
    state.stunTimeLeft = STUN_DURATION;
    state.speed = 0;
    state.boostTimeLeft = 0;
    state.boostMultiplier = 1;
    state.driftActive = false;
    state.driftCharge = 0;
  }

  const currentInfo = nearestCenterlineInfo(state.position.x, state.position.z);
  let ds = currentInfo.s - state.lastS;
  if (ds < -TRACK_LENGTH * 0.5) {
    ds += TRACK_LENGTH;
  } else if (ds > TRACK_LENGTH * 0.5) {
    ds -= TRACK_LENGTH;
  }
  state.lastS = currentInfo.s;

  state.lapProgress += ds;
  if (state.lapProgress >= TRACK_LENGTH) {
    state.lapProgress -= TRACK_LENGTH;
    onLapComplete();
  } else if (state.lapProgress < 0) {
    state.lapProgress = 0;
  }

  state.runFrames.push({
    t: state.totalTime,
    x: state.position.x,
    y: state.position.y,
    z: state.position.z,
    heading: state.heading,
  });

  const speedNorm = clamp(state.speed / (BASE_SPEED * 1.3), 0, 1);
  audio.setEngine(speedNorm, true);
  audio.setDrift(state.driftActive, clamp(state.driftCharge / DRIFT_TIER_2.charge, 0, 1));
}

function updateGhost() {
  if (
    state.mode !== "running" ||
    !state.ghostEnabled ||
    !state.bestGhostFrames ||
    state.bestGhostFrames.length === 0
  ) {
    ghostKart.visible = false;
    return;
  }

  const idx = clamp(
    Math.floor(state.totalTime / FIXED_DT),
    0,
    state.bestGhostFrames.length - 1,
  );
  const frame = state.bestGhostFrames[idx];
  ghostKart.visible = true;
  ghostKart.position.set(frame.x, frame.y, frame.z);
  ghostKart.rotation.y = -frame.heading + Math.PI / 2;
}

function render() {
  kartMesh.position.copy(state.position);
  kartMesh.rotation.y = -state.heading + Math.PI / 2;

  updateGhost();

  const cameraTarget = new THREE.Vector3(
    state.position.x - Math.cos(state.heading) * 22,
    16,
    state.position.z - Math.sin(state.heading) * 22,
  );
  camera.position.lerp(cameraTarget, 0.1);
  camera.lookAt(
    state.position.x + Math.cos(state.heading) * 9,
    state.position.y + 4,
    state.position.z + Math.sin(state.heading) * 9,
  );

  updateHUD();
  renderer.render(scene, camera);
}

function advanceSimulation(ms) {
  const steps = Math.max(1, Math.round(ms / (FIXED_DT * 1000)));
  for (let i = 0; i < steps; i += 1) {
    updateKart(FIXED_DT);
  }
  render();
}

window.advanceTime = (ms) => {
  advanceSimulation(ms);
};

window.render_game_to_text = () => {
  const payload = {
    coordinateSystem: {
      origin: "world center",
      x: "east(+), west(-)",
      z: "south(+), north(-)",
      y: "up(+)",
    },
    mode: state.mode,
    lap: state.lap,
    totalLaps: LAP_COUNT,
    currentLapTime: Number(state.currentLapTime.toFixed(3)),
    totalTime: Number(state.totalTime.toFixed(3)),
    speed: Number(state.speed.toFixed(2)),
    offroad: state.offroad,
    driftActive: state.driftActive,
    driftCharge: Number(state.driftCharge.toFixed(3)),
    boostTimeLeft: Number(state.boostTimeLeft.toFixed(3)),
    stunTimeLeft: Number(state.stunTimeLeft.toFixed(3)),
    player: {
      x: Number(state.position.x.toFixed(2)),
      y: Number(state.position.y.toFixed(2)),
      z: Number(state.position.z.toFixed(2)),
      heading: Number(state.heading.toFixed(3)),
    },
    ghost: {
      enabled: state.ghostEnabled,
      available: Boolean(state.bestGhostFrames && state.bestGhostFrames.length),
      visible: ghostKart.visible,
      x: Number(ghostKart.position.x.toFixed(2)),
      y: Number(ghostKart.position.y.toFixed(2)),
      z: Number(ghostKart.position.z.toFixed(2)),
    },
  };
  return JSON.stringify(payload);
};

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

function setModeUI() {
  const running = state.mode === "running";
  hudEl.classList.toggle("hidden", !running);
  startScreenEl.classList.toggle("hidden", state.mode !== "start");
}

async function startRace() {
  audio.init();
  await audio.resume();
  finishScreenEl.classList.add("hidden");
  startScreenEl.classList.add("hidden");
  hudEl.classList.remove("hidden");
  resetRunState();
}

startBtn.addEventListener("click", () => {
  startRace();
});

restartBtn.addEventListener("click", () => {
  startRace();
});

finishRestartBtn.addEventListener("click", () => {
  startRace();
});

ghostToggleEl.addEventListener("change", (event) => {
  state.ghostEnabled = Boolean(event.target.checked);
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keydown", (event) => {
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    input.left = true;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    input.right = true;
  }
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
    input.drift = true;
  }
  if (event.code === "Space") {
    input.drift = true;
  }
  if (event.code === "KeyF") {
    toggleFullscreen();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    input.left = false;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    input.right = false;
  }
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
    input.drift = false;
    releaseDrift();
  }
  if (event.code === "Space") {
    input.drift = false;
    releaseDrift();
  }
});

resetKartPose();
setModeUI();
updateHUD();
render();

let lastTime = performance.now();
let accumulator = 0;

function gameLoop(now) {
  const frameDt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += frameDt;

  while (accumulator >= FIXED_DT) {
    updateKart(FIXED_DT);
    accumulator -= FIXED_DT;
  }

  render();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
