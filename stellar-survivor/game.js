(() => {
  const GAME_WIDTH = 960;
  const GAME_HEIGHT = 640;

  const PLAYER_SPEED = 300;
  const PLAYER_MAX_HP = 3;
  const BULLET_SPEED = 700;
  const DEFAULT_FIRE_COOLDOWN = 1000 / 3;
  const RAPID_FIRE_COOLDOWN = 1000 / 6;

  const ENEMY_TYPES = {
    drone: { hp: 1, speed: 180, score: 10 },
    chaser: { hp: 2, speed: 150, score: 20 },
    bomber: { hp: 4, speed: 90, score: 35 }
  };

  class SynthAudio {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.bgmTimer = null;
      this.bgmStep = 0;
      this.notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 293.66, 392.0];
    }

    ensureCtx() {
      if (this.ctx) {
        return;
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        return;
      }
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.14;
      this.master.connect(this.ctx.destination);
    }

    resume() {
      this.ensureCtx();
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }

    beep(freq, duration, type = "square", volume = 0.1) {
      if (!this.ctx || !this.master) {
        return;
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    playHit() {
      this.resume();
      this.beep(160, 0.09, "sawtooth", 0.09);
    }

    playExplosion() {
      this.resume();
      this.beep(90, 0.2, "triangle", 0.12);
      window.setTimeout(() => this.beep(60, 0.22, "sawtooth", 0.09), 30);
    }

    playPickup() {
      this.resume();
      this.beep(520, 0.08, "square", 0.09);
      window.setTimeout(() => this.beep(740, 0.08, "square", 0.08), 55);
    }

    startBgm() {
      this.resume();
      if (!this.ctx || !this.master || this.bgmTimer) {
        return;
      }
      this.bgmTimer = window.setInterval(() => {
        const note = this.notes[this.bgmStep % this.notes.length];
        this.beep(note, 0.18, "square", 0.05);
        if (this.bgmStep % 2 === 0) {
          this.beep(note / 2, 0.16, "triangle", 0.03);
        }
        this.bgmStep += 1;
      }, 220);
    }

    stopBgm() {
      if (this.bgmTimer) {
        window.clearInterval(this.bgmTimer);
        this.bgmTimer = null;
      }
    }
  }

  class MainScene extends Phaser.Scene {
    constructor() {
      super("main");
      this.audio = new SynthAudio();
      this.mode = "start";
      this.score = 0;
      this.highScore = Number(window.localStorage.getItem("stellar_survivor_high_score") || 0);
      this.wave = 0;
      this.spawnInterval = 3000;
      this.spawnTimer = 0;
      this.powerupTimer = 0;
      this.fireCooldownMs = DEFAULT_FIRE_COOLDOWN;
      this.fireTimer = 0;
      this.rapidFireRemaining = 0;
      this.playerHp = PLAYER_MAX_HP;
      this.hasShield = false;
      this.lastDelta = 16.6667;
    }

    preload() {}

    create() {
      this.createTextures();
      this.createBackground();

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys({
        w: Phaser.Input.Keyboard.KeyCodes.W,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
        enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
        f: Phaser.Input.Keyboard.KeyCodes.F
      });

      this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT - 90, "ship");
      this.player.setDepth(10);
      this.player.body.setCircle(16, 0, 2);

      this.bullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, maxSize: 120, runChildUpdate: false });
      this.enemies = this.physics.add.group({ runChildUpdate: false });
      this.powerups = this.physics.add.group({ runChildUpdate: false });

      this.createHud();

      this.titleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, "Stellar Survivor", {
        fontSize: "56px",
        color: "#d7ecff",
        stroke: "#0f1f3b",
        strokeThickness: 6
      }).setOrigin(0.5).setDepth(60);

      this.infoText = this.add.text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 - 50,
        "WASD / Arrow: Move\nSpace: Fire\nRed = Danger, Green/Blue = Pickup",
        { fontSize: "24px", color: "#cae8ff", align: "center", lineSpacing: 8 }
      ).setOrigin(0.5).setDepth(60);

      this.startButton = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, "START", {
        fontSize: "34px",
        color: "#ffffff",
        backgroundColor: "#18335f",
        padding: { x: 24, y: 12 }
      }).setOrigin(0.5).setDepth(60).setInteractive({ useHandCursor: true });

      this.gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, "", {
        fontSize: "32px",
        color: "#ffd8d8",
        align: "center",
        lineSpacing: 8
      }).setOrigin(0.5).setDepth(60).setVisible(false);
      this.gameOverPanel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 8, 440, 290, 0x1a0d14, 0.68)
        .setDepth(59)
        .setStrokeStyle(2, 0x7b2230, 0.8)
        .setVisible(false);

      this.restartButton = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 110, "RESTART", {
        fontSize: "32px",
        color: "#ffffff",
        backgroundColor: "#5f1f24",
        padding: { x: 24, y: 12 }
      }).setOrigin(0.5).setDepth(60).setVisible(false).setInteractive({ useHandCursor: true });

      this.startButton.on("pointerdown", () => this.startGame());
      this.restartButton.on("pointerdown", () => this.restartGame());

      this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletEnemy, null, this);
      this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemy, null, this);
      this.physics.add.overlap(this.player, this.powerups, this.handlePlayerPowerup, null, this);

      this.scale.on("resize", this.handleResize, this);
      this.input.keyboard.on("keydown-F", () => this.toggleFullscreen());
      this.input.keyboard.on("keydown-ENTER", () => {
        if (this.mode === "start") {
          this.startGame();
        } else if (this.mode === "gameover") {
          this.restartGame();
        }
      });
      this.input.keyboard.on("keydown-ESC", () => {
        if (this.scale.isFullscreen) {
          this.scale.stopFullscreen();
        }
      });

      this.bindExternalHooks();
    }

    createHud() {
      this.uiTopPanel = this.add.rectangle(220, 45, 430, 82, 0x0a1329, 0.62).setDepth(49).setScrollFactor(0);
      this.uiTopPanel.setStrokeStyle(2, 0x3962a8, 0.8);

      this.uiRightPanel = this.add.rectangle(GAME_WIDTH - 138, 132, 252, 224, 0x0a1329, 0.56).setDepth(49).setScrollFactor(0);
      this.uiRightPanel.setStrokeStyle(2, 0x3962a8, 0.7);

      this.uiScore = this.add.text(22, 16, "SCORE 0", { fontSize: "28px", color: "#f7fbff", fontStyle: "bold" }).setDepth(50).setScrollFactor(0);
      this.uiHigh = this.add.text(238, 19, "HI 0", { fontSize: "22px", color: "#a8d5ff", fontStyle: "bold" }).setDepth(50).setScrollFactor(0);
      this.uiHp = this.add.text(22, 50, "HP ♥♥♥", { fontSize: "24px", color: "#ff9aa8", fontStyle: "bold" }).setDepth(50).setScrollFactor(0);
      this.uiWave = this.add.text(194, 50, "WAVE 0", { fontSize: "24px", color: "#b7ebff", fontStyle: "bold" }).setDepth(50).setScrollFactor(0);

      this.uiStatus = this.add.text(22, 88, "NORMAL FIRE", { fontSize: "18px", color: "#fff49a", fontStyle: "bold" }).setDepth(50).setScrollFactor(0);
      this.uiThreat = this.add.text(260, 88, "", { fontSize: "18px", color: "#ff8f8f", fontStyle: "bold" }).setDepth(50).setScrollFactor(0);

      this.uiWaveBarBg = this.add.rectangle(480, 20, 300, 12, 0x111a32, 0.85).setDepth(50).setScrollFactor(0);
      this.uiWaveBarBg.setStrokeStyle(1, 0x4567ad, 0.9);
      this.uiWaveBarFill = this.add.rectangle(330, 20, 300, 10, 0x6ed1ff, 0.95).setOrigin(0, 0.5).setDepth(50).setScrollFactor(0);

      this.uiLegendTitle = this.add.text(GAME_WIDTH - 245, 35, "FIELD GUIDE", {
        fontSize: "18px",
        color: "#dff1ff",
        fontStyle: "bold"
      }).setDepth(50).setScrollFactor(0);

      this.add.image(GAME_WIDTH - 238, 66, "enemy_drone").setScale(0.8).setDepth(50).setScrollFactor(0);
      this.add.image(GAME_WIDTH - 238, 98, "enemy_chaser").setScale(0.7).setDepth(50).setScrollFactor(0);
      this.add.image(GAME_WIDTH - 238, 130, "enemy_bomber").setScale(0.65).setDepth(50).setScrollFactor(0);
      this.add.image(GAME_WIDTH - 238, 166, "power_rapid").setScale(0.7).setDepth(50).setScrollFactor(0);
      this.add.image(GAME_WIDTH - 238, 197, "power_shield").setScale(0.7).setDepth(50).setScrollFactor(0);
      this.add.image(GAME_WIDTH - 238, 228, "power_bomb").setScale(0.7).setDepth(50).setScrollFactor(0);

      this.add.text(GAME_WIDTH - 220, 57, "Drone (danger)", { fontSize: "14px", color: "#ff9a9a" }).setDepth(50).setScrollFactor(0);
      this.add.text(GAME_WIDTH - 220, 89, "Chaser (danger)", { fontSize: "14px", color: "#ff9a9a" }).setDepth(50).setScrollFactor(0);
      this.add.text(GAME_WIDTH - 220, 121, "Bomber AoE 80", { fontSize: "14px", color: "#ff9a9a" }).setDepth(50).setScrollFactor(0);
      this.add.text(GAME_WIDTH - 220, 157, "Rapid Fire +5s", { fontSize: "14px", color: "#9dffad" }).setDepth(50).setScrollFactor(0);
      this.add.text(GAME_WIDTH - 220, 188, "Shield 1 hit", { fontSize: "14px", color: "#9dffad" }).setDepth(50).setScrollFactor(0);
      this.add.text(GAME_WIDTH - 220, 219, "Bomb clear", { fontSize: "14px", color: "#9dffad" }).setDepth(50).setScrollFactor(0);
    }

    createTextures() {
      const g = this.add.graphics();

      g.clear();
      g.fillStyle(0x4fd3ff, 1);
      g.fillTriangle(16, 0, 0, 32, 32, 32);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(16, 6, 8, 24, 24, 24);
      g.generateTexture("ship", 32, 32);

      g.clear();
      g.fillStyle(0xffef7a, 1);
      g.fillRect(0, 0, 6, 16);
      g.generateTexture("bullet", 6, 16);

      g.clear();
      g.fillStyle(0x89f6ff, 1);
      g.fillCircle(12, 12, 10);
      g.generateTexture("enemy_drone", 24, 24);

      g.clear();
      g.fillStyle(0xff9f6a, 1);
      g.fillTriangle(16, 0, 0, 32, 32, 32);
      g.generateTexture("enemy_chaser", 32, 32);

      g.clear();
      g.fillStyle(0xe95f5f, 1);
      g.fillRect(0, 0, 38, 28);
      g.fillStyle(0xffc3c3, 1);
      g.fillRect(8, 8, 22, 12);
      g.generateTexture("enemy_bomber", 38, 28);

      g.clear();
      g.fillStyle(0xa5ff8f, 1);
      g.fillCircle(14, 14, 14);
      g.fillStyle(0x1b4f1f, 1);
      g.fillRect(11, 6, 6, 16);
      g.fillRect(6, 11, 16, 6);
      g.generateTexture("power_rapid", 28, 28);

      g.clear();
      g.fillStyle(0x89d0ff, 1);
      g.fillCircle(14, 14, 14);
      g.lineStyle(3, 0xffffff);
      g.strokeCircle(14, 14, 10);
      g.generateTexture("power_shield", 28, 28);

      g.clear();
      g.fillStyle(0xffd37f, 1);
      g.fillCircle(14, 14, 14);
      g.fillStyle(0x7b3300, 1);
      g.fillCircle(14, 14, 6);
      g.generateTexture("power_bomb", 28, 28);

      g.destroy();
    }

    createBackground() {
      const g = this.add.graphics();
      g.fillGradientStyle(0x0d1a39, 0x13254e, 0x050a1b, 0x04060f, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      for (let i = 0; i < 170; i += 1) {
        const x = Phaser.Math.Between(0, GAME_WIDTH);
        const y = Phaser.Math.Between(0, GAME_HEIGHT);
        const radius = Phaser.Math.FloatBetween(0.6, 1.8);
        const alpha = Phaser.Math.FloatBetween(0.2, 0.95);
        g.fillStyle(0xffffff, alpha);
        g.fillCircle(x, y, radius);
      }
      g.setDepth(-10);
    }

    startGame() {
      this.mode = "playing";
      this.score = 0;
      this.wave = 0;
      this.playerHp = PLAYER_MAX_HP;
      this.hasShield = false;
      this.rapidFireRemaining = 0;
      this.spawnInterval = 3000;
      this.spawnTimer = 0;
      this.powerupTimer = 4500;
      this.fireTimer = 0;
      this.fireCooldownMs = DEFAULT_FIRE_COOLDOWN;

      this.player.setPosition(GAME_WIDTH / 2, GAME_HEIGHT - 90);
      this.player.setActive(true).setVisible(true);
      this.player.body.enable = true;
      this.player.setVelocity(0, 0);

      this.clearGroup(this.enemies);
      this.clearGroup(this.bullets);
      this.clearGroup(this.powerups);

      this.titleText.setVisible(false);
      this.infoText.setVisible(false);
      this.startButton.setVisible(false);
      this.gameOverPanel.setVisible(false);
      this.gameOverText.setVisible(false);
      this.restartButton.setVisible(false);

      this.audio.startBgm();
      this.updateUi();
      this.spawnWave();
    }

    restartGame() {
      this.startGame();
    }

    update(time, delta) {
      this.lastDelta = delta;
      if (this.mode !== "playing") {
        return;
      }
      this.step(delta);
    }

    step(delta) {
      this.handlePlayerInput(delta);
      this.updateTimers(delta);
      this.updateChasers(delta);
      this.cleanupObjects();
      this.updateUi();
    }

    handlePlayerInput(delta) {
      let vx = 0;
      let vy = 0;
      const left = this.cursors.left.isDown || this.keys.a.isDown;
      const right = this.cursors.right.isDown || this.keys.d.isDown;
      const up = this.cursors.up.isDown || this.keys.w.isDown;
      const down = this.cursors.down.isDown || this.keys.s.isDown;

      if (left) vx -= 1;
      if (right) vx += 1;
      if (up) vy -= 1;
      if (down) vy += 1;

      const vec = new Phaser.Math.Vector2(vx, vy);
      if (vec.lengthSq() > 0) {
        vec.normalize().scale(PLAYER_SPEED);
      }
      this.player.setVelocity(vec.x, vec.y);
      this.player.x = Phaser.Math.Clamp(this.player.x, 24, GAME_WIDTH - 24);
      this.player.y = Phaser.Math.Clamp(this.player.y, 24, GAME_HEIGHT - 24);

      this.fireTimer -= delta;
      if ((this.keys.space.isDown || this.cursors.space.isDown) && this.fireTimer <= 0) {
        this.fireShot();
        this.fireTimer = this.fireCooldownMs;
      }
    }

    updateTimers(delta) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        this.spawnWave();
        this.spawnTimer = this.spawnInterval;
      }

      this.powerupTimer -= delta;
      if (this.powerupTimer <= 0) {
        this.spawnPowerup();
        this.powerupTimer = Phaser.Math.Between(7000, 11000);
      }

      if (this.rapidFireRemaining > 0) {
        this.rapidFireRemaining -= delta;
        if (this.rapidFireRemaining <= 0) {
          this.rapidFireRemaining = 0;
          this.fireCooldownMs = DEFAULT_FIRE_COOLDOWN;
        }
      }
    }

    fireShot() {
      const bullet = this.bullets.get(this.player.x, this.player.y - 20, "bullet");
      if (!bullet) {
        return;
      }
      bullet.setActive(true).setVisible(true);
      bullet.body.enable = true;
      bullet.body.setSize(6, 16);
      bullet.setVelocity(0, -BULLET_SPEED);
    }

    spawnWave() {
      this.wave += 1;
      this.spawnInterval = Math.max(1000, 3000 - (this.wave - 1) * 100);
      const total = 2 + Math.floor(this.wave * 1.35);

      for (let i = 0; i < total; i += 1) {
        const roll = Phaser.Math.Between(1, 100);
        if (roll <= 52) {
          this.spawnDrone();
        } else if (roll <= 82) {
          this.spawnChaser();
        } else {
          this.spawnBomber();
        }
      }
    }

    spawnDrone() {
      const edge = Phaser.Math.Between(0, 2);
      let x = Phaser.Math.Between(20, GAME_WIDTH - 20);
      let y = -24;
      let vx = 0;
      let vy = ENEMY_TYPES.drone.speed;

      if (edge === 1) {
        x = -24;
        y = Phaser.Math.Between(30, GAME_HEIGHT * 0.6);
        vx = ENEMY_TYPES.drone.speed;
        vy = Phaser.Math.Between(20, 80);
      } else if (edge === 2) {
        x = GAME_WIDTH + 24;
        y = Phaser.Math.Between(30, GAME_HEIGHT * 0.6);
        vx = -ENEMY_TYPES.drone.speed;
        vy = Phaser.Math.Between(20, 80);
      }
      this.createEnemy("drone", x, y, vx, vy);
    }

    spawnChaser() {
      const corner = Phaser.Math.Between(0, 3);
      const positions = [
        { x: -20, y: -20 },
        { x: GAME_WIDTH + 20, y: -20 },
        { x: -20, y: GAME_HEIGHT + 20 },
        { x: GAME_WIDTH + 20, y: GAME_HEIGHT + 20 }
      ];
      const spawn = positions[corner];
      const initial = new Phaser.Math.Vector2(this.player.x - spawn.x, this.player.y - spawn.y).normalize().scale(ENEMY_TYPES.chaser.speed);
      const enemy = this.createEnemy("chaser", spawn.x, spawn.y, initial.x, initial.y);
      if (enemy) {
        enemy.setAngle(Phaser.Math.RadToDeg(initial.angle()) + 90);
      }
    }

    spawnBomber() {
      const x = Phaser.Math.Between(50, GAME_WIDTH - 50);
      const y = -30;
      this.createEnemy("bomber", x, y, 0, ENEMY_TYPES.bomber.speed);
    }

    createEnemy(type, x, y, vx, vy) {
      const texture = `enemy_${type}`;
      const enemy = this.enemies.get(x, y, texture);
      if (!enemy) {
        return null;
      }
      enemy.setActive(true).setVisible(true);
      enemy.body.enable = true;
      enemy.setVelocity(vx, vy);
      enemy.enemyType = type;
      enemy.hp = ENEMY_TYPES[type].hp;
      enemy.scoreValue = ENEMY_TYPES[type].score;
      enemy.baseSpeed = ENEMY_TYPES[type].speed;
      if (type === "bomber") {
        enemy.body.setSize(38, 28);
      } else if (type === "chaser") {
        enemy.body.setSize(28, 28);
      } else {
        enemy.body.setSize(22, 22);
      }
      return enemy;
    }

    updateChasers(delta) {
      const maxTurn = Phaser.Math.DegToRad(2) * (delta / 16.6667);
      this.enemies.children.iterate((enemy) => {
        if (!enemy || !enemy.active || enemy.enemyType !== "chaser") {
          return;
        }
        const targetAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        const currentAngle = Math.atan2(enemy.body.velocity.y, enemy.body.velocity.x);
        const diff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
        const clamped = Phaser.Math.Clamp(diff, -maxTurn, maxTurn);
        const nextAngle = currentAngle + clamped;
        enemy.setVelocity(Math.cos(nextAngle) * enemy.baseSpeed, Math.sin(nextAngle) * enemy.baseSpeed);
        enemy.setAngle(Phaser.Math.RadToDeg(nextAngle) + 90);
      });
    }

    handleBulletEnemy(bullet, enemy) {
      if (!bullet.active || !enemy.active) {
        return;
      }
      bullet.disableBody(true, true);
      enemy.hp -= 1;
      if (enemy.hp > 0) {
        this.audio.playHit();
        return;
      }

      this.score += enemy.scoreValue;
      if (enemy.enemyType === "bomber") {
        this.triggerBomberExplosion(enemy.x, enemy.y);
      }
      this.audio.playExplosion();
      enemy.disableBody(true, true);
    }

    handlePlayerEnemy(player, enemy) {
      if (!player.active || !enemy.active || this.mode !== "playing") {
        return;
      }
      enemy.disableBody(true, true);
      this.damagePlayer(1);
      this.audio.playHit();
    }

    triggerBomberExplosion(x, y) {
      const radius = 80;
      const circle = this.add.circle(x, y, radius, 0xff8f6f, 0.22).setDepth(40);
      this.tweens.add({
        targets: circle,
        alpha: 0,
        duration: 240,
        onComplete: () => circle.destroy()
      });

      if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= radius) {
        this.damagePlayer(1);
      }

      this.enemies.children.iterate((enemy) => {
        if (!enemy || !enemy.active) {
          return;
        }
        if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius) {
          enemy.disableBody(true, true);
          this.score += enemy.scoreValue;
        }
      });
    }

    spawnPowerup() {
      const types = ["rapid", "shield", "bomb"];
      const type = Phaser.Utils.Array.GetRandom(types);
      const x = Phaser.Math.Between(30, GAME_WIDTH - 30);
      const y = Phaser.Math.Between(40, GAME_HEIGHT * 0.55);
      const powerup = this.powerups.get(x, y, `power_${type}`);
      if (!powerup) {
        return;
      }
      powerup.setActive(true).setVisible(true);
      powerup.body.enable = true;
      powerup.body.setCircle(14);
      powerup.powerType = type;
      powerup.setVelocity(Phaser.Math.Between(-40, 40), Phaser.Math.Between(12, 34));
    }

    handlePlayerPowerup(player, powerup) {
      if (!powerup.active) {
        return;
      }
      const type = powerup.powerType;
      powerup.disableBody(true, true);
      this.audio.playPickup();

      if (type === "rapid") {
        this.rapidFireRemaining = 5000;
        this.fireCooldownMs = RAPID_FIRE_COOLDOWN;
      } else if (type === "shield") {
        this.hasShield = true;
      } else if (type === "bomb") {
        this.enemies.children.iterate((enemy) => {
          if (!enemy || !enemy.active) {
            return;
          }
          this.score += enemy.scoreValue;
          enemy.disableBody(true, true);
        });
        this.audio.playExplosion();
      }
    }

    damagePlayer(amount) {
      if (this.mode !== "playing") {
        return;
      }
      if (this.hasShield) {
        this.hasShield = false;
        return;
      }
      this.playerHp -= amount;
      if (this.playerHp <= 0) {
        this.playerHp = 0;
        this.gameOver();
      }
    }

    gameOver() {
      this.mode = "gameover";
      this.player.setVelocity(0, 0);
      this.audio.stopBgm();
      this.audio.playExplosion();

      if (this.score > this.highScore) {
        this.highScore = this.score;
        window.localStorage.setItem("stellar_survivor_high_score", String(this.highScore));
      }

      this.gameOverText.setText(`GAME OVER\nFinal Score: ${this.score}\nHigh Score: ${this.highScore}`);
      this.gameOverPanel.setVisible(true);
      this.gameOverText.setVisible(true);
      this.restartButton.setVisible(true);
    }

    cleanupObjects() {
      const out = 60;
      this.bullets.children.iterate((bullet) => {
        if (!bullet || !bullet.active) {
          return;
        }
        if (bullet.y < -out) {
          bullet.disableBody(true, true);
        }
      });

      this.enemies.children.iterate((enemy) => {
        if (!enemy || !enemy.active) {
          return;
        }
        if (enemy.x < -out || enemy.x > GAME_WIDTH + out || enemy.y < -out || enemy.y > GAME_HEIGHT + out) {
          enemy.disableBody(true, true);
        }
      });

      this.powerups.children.iterate((powerup) => {
        if (!powerup || !powerup.active) {
          return;
        }
        if (powerup.x < -out || powerup.x > GAME_WIDTH + out || powerup.y < -out || powerup.y > GAME_HEIGHT + out) {
          powerup.disableBody(true, true);
        }
      });
    }

    clearGroup(group) {
      group.children.iterate((obj) => {
        if (obj && obj.active) {
          obj.disableBody(true, true);
        }
      });
    }

    updateUi() {
      this.uiScore.setText(`SCORE ${this.score}`);
      this.uiHigh.setText(`HI ${this.highScore}`);
      this.uiWave.setText(`WAVE ${this.wave}`);

      const hearts = "♥".repeat(this.playerHp);
      const empties = "♡".repeat(Math.max(0, PLAYER_MAX_HP - this.playerHp));
      const shieldTag = this.hasShield ? " +SHIELD" : "";
      this.uiHp.setText(`HP ${hearts}${empties}${shieldTag}`);
      this.uiHp.setColor(this.playerHp <= 1 ? "#ff6f88" : "#ff9aa8");

      const rapid = this.rapidFireRemaining > 0 ? `RAPID ${(this.rapidFireRemaining / 1000).toFixed(1)}s` : "NORMAL FIRE";
      this.uiStatus.setText(rapid);

      let minEnemyDist = Number.POSITIVE_INFINITY;
      this.enemies.children.iterate((enemy) => {
        if (enemy && enemy.active) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
          if (dist < minEnemyDist) {
            minEnemyDist = dist;
          }
        }
      });
      this.uiThreat.setText(minEnemyDist < 140 ? "DANGER CLOSE" : "");

      const interval = Math.max(1, this.spawnInterval);
      const ratio = Phaser.Math.Clamp(this.spawnTimer / interval, 0, 1);
      this.uiWaveBarFill.width = 300 * ratio;
      this.uiWaveBarFill.fillColor = ratio < 0.3 ? 0xff6f6f : 0x6ed1ff;
    }

    toggleFullscreen() {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    }

    handleResize(gameSize) {
      const width = gameSize.width;
      const height = gameSize.height;
      this.cameras.resize(width, height);
    }

    bindExternalHooks() {
      window.render_game_to_text = () => {
        const enemyList = [];
        this.enemies.children.iterate((enemy) => {
          if (enemy && enemy.active) {
            enemyList.push({
              type: enemy.enemyType,
              x: Math.round(enemy.x),
              y: Math.round(enemy.y),
              hp: enemy.hp
            });
          }
        });

        const powerupList = [];
        this.powerups.children.iterate((powerup) => {
          if (powerup && powerup.active) {
            powerupList.push({
              type: powerup.powerType,
              x: Math.round(powerup.x),
              y: Math.round(powerup.y)
            });
          }
        });

        const payload = {
          coordinateSystem: "origin=(0,0) top-left, +x right, +y down",
          mode: this.mode,
          score: this.score,
          highScore: this.highScore,
          wave: this.wave,
          player: {
            x: Math.round(this.player.x),
            y: Math.round(this.player.y),
            hp: this.playerHp,
            shield: this.hasShield,
            rapidFireRemainingMs: Math.max(0, Math.round(this.rapidFireRemaining))
          },
          timers: {
            nextWaveMs: Math.max(0, Math.round(this.spawnTimer)),
            waveIntervalMs: Math.round(this.spawnInterval)
          },
          enemies: enemyList,
          powerups: powerupList
        };
        return JSON.stringify(payload);
      };

      window.advanceTime = (ms) => {
        if (this.mode !== "playing") {
          return;
        }
        const dt = 1000 / 60;
        const steps = Math.max(1, Math.round(ms / dt));
        for (let i = 0; i < steps; i += 1) {
          this.step(dt);
          this.physics.world.step(dt / 1000);
        }
      };
    }
  }

  const config = {
    type: Phaser.CANVAS,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: "game-root",
    backgroundColor: "#000000",
    physics: {
      default: "arcade",
      arcade: {
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [MainScene]
  };

  const game = new Phaser.Game(config);
  window.__stellarGame = game;
})();
