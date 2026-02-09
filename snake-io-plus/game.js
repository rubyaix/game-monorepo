(() => {
  const canvas = document.getElementById("game-canvas");
  const menuOverlay = document.getElementById("menu-overlay");
  const gameoverOverlay = document.getElementById("gameover-overlay");
  const gameoverStats = document.getElementById("gameover-stats");
  const startBtn = document.getElementById("start-btn");
  const restartBtn = document.getElementById("restart-btn");
  const backMenuBtn = document.getElementById("back-menu-btn");
  const touchBoostBtn = document.getElementById("touch-boost");

  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const TAU = Math.PI * 2;
  const CONFIG = {
    worldWidth: 5200,
    worldHeight: 5200,
    foodTarget: 700,
    maxFood: 1300,
    botCount: 16,
    segmentSpacing: 11,
    initialPlayerSegments: 20,
    initialBotSegmentsMin: 15,
    initialBotSegmentsMax: 28,
    baseSpeed: 170,
    boostMultiplier: 1.72,
    boostDrainPerSec: 34,
    boostRecoverPerSec: 23,
    minBoostSegments: 11,
    boostDropInterval: 0.09,
    botRespawnMin: 1.4,
    botRespawnMax: 3.4,
    magnetRange: 170,
    magnetStrength: 360,
    edgeMargin: 220,
    edgePush: 880,
  };

  const BOT_SKINS = [
    { body: "#4aa8ff", head: "#8fd2ff", accent: "#dff3ff" },
    { body: "#ff8f5a", head: "#ffd2a5", accent: "#ffeed8" },
    { body: "#52d3a5", head: "#90f5cd", accent: "#defef2" },
    { body: "#9a8cff", head: "#cfc6ff", accent: "#f0ecff" },
    { body: "#ff78a4", head: "#ffbcd0", accent: "#ffe5ef" },
    { body: "#78b64b", head: "#c5f28a", accent: "#ebffd1" },
    { body: "#e58bff", head: "#f5c7ff", accent: "#fff0ff" },
    { body: "#53d0e0", head: "#97effa", accent: "#dffbff" },
  ];

  const BOT_NAMES = [
    "Nova",
    "Rex",
    "Aster",
    "Echo",
    "Mango",
    "Pico",
    "Bolt",
    "Luna",
    "Taro",
    "Kite",
    "Dune",
    "Sora",
    "Mint",
    "Nori",
    "Iris",
    "Blitz",
    "Vega",
    "Coco",
  ];

  const state = {
    mode: "menu",
    paused: false,
    time: 0,
    frameTime: performance.now(),
    dpr: Math.max(1, Math.min(window.devicePixelRatio || 1, 2)),
    viewWidth: 0,
    viewHeight: 0,
    camera: { x: CONFIG.worldWidth / 2, y: CONFIG.worldHeight / 2 },
    input: {
      up: false,
      down: false,
      left: false,
      right: false,
      boostKey: false,
      touchBoost: false,
      pointerActive: false,
      pointerX: 0,
      pointerY: 0,
    },
    usingTouch: false,
    player: null,
    bots: [],
    snakes: [],
    foods: [],
    leaderboard: [],
    score: 0,
    bestScore: 0,
    kills: 0,
    nextSnakeId: 1,
    nextFoodId: 1,
  };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function distSq(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  function shortestAngleDelta(from, to) {
    let delta = to - from;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;
    return delta;
  }

  function easeTowardAngle(current, target, maxStep) {
    const delta = shortestAngleDelta(current, target);
    if (Math.abs(delta) <= maxStep) return target;
    return current + Math.sign(delta) * maxStep;
  }

  function worldToScreen(x, y) {
    return {
      x: x - state.camera.x + state.viewWidth * 0.5,
      y: y - state.camera.y + state.viewHeight * 0.5,
    };
  }

  function drawRoundRect(x, y, w, h, r) {
    const rr = Math.min(r, w * 0.5, h * 0.5);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function resizeCanvas() {
    state.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    state.viewWidth = Math.max(320, window.innerWidth);
    state.viewHeight = Math.max(320, window.innerHeight);
    canvas.width = Math.floor(state.viewWidth * state.dpr);
    canvas.height = Math.floor(state.viewHeight * state.dpr);
    canvas.style.width = `${state.viewWidth}px`;
    canvas.style.height = `${state.viewHeight}px`;
    clampCameraInsideWorld();
  }

  function clampCameraInsideWorld() {
    const halfW = state.viewWidth * 0.5;
    const halfH = state.viewHeight * 0.5;
    state.camera.x = clamp(state.camera.x, halfW, CONFIG.worldWidth - halfW);
    state.camera.y = clamp(state.camera.y, halfH, CONFIG.worldHeight - halfH);
  }

  function randomFoodColor() {
    const hue = rand(24, 212);
    return `hsl(${hue.toFixed(1)} 88% 63%)`;
  }

  function createFood(x, y, fromBoost = false) {
    return {
      id: state.nextFoodId++,
      x: clamp(x, 4, CONFIG.worldWidth - 4),
      y: clamp(y, 4, CONFIG.worldHeight - 4),
      r: fromBoost ? rand(3.2, 4.8) : rand(2.8, 4.3),
      value: fromBoost ? 1.2 : 1,
      color: fromBoost ? "#ffb56d" : randomFoodColor(),
      fromBoost,
      phase: rand(0, TAU),
    };
  }

  function randomSpawnPoint() {
    return {
      x: rand(380, CONFIG.worldWidth - 380),
      y: rand(380, CONFIG.worldHeight - 380),
    };
  }

  function makeSnake(name, isPlayer, skin, segmentCount, spawn) {
    const heading = rand(0, TAU);
    const snake = {
      id: state.nextSnakeId++,
      name,
      isPlayer,
      bodyColor: skin.body,
      headColor: skin.head,
      accentColor: skin.accent,
      heading,
      targetHeading: heading,
      turnRate: isPlayer ? 6.2 : 4.4,
      baseSpeed: isPlayer ? CONFIG.baseSpeed + 6 : CONFIG.baseSpeed,
      boostMeter: 100,
      boosting: false,
      boostDropTimer: 0,
      segmentRadius: 6.8,
      headRadius: 8.6,
      targetSegments: Math.max(10, segmentCount),
      growth: 0,
      alive: true,
      respawnAt: 0,
      segments: [],
      ai: {
        decisionTimer: 0,
        targetFoodId: null,
        boost: false,
        wanderHeading: heading,
      },
    };

    for (let i = 0; i < snake.targetSegments; i += 1) {
      snake.segments.push({
        x: spawn.x - Math.cos(heading) * i * CONFIG.segmentSpacing,
        y: spawn.y - Math.sin(heading) * i * CONFIG.segmentSpacing,
      });
    }
    updateSnakeSize(snake);
    return snake;
  }

  function updateSnakeSize(snake) {
    snake.segmentRadius = clamp(5.6 + snake.targetSegments * 0.033, 5.4, 11.6);
    snake.headRadius = snake.segmentRadius + 1.6;
  }

  function respawnBot(bot) {
    const spawn = randomSpawnPoint();
    const heading = rand(0, TAU);
    const segmentCount = Math.floor(rand(CONFIG.initialBotSegmentsMin, CONFIG.initialBotSegmentsMax));
    bot.alive = true;
    bot.heading = heading;
    bot.targetHeading = heading;
    bot.boostMeter = 100;
    bot.boosting = false;
    bot.boostDropTimer = 0;
    bot.targetSegments = segmentCount;
    bot.growth = 0;
    bot.respawnAt = 0;
    bot.ai.decisionTimer = 0;
    bot.ai.targetFoodId = null;
    bot.ai.boost = false;
    bot.ai.wanderHeading = heading;
    bot.segments.length = 0;

    for (let i = 0; i < bot.targetSegments; i += 1) {
      bot.segments.push({
        x: spawn.x - Math.cos(heading) * i * CONFIG.segmentSpacing,
        y: spawn.y - Math.sin(heading) * i * CONFIG.segmentSpacing,
      });
    }
    updateSnakeSize(bot);
  }

  function buildWorld() {
    state.foods = [];
    state.bots = [];
    state.snakes = [];
    state.kills = 0;
    state.score = 0;

    const playerSpawn = {
      x: CONFIG.worldWidth * 0.5,
      y: CONFIG.worldHeight * 0.5,
    };

    const playerSkin = {
      body: "#2ec4b6",
      head: "#9df6e9",
      accent: "#dcfff9",
    };
    const player = makeSnake(
      "YOU",
      true,
      playerSkin,
      CONFIG.initialPlayerSegments,
      playerSpawn
    );
    state.player = player;
    state.snakes.push(player);

    const shuffledNames = [...BOT_NAMES].sort(() => Math.random() - 0.5);
    for (let i = 0; i < CONFIG.botCount; i += 1) {
      const skin = BOT_SKINS[i % BOT_SKINS.length];
      const name = shuffledNames[i] || `Bot-${i + 1}`;
      const spawn = randomSpawnPoint();
      const segments = Math.floor(rand(CONFIG.initialBotSegmentsMin, CONFIG.initialBotSegmentsMax));
      const bot = makeSnake(name, false, skin, segments, spawn);
      state.bots.push(bot);
      state.snakes.push(bot);
    }

    for (let i = 0; i < CONFIG.foodTarget; i += 1) {
      const p = randomSpawnPoint();
      state.foods.push(createFood(p.x, p.y, false));
    }

    state.camera.x = player.segments[0].x;
    state.camera.y = player.segments[0].y;
    clampCameraInsideWorld();
    refreshLeaderboard();
  }

  function startGame() {
    state.mode = "playing";
    state.paused = false;
    state.time = 0;
    state.frameTime = performance.now();
    buildWorld();

    menuOverlay.classList.remove("visible");
    gameoverOverlay.classList.remove("visible");
  }

  function backToMenu() {
    state.mode = "menu";
    state.paused = false;
    state.input.boostKey = false;
    state.input.touchBoost = false;
    state.input.pointerActive = false;
    menuOverlay.classList.add("visible");
    gameoverOverlay.classList.remove("visible");
  }

  function showGameOver() {
    const score = computeScore();
    state.bestScore = Math.max(state.bestScore, score);
    const length = state.player ? state.player.targetSegments : 0;
    gameoverStats.textContent = `점수 ${score.toLocaleString()} | 길이 ${length} | 처치 ${state.kills}`;
    gameoverOverlay.classList.add("visible");
  }

  function isBoostingRequested() {
    return state.input.boostKey || state.input.touchBoost;
  }

  function updatePlayerIntent() {
    const player = state.player;
    if (!player || !player.alive) return;

    const head = player.segments[0];
    let target = null;

    if (state.input.pointerActive) {
      const worldX = state.camera.x + (state.input.pointerX - state.viewWidth * 0.5);
      const worldY = state.camera.y + (state.input.pointerY - state.viewHeight * 0.5);
      const dx = worldX - head.x;
      const dy = worldY - head.y;
      if (dx * dx + dy * dy > 16) {
        target = Math.atan2(dy, dx);
      }
    }

    if (target === null) {
      const x = (state.input.right ? 1 : 0) - (state.input.left ? 1 : 0);
      const y = (state.input.down ? 1 : 0) - (state.input.up ? 1 : 0);
      if (x !== 0 || y !== 0) {
        target = Math.atan2(y, x);
      }
    }

    if (target !== null) {
      player.targetHeading = target;
    }
  }

  function pickFoodTarget(snake) {
    const head = snake.segments[0];
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;
    const sampleStep = Math.max(1, Math.floor(state.foods.length / 180));

    for (let i = 0; i < state.foods.length; i += sampleStep) {
      const food = state.foods[i];
      const d = distSq(head.x, head.y, food.x, food.y);
      const score = d * (food.fromBoost ? 0.9 : 1);
      if (score < bestScore) {
        bestScore = score;
        best = food;
      }
    }

    return best;
  }

  function findNearestHazard(snake, range) {
    const head = snake.segments[0];
    const rangeSq = range * range;
    let nearest = null;
    let best = rangeSq;

    for (const other of state.snakes) {
      if (!other.alive || other.id === snake.id) continue;
      const step = Math.max(1, Math.floor(other.segments.length / 26));
      for (let i = 0; i < other.segments.length; i += step) {
        const seg = other.segments[i];
        const d = distSq(head.x, head.y, seg.x, seg.y);
        if (d < best) {
          best = d;
          nearest = seg;
        }
      }
    }

    return nearest;
  }

  function applyEdgeSteering(snake) {
    const head = snake.segments[0];
    let vx = 0;
    let vy = 0;

    if (head.x < CONFIG.edgeMargin) vx += (CONFIG.edgeMargin - head.x) * CONFIG.edgePush;
    if (head.x > CONFIG.worldWidth - CONFIG.edgeMargin) {
      vx -= (head.x - (CONFIG.worldWidth - CONFIG.edgeMargin)) * CONFIG.edgePush;
    }
    if (head.y < CONFIG.edgeMargin) vy += (CONFIG.edgeMargin - head.y) * CONFIG.edgePush;
    if (head.y > CONFIG.worldHeight - CONFIG.edgeMargin) {
      vy -= (head.y - (CONFIG.worldHeight - CONFIG.edgeMargin)) * CONFIG.edgePush;
    }

    if (vx !== 0 || vy !== 0) {
      const edgeHeading = Math.atan2(vy, vx);
      snake.targetHeading = lerp(snake.targetHeading, edgeHeading, 0.26);
    }
  }

  function updateBotIntent(bot, dt) {
    if (!bot.alive) return;

    bot.ai.decisionTimer -= dt;
    if (bot.ai.decisionTimer <= 0) {
      bot.ai.decisionTimer = rand(0.2, 0.62);
      const head = bot.segments[0];

      const food = pickFoodTarget(bot);
      let vx = 0;
      let vy = 0;

      if (food) {
        vx += (food.x - head.x) * 1.15;
        vy += (food.y - head.y) * 1.15;
        bot.ai.targetFoodId = food.id;
      }

      const hazard = findNearestHazard(bot, 170);
      if (hazard) {
        vx += (head.x - hazard.x) * 3.6;
        vy += (head.y - hazard.y) * 3.6;
      }

      if (Math.abs(vx) + Math.abs(vy) < 8) {
        bot.ai.wanderHeading += rand(-0.95, 0.95);
      } else {
        bot.ai.wanderHeading = Math.atan2(vy, vx) + rand(-0.2, 0.2);
      }

      bot.targetHeading = bot.ai.wanderHeading;
      bot.ai.boost =
        !!food &&
        distSq(head.x, head.y, food.x, food.y) < 220 * 220 &&
        bot.boostMeter > 35 &&
        Math.random() < 0.4;
    }

    applyEdgeSteering(bot);
  }

  function normalizeSnakeLength(snake) {
    while (snake.growth >= 1) {
      snake.growth -= 1;
      snake.targetSegments += 1;
    }

    if (snake.segments.length < snake.targetSegments) {
      const tail = snake.segments[snake.segments.length - 1];
      snake.segments.push({ x: tail.x, y: tail.y });
    }

    while (snake.segments.length > snake.targetSegments) {
      snake.segments.pop();
    }

    updateSnakeSize(snake);
  }

  function dropBoostFoodFromTail(snake) {
    if (state.foods.length >= CONFIG.maxFood) return;
    const tail = snake.segments[snake.segments.length - 1];
    if (!tail) return;
    state.foods.push(
      createFood(tail.x + rand(-7, 7), tail.y + rand(-7, 7), true)
    );
  }

  function updateSnakeMovement(snake, dt) {
    if (!snake.alive || snake.segments.length === 0) return;

    const canBoost =
      (snake.isPlayer ? isBoostingRequested() : snake.ai.boost) &&
      snake.boostMeter > 0 &&
      snake.targetSegments > CONFIG.minBoostSegments;

    snake.boosting = canBoost;
    if (snake.boosting) {
      snake.boostMeter = Math.max(0, snake.boostMeter - CONFIG.boostDrainPerSec * dt);
      snake.boostDropTimer += dt;

      while (snake.boostDropTimer >= CONFIG.boostDropInterval) {
        snake.boostDropTimer -= CONFIG.boostDropInterval;
        if (snake.targetSegments > CONFIG.minBoostSegments) {
          snake.targetSegments -= 1;
          dropBoostFoodFromTail(snake);
        }
      }
    } else {
      snake.boostDropTimer = 0;
      snake.boostMeter = Math.min(100, snake.boostMeter + CONFIG.boostRecoverPerSec * dt);
    }

    const sizePenalty = clamp(1.16 - snake.targetSegments * 0.0086, 0.56, 1.16);
    const speed =
      snake.baseSpeed * sizePenalty * (snake.boosting ? CONFIG.boostMultiplier : 1);

    snake.heading = easeTowardAngle(snake.heading, snake.targetHeading, snake.turnRate * dt);

    const head = snake.segments[0];
    head.x = clamp(head.x + Math.cos(snake.heading) * speed * dt, 0, CONFIG.worldWidth);
    head.y = clamp(head.y + Math.sin(snake.heading) * speed * dt, 0, CONFIG.worldHeight);

    const spacing = CONFIG.segmentSpacing;
    for (let i = 1; i < snake.segments.length; i += 1) {
      const prev = snake.segments[i - 1];
      const seg = snake.segments[i];
      const dx = prev.x - seg.x;
      const dy = prev.y - seg.y;
      const d = Math.hypot(dx, dy) || 0.0001;
      const pull = (d - spacing) / d;
      if (pull > 0) {
        seg.x += dx * pull;
        seg.y += dy * pull;
      }
    }

    normalizeSnakeLength(snake);
    applyEdgeSteering(snake);
  }

  function updateFoods(dt) {
    if (state.mode !== "playing" || state.paused || !state.player || !state.player.alive) return;

    const head = state.player.segments[0];
    const magnetRangeSq = CONFIG.magnetRange * CONFIG.magnetRange;

    for (const food of state.foods) {
      const d2 = distSq(food.x, food.y, head.x, head.y);
      if (d2 >= magnetRangeSq) continue;
      const d = Math.sqrt(d2) || 0.0001;
      const pull = (1 - d / CONFIG.magnetRange) * CONFIG.magnetStrength * dt;
      food.x += ((head.x - food.x) / d) * pull;
      food.y += ((head.y - food.y) / d) * pull;
      food.x = clamp(food.x, 0, CONFIG.worldWidth);
      food.y = clamp(food.y, 0, CONFIG.worldHeight);
    }

    while (state.foods.length < CONFIG.foodTarget) {
      const p = randomSpawnPoint();
      state.foods.push(createFood(p.x, p.y, false));
    }
  }

  function consumeFood() {
    for (const snake of state.snakes) {
      if (!snake.alive || snake.segments.length === 0) continue;
      const head = snake.segments[0];
      const eatR = snake.headRadius + 4.5;
      const eatRSq = eatR * eatR;

      for (let i = state.foods.length - 1; i >= 0; i -= 1) {
        const food = state.foods[i];
        if (distSq(head.x, head.y, food.x, food.y) <= eatRSq) {
          snake.growth += food.value;
          state.foods.splice(i, 1);
        }
      }
    }
  }

  function queueDeath(map, victim, killerId) {
    if (!victim || !victim.alive) return;
    if (!map.has(victim.id)) {
      map.set(victim.id, killerId || null);
    }
  }

  function burstSnakeToFood(snake) {
    for (let i = 0; i < snake.segments.length; i += 2) {
      if (state.foods.length >= CONFIG.maxFood) break;
      const seg = snake.segments[i];
      state.foods.push(createFood(seg.x + rand(-9, 9), seg.y + rand(-9, 9), true));
    }
  }

  function handleSnakeDeath(victim, killer) {
    if (!victim.alive) return;
    victim.alive = false;
    victim.boosting = false;
    burstSnakeToFood(victim);

    if (killer && killer.alive && killer.id !== victim.id) {
      killer.growth += Math.max(2, victim.targetSegments * 0.16);
      if (killer.isPlayer) {
        state.kills += 1;
      }
    }

    if (victim.isPlayer) {
      state.mode = "gameover";
      state.paused = false;
      showGameOver();
    } else {
      victim.respawnAt = state.time + rand(CONFIG.botRespawnMin, CONFIG.botRespawnMax);
    }
  }

  function resolveSnakeCollisions() {
    const alive = state.snakes.filter((s) => s.alive && s.segments.length > 0);
    const pending = new Map();

    for (const snake of alive) {
      if (pending.has(snake.id)) continue;
      const head = snake.segments[0];
      for (const other of alive) {
        const start = snake.id === other.id ? 6 : 1;
        if (other.segments.length <= start) continue;

        for (let i = start; i < other.segments.length; i += 1) {
          const seg = other.segments[i];
          const hitR = snake.headRadius + other.segmentRadius * 0.9;
          if (distSq(head.x, head.y, seg.x, seg.y) <= hitR * hitR) {
            queueDeath(pending, snake, other.id);
            break;
          }
        }
        if (pending.has(snake.id)) break;
      }
    }

    for (let i = 0; i < alive.length; i += 1) {
      const a = alive[i];
      if (pending.has(a.id)) continue;
      for (let j = i + 1; j < alive.length; j += 1) {
        const b = alive[j];
        if (pending.has(b.id)) continue;
        const headA = a.segments[0];
        const headB = b.segments[0];
        const r = a.headRadius + b.headRadius;
        if (distSq(headA.x, headA.y, headB.x, headB.y) <= r * r) {
          const diff = a.targetSegments - b.targetSegments;
          if (Math.abs(diff) < 3) {
            queueDeath(pending, a, b.id);
            queueDeath(pending, b, a.id);
          } else if (diff > 0) {
            queueDeath(pending, b, a.id);
          } else {
            queueDeath(pending, a, b.id);
          }
        }
      }
    }

    if (pending.size === 0) return;

    for (const [victimId, killerId] of pending.entries()) {
      const victim = state.snakes.find((s) => s.id === victimId);
      const killer = killerId ? state.snakes.find((s) => s.id === killerId) : null;
      if (victim && victim.alive) {
        handleSnakeDeath(victim, killer);
      }
    }
  }

  function respawnBotsIfNeeded() {
    for (const bot of state.bots) {
      if (!bot.alive && bot.respawnAt > 0 && state.time >= bot.respawnAt) {
        respawnBot(bot);
      }
    }
  }

  function refreshLeaderboard() {
    const entries = state.snakes
      .filter((snake) => snake.alive || snake.isPlayer)
      .map((snake) => ({
        name: snake.name,
        length: snake.targetSegments,
        isPlayer: snake.isPlayer,
        alive: snake.alive,
      }))
      .sort((a, b) => b.length - a.length);

    state.leaderboard = entries.slice(0, 6);
    const playerEntry = entries.find((entry) => entry.isPlayer);
    if (playerEntry && !state.leaderboard.some((entry) => entry.isPlayer)) {
      state.leaderboard[state.leaderboard.length - 1] = playerEntry;
    }
  }

  function computeScore() {
    if (!state.player) return 0;
    const bodyScore = Math.max(0, state.player.targetSegments - CONFIG.initialPlayerSegments) * 12;
    const killScore = state.kills * 140;
    return Math.floor(bodyScore + killScore);
  }

  function updateCamera(dt) {
    if (!state.player || state.player.segments.length === 0) return;

    const head = state.player.segments[0];
    const smooth = 1 - Math.exp(-dt * 8);
    state.camera.x = lerp(state.camera.x, head.x, smooth);
    state.camera.y = lerp(state.camera.y, head.y, smooth);
    clampCameraInsideWorld();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, state.viewWidth, state.viewHeight);
    g.addColorStop(0, "#0d1728");
    g.addColorStop(1, "#11335a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.viewWidth, state.viewHeight);

    const spacing = 74;
    const ox = ((-state.camera.x % spacing) + spacing) % spacing;
    const oy = ((-state.camera.y % spacing) + spacing) % spacing;

    ctx.strokeStyle = "rgba(168, 206, 255, 0.12)";
    ctx.lineWidth = 1;

    for (let x = ox; x < state.viewWidth; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, state.viewHeight);
      ctx.stroke();
    }

    for (let y = oy; y < state.viewHeight; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(state.viewWidth, y);
      ctx.stroke();
    }

    const topLeft = worldToScreen(0, 0);
    const bottomRight = worldToScreen(CONFIG.worldWidth, CONFIG.worldHeight);
    ctx.strokeStyle = "rgba(110, 185, 255, 0.36)";
    ctx.lineWidth = 3;
    ctx.strokeRect(
      topLeft.x,
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y
    );
  }

  function drawFoods() {
    for (const food of state.foods) {
      const p = worldToScreen(food.x, food.y);
      if (p.x < -20 || p.y < -20 || p.x > state.viewWidth + 20 || p.y > state.viewHeight + 20) {
        continue;
      }

      const pulse = 1 + Math.sin(state.time * 4.2 + food.phase) * 0.18;
      const rr = food.r * pulse;

      ctx.beginPath();
      ctx.arc(p.x, p.y, rr + 1.7, 0, TAU);
      ctx.fillStyle = food.fromBoost
        ? "rgba(255, 178, 93, 0.28)"
        : "rgba(120, 236, 187, 0.2)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, TAU);
      ctx.fillStyle = food.color;
      ctx.fill();
    }
  }

  function drawSnake(snake) {
    if (!snake.alive || snake.segments.length === 0) return;

    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    for (let i = snake.segments.length - 1; i >= 0; i -= 1) {
      const seg = snake.segments[i];
      const p = worldToScreen(seg.x, seg.y);
      if (i === snake.segments.length - 1) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.strokeStyle = snake.bodyColor;
    ctx.lineWidth = snake.segmentRadius * 1.85;
    ctx.stroke();

    const head = snake.segments[0];
    const hp = worldToScreen(head.x, head.y);

    if (snake.isPlayer) {
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, snake.headRadius + 6, 0, TAU);
      ctx.fillStyle = "rgba(157, 246, 233, 0.22)";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(hp.x, hp.y, snake.headRadius, 0, TAU);
    ctx.fillStyle = snake.headColor;
    ctx.fill();

    const eyeOffset = snake.headRadius * 0.42;
    const eyeRadius = Math.max(1.8, snake.headRadius * 0.19);
    const forwardX = Math.cos(snake.heading);
    const forwardY = Math.sin(snake.heading);
    const normalX = -forwardY;
    const normalY = forwardX;

    const eyeBaseX = hp.x + forwardX * snake.headRadius * 0.3;
    const eyeBaseY = hp.y + forwardY * snake.headRadius * 0.3;

    ctx.fillStyle = snake.accentColor;
    ctx.beginPath();
    ctx.arc(eyeBaseX + normalX * eyeOffset, eyeBaseY + normalY * eyeOffset, eyeRadius, 0, TAU);
    ctx.arc(eyeBaseX - normalX * eyeOffset, eyeBaseY - normalY * eyeOffset, eyeRadius, 0, TAU);
    ctx.fill();

    if (!snake.isPlayer && hp.x > -40 && hp.x < state.viewWidth + 40 && hp.y > -24 && hp.y < state.viewHeight + 24) {
      ctx.fillStyle = "rgba(233, 245, 255, 0.95)";
      ctx.font = "600 12px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(snake.name, hp.x, hp.y - snake.headRadius - 8);
    }
  }

  function drawHUD() {
    if (!state.player) return;

    const score = computeScore();
    const boost = Math.round(state.player.boostMeter);
    const length = state.player.targetSegments;

    ctx.fillStyle = "rgba(7, 17, 31, 0.72)";
    drawRoundRect(16, 16, 256, 118, 14);
    ctx.fill();

    ctx.fillStyle = "#dcecff";
    ctx.font = "700 19px Trebuchet MS, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`점수 ${score.toLocaleString()}`, 30, 44);

    ctx.font = "600 14px Trebuchet MS, sans-serif";
    ctx.fillStyle = "#b7cee9";
    ctx.fillText(`길이 ${length}   처치 ${state.kills}`, 30, 66);

    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    drawRoundRect(30, 80, 224, 16, 10);
    ctx.fill();

    const ratio = clamp(boost / 100, 0, 1);
    const boostGrad = ctx.createLinearGradient(30, 80, 254, 80);
    boostGrad.addColorStop(0, "#ffd774");
    boostGrad.addColorStop(1, "#ff7b9d");
    ctx.fillStyle = boostGrad;
    drawRoundRect(30, 80, 224 * ratio, 16, 10);
    ctx.fill();

    ctx.fillStyle = "#f7f9ff";
    ctx.font = "600 12px Trebuchet MS, sans-serif";
    ctx.fillText(`부스트 ${boost}%`, 30, 112);

    if (state.paused && state.mode === "playing") {
      ctx.fillStyle = "rgba(9, 15, 25, 0.58)";
      drawRoundRect(state.viewWidth * 0.5 - 140, state.viewHeight * 0.5 - 40, 280, 80, 16);
      ctx.fill();
      ctx.fillStyle = "#f2f6ff";
      ctx.font = "700 28px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", state.viewWidth * 0.5, state.viewHeight * 0.5 + 10);
      ctx.textAlign = "left";
    }
  }

  function drawLeaderboard() {
    if (state.leaderboard.length === 0) return;

    const boxW = 230;
    const rowH = 22;
    const boxH = 36 + state.leaderboard.length * rowH;
    const x = state.viewWidth - boxW - 16;
    const y = 16;

    ctx.fillStyle = "rgba(7, 17, 31, 0.72)";
    drawRoundRect(x, y, boxW, boxH, 14);
    ctx.fill();

    ctx.fillStyle = "#e7f1ff";
    ctx.font = "700 15px Trebuchet MS, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("리더보드", x + 14, y + 23);

    ctx.font = "600 13px Trebuchet MS, sans-serif";
    for (let i = 0; i < state.leaderboard.length; i += 1) {
      const entry = state.leaderboard[i];
      const yy = y + 43 + i * rowH;
      ctx.fillStyle = entry.isPlayer ? "#9df6e9" : "#d2def0";
      const dead = entry.alive ? "" : " (X)";
      ctx.fillText(`${i + 1}. ${entry.name}${dead}`, x + 14, yy);
      ctx.textAlign = "right";
      ctx.fillText(String(entry.length), x + boxW - 14, yy);
      ctx.textAlign = "left";
    }
  }

  function render() {
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    drawBackground();
    drawFoods();
    for (const snake of state.snakes) {
      drawSnake(snake);
    }
    if (state.mode === "playing" || state.mode === "gameover") {
      drawHUD();
      drawLeaderboard();
    }
  }

  function update(deltaSec) {
    const dt = Math.min(0.04, deltaSec);
    state.time += dt;

    if (state.mode !== "playing") {
      return;
    }

    if (state.paused) {
      return;
    }

    updatePlayerIntent();
    for (const bot of state.bots) {
      updateBotIntent(bot, dt);
    }

    for (const snake of state.snakes) {
      updateSnakeMovement(snake, dt);
    }

    updateFoods(dt);
    consumeFood();
    resolveSnakeCollisions();
    respawnBotsIfNeeded();
    updateCamera(dt);

    state.score = computeScore();
    state.bestScore = Math.max(state.bestScore, state.score);
    refreshLeaderboard();
  }

  function frame(now) {
    const dt = (now - state.frameTime) / 1000;
    state.frameTime = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  function setMoveKey(code, value) {
    switch (code) {
      case "ArrowUp":
      case "KeyW":
        state.input.up = value;
        return true;
      case "ArrowDown":
      case "KeyS":
        state.input.down = value;
        return true;
      case "ArrowLeft":
      case "KeyA":
        state.input.left = value;
        return true;
      case "ArrowRight":
      case "KeyD":
        state.input.right = value;
        return true;
      case "Space":
      case "ShiftLeft":
      case "ShiftRight":
        state.input.boostKey = value;
        return true;
      default:
        return false;
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      return;
    }
    document.exitFullscreen?.();
  }

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyF") {
      toggleFullscreen();
      event.preventDefault();
      return;
    }

    if (event.code === "KeyP" && state.mode === "playing") {
      state.paused = !state.paused;
      event.preventDefault();
      return;
    }

    if ((event.code === "Enter" || event.code === "Space") && state.mode === "menu") {
      startGame();
      event.preventDefault();
      return;
    }

    if (
      (event.code === "Enter" || event.code === "Space" || event.code === "KeyR") &&
      state.mode === "gameover"
    ) {
      startGame();
      event.preventDefault();
      return;
    }

    if (setMoveKey(event.code, true)) {
      event.preventDefault();
    }
  });

  window.addEventListener("keyup", (event) => {
    if (setMoveKey(event.code, false)) {
      event.preventDefault();
    }
  });

  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    state.input.pointerActive = true;
    state.input.pointerX = event.clientX - rect.left;
    state.input.pointerY = event.clientY - rect.top;
  });

  canvas.addEventListener("mouseleave", () => {
    state.input.pointerActive = false;
  });

  function updateTouchPoint(touch) {
    const rect = canvas.getBoundingClientRect();
    state.input.pointerActive = true;
    state.input.pointerX = touch.clientX - rect.left;
    state.input.pointerY = touch.clientY - rect.top;
  }

  canvas.addEventListener(
    "touchstart",
    (event) => {
      state.usingTouch = true;
      touchBoostBtn.classList.add("visible");
      if (event.touches.length > 0) {
        updateTouchPoint(event.touches[0]);
      }
      state.input.touchBoost = event.touches.length >= 2 || state.input.touchBoost;
      event.preventDefault();
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length > 0) {
        updateTouchPoint(event.touches[0]);
      }
      state.input.touchBoost = event.touches.length >= 2 || state.input.touchBoost;
      event.preventDefault();
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchend",
    (event) => {
      if (event.touches.length === 0) {
        state.input.pointerActive = false;
      }
      if (event.touches.length < 2 && !touchBoostBtn.matches(":active")) {
        state.input.touchBoost = false;
      }
      event.preventDefault();
    },
    { passive: false }
  );

  touchBoostBtn.addEventListener("pointerdown", (event) => {
    state.input.touchBoost = true;
    event.preventDefault();
  });

  touchBoostBtn.addEventListener("pointerup", (event) => {
    state.input.touchBoost = false;
    event.preventDefault();
  });

  touchBoostBtn.addEventListener("pointercancel", () => {
    state.input.touchBoost = false;
  });

  startBtn?.addEventListener("click", startGame);
  restartBtn?.addEventListener("click", startGame);
  backMenuBtn?.addEventListener("click", backToMenu);

  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("fullscreenchange", resizeCanvas);

  function collectClosestFoods(x, y, limit) {
    return state.foods
      .map((food) => ({
        x: Number(food.x.toFixed(1)),
        y: Number(food.y.toFixed(1)),
        fromBoost: food.fromBoost,
        d2: distSq(x, y, food.x, food.y),
      }))
      .sort((a, b) => a.d2 - b.d2)
      .slice(0, limit)
      .map((food) => ({ x: food.x, y: food.y, fromBoost: food.fromBoost }));
  }

  function collectNearbyBots(playerHead, limit) {
    return state.bots
      .map((bot) => {
        const head = bot.segments[0] || { x: 0, y: 0 };
        return {
          name: bot.name,
          alive: bot.alive,
          x: Number(head.x.toFixed(1)),
          y: Number(head.y.toFixed(1)),
          heading: Number(bot.heading.toFixed(3)),
          length: bot.targetSegments,
          d2: distSq(playerHead.x, playerHead.y, head.x, head.y),
        };
      })
      .sort((a, b) => a.d2 - b.d2)
      .slice(0, limit)
      .map((bot) => ({
        name: bot.name,
        alive: bot.alive,
        x: bot.x,
        y: bot.y,
        heading: bot.heading,
        length: bot.length,
        distance: Number(Math.sqrt(bot.d2).toFixed(1)),
      }));
  }

  function renderGameToText() {
    const player = state.player;
    const playerHead = player && player.segments[0] ? player.segments[0] : { x: 0, y: 0 };
    const payload = {
      coordinateSystem:
        "world origin is top-left (0,0); +x right, +y down. camera is centered on player in viewport space.",
      mode: state.mode,
      paused: state.paused,
      world: {
        width: CONFIG.worldWidth,
        height: CONFIG.worldHeight,
      },
      camera: {
        x: Number(state.camera.x.toFixed(1)),
        y: Number(state.camera.y.toFixed(1)),
        viewWidth: state.viewWidth,
        viewHeight: state.viewHeight,
      },
      player: player
        ? {
            alive: player.alive,
            x: Number(playerHead.x.toFixed(1)),
            y: Number(playerHead.y.toFixed(1)),
            heading: Number(player.heading.toFixed(3)),
            length: player.targetSegments,
            boostMeter: Number(player.boostMeter.toFixed(1)),
            boosting: player.boosting,
            kills: state.kills,
            score: computeScore(),
          }
        : null,
      foodCount: state.foods.length,
      closestFoods: collectClosestFoods(playerHead.x, playerHead.y, 10),
      nearbyBots: collectNearbyBots(playerHead, 8),
      leaderboard: state.leaderboard,
    };
    return JSON.stringify(payload);
  }

  window.render_game_to_text = renderGameToText;
  window.advanceTime = (ms) => {
    const frames = Math.max(1, Math.round(ms / (1000 / 60)));
    const dt = ms / frames / 1000;
    for (let i = 0; i < frames; i += 1) {
      update(dt);
    }
    render();
  };

  resizeCanvas();
  backToMenu();
  requestAnimationFrame(frame);
})();
