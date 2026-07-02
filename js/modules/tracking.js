// ========== Tracking (跟枪) Training Module ==========

class TrackingModule extends TrainingModule {
  getDefaultSettings() {
    return {
      mode: 'smooth',      // 'smooth' | 'reactive' | 'strafe'
      targetSpeed: 150,    // pixels per second
      targetSize: 28,
      duration: 60,
    };
  }

  getPresets() {
    return {
      easy: { mode: 'smooth', targetSpeed: 100, targetSize: 35, duration: 30 },
      medium: { mode: 'smooth', targetSpeed: 180, targetSize: 28, duration: 60 },
      hard: { mode: 'reactive', targetSpeed: 250, targetSize: 22, duration: 60 },
    };
  }

  getSettingDefs() {
    return [
      { key: 'mode', label: '移动模式', type: 'select', options: ['smooth', 'reactive', 'strafe'], default: 'smooth' },
      { key: 'targetSpeed', label: '目标速度', type: 'range', min: 50, max: 400, step: 25, default: 150, labels: ['50', '150', '250', '400'] },
      { key: 'targetSize', label: '目标大小', type: 'range', min: 15, max: 50, step: 5, default: 28, labels: ['15', '25', '40', '50'] },
      { key: 'duration', label: '训练时长(秒)', type: 'range', min: 15, max: 180, step: 15, default: 60, labels: ['15', '60', '120', '180'] },
    ];
  }

  onStart() {
    // Initialize target at random position
    const pad = 80;
    this.tx = Utils.randFloat(pad, this.width - pad);
    this.ty = Utils.randFloat(100, this.height - pad);
    this.tr = this.settings.targetSize;

    // Movement vectors
    this.vx = Utils.randFloat(-1, 1);
    this.vy = Utils.randFloat(-1, 1);
    this._normalizeVelocity();
    this.speed = this.settings.targetSpeed;

    // Direction change timing
    this.dirChangeTimer = 0;
    this.dirChangeInterval = this.settings.mode === 'reactive' ?
      Utils.randFloat(0.3, 1.2) : Utils.randFloat(2, 5);

    // Scoring
    this.timeOnTarget = 0;
    this.totalTimeTracked = 0; // total time where mouse was near
    this.mouseOnTarget = false;
    this.framesTracked = 0;
    this.totalFrames = 0;

    // Smooth movement params
    this.angle = Math.atan2(this.vy, this.vx);
    this.targetAngle = this.angle;
    this.angularSpeed = Utils.randFloat(0.3, 1.0);

    // Strafe mode state
    this.strafeDir = 1;
    this.strafeTimer = 0;
    this.strafePause = 0;
    this.strafePausing = false;
    this.strafeY = this.ty;
  }

  _normalizeVelocity() {
    const mag = Math.hypot(this.vx, this.vy);
    if (mag > 0) {
      this.vx /= mag;
      this.vy /= mag;
    }
  }

  onUpdate(dt) {
    this.totalFrames++;

    const w = this.width;
    const h = this.height;
    const pad = this.tr + 20;
    const topPad = 90;

    if (this.settings.mode === 'smooth') {
      // Smooth curved movement
      this.angle += this.angularSpeed * dt;
      this.targetAngle += (Utils.randFloat(-0.5, 0.5)) * dt;

      // Smoothly rotate towards target angle
      let diff = this.targetAngle - this.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.angle += diff * 2 * dt;

      this.vx = Math.cos(this.angle);
      this.vy = Math.sin(this.angle);

      // Occasionally change target angle
      this.dirChangeTimer += dt;
      if (this.dirChangeTimer > this.dirChangeInterval) {
        this.dirChangeTimer = 0;
        this.dirChangeInterval = Utils.randFloat(2, 5);
        this.targetAngle = Utils.randFloat(0, Math.PI * 2);
        this.angularSpeed = Utils.randFloat(0.3, 1.0);
      }
    } else if (this.settings.mode === 'reactive') {
      // Random direction changes
      this.dirChangeTimer += dt;
      if (this.dirChangeTimer > this.dirChangeInterval) {
        this.dirChangeTimer = 0;
        this.dirChangeInterval = Utils.randFloat(0.4, 1.5);
        this.vx = Utils.randFloat(-1, 1);
        this.vy = Utils.randFloat(-1, 1);
        this._normalizeVelocity();
        this.speed = Utils.randFloat(this.settings.targetSpeed * 0.6, this.settings.targetSpeed * 1.4);
      }
    } else if (this.settings.mode === 'strafe') {
      // Player-like strafe movement (horizontal)
      if (this.strafePausing) {
        this.strafePause -= dt;
        if (this.strafePause <= 0) {
          this.strafePausing = false;
          this.strafeDir *= -1;
        }
      } else {
        this.strafeTimer += dt;
        const strafeDuration = Utils.randFloat(0.5, 2.5);
        if (this.strafeTimer > strafeDuration) {
          this.strafeTimer = 0;
          this.strafePausing = true;
          this.strafePause = Utils.randFloat(0.1, 0.5);
        }
        this.vx = this.strafeDir;
        this.vy = Math.sin(this.strafeTimer * 3) * 0.3; // slight vertical bob
      }
      this.speed = this.settings.targetSpeed;
    }

    // Move target
    this.tx += this.vx * this.speed * dt;
    this.ty += this.vy * this.speed * dt;

    // Bounce off walls
    if (this.tx - this.tr < pad) { this.tx = pad + this.tr; this.vx *= -1; if (this.settings.mode === 'smooth') this.targetAngle = Math.PI - this.targetAngle; }
    if (this.tx + this.tr > w - pad) { this.tx = w - pad - this.tr; this.vx *= -1; if (this.settings.mode === 'smooth') this.targetAngle = Math.PI - this.targetAngle; }
    if (this.ty - this.tr < topPad) { this.ty = topPad + this.tr; this.vy *= -1; if (this.settings.mode === 'smooth') this.targetAngle = -this.targetAngle; }
    if (this.ty + this.tr > h - pad) { this.ty = h - pad - this.tr; this.vy *= -1; if (this.settings.mode === 'smooth') this.targetAngle = -this.targetAngle; }

    // Check if mouse is on target
    this.mouseOnTarget = Utils.inCircle(this.mouseX, this.mouseY, this.tx, this.ty, this.tr + 5);
    if (this.mouseOnTarget) {
      this.timeOnTarget += dt;
      this.framesTracked++;
    }
    this.totalTimeTracked += dt;
  }

