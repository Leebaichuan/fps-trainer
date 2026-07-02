// ========== Precision Training Module ==========

class PrecisionModule extends TrainingModule {
  getDefaultSettings() {
    return {
      mode: 'shrinking',   // 'shrinking' | 'moving' | 'headshot'
      startSize: 30,
      minSize: 6,
      shrinkStep: 2,
      targetSpeed: 80,
      duration: 60,
    };
  }

  getPresets() {
    return {
      easy: { mode: 'shrinking', startSize: 35, minSize: 12, shrinkStep: 1, duration: 60 },
      medium: { mode: 'shrinking', startSize: 28, minSize: 8, shrinkStep: 2, duration: 60 },
      hard: { mode: 'moving', startSize: 20, minSize: 6, shrinkStep: 3, targetSpeed: 120, duration: 60 },
    };
  }

  getSettingDefs() {
    return [
      { key: 'mode', label: '模式', type: 'select', options: ['shrinking', 'moving', 'headshot'], default: 'shrinking' },
      { key: 'startSize', label: '起始大小', type: 'range', min: 15, max: 50, step: 5, default: 30, labels: ['15', '25', '40', '50'] },
      { key: 'minSize', label: '最小大小', type: 'range', min: 4, max: 20, step: 2, default: 6, labels: ['4', '8', '14', '20'] },
      { key: 'shrinkStep', label: '缩小步进', type: 'range', min: 1, max: 5, step: 1, default: 2, labels: ['1', '2', '3', '5'] },
      { key: 'duration', label: '训练时长(秒)', type: 'range', min: 15, max: 120, step: 15, default: 60, labels: ['15', '45', '75', '120'] },
    ];
  }

  onStart() {
    this.hits = 0;
    this.misses = 0;
    this.currentR = this.settings.startSize;
    this.hitStreak = 0;
    this.maxStreak = 0;

    // Target position
    const pad = 100;
    this.targetX = Utils.randInt(pad, this.width - pad);
    this.targetY = Utils.randInt(120, this.height - pad);
    this.targetR = this.currentR;

    // Moving mode
    this.mvx = Utils.randFloat(-0.5, 0.5);
    this.mvy = Utils.randFloat(-0.5, 0.5);
    this._normalizeMove();
    this.moveSpeed = this.settings.targetSpeed;
    this.moveDirTimer = 0;
    this.moveDirInterval = Utils.randFloat(1.5, 4);

    // Headshot mode
    this.headshotY = this.height * 0.55;
  }

  _normalizeMove() {
    const mag = Math.hypot(this.mvx, this.mvy);
    if (mag > 0) { this.mvx /= mag; this.mvy /= mag; }
  }

  onUpdate(dt) {
    if (this.settings.mode === 'moving') {
      this.moveDirTimer += dt;
      if (this.moveDirTimer > this.moveDirInterval) {
        this.moveDirTimer = 0;
        this.moveDirInterval = Utils.randFloat(1.5, 4);
        this.mvx = Utils.randFloat(-1, 1);
        this.mvy = Utils.randFloat(-1, 1);
        this._normalizeMove();
        this.moveSpeed = Utils.randFloat(this.settings.targetSpeed * 0.6, this.settings.targetSpeed * 1.5);
      }

      this.targetX += this.mvx * this.moveSpeed * dt;
      this.targetY += this.mvy * this.moveSpeed * dt;

      // Bounce
      const pad = this.targetR + 30;
      if (this.targetX < pad) { this.targetX = pad; this.mvx *= -1; }
      if (this.targetX > this.width - pad) { this.targetX = this.width - pad; this.mvx *= -1; }
      if (this.targetY < 90) { this.targetY = 90; this.mvy *= -1; }
      if (this.targetY > this.height - pad) { this.targetY = this.height - pad; this.mvy *= -1; }
    }

    if (this.settings.mode === 'headshot') {
      // Target is always at headshot height, varies horizontally
      this.targetY = this.headshotY;
    }
  }

