// ========== FPS Aim Trainer - Utilities ==========

const Utils = {
  /**
   * Generate random integer between min and max (inclusive)
   */
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Generate random float between min and max
   */
  randFloat(min, max) {
    return Math.random() * (max - min) + min;
  },

  /**
   * Pick a random element from an array
   */
  randPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  /**
   * Distance between two points
   */
  distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  },

  /**
   * Check if point is inside circle
   */
  inCircle(px, py, cx, cy, r) {
    return this.distance(px, py, cx, cy) <= r;
  },

  /**
   * Linear interpolation
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  /**
   * Clamp value between min and max
   */
  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  /**
   * Format time in milliseconds to human readable
   */
  formatTime(ms) {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    const min = Math.floor(ms / 60000);
    const sec = ((ms % 60000) / 1000).toFixed(1);
    return `${min}m ${sec}s`;
  },

  /**
   * Format seconds to mm:ss
   */
  formatClock(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  },

  /**
   * Calculate accuracy percentage
   */
  accuracy(hits, total) {
    if (total === 0) return 0;
    return ((hits / total) * 100).toFixed(1);
  },

  /**
   * Get a contrasting color for the target
   */
  targetColor() {
    const colors = ['#ff4757', '#ff6b81', '#ffa502', '#ff6348', '#7c5ce7', '#2ed573', '#1e90ff', '#e056a0'];
    return this.randPick(colors);
  },

  /**
   * Darken a hex color by a factor
   */
  darkenColor(hex, factor = 0.5) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dr = Math.floor(r * factor);
    const dg = Math.floor(g * factor);
    const db = Math.floor(b * factor);
    return `rgb(${dr},${dg},${db})`;
  },

  /**
   * Parse hex color to RGB
   */
  hexToRgb(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  },

  /**
   * Draw a clean 2D target — flat circle with subtle glow, Valorant-inspired
   */
  drawTarget(ctx, x, y, r, color = '#ff4655', opts = {}) {
    const { glowAlpha = 0.35, ringAlpha = 0.5 } = opts;

    ctx.save();

    // Outer glow (subtle, against dark bg)
    const { r: cr, g: cg, b: cb } = this.hexToRgb(color);
    const glow = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 1.6);
    glow.addColorStop(0, 'rgba(0,0,0,0)');
    glow.addColorStop(0.4, `rgba(${cr},${cg},${cb},${glowAlpha})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Main circle — flat fill
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner ring — slightly brighter
    const innerR = r * 0.7;
    ctx.strokeStyle = `rgba(255,255,255,${ringAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, innerR, 0, Math.PI * 2);
    ctx.stroke();

    // Outer edge ring
    ctx.strokeStyle = `rgba(255,255,255,0.2)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  },

  /**
   * Valorant target color palette — bright against #0c0c0e
   */
  targetColors: [
    '#ff4655',  // Valorant Red
    '#ff6b81',  // Light Red
    '#00e5a0',  // Mint Green
    '#00bcd4',  // Cyan
    '#ece8e1',  // Off-white
    '#ffd60a',  // Yellow
    '#7c5ce7',  // Purple
    '#ff6bd6',  // Pink
    '#ff8c42',  // Orange
    '#6bffd6',  // Teal
  ],

  randomTargetColor() {
    return this.targetColors[Math.floor(Math.random() * this.targetColors.length)];
  },

  _lightenColor(hex, amount) {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgb(${Math.min(255, r + Math.floor(255 * amount))},${Math.min(255, g + Math.floor(255 * amount))},${Math.min(255, b + Math.floor(255 * amount))})`;
  },

  /**
   * Calculate mean of an array
   */
  mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  },

  /**
   * Calculate median of an array
   */
  median(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },

  /**
   * Get standard deviation
   */
  stdDev(arr) {
    if (arr.length < 2) return 0;
    const avg = this.mean(arr);
    const variance = arr.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (arr.length - 1);
    return Math.sqrt(variance);
  },

  /**
   * Check if event target is a button/interactive element (should not trigger canvas actions)
   */
  isUIElement(el) {
    return el.tagName === 'BUTTON' || el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.closest('.overlay');
  },

  /**
   * Emit a simple beep sound using Web Audio API
   */
  playBeep(freq = 800, duration = 80, type = 'sine') {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration / 1000);
    } catch (e) {
      // Silently fail if audio not available
    }
  },

  /**
   * Play hit sound
   */
  playHit() { this.playBeep(1200, 50, 'square'); },

  /**
   * Play miss sound
   */
  playMiss() { this.playBeep(200, 150, 'sawtooth'); },

  /**
   * Play countdown beep
   */
  playCountdown() { this.playBeep(600, 100, 'sine'); },
};