  onRender() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Tracking trail (recent positions)
    if (!this._trail) this._trail = [];
    this._trail.push({ x: this.tx, y: this.ty });
    if (this._trail.length > 20) this._trail.shift();

    for (let i = 1; i < this._trail.length; i++) {
      const alpha = i / this._trail.length * 0.3;
      ctx.strokeStyle = `rgba(124, 92, 231, ${alpha})`;
      ctx.lineWidth = this.tr * (i / this._trail.length) * 0.5;
      ctx.beginPath();
      ctx.moveTo(this._trail[i - 1].x, this._trail[i - 1].y);
      ctx.lineTo(this._trail[i].x, this._trail[i].y);
      ctx.stroke();
    }

    // (crosshair drawn by base class)

    // Target
    const isOnTarget = this.mouseOnTarget;
    const color = isOnTarget ? '#2ed573' : '#ff4655';

    Utils.drawTarget(ctx, this.tx, this.ty, this.tr, color);

    // Accuracy indicator ring
    const accuracy = this.totalFrames > 0 ? this.framesTracked / this.totalFrames : 0;
    ctx.strokeStyle = accuracy > 0.5 ? '#2ed573' : '#ffa502';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.tx, this.ty, this.tr + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * accuracy);
    ctx.stroke();
  }

  onClick(x, y) {
    // Tracking is clickless; clicking doesn't do anything special
  }

  onEnd() {
    const accuracy = this.totalTimeTracked > 0 ? (this.timeOnTarget / this.totalTimeTracked * 100) : 0;
    const frameAccuracy = this.totalFrames > 0 ? (this.framesTracked / this.totalFrames * 100) : 0;

    return {
      accuracy: accuracy.toFixed(1),
      timeOnTarget: this.timeOnTarget.toFixed(2),
      totalTime: this.totalTimeTracked.toFixed(2),
      frameAccuracy: frameAccuracy.toFixed(1),
      labels: {
        accuracy: '跟枪精度',
        timeOnTarget: '在靶时间',
        totalTime: '总时间',
        frameAccuracy: '帧精度',
      },
      units: {
        accuracy: '%',
        timeOnTarget: '秒',
        totalTime: '秒',
        frameAccuracy: '%',
      },
    };
  }

  updateHUD(hudEl) {
    const accuracy = this.totalFrames > 0 ? (this.framesTracked / this.totalFrames * 100).toFixed(1) : '0.0';
    hudEl.innerHTML = `
      <div class="hud-stat">跟枪精度 <span>${accuracy}%</span></div>
      ${this.mouseOnTarget ? '<div class="hud-stat" style="color:#2ed573">● 在靶上</div>' : '<div class="hud-stat" style="color:#ff4757">○ 脱靶</div>'}
    `;
  }
}

App.registerModule('tracking', {
  name: '跟枪追踪',
  description: '平滑、反应与横移跟枪训练。保持准星始终锁定目标，实时精度反馈。',
  ModuleClass: TrackingModule,
});
