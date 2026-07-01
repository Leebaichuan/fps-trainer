// ========== Grid Shot Training Module (1wall6targets style) ==========

class GridshotModule extends TrainingModule {
  getDefaultSettings() {
    return {
      rows: 3,
      cols: 3,
      targetSize: 30,
      duration: 60,
    };
  }

  getPresets() {
    return {
      easy: { rows: 2, cols: 2, targetSize: 40, duration: 60 },
      medium: { rows: 3, cols: 3, targetSize: 30, duration: 60 },
      hard: { rows: 3, cols: 4, targetSize: 22, duration: 60 },
    };
  }

  getSettingDefs() {
    return [
      { key: 'rows', label: '行数', type: 'range', min: 2, max: 4, step: 1, default: 3, labels: ['2', '3', '4'] },
      { key: 'cols', label: '列数', type: 'range', min: 2, max: 5, step: 1, default: 3, labels: ['2', '3', '4', '5'] },
      { key: 'targetSize', label: '目标大小', type: 'range', min: 15, max: 50, step: 5, default: 30, labels: ['15', '25', '40', '50'] },
      { key: 'duration', label: '训练时长(秒)', type: 'range', min: 15, max: 120, step: 15, default: 60, labels: ['15', '45', '75', '120'] },
    ];
  }

  onStart() {
    this.hits = 0;
    this.misses = 0;
    this.totalShots = 0;
    this.activeRow = -1;
    this.activeCol = -1;
    this.combo = 0;
    this.maxCombo = 0;
    this.cells = [];
    this.targetR = this.settings.targetSize;

    const { rows, cols } = this.settings;
    const cellW = (this.width - 80) / cols;
    const cellH = (this.height - 140) / rows;
    const startX = 40 + cellW / 2;
    const startY = 100 + cellH / 2;

    for (let r = 0; r < rows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < cols; c++) {
        this.cells[r][c] = {
          x: startX + c * cellW,
          y: startY + r * cellH,
          w: cellW,
          h: cellH,
        };
      }
    }

    // Activate first target
    this._nextTarget();
  }

  _nextTarget() {
    const { rows, cols } = this.settings;
    let nr, nc;
    do {
      nr = Utils.randInt(0, rows - 1);
      nc = Utils.randInt(0, cols - 1);
    } while (nr === this.activeRow && nc === this.activeCol && rows * cols > 1);
    this.activeRow = nr;
    this.activeCol = nc;
  }

  onUpdate(dt) {
    // Nothing dynamic in gridshot
  }

  onRender() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, w, h);

    const { rows, cols } = this.settings;

    // Draw grid cells
    this.cells.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        const isActive = ri === this.activeRow && ci === this.activeCol;

        // Cell background
        ctx.fillStyle = isActive ? 'rgba(255,71,87,0.08)' : 'rgba(255,255,255,0.02)';
        ctx.strokeStyle = isActive ? 'rgba(255,71,87,0.3)' : 'rgba(255,255,255,0.06)';
        ctx.lineWidth = isActive ? 2 : 1;

        const cx = cell.x - cell.w / 2;
        const cy = cell.y - cell.h / 2;
        // Draw rounded rect manually for broad compat
        const rr = 6;
        ctx.beginPath();
        ctx.moveTo(cx + rr, cy);
        ctx.lineTo(cx + cell.w - rr, cy);
        ctx.arcTo(cx + cell.w, cy, cx + cell.w, cy + rr, rr);
        ctx.lineTo(cx + cell.w, cy + cell.h - rr);
        ctx.arcTo(cx + cell.w, cy + cell.h, cx + cell.w - rr, cy + cell.h, rr);
        ctx.lineTo(cx + rr, cy + cell.h);
        ctx.arcTo(cx, cy + cell.h, cx, cy + cell.h - rr, rr);
        ctx.lineTo(cx, cy + rr);
        ctx.arcTo(cx, cy, cx + rr, cy, rr);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Active target
        if (isActive) {
          const tx = cell.x;
          const ty = cell.y;
          const tr = this.targetR;

          // 3D target
          Utils.drawTarget(ctx, tx, ty, tr, '#ff4655');

          // Pulse ring
          const pulse = Math.sin(performance.now() / 300) * 5 + 5;
          ctx.strokeStyle = 'rgba(255,70,85,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(tx, ty, tr + pulse, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Inactive dot
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath();
          ctx.arc(cell.x, cell.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });

    // Stats overlay (bottom center)
    const hitsPerMin = this.elapsed > 0 ? (this.hits / (this.elapsed / 60)).toFixed(1) : '0';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${hitsPerMin} hits/min`, w / 2, h - 20);

    // Combo
    if (this.combo >= 5) {
      ctx.fillStyle = '#ffa502';
      ctx.font = 'bold 56px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.6;
      ctx.fillText(`${this.combo}x`, w / 2, 60);
      ctx.globalAlpha = 1;
    }
  }

  onClick(x, y) {
    this.totalShots++;

    const cell = this.cells[this.activeRow]?.[this.activeCol];
    if (!cell) return;

    // Check if click is in the active target cell
    const inCell = x >= cell.x - cell.w / 2 && x <= cell.x + cell.w / 2 &&
                   y >= cell.y - cell.h / 2 && y <= cell.y + cell.h / 2;
    const inTarget = Utils.inCircle(x, y, cell.x, cell.y, this.targetR + 5);

    if (inCell && inTarget) {
      this.hits++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      Utils.playHit();
      this._nextTarget();
    } else {
      this.misses++;
      this.combo = 0;
      Utils.playMiss();
    }
  }

  onEnd() {
    const total = this.hits + this.misses;
    const accuracy = total > 0 ? (this.hits / total * 100) : 0;
    const hitsPerMin = this.elapsed > 0 ? (this.hits / (this.elapsed / 60)).toFixed(1) : '0';

    return {
      hits: this.hits,
      misses: this.misses,
      accuracy: accuracy.toFixed(1),
      maxCombo: this.maxCombo,
      hitsPerMin,
      labels: {
        hits: '命中',
        misses: '未命中',
        accuracy: '命中率',
        maxCombo: '最高连击',
        hitsPerMin: '每分钟命中',
      },
      units: {
        hits: '次',
        misses: '次',
        accuracy: '%',
        maxCombo: 'x',
        hitsPerMin: '',
      },
    };
  }

  updateHUD(hudEl) {
    const total = this.hits + this.misses;
    const accuracy = total > 0 ? (this.hits / total * 100).toFixed(1) : '0.0';
    const hitsPerMin = this.elapsed > 0 ? (this.hits / (this.elapsed / 60)).toFixed(1) : '0';
    hudEl.innerHTML = `
      <div class="hud-stat">命中 <span>${this.hits}</span></div>
      <div class="hud-stat">命中率 <span>${accuracy}%</span></div>
      <div class="hud-stat">连击 <span>${this.combo}x</span></div>
      <div class="hud-stat">速率 <span>${hitsPerMin}/min</span></div>
    `;
  }
}

App.registerModule('gridshot', {
  name: 'GRIDSHOT',
  icon: '▦',
  description: 'Classic 1wall6targets. Grid-based random highlight. Speed, rhythm, raw clicks per minute.',
  ModuleClass: GridshotModule,
});