// ========== Training Base Class ==========

class TrainingModule {
  constructor(canvas, hudElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hud = hudElement;
    this.running = false;
    this.paused = false;
    this.startTime = 0;
    this.elapsed = 0;
    this.animFrame = null;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this._virtX = 0;          // virtual cursor (sensitivity-scaled)
    this._virtY = 0;
    this._lastRawX = 0;       // last raw mouse position for delta calc
    this._lastRawY = 0;
    this._rawInit = false;    // first mousemove initializes raw position
    this._pointerLocked = false;
    this._boundMouseMove = this._onMouseMove.bind(this);
    this._boundMouseDown = this._onMouseDown.bind(this);
    this._boundMouseUp = this._onMouseUp.bind(this);
    this._boundKeyDown = this._onKeyDown.bind(this);
    this._boundPointerLockChange = this._onPointerLockChange.bind(this);
    this._boundPointerLockError = () => {}; // silently handle lock errors
  }

  /** Override in subclass to define default settings */
  getDefaultSettings() { return {}; }

  /** Override in subclass to define difficulty presets: { easy: {}, medium: {}, hard: {} } */
  getPresets() {
    return {
      easy: {},
      medium: {},
      hard: {},
    };
  }

  /** Override: return array of setting definitions */
  getSettingDefs() { return []; }

  /** Override: called when training starts */
  onStart() {}

  /** Override: called each frame, dt in seconds */
  onUpdate(dt) {}

  /** Override: render the training scene */
  onRender() {}

  /** Override: called when training ends (time up or manual stop) */
  onEnd() { return {}; }

  /** Override: handle click on canvas */
  onClick(x, y) {}

  start(settings = {}) {
    this.settings = { ...this.getDefaultSettings(), ...settings };
    this.running = true;
    this.paused = false;
    this.startTime = performance.now();
    this.elapsed = 0;

    this.canvas.addEventListener('mousemove', this._boundMouseMove);
    this.canvas.addEventListener('mousedown', this._boundMouseDown);
    this.canvas.addEventListener('mouseup', this._boundMouseUp);
    window.addEventListener('keydown', this._boundKeyDown);

    this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
    this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

    // Initialize virtual cursor at canvas center
    const cx = this.canvas.offsetWidth / 2;
    const cy = this.canvas.offsetHeight / 2;
    this.mouseX = cx;
    this.mouseY = cy;
    this._virtX = cx;
    this._virtY = cy;
    this._rawInit = false;

    // Request pointer lock for raw mouse input (AimLab-style)
    document.addEventListener('pointerlockchange', this._boundPointerLockChange);
    this._requestPointerLock();

    this._lastTime = performance.now();
    this.onStart();
    this._loop(this._lastTime);
  }

  stop() {
    this.running = false;
    if (this.animFrame) cancelAnimationFrame(this.animFrame);

    this.canvas.removeEventListener('mousemove', this._boundMouseMove);
    this.canvas.removeEventListener('mousedown', this._boundMouseDown);
    this.canvas.removeEventListener('mouseup', this._boundMouseUp);
    window.removeEventListener('keydown', this._boundKeyDown);
    document.removeEventListener('pointerlockchange', this._boundPointerLockChange);

    // Release pointer lock
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }

