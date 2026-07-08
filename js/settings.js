// ========== FPS Aim Trainer - Global Settings ==========

const CrosshairSettings = {
  STORAGE_KEY: 'fps-trainer-crosshair',

  // Valorant-inspired defaults
  defaults: {
    style: 'cross',       // 'cross' | 'dot' | 'circle' | 'crossdot' | 'crosscircle'
    color: '#00e5a0',
    size: 8,              // arm length
    gap: 3,               // center gap
    thickness: 1.5,
    outline: true,
    outlineOpacity: 0.5,
    outlineThickness: 3,
    centerDot: true,
    dotSize: 1.2,
    opacity: 0.9,
    showHitMarker: true,
  },

  // Valorant crosshair color presets
  colorPresets: [
    { name: 'Green', hex: '#00e5a0' },
    { name: 'Cyan', hex: '#00bcd4' },
    { name: 'White', hex: '#ffffff' },
    { name: 'Red', hex: '#ff4655' },
    { name: 'Yellow', hex: '#ffd60a' },
    { name: 'Pink', hex: '#ff6bd6' },
    { name: 'V. Green', hex: '#7eff6b' },
    { name: 'V. Cyan', hex: '#6bffd6' },
  ],

  // Quick presets
  presets: {
    default: { style: 'cross', color: '#00e5a0', size: 8, gap: 3, thickness: 1.5, outline: true, centerDot: true, dotSize: 1.2 },
    dot: { style: 'dot', color: '#00e5a0', size: 4, gap: 0, thickness: 0, outline: true, centerDot: true, dotSize: 2.5 },
    thin: { style: 'cross', color: '#ffffff', size: 12, gap: 2, thickness: 1, outline: false, centerDot: false, dotSize: 0 },
    thick: { style: 'cross', color: '#ff4655', size: 6, gap: 5, thickness: 3, outline: true, centerDot: true, dotSize: 2 },
    circle: { style: 'crosscircle', color: '#00bcd4', size: 6, gap: 4, thickness: 1.5, outline: true, centerDot: true, dotSize: 1 },
  },

  /** Get current settings (merged with defaults) */
  get() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) return { ...this.defaults, ...JSON.parse(raw) };
    } catch (e) { /* ignore */ }
    return { ...this.defaults };
  },

  /** Save settings */
  save(settings) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch (e) { /* ignore */ }
  },

  /** Reset to defaults */
  reset() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  /** Apply a preset */
  applyPreset(name) {
    const preset = this.presets[name];
    if (preset) {
      this.save({ ...this.defaults, ...preset });
    }
  },
};

// ========== Global Game Settings ==========

const GameSettings = {
  STORAGE_KEY: 'fps-trainer-game',

  defaults: {
    sensitivity: 0.50,       // mouse sensitivity (Valorant-style, 0.01–3.00)
    rawInput: true,          // pointer lock raw input — eliminates OS acceleration
    fov: 90,
    soundEnabled: true,
    soundVolume: 0.5,
  },

  normalizeSensitivity(value) {
    const parsed = Number(value);
    const fallback = this.defaults.sensitivity;
    const next = Number.isFinite(parsed) ? parsed : fallback;
    const clamped = Math.max(0.01, Math.min(3.00, next));
    return Math.round(clamped * 100) / 100;
  },

  getSensitivity() {
    return this.normalizeSensitivity(this.get().sensitivity);
  },

  applySensitivity(delta, sensitivity = this.getSensitivity()) {
    const movement = Number(delta);
    if (!Number.isFinite(movement)) return 0;
    return movement * this.normalizeSensitivity(sensitivity);
  },

  get() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const settings = { ...this.defaults, ...JSON.parse(raw) };
        settings.sensitivity = this.normalizeSensitivity(settings.sensitivity);
        return settings;
      }
    } catch (e) { /* ignore */ }
    return { ...this.defaults };
  },

  save(settings) {
    try {
      const normalized = { ...this.defaults, ...(settings || {}) };
      normalized.sensitivity = this.normalizeSensitivity(normalized.sensitivity);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(normalized));
    } catch (e) { /* ignore */ }
  },
};
