// ========== Clicking / Flicking Training Module ==========

class ClickingModule extends TrainingModule {
  getDefaultSettings() {
    return {
      mode: 'static',      // 'static' | 'dynamic' | 'micro'
      targetSize: 25,
      targetDuration: 1500, // ms, for dynamic mode
      duration: 60,        // seconds
    };
  }

  getPresets() {
    return {
      easy: { mode: 'static', targetSize: 35, duration: 60 },
      medium: { mode: 'static', targetSize: 25, duration: 60 },
      hard: { mode: 'dynamic', targetSize: 18, targetDuration: 800, duration: 60 },
    };
  }

  getSettingDefs() {
    return [
      { key: 'mode', label: '训练模式', type: 'select', options: ['static', 'dynamic', 'micro'], default: 'static' },
      { key: 'targetSize', label: '目标大小', type: 'range', min: 10, max: 50, step: 5, default: 25, labels: ['10', '20', '30', '50'] },
      { key: 'targetDuration', label: '目标停留(ms)', type: 'range', min: 500, max: 5000, step: 250, default: 1500, labels: ['500', '1500', '3000', '5000'] },
      { key: 'duration', label: '训练时长(秒)', type: 'range', min: 15, max: 180, step: 15, default: 60, labels: ['15', '60', '120', '180'] },
    ];
  }

  onStart() {
    this.hits = 0;
    this.misses = 0;
    this.totalClicks = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.targetR = this.settings.targetSize;
    this.targetColor = Utils.randomTargetColor();
    this.targetAppearTime = 0;
    this.targetVisible = false;
    this.comboCount = 0;
    this.maxCombo = 0;
    this._spawnTarget();
  }

  _spawnTarget() {
    const pad = this.targetR + 40;
    const topPad = 100; // Extra padding at top for HUD
    this.targetX = Utils.randInt(pad, this.width - pad);
    this.targetY = Utils.randInt(topPad, this.height - pad);
    this.targetR = this.settings.targetSize;
    this.targetColor = Utils.randomTargetColor();
    this.targetAppearTime = performance.now();
    this.targetVisible = true;
  }

  onUpdate(dt) {
    if (this.settings.mode === 'dynamic' && this.targetVisible) {
      const visibleTime = performance.now() - this.targetAppearTime;
      if (visibleTime > this.settings.targetDuration) {
        // Target disappeared - missed
        this.misses++;
        this.comboCount = 0;
        this.targetVisible = false;
        this._respawnTimeout = setTimeout(() => { if (this.running) this._spawnTarget(); }, Utils.randInt(300, 800));
      }
    }
  }

  onRender() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    // Draw grid lines for reference (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // (crosshair drawn by base class)

    if (this.targetVisible) {
      // 3D orb target
      Utils.drawTarget(ctx, this.targetX, this.targetY, this.targetR, this.targetColor);

      // Dynamic mode: shrink timer ring
      if (this.settings.mode === 'dynamic') {
        const remaining = this.settings.targetDuration - (performance.now() - this.targetAppearTime);
        const pct = Math.max(0, remaining / this.settings.targetDuration);
        ctx.strokeStyle = `rgba(255,255,255,${0.3 + pct * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.targetX, this.targetY, this.targetR + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.stroke();
      }
    }

    // Combo display
    if (this.comboCount >= 3) {
      ctx.fillStyle = '#ffa502';
      ctx.font = 'bold 48px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.7;
      ctx.fillText(`${this.comboCount}x`, w / 2, h / 2 + 80);
      ctx.globalAlpha = 1;
    }
  }

  onClick(x, y) {
    this.totalClicks++;

    if (this.targetVisible && Utils.inCircle(x, y, this.targetX, this.targetY, this.targetR + 3)) {
      this.hits++;
      this.comboCount++;
      if (this.comboCount > this.maxCombo) this.maxCombo = this.comboCount;
      Utils.playHit();
      this._spawnTarget();

      // In micro mode, shrink target after consecutive hits
      if (this.settings.mode === 'micro') {
        this.targetR = Math.max(8, this.targetR - 1);
      }
    } else {
      this.misses++;
      this.comboCount = 0;
      // Visualize miss
      Utils.playMiss();
    }
  }

  onEnd() {
    const accuracy = this.totalClicks > 0 ? (this.hits / this.totalClicks * 100) : 0;
    const hitsPerMin = this.hits / (this.elapsed / 60);

    return {
      hits: this.hits,
      misses: this.misses,
      totalClicks: this.totalClicks,
      accuracy: accuracy.toFixed(1),
      maxCombo: this.maxCombo,
      hitsPerMin: hitsPerMin.toFixed(1),
      labels: {
        hits: '命中',
        misses: '未命中',
        totalClicks: '总点击',
        accuracy: '命中率',
        maxCombo: '最高连击',
        hitsPerMin: '每分钟命中',
      },
      units: {
        hits: '次',
        misses: '次',
        totalClicks: '次',
        accuracy: '%',
        maxCombo: 'x',
        hitsPerMin: '',
      },
    };
  }

  updateHUD(hudEl) {
    const accuracy = this.totalClicks > 0 ? (this.hits / this.totalClicks * 100).toFixed(1) : '0.0';
    hudEl.innerHTML = `
      <div class="hud-stat">命中 <span>${this.hits}</span></div>
      <div class="hud-stat">命中率 <span>${accuracy}%</span></div>
      <div class="hud-stat">连击 <span>${this.comboCount}x</span></div>
    `;
  }
}

App.registerModule('clicking', {
  name: 'FLICK',
  icon: '⌖',
  description: 'Static & dynamic dot clicking. Train flick accuracy, speed, and combo streaks.',
  ModuleClass: ClickingModule,
});