  onRender() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    // Headshot mode: draw a horizontal headshot line
    if (this.settings.mode === 'headshot') {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 20]);
      ctx.beginPath();
      ctx.moveTo(0, this.headshotY);
      ctx.lineTo(w, this.headshotY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Current size indicator
    if (this.settings.mode === 'shrinking') {
      const sizeRatio = (this.currentR - this.settings.minSize) / (this.settings.startSize - this.settings.minSize);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(w - 30, 80, 12, h - 160);
      const barH = (h - 160) * sizeRatio;
      const barColor = sizeRatio > 0.6 ? '#2ed573' : sizeRatio > 0.3 ? '#ffa502' : '#ff4757';
      ctx.fillStyle = barColor;
      ctx.fillRect(w - 28, h - 80 - barH, 8, barH);
    }

    // Draw target
    let color;
    if (this.settings.mode === 'shrinking') {
      const ratio = (this.currentR - this.settings.minSize) / (this.settings.startSize - this.settings.minSize);
      if (ratio > 0.6) color = '#2ed573';
      else if (ratio > 0.3) color = '#ffa502';
      else color = '#ff4655';
    } else {
      color = '#ff4655';
    }

    Utils.drawTarget(ctx, this.targetX, this.targetY, this.targetR, color);

    // Streak display
    if (this.hitStreak >= 3) {
      ctx.fillStyle = '#ffa502';
      ctx.font = 'bold 40px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.6;
      ctx.fillText(`${this.hitStreak}x`, w / 2, h / 2 + 60);
      ctx.globalAlpha = 1;
    }
  }

  onClick(x, y) {
    if (Utils.inCircle(x, y, this.targetX, this.targetY, this.targetR + 2)) {
      this.hits++;
      this.hitStreak++;
      if (this.hitStreak > this.maxStreak) this.maxStreak = this.hitStreak;
      Utils.playHit();

      // Shrink target
      if (this.settings.mode === 'shrinking') {
        this.currentR = Math.max(this.settings.minSize, this.currentR - this.settings.shrinkStep);
        this.targetR = this.currentR;
      }

      // Move to new position
      const pad = Math.max(this.targetR + 40, 50);
      this.targetX = Utils.randInt(pad, this.width - pad);
      this.targetY = Utils.randInt(120, this.height - pad);

      // Reset if at minimum size
      if (this.currentR <= this.settings.minSize) {
        this.currentR = this.settings.startSize;
        this.targetR = this.currentR;
        // Cycle completed - visual feedback handled by target color change
      }
    } else {
      this.misses++;
      this.hitStreak = 0;

      // Grow back on miss
      if (this.settings.mode === 'shrinking') {
        this.currentR = Math.min(this.settings.startSize, this.currentR + this.settings.shrinkStep * 2);
        this.targetR = this.currentR;
      }
      Utils.playMiss();
    }
  }

  onEnd() {
    const total = this.hits + this.misses;
    const accuracy = total > 0 ? (this.hits / total * 100) : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      accuracy: accuracy.toFixed(1),
      maxStreak: this.maxStreak,
      finalSize: this.targetR,
      labels: {
        hits: '命中',
        misses: '未命中',
        accuracy: '命中率',
        maxStreak: '最高连击',
        finalSize: '最终大小',
      },
      units: {
        hits: '次',
        misses: '次',
        accuracy: '%',
        maxStreak: '连',
        finalSize: '像素',
      },
    };
  }

  updateHUD(hudEl) {
    const total = this.hits + this.misses;
    const accuracy = total > 0 ? (this.hits / total * 100).toFixed(1) : '0.0';
    hudEl.innerHTML = `
      <div class="hud-stat">命中 <span>${this.hits}</span></div>
      <div class="hud-stat">命中率 <span>${accuracy}%</span></div>
      <div class="hud-stat">连击 <span>${this.hitStreak}x</span></div>
      <div class="hud-stat">大小 <span>${this.targetR}px</span></div>
    `;
  }
}

App.registerModule('precision', {
  name: '精准定位',
  description: '渐小目标、移动靶与爆头线。目标越小，枪法越精准。',
  ModuleClass: PrecisionModule,
});