    return this.onEnd();
  }

  _loop(now) {
    if (!this.running) return;
    this.animFrame = requestAnimationFrame((t) => this._loop(t));

    const dt = (now - this._lastTime) / 1000;
    this._lastTime = now;
    this.elapsed = (now - this.startTime) / 1000;

    // Clear canvas
    const w = this.canvas.offsetWidth;
    const h = this.canvas.offsetHeight;
    this.ctx.clearRect(0, 0, w, h);

    this.onUpdate(dt);
    this.onRender();

    // Draw custom crosshair (AimLab-style) — always on top
    this._drawCrosshair();

    // Check time limit
    const duration = this.settings.duration || 60;
    if (this.elapsed >= duration) {
      this.running = false;
      cancelAnimationFrame(this.animFrame);
      this.canvas.removeEventListener('mousemove', this._boundMouseMove);
      this.canvas.removeEventListener('mousedown', this._boundMouseDown);
      this.canvas.removeEventListener('mouseup', this._boundMouseUp);
      window.removeEventListener('keydown', this._boundKeyDown);
      if (this._onComplete) this._onComplete(this.onEnd());
    }

    // Update HUD
    this._updateHUD();
  }

  _onMouseMove(e) {
    const sens = GameSettings.get().sensitivity;

    if (this._pointerLocked) {
      // Pointer lock: raw movementX/Y deltas × sensitivity (Valorant-style)
      this._virtX += e.movementX * sens;
      this._virtY += e.movementY * sens;
    } else {
      // Fallback: absolute 1:1 cursor mapping (no delta drift, no inertia)
      const rect = this.canvas.getBoundingClientRect();
      this._virtX = e.clientX - rect.left;
      this._virtY = e.clientY - rect.top;
    }

    // Clamp virtual cursor to canvas bounds
    this._virtX = Utils.clamp(this._virtX, 0, this.canvas.offsetWidth);
    this._virtY = Utils.clamp(this._virtY, 0, this.canvas.offsetHeight);
    this.mouseX = this._virtX;
    this.mouseY = this._virtY;
  }

  _onMouseDown(e) {
    if (Utils.isUIElement(e.target)) return;
    this.mouseDown = true;

    this.onClick(this.mouseX, this.mouseY);
  }

  _onMouseUp(e) {
    this.mouseDown = false;
  }

  _onPointerLockChange() {
    this._pointerLocked = document.pointerLockElement === this.canvas;
    this._rawInit = false; // reset delta tracking on lock change
  }

  _requestPointerLock() {
    if (!GameSettings.get().rawInput) return;
    try {
      this.canvas.requestPointerLock();
    } catch (e) {
      // Pointer lock not supported — fallback to 1:1 absolute positioning
    }
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') {
      if (this._onEscape) this._onEscape();
    }
  }

  _updateHUD() {
    const remaining = Math.max(0, (this.settings.duration || 60) - this.elapsed);
    const timerEl = document.getElementById('hud-timer');
    if (timerEl) timerEl.textContent = Utils.formatClock(remaining);
  }

  /**
   * AimLab-style custom crosshair — reads from CrosshairSettings
   */
  _drawCrosshair() {
    if (this.mouseX <= 0 || this.mouseY <= 0) return;
    const ctx = this.ctx;
    const x = this.mouseX;
    const y = this.mouseY;
    const cs = CrosshairSettings.get();
    const len = cs.size;
    const gap = cs.gap;
    const thick = cs.thickness;
    const color = cs.color;

    ctx.save();
    ctx.globalAlpha = cs.opacity;

    // Outer glow (outline)
    if (cs.outline) {
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = cs.outlineThickness;
    }

    if (cs.style === 'dot') {
      // Dot only
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, cs.dotSize, 0, Math.PI * 2);
      ctx.fill();

    } else if (cs.style === 'circle') {
      // Circle with center dot
      ctx.strokeStyle = color;
      ctx.lineWidth = thick;
      ctx.beginPath();
      ctx.arc(x, y, len, 0, Math.PI * 2);
      ctx.stroke();
      if (cs.centerDot) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, cs.dotSize, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (cs.style === 'crosscircle') {
      // Cross inside circle
      ctx.strokeStyle = color;
      ctx.lineWidth = thick;
      ctx.beginPath();
      ctx.arc(x, y, len, 0, Math.PI * 2);
      ctx.stroke();
      // Fall through to draw cross inside
      this._drawCrossArms(ctx, x, y, len - 1, gap, thick, color);
      if (cs.centerDot) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, cs.dotSize, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (cs.style === 'crossdot') {
      // Cross with dot
      this._drawCrossArms(ctx, x, y, len, gap, thick, color);
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, cs.dotSize + 0.5, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Default: 'cross'
      this._drawCrossArms(ctx, x, y, len, gap, thick, color);
      // Center dot
      if (cs.centerDot) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, cs.dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  _drawCrossArms(ctx, x, y, len, gap, thick, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(x, y - gap);
    ctx.lineTo(x, y - gap - len);
    ctx.moveTo(x, y + gap);
    ctx.lineTo(x, y + gap + len);
    ctx.moveTo(x - gap, y);
    ctx.lineTo(x - gap - len, y);
    ctx.moveTo(x + gap, y);
    ctx.lineTo(x + gap + len, y);
    ctx.stroke();
  }

  /** Resize canvas to fill container */
  resize() {
    this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
    this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  }

  get width() { return this.canvas.offsetWidth; }
  get height() { return this.canvas.offsetHeight; }
}
