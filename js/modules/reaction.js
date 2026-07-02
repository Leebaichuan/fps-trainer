// ========== Reaction Time Training Module ==========

class ReactionModule extends TrainingModule {
  getDefaultSettings() {
    return {
      trials: 10,
      mode: 'color',       // 'color' | 'target'
      minDelay: 1000,      // ms
      maxDelay: 4000,      // ms
      duration: 60,        // seconds (time limit, or use trials)
    };
  }

  getPresets() {
    return {
      easy: { trials: 5, mode: 'color', minDelay: 1500, maxDelay: 5000 },
      medium: { trials: 10, mode: 'color', minDelay: 1000, maxDelay: 4000 },
      hard: { trials: 20, mode: 'target', minDelay: 500, maxDelay: 2500 },
    };
  }

  getSettingDefs() {
    return [
      { key: 'mode', label: '训练模式', type: 'select', options: ['color', 'target'], default: 'color' },
      { key: 'trials', label: '测试次数', type: 'range', min: 5, max: 30, step: 5, default: 10, labels: ['5', '10', '15', '20', '25', '30'] },
      { key: 'minDelay', label: '最小等待(ms)', type: 'range', min: 500, max: 5000, step: 250, default: 1000, labels: ['500', '1500', '3000', '5000'] },
      { key: 'maxDelay', label: '最大等待(ms)', type: 'range', min: 1000, max: 8000, step: 500, default: 4000, labels: ['1000', '3000', '5000', '8000'] },
    ];
  }

  onStart() {
    this.state = 'waiting';  // 'waiting' | 'ready' | 'clicked' | 'too-early' | 'done'
    this.trialIndex = 0;
    this.trialResults = [];
    this.waitStart = 0;
    this.waitDuration = 0;
    this.readyTime = 0;
    this.reactionTime = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.targetR = 30;
    this._scheduleNext();
  }

  _scheduleNext() {
    if (this.trialIndex >= this.settings.trials) {
      this.state = 'done';
      this.running = false;
      if (this._onComplete) this._onComplete(this.onEnd());
      return;
    }
    this.state = 'waiting';
    this.waitStart = performance.now();
    this.waitDuration = Utils.randInt(this.settings.minDelay, this.settings.maxDelay);

    // Place target at random position
    if (this.settings.mode === 'target') {
      const pad = 80;
      this.targetX = Utils.randInt(pad, this.width - pad);
      this.targetY = Utils.randInt(100, this.height - pad);
    }

    this.readyTime = 0;
  }

  onUpdate(dt) {
    if (this.state === 'done') return;

    const now = performance.now();

    if (this.state === 'waiting') {
      if (now - this.waitStart >= this.waitDuration) {
        this.state = 'ready';
        this.readyTime = now;
        if (this.settings.mode === 'target') {
          Utils.playCountdown();
        }
      }
    }
  }

  onRender() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    if (this.state === 'waiting') {
      // Red screen for color mode
      if (this.settings.mode === 'color') {
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        ctx.font = '24px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('等待颜色变化后点击...', w / 2, h / 2);
        ctx.fillText(`测试 ${this.trialIndex + 1} / ${this.settings.trials}`, w / 2, h / 2 + 36);
      } else {
        // Dark background waiting for target
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#8888a0';
        ctx.font = '20px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('等待目标出现... 看到后尽快点击！', w / 2, h / 2);
        ctx.fillText(`测试 ${this.trialIndex + 1} / ${this.settings.trials}`, w / 2, h / 2 + 30);
      }
    }

    if (this.state === 'ready') {
      if (this.settings.mode === 'color') {
        // Green screen - click now!
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff';
        ctx.font = '36px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('点击！', w / 2, h / 2);
      } else {
        // Target mode - draw the target
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);

        // 3D target
        Utils.drawTarget(ctx, this.targetX, this.targetY, this.targetR, '#ff4655');
      }
    }

    if (this.state === 'too-early') {
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      ctx.font = '28px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('太早了！等颜色变化后再点击', w / 2, h / 2);
    }

    // Show previous results in corner
    if (this.trialResults.length > 0) {
      ctx.fillStyle = '#55556a';
      ctx.font = '14px "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`上次: ${this.trialResults[this.trialResults.length - 1].toFixed(0)}ms`, w - 20, 80);
      const avg = Utils.mean(this.trialResults).toFixed(0);
      ctx.fillText(`平均: ${avg}ms`, w - 20, 100);
    }
  }

  onClick(x, y) {
    if (this.state === 'waiting') {
      // Too early!
      this.state = 'too-early';
      Utils.playMiss();
      this._earlyTimeout = setTimeout(() => { if (this.running) this._scheduleNext(); }, 800);
      return;
    }

    if (this.state === 'ready') {
      // Record reaction time
      this.reactionTime = performance.now() - this.readyTime;
      this.trialResults.push(this.reactionTime);
      this.trialIndex++;
      Utils.playHit();

      if (this.settings.mode === 'target') {
        // Also check if they clicked on the target
        if (!Utils.inCircle(x, y, this.targetX, this.targetY, this.targetR + 5)) {
          // Clicked but missed - still counts as reacted, just slower
          this.trialResults[this.trialResults.length - 1] += 200; // penalty
        }
      }

      this._scheduleNext();
      return;
    }
  }

  onEnd() {
    if (this.trialResults.length === 0) {
      return {
        avgReaction: '0', medianReaction: '0', bestReaction: '0', worstReaction: '0', stdDev: '0', trials: 0,
        labels: { avgReaction: '平均反应', medianReaction: '中位数', bestReaction: '最快', worstReaction: '最慢', stdDev: '标准差', trials: '测试次数' },
        units: { avgReaction: 'ms', medianReaction: 'ms', bestReaction: 'ms', worstReaction: 'ms', stdDev: 'ms', trials: '次' },
      };
    }
    const avg = Utils.mean(this.trialResults);
    const median = Utils.median(this.trialResults);
    const best = Math.min(...this.trialResults);
    const worst = Math.max(...this.trialResults);
    const stdDev = Utils.stdDev(this.trialResults);

    return {
      avgReaction: avg.toFixed(0),
      medianReaction: median.toFixed(0),
      bestReaction: best.toFixed(0),
      worstReaction: worst.toFixed(0),
      stdDev: stdDev.toFixed(0),
      trials: this.trialResults.length,
      labels: {
        avgReaction: '平均反应',
        medianReaction: '中位数',
        bestReaction: '最快',
        worstReaction: '最慢',
        stdDev: '标准差',
        trials: '测试次数',
      },
      units: {
        avgReaction: '毫秒',
        medianReaction: '毫秒',
        bestReaction: '毫秒',
        worstReaction: '毫秒',
        stdDev: '毫秒',
        trials: '次',
      },
    };
  }

  updateHUD(hudEl) {
    hudEl.innerHTML = `
      <div class="hud-stat">进度 <span>${this.trialIndex}/${this.settings.trials}</span></div>
      ${this.trialResults.length > 0 ? `<div class="hud-stat">最近 <span>${this.trialResults[this.trialResults.length - 1].toFixed(0)}ms</span></div>` : ''}
    `;
  }
}

App.registerModule('reaction', {
  name: '反应测试',
  description: '视觉触发反应。颜色变化与目标出现，测量原始反应速度。',
  ModuleClass: ReactionModule,
});
