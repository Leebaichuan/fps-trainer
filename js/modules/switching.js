// ========== Target Switching Training Module ==========

class SwitchingModule extends TrainingModule {
  getDefaultSettings() {
    return {
      mode: 'dual',        // 'dual' | 'multi'
      targetCount: 3,
      targetSize: 25,
      switchSpeed: 'medium', // 'slow' | 'medium' | 'fast'
      duration: 60,
    };
  }

  getPresets() {
    return {
      easy: { mode: 'dual', targetCount: 2, targetSize: 30, switchSpeed: 'slow', duration: 60 },
      medium: { mode: 'dual', targetCount: 2, targetSize: 25, switchSpeed: 'medium', duration: 60 },
      hard: { mode: 'multi', targetCount: 4, targetSize: 20, switchSpeed: 'fast', duration: 60 },
    };
  }

  getSettingDefs() {
    return [
      { key: 'mode', label: '模式', type: 'select', options: ['dual', 'multi'], default: 'dual' },
      { key: 'targetCount', label: '目标数量', type: 'range', min: 2, max: 8, step: 1, default: 3, labels: ['2', '4', '6', '8'] },
      { key: 'targetSize', label: '目标大小', type: 'range', min: 15, max: 45, step: 5, default: 25, labels: ['15', '25', '35', '45'] },
      { key: 'switchSpeed', label: '切换速度', type: 'select', options: ['slow', 'medium', 'fast'], default: 'medium' },
      { key: 'duration', label: '训练时长(秒)', type: 'range', min: 15, max: 120, step: 15, default: 60, labels: ['15', '45', '75', '120'] },
    ];
  }

  onStart() {
    this.hits = 0;
    this.misses = 0;
    this.activeIndex = 0;
    this.targets = [];
    this.targetR = this.settings.targetSize;

    const speedMap = { slow: 1200, medium: 800, fast: 500 };
    this.switchInterval = speedMap[this.settings.switchSpeed];
    this.lastSwitchTime = performance.now();

    const count = this.settings.targetCount;
    const pad = 120;
    const topPad = 100;

    // Arrange targets in a horizontal row or arc
    if (count <= 4) {
      // Horizontal arrangement
      const totalWidth = Math.min(this.width - pad * 2, count * 160);
      const startX = (this.width - totalWidth) / 2;
      const spacing = totalWidth / (count - 1 || 1);

      for (let i = 0; i < count; i++) {
        this.targets.push({
          x: count === 1 ? this.width / 2 : startX + spacing * i,
          y: this.height / 2,
        });
      }
    } else {
      // Two rows
      const perRow = Math.ceil(count / 2);
      const totalWidth = Math.min(this.width - pad * 2, perRow * 130);
      const startX = (this.width - totalWidth) / 2;
      const spacing = totalWidth / (perRow - 1 || 1);

      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const rowCount = row === 0 ? perRow : count - perRow;
        const rowWidth = (rowCount - 1) * spacing;
        const rowStartX = (this.width - rowWidth) / 2;

        this.targets.push({
          x: rowStartX + spacing * col,
          y: this.height / 2 - 40 + row * 80,
        });
      }
    }
  }

  onUpdate(dt) {
    // Auto-switch targets
    const now = performance.now();
    if (now - this.lastSwitchTime > this.switchInterval) {
      this.lastSwitchTime = now;

      // If they missed the current target
      if (this.activeIndex !== -1) {
        this.misses++;
      }

      // Pick next target (never same as current for dual mode)
      let next;
      if (this.settings.mode === 'dual') {
        const other = this.activeIndex === 0 ? 1 : 0;
        next = other < this.targets.length ? other : 0;
        this.activeIndex = next;
      } else {
        do {
          next = Utils.randInt(0, this.targets.length - 1);
        } while (next === this.activeIndex && this.targets.length > 1);
        this.activeIndex = next;
      }
    }
  }

  onRender() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    // Draw lines connecting targets
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < this.targets.length; i++) {
      for (let j = i + 1; j < this.targets.length; j++) {
        ctx.beginPath();
        ctx.moveTo(this.targets[i].x, this.targets[i].y);
        ctx.lineTo(this.targets[j].x, this.targets[j].y);
        ctx.stroke();
      }
    }

    // Draw mouse line
    if (this.mouseX > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      const active = this.targets[this.activeIndex];
      if (active) {
        ctx.beginPath();
        ctx.moveTo(this.mouseX, this.mouseY);
        ctx.lineTo(active.x, active.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Draw targets
    this.targets.forEach((t, i) => {
      const isActive = i === this.activeIndex;
      const r = isActive ? this.targetR : this.targetR * 0.6;

      if (isActive) {
        Utils.drawTarget(ctx, t.x, t.y, r, '#ff4655');

        // Active indicator pulse
        const pulse = Math.sin(performance.now() / 200) * 4 + 4;
        ctx.strokeStyle = 'rgba(255,70,85,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(t.x, t.y, r + pulse, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Inactive: dimmed flat circle
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#3a3a50';
        ctx.beginPath();
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Hit feedback flash
      if (t._hitFlash && t._hitFlash > 0) {
        ctx.globalAlpha = t._hitFlash;
        ctx.fillStyle = '#2ed573';
        ctx.beginPath();
        ctx.arc(t.x, t.y, r + 10, 0, Math.PI * 2);
        ctx.fill();
        t._hitFlash -= 0.05;
        ctx.globalAlpha = 1;
      }
    });

    ctx.globalAlpha = 1;
  }

  onClick(x, y) {
    const active = this.targets[this.activeIndex];
    if (!active) return;

    if (Utils.inCircle(x, y, active.x, active.y, this.targetR + 5)) {
      this.hits++;
      active._hitFlash = 0.8;
      Utils.playHit();

      // Move to next target immediately on hit
      const now = performance.now();
      this.lastSwitchTime = now;

      let next;
      if (this.settings.mode === 'dual') {
        next = this.activeIndex === 0 ? 1 : 0;
        this.activeIndex = next < this.targets.length ? next : 0;
      } else {
        do {
          next = Utils.randInt(0, this.targets.length - 1);
        } while (next === this.activeIndex && this.targets.length > 1);
        this.activeIndex = next;
      }
    } else {
      this.misses++;
      Utils.playMiss();
    }
  }

  onEnd() {
    const accuracy = (this.hits + this.misses) > 0 ? (this.hits / (this.hits + this.misses) * 100) : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      accuracy: accuracy.toFixed(1),
      totalAttempts: this.hits + this.misses,
      labels: {
        hits: '命中',
        misses: '未命中',
        accuracy: '命中率',
        totalAttempts: '总尝试',
      },
      units: {
        hits: '次',
        misses: '次',
        accuracy: '%',
        totalAttempts: '次',
      },
    };
  }

  updateHUD(hudEl) {
    const accuracy = (this.hits + this.misses) > 0 ? (this.hits / (this.hits + this.misses) * 100).toFixed(1) : '0.0';
    hudEl.innerHTML = `
      <div class="hud-stat">命中 <span>${this.hits}</span></div>
      <div class="hud-stat">命中率 <span>${accuracy}%</span></div>
      <div class="hud-stat">目标 <span>#${this.activeIndex + 1}</span></div>
    `;
  }
}

App.registerModule('switching', {
  name: 'SWITCH',
  icon: '⇄',
  description: 'Rapid target switching. Dual & multi-target drills. Train flick-and-transfer speed.',
  ModuleClass: SwitchingModule,
});
