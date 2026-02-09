(() => {
  const GRID_SIZE = 7;
  const HEX_SIZE = 38;
  const HEX_W = Math.sqrt(3) * HEX_SIZE;
  const HEX_H = HEX_SIZE * 2;
  const ROW_STEP = HEX_H * 0.75;

  const START = { col: 0, row: 3 };
  const END = { col: 6, row: 3 };

  const PATH_TILES = new Set([
    "0,3", "1,3", "2,3",
    "3,2", "4,2", "4,3",
    "3,4", "4,4",
    "5,3", "6,3",
  ]);

  const TOWER_TYPES = {
    arrow: { label: "Arrow", cost: 20, dmg: 10, fireRate: 1.0, range: 2, color: 0x79c7ff },
    cannon: { label: "Cannon", cost: 40, dmg: 40, fireRate: 0.3, range: 3, splash: 1, color: 0xffb26f },
    freeze: { label: "Freeze", cost: 30, dmg: 0, fireRate: 1.0, range: 2, slow: 0.5, slowMs: 2000, color: 0x9df7ff },
  };

  const ENEMY_TYPES = {
    grunt: { hp: 50, speedMul: 1.0, color: 0xff6666, reward: 10 },
    runner: { hp: 30, speedMul: 2.0, color: 0xffde59, reward: 10 },
    tank: { hp: 150, speedMul: 0.5, color: 0xb38cff, reward: 10 },
  };

  const WAVE_DATA = [
    ["grunt", "grunt", "grunt", "runner"],
    ["grunt", "grunt", "runner", "runner", "grunt"],
    ["grunt", "tank", "grunt", "runner", "grunt"],
    ["runner", "runner", "grunt", "grunt", "tank"],
    ["tank", "grunt", "runner", "runner", "grunt", "grunt"],
    ["tank", "tank", "runner", "grunt", "grunt"],
    ["runner", "runner", "runner", "tank", "grunt", "grunt"],
    ["tank", "runner", "tank", "grunt", "runner", "grunt"],
    ["tank", "tank", "runner", "runner", "grunt", "grunt", "grunt"],
    ["tank", "tank", "tank", "runner", "runner", "grunt", "grunt"],
  ];

  class SynthAudio {
    constructor(scene) {
      this.scene = scene;
      this.ctx = null;
      this.master = null;
      this.unlocked = false;
      this.bgmTimer = 0;
      this.bgmStep = 0;
      this.bgmNotes = [220, 247, 262, 247, 196, 220, 247, 196];
    }

    unlock() {
      if (this.unlocked) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18;
      this.master.connect(this.ctx.destination);
      this.unlocked = true;
    }

    beep(freq, duration, type, gain = 0.25) {
      if (!this.unlocked || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const amp = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      amp.gain.setValueAtTime(gain, now);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(amp);
      amp.connect(this.master);
      osc.start(now);
      osc.stop(now + duration);
    }

    playPlacement() { this.beep(520, 0.08, "square", 0.22); }
    playHit() { this.beep(340, 0.05, "sawtooth", 0.16); }
    playDeath() { this.beep(180, 0.2, "triangle", 0.22); }

    update(dtMs, enabled) {
      if (!enabled || !this.unlocked) return;
      this.bgmTimer -= dtMs;
      if (this.bgmTimer <= 0) {
        const note = this.bgmNotes[this.bgmStep % this.bgmNotes.length];
        this.beep(note, 0.22, "triangle", 0.08);
        this.bgmStep += 1;
        this.bgmTimer = 450;
      }
    }
  }

  class HexHoldScene extends Phaser.Scene {
    constructor() {
      super("hex-hold");
      this.originX = 0;
      this.originY = 0;
      this.graphics = null;
      this.previewGraphic = null;
      this.projectileGraphics = null;

      this.gold = 100;
      this.lives = 10;
      this.waveIndex = 0;
      this.nextWaveInMs = 1000;
      this.enemiesLeaked = 0;
      this.selectedTower = "arrow";
      this.mode = "playing";

      this.towers = [];
      this.enemies = [];
      this.spawnQueue = [];
      this.spawnCooldownMs = 0;
      this.projectileFx = [];

      this.hoverTile = null;
      this.pathHighlight = [];
      this.samplePath = [];
      this.uiText = null;
      this.waveText = null;
      this.modeText = null;
      this.towerButtons = [];
      this.audio = null;
    }

    create() {
      this.cameras.main.setBackgroundColor("#152630");
      this.originX = 150;
      this.originY = 110;
      this.graphics = this.add.graphics();
      this.projectileGraphics = this.add.graphics();
      this.previewGraphic = this.add.graphics();
      this.audio = new SynthAudio(this);

      this.uiText = this.add.text(20, 16, "", { fontSize: "22px", color: "#f2f7ff" }).setDepth(20);
      this.waveText = this.add.text(20, 44, "", { fontSize: "20px", color: "#e4f1ff" }).setDepth(20);
      this.modeText = this.add.text(20, 72, "", { fontSize: "22px", color: "#ffd07f" }).setDepth(20);

      this.createTowerButtons();
      this.input.on("pointermove", (pointer) => this.onPointerMove(pointer));
      this.input.on("pointerdown", (pointer) => this.onPointerDown(pointer));

      this.samplePath = this.findPath(START, END, PATH_TILES) || [];
      this.refreshPathHighlight();
      this.renderBoard();
      this.renderUI();

      window.render_game_to_text = () => this.renderGameToText();
      window.advanceTime = (ms) => this.advanceTime(ms);
    }

    createTowerButtons() {
      const defs = [
        { id: "arrow", x: 730, y: 20, label: "1 Arrow (20g)" },
        { id: "cannon", x: 730, y: 56, label: "2 Cannon (40g)" },
        { id: "freeze", x: 730, y: 92, label: "3 Freeze (30g)" },
      ];

      defs.forEach((d) => {
        const bg = this.add.rectangle(d.x, d.y, 230, 30, 0x223748, 0.92).setOrigin(0, 0).setDepth(20).setInteractive();
        const text = this.add.text(d.x + 8, d.y + 6, d.label, { fontSize: "15px", color: "#f7fbff" }).setDepth(21);
        bg.on("pointerdown", () => {
          this.selectedTower = d.id;
          this.renderUI();
          this.audio.unlock();
        });
        this.towerButtons.push({ id: d.id, bg, text });
      });
    }

    onPointerMove(pointer) {
      this.hoverTile = this.pixelToHex(pointer.x, pointer.y);
    }

    onPointerDown(pointer) {
      this.audio.unlock();

      const tile = this.pixelToHex(pointer.x, pointer.y);
      if (!tile) return;
      if (tile.col < 0 || tile.row < 0 || tile.col >= GRID_SIZE || tile.row >= GRID_SIZE) return;

      if (!this.isBuildable(tile.col, tile.row)) return;
      const def = TOWER_TYPES[this.selectedTower];
      if (this.gold < def.cost) return;

      this.gold -= def.cost;
      this.towers.push({ col: tile.col, row: tile.row, type: this.selectedTower, cooldownMs: 0 });
      this.audio.playPlacement();
      this.renderUI();
    }

    update(_, delta) {
      this.simulate(delta);
    }

    advanceTime(ms) {
      const step = 1000 / 60;
      const loops = Math.max(1, Math.floor(ms / step));
      for (let i = 0; i < loops; i += 1) this.simulate(step);
    }

    simulate(delta) {
      if (this.mode === "victory" || this.mode === "defeat") {
        this.audio.update(delta, false);
        this.renderBoard();
        this.renderUI();
        return;
      }

      this.nextWaveInMs -= delta;
      if (this.nextWaveInMs <= 0 && this.waveIndex < WAVE_DATA.length) {
        this.startWave(this.waveIndex);
        this.waveIndex += 1;
        this.nextWaveInMs += 15000;
      }

      if (this.spawnQueue.length > 0) {
        this.spawnCooldownMs -= delta;
        if (this.spawnCooldownMs <= 0) {
          this.spawnEnemy(this.spawnQueue.shift());
          this.spawnCooldownMs = 900;
        }
      }

      this.updateEnemies(delta);
      this.updateTowers(delta);
      this.updateProjectileFx(delta);
      this.audio.update(delta, true);

      if (this.waveIndex >= WAVE_DATA.length && this.spawnQueue.length === 0 && this.enemies.length === 0) {
        this.mode = "victory";
      }
      if (this.lives <= 0 || this.enemiesLeaked >= 10) {
        this.mode = "defeat";
      }

      this.renderBoard();
      this.renderUI();
    }

    startWave(idx) {
      const wave = WAVE_DATA[idx];
      wave.forEach((t) => this.spawnQueue.push(t));
      this.spawnCooldownMs = 0;
    }

    spawnEnemy(typeId) {
      const path = this.findPath(START, END, PATH_TILES);
      if (!path || path.length < 2) return;
      const type = ENEMY_TYPES[typeId];
      const startPos = this.hexToPixel(path[0].col, path[0].row);
      this.enemies.push({
        typeId,
        hp: type.hp,
        maxHp: type.hp,
        baseSpeed: 52,
        speedMul: type.speedMul,
        reward: type.reward,
        path,
        pathIndex: 0,
        x: startPos.x,
        y: startPos.y,
        col: path[0].col,
        row: path[0].row,
        slowUntil: 0,
      });
    }

    updateEnemies(delta) {
      const dt = delta / 1000;
      const now = this.time.now;

      for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
        const e = this.enemies[i];
        const nextTile = e.path[e.pathIndex + 1];
        if (!nextTile) {
          this.enemies.splice(i, 1);
          this.lives -= 1;
          this.enemiesLeaked += 1;
          continue;
        }

        const target = this.hexToPixel(nextTile.col, nextTile.row);
        const dx = target.x - e.x;
        const dy = target.y - e.y;
        const dist = Math.hypot(dx, dy);
        const slowFactor = now < e.slowUntil ? 0.5 : 1;
        const speed = e.baseSpeed * e.speedMul * slowFactor;
        const move = speed * dt;

        if (dist <= move) {
          e.x = target.x;
          e.y = target.y;
          e.pathIndex += 1;
          e.col = nextTile.col;
          e.row = nextTile.row;
        } else {
          e.x += (dx / dist) * move;
          e.y += (dy / dist) * move;
        }
      }
    }

    updateTowers(delta) {
      const now = this.time.now;
      this.towers.forEach((tower) => {
        const def = TOWER_TYPES[tower.type];
        tower.cooldownMs -= delta;
        if (tower.cooldownMs > 0) return;

        const target = this.pickTarget(tower.col, tower.row, def.range);
        if (!target) return;

        tower.cooldownMs = 1000 / def.fireRate;

        if (tower.type === "arrow") {
          this.damageEnemy(target, def.dmg);
          this.audio.playHit();
          this.projectileFx.push({
            from: this.hexToPixel(tower.col, tower.row),
            to: { x: target.x, y: target.y },
            ttlMs: 100,
            color: 0x9cd8ff,
          });
        }

        if (tower.type === "cannon") {
          this.audio.playHit();
          this.projectileFx.push({
            from: this.hexToPixel(tower.col, tower.row),
            to: { x: target.x, y: target.y },
            ttlMs: 140,
            color: 0xffcfa6,
            blast: true,
          });

          this.enemies.forEach((enemy) => {
            if (this.hexDistance(enemy.col, enemy.row, target.col, target.row) <= def.splash) {
              this.damageEnemy(enemy, def.dmg);
            }
          });
        }

        if (tower.type === "freeze") {
          target.slowUntil = Math.max(target.slowUntil, now + def.slowMs);
          this.projectileFx.push({
            from: this.hexToPixel(tower.col, tower.row),
            to: { x: target.x, y: target.y },
            ttlMs: 120,
            color: 0x9df7ff,
          });
        }
      });
    }

    pickTarget(col, row, range) {
      let best = null;
      let bestPathIndex = -1;

      this.enemies.forEach((e) => {
        const d = this.hexDistance(col, row, e.col, e.row);
        if (d > range) return;
        if (e.pathIndex > bestPathIndex) {
          bestPathIndex = e.pathIndex;
          best = e;
        }
      });
      return best;
    }

    damageEnemy(enemy, amount) {
      if (amount <= 0) return;
      enemy.hp -= amount;
      if (enemy.hp > 0) return;

      const idx = this.enemies.indexOf(enemy);
      if (idx >= 0) {
        this.enemies.splice(idx, 1);
        this.gold += enemy.reward;
        this.audio.playDeath();
      }
    }

    updateProjectileFx(delta) {
      for (let i = this.projectileFx.length - 1; i >= 0; i -= 1) {
        this.projectileFx[i].ttlMs -= delta;
        if (this.projectileFx[i].ttlMs <= 0) this.projectileFx.splice(i, 1);
      }
    }

    renderBoard() {
      this.graphics.clear();
      this.projectileGraphics.clear();
      this.previewGraphic.clear();

      for (let row = 0; row < GRID_SIZE; row += 1) {
        for (let col = 0; col < GRID_SIZE; col += 1) {
          const { x, y } = this.hexToPixel(col, row);
          const key = `${col},${row}`;
          const isPath = PATH_TILES.has(key);
          const fill = isPath ? 0x355a43 : 0x2d3f52;
          this.drawHex(this.graphics, x, y, HEX_SIZE - 1, fill, 0xb8cad9, 0.65);
        }
      }

      this.pathHighlight.forEach((tile) => {
        const { x, y } = this.hexToPixel(tile.col, tile.row);
        this.drawHex(this.graphics, x, y, HEX_SIZE - 10, 0x88f39b, 0x88f39b, 0.25);
      });

      this.towers.forEach((t) => {
        const def = TOWER_TYPES[t.type];
        const { x, y } = this.hexToPixel(t.col, t.row);
        this.graphics.fillStyle(def.color, 1);
        this.graphics.fillCircle(x, y, 13);
        this.graphics.lineStyle(2, 0x111111, 0.5);
        this.graphics.strokeCircle(x, y, 13);
      });

      this.enemies.forEach((e) => {
        const type = ENEMY_TYPES[e.typeId];
        this.graphics.fillStyle(type.color, 0.95);
        this.graphics.fillCircle(e.x, e.y, 11);
        const hpRatio = Phaser.Math.Clamp(e.hp / e.maxHp, 0, 1);
        this.graphics.fillStyle(0x111111, 0.9);
        this.graphics.fillRect(e.x - 14, e.y - 18, 28, 4);
        this.graphics.fillStyle(0x61ff8f, 1);
        this.graphics.fillRect(e.x - 14, e.y - 18, 28 * hpRatio, 4);
      });

      this.projectileFx.forEach((fx) => {
        this.projectileGraphics.lineStyle(3, fx.color, 0.9);
        this.projectileGraphics.beginPath();
        this.projectileGraphics.moveTo(fx.from.x, fx.from.y);
        this.projectileGraphics.lineTo(fx.to.x, fx.to.y);
        this.projectileGraphics.strokePath();

        if (fx.blast) {
          this.projectileGraphics.fillStyle(0xffd2a9, 0.4);
          this.projectileGraphics.fillCircle(fx.to.x, fx.to.y, 18);
        }
      });

      this.drawPlacementPreview();
    }

    drawPlacementPreview() {
      if (!this.hoverTile) return;
      const { col, row } = this.hoverTile;
      if (col < 0 || row < 0 || col >= GRID_SIZE || row >= GRID_SIZE) return;
      const valid = this.isBuildable(col, row) && this.gold >= TOWER_TYPES[this.selectedTower].cost;
      const { x, y } = this.hexToPixel(col, row);
      const color = valid ? 0x79ff9f : 0xff6f6f;
      this.drawHex(this.previewGraphic, x, y, HEX_SIZE - 5, color, color, 0.25);
      this.previewGraphic.lineStyle(3, color, 0.95);
      this.previewGraphic.strokePoints(this.hexPoints(x, y, HEX_SIZE - 5), true);
    }

    renderUI() {
      this.uiText.setText(`Gold: ${this.gold}   Lives: ${this.lives}/10`);
      this.waveText.setText(`Wave: ${Math.min(this.waveIndex + (this.spawnQueue.length > 0 ? 1 : 0), 10)}/10   Next: ${Math.max(0, Math.ceil(this.nextWaveInMs / 1000))}s`);

      if (this.mode === "playing") {
        this.modeText.setText(`Selected: ${TOWER_TYPES[this.selectedTower].label}`);
      }
      if (this.mode === "victory") {
        this.modeText.setText("Victory! 10 waves cleared.");
      }
      if (this.mode === "defeat") {
        this.modeText.setText("Defeat! 10 enemies reached the end.");
      }

      this.towerButtons.forEach((btn) => {
        const active = btn.id === this.selectedTower;
        btn.bg.setFillStyle(active ? 0x3a6b8a : 0x223748, 0.95);
      });
    }

    isBuildable(col, row) {
      const key = `${col},${row}`;
      if (PATH_TILES.has(key)) return false;
      return !this.towers.some((t) => t.col === col && t.row === row);
    }

    refreshPathHighlight() {
      this.pathHighlight = this.samplePath.slice();
    }

    drawHex(graphics, cx, cy, radius, fillColor, strokeColor, alpha = 1) {
      const pts = this.hexPoints(cx, cy, radius);
      graphics.fillStyle(fillColor, alpha);
      graphics.fillPoints(pts, true);
      graphics.lineStyle(2, strokeColor, 0.55);
      graphics.strokePoints(pts, true);
    }

    hexPoints(cx, cy, radius) {
      const pts = [];
      for (let i = 0; i < 6; i += 1) {
        const angle = Phaser.Math.DegToRad(60 * i - 30);
        pts.push(new Phaser.Geom.Point(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)));
      }
      return pts;
    }

    hexToPixel(col, row) {
      return {
        x: this.originX + col * HEX_W + (row % 2 ? HEX_W / 2 : 0),
        y: this.originY + row * ROW_STEP,
      };
    }

    pixelToHex(x, y) {
      let best = null;
      let bestDist = Infinity;
      for (let row = 0; row < GRID_SIZE; row += 1) {
        for (let col = 0; col < GRID_SIZE; col += 1) {
          const p = this.hexToPixel(col, row);
          const d = Phaser.Math.Distance.Between(x, y, p.x, p.y);
          if (d < bestDist) {
            bestDist = d;
            best = { col, row };
          }
        }
      }
      return bestDist <= HEX_SIZE ? best : null;
    }

    neighbors(col, row) {
      const even = row % 2 === 0;
      const offsets = even
        ? [[-1, 0], [1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]]
        : [[-1, 0], [1, 0], [0, -1], [1, -1], [0, 1], [1, 1]];
      return offsets
        .map(([dc, dr]) => ({ col: col + dc, row: row + dr }))
        .filter((n) => n.col >= 0 && n.row >= 0 && n.col < GRID_SIZE && n.row < GRID_SIZE);
    }

    toCube(col, row) {
      const q = col - (row - (row & 1)) / 2;
      const r = row;
      const x = q;
      const z = r;
      const y = -x - z;
      return { x, y, z };
    }

    hexDistance(c1, r1, c2, r2) {
      const a = this.toCube(c1, r1);
      const b = this.toCube(c2, r2);
      return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
    }

    findPath(start, goal, walkableSet) {
      const startKey = `${start.col},${start.row}`;
      const goalKey = `${goal.col},${goal.row}`;
      const open = new Map();
      const gScore = new Map();
      const cameFrom = new Map();

      const nodeFor = (key) => {
        const [c, r] = key.split(",").map(Number);
        return { col: c, row: r };
      };

      open.set(startKey, { key: startKey, f: this.hexDistance(start.col, start.row, goal.col, goal.row) });
      gScore.set(startKey, 0);

      while (open.size > 0) {
        const sorted = [...open.values()].sort((a, b) => {
          if (a.f !== b.f) return a.f - b.f;
          return Math.random() - 0.5;
        });
        const current = sorted[0];
        open.delete(current.key);

        if (current.key === goalKey) {
          const path = [];
          let k = goalKey;
          while (k) {
            path.push(nodeFor(k));
            k = cameFrom.get(k);
          }
          path.reverse();
          return path;
        }

        const curr = nodeFor(current.key);
        const neighbors = Phaser.Utils.Array.Shuffle(this.neighbors(curr.col, curr.row));
        neighbors.forEach((n) => {
          const nk = `${n.col},${n.row}`;
          if (!walkableSet.has(nk) && nk !== goalKey && nk !== startKey) return;

          const tentative = (gScore.get(current.key) ?? Infinity) + 1;
          if (tentative < (gScore.get(nk) ?? Infinity)) {
            cameFrom.set(nk, current.key);
            gScore.set(nk, tentative);
            const h = this.hexDistance(n.col, n.row, goal.col, goal.row);
            open.set(nk, { key: nk, f: tentative + h });
          }
        });
      }
      return null;
    }

    renderGameToText() {
      const payload = {
        mode: this.mode,
        coordSystem: "odd-r offset hex grid; origin=(0,0) top-left; col+ right, row+ down",
        resources: { gold: this.gold, lives: this.lives, wave: this.waveIndex, nextWaveMs: Math.max(0, Math.floor(this.nextWaveInMs)) },
        selection: this.selectedTower,
        towers: this.towers.map((t) => ({ col: t.col, row: t.row, type: t.type, cooldownMs: Math.max(0, Math.floor(t.cooldownMs)) })),
        enemies: this.enemies.map((e) => ({ type: e.typeId, hp: e.hp, col: e.col, row: e.row, pathIndex: e.pathIndex, slowed: this.time.now < e.slowUntil })),
        pendingSpawn: this.spawnQueue.length,
      };
      return JSON.stringify(payload);
    }
  }

  const config = {
    type: Phaser.CANVAS,
    width: 980,
    height: 640,
    parent: "game-root",
    backgroundColor: "#152630",
    scene: [HexHoldScene],
  };

  new Phaser.Game(config);
})();
