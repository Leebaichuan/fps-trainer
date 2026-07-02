// ========== FPS Aim Trainer - Application Core ==========

const App = {
  // Module registry
  modules: {},

  // Current training state
  currentModule: null,
  currentInstance: null,

  // DOM refs
  el: {},

  /**
   * Initialize the application
   */
  init() {
    this._cacheDOM();
    this._registerModules();
    this._renderMenu();
    this._bindEvents();
  },

  _cacheDOM() {
    this.el.mainMenu = document.getElementById('main-menu');
    this.el.trainingView = document.getElementById('training-view');
    this.el.moduleGrid = document.getElementById('module-grid');
    this.el.canvas = document.getElementById('training-canvas');
    this.el.hudStats = document.getElementById('hud-stats');
    this.el.hudModuleName = document.getElementById('hud-module-name');
    this.el.resultOverlay = document.getElementById('result-overlay');
    this.el.resultTitle = document.getElementById('result-title');
    this.el.resultContent = document.getElementById('result-content');
    this.el.settingsOverlay = document.getElementById('settings-overlay');
    this.el.settingsContent = document.getElementById('settings-content');
    this.el.statsOverlay = document.getElementById('stats-overlay');
    this.el.statsContent = document.getElementById('stats-content');
    this.el.crosshairOverlay = document.getElementById('crosshair-overlay');
  },

  _registerModules() {
    // Each module file registers itself via registerModule()
  },

  registerModule(id, config) {
    this.modules[id] = {
      id,
      name: config.name,
      icon: config.icon,
      description: config.description,
      ModuleClass: config.ModuleClass,
    };
  },

  /**
   * Get all registered modules
   */
  getModules() {
    return Object.values(this.modules);
  },

  /**
   * Render the main menu module cards
   */
  _renderMenu() {
    if (!this.el.moduleGrid) return;
    this.el.moduleGrid.innerHTML = '';

    const mods = this.getModules();
    mods.forEach((mod, i) => {
      const ids = ['01', '02', '03', '04', '05', '06'];
      const card = document.createElement('div');
      card.className = 'module-card';
      card.dataset.module = mod.id;
      card.innerHTML = `
        <div class="card-id">// ${ids[i] || '00'} — training</div>
        <div class="card-title">${mod.name}</div>
        <div class="card-desc">${mod.description}</div>
        <div class="card-line"></div>
      `;
      card.addEventListener('click', () => this._openSettings(mod));
      this.el.moduleGrid.appendChild(card);
    });
  },

  /**
   * Open settings panel for a module
   */
  _openSettings(mod) {
    const instance = new mod.ModuleClass(this.el.canvas, this.el.hudStats);
    const defs = instance.getSettingDefs();

    let html = '';

    // Difficulty presets
    const presets = instance.getPresets();
    const presetKeys = Object.keys(presets);
    if (presetKeys.length > 0) {
      html += '<div class="difficulty-presets">';
      html += `<button class="diff-btn active" data-preset="medium">中级</button>`;
      if (presetKeys.includes('easy')) html += `<button class="diff-btn" data-preset="easy">初级</button>`;
      if (presetKeys.includes('hard')) html += `<button class="diff-btn" data-preset="hard">高级</button>`;
      html += '</div>';
    }

    // Settings controls
    defs.forEach((def) => {
      html += '<div class="setting-group">';
      html += `<label>${def.label}</label>`;
      if (def.type === 'select') {
        html += `<select data-setting="${def.key}">`;
        def.options.forEach((opt) => {
          const selected = opt === def.default ? ' selected' : '';
          html += `<option value="${opt}"${selected}>${opt}</option>`;
        });
        html += '</select>';
      } else if (def.type === 'range') {
        html += `<input type="range" data-setting="${def.key}" min="${def.min}" max="${def.max}" step="${def.step || 1}" value="${def.default}">`;
        html += '<div class="range-labels">';
        if (def.labels) {
          def.labels.forEach((l) => { html += `<span>${l}</span>`; });
        } else {
          html += `<span>${def.min}</span><span>${def.default}</span><span>${def.max}</span>`;
        }
        html += '</div>';
      }
      html += '</div>';
    });

    // Global sensitivity setting
    const curSens = GameSettings.get().sensitivity;
    html += '<div class="setting-divider"></div>';
    html += '<div class="setting-group">';
    html += '<div class="sens-row">';
    html += '<label>鼠标灵敏度</label>';
    html += '<input type="number" class="sens-input" id="setting-sens-input" value="' + curSens.toFixed(2) + '" min="0.01" max="3.00" step="0.01">';
    html += '</div>';
    html += '<input type="range" id="setting-sensitivity" min="0.01" max="3.00" step="0.01" value="' + curSens + '">';
    html += '<div class="range-labels"><span>0.01</span><span>1.00</span><span>2.00</span><span>3.00</span></div>';
    html += '</div>';

    this.el.settingsContent.innerHTML = html;
    this.el.settingsOverlay.classList.remove('hidden');

    // Bidirectional sync: slider ↔ number input
    const sensSlider = document.getElementById('setting-sensitivity');
    const sensInput = document.getElementById('setting-sens-input');
    if (sensSlider && sensInput) {
      sensSlider.addEventListener('input', () => {
        sensInput.value = parseFloat(sensSlider.value).toFixed(2);
      });
      sensInput.addEventListener('input', () => {
        let v = parseFloat(sensInput.value);
        if (isNaN(v)) return;
        v = Math.max(0.01, Math.min(3.00, v));
        sensSlider.value = v;
      });
      sensInput.addEventListener('change', () => {
        let v = parseFloat(sensInput.value);
        if (isNaN(v)) v = curSens;
        v = Math.max(0.01, Math.min(3.00, v));
        sensInput.value = v.toFixed(2);
        sensSlider.value = v;
      });
    }
    this.el.settingsOverlay.classList.remove('hidden');

    // Save module ref for settings panel
    this._pendingModule = { mod, instance, presets, defs };
    this._currentPreset = 'medium';

    // Bind preset buttons
    const presetBtns = this.el.settingsContent.querySelectorAll('.diff-btn');
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        presetBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this._currentPreset = btn.dataset.preset;
        this._applyPreset(presets[this._currentPreset], defs);
      });
    });
  },

  _applyPreset(preset, defs) {
    defs.forEach((def) => {
      if (preset[def.key] !== undefined) {
        const el = this.el.settingsContent.querySelector(`[data-setting="${def.key}"]`);
        if (el) el.value = preset[def.key];
      }
    });
  },

  /**
   * Start a training module
   */
  startTraining(mod, instance, settings) {
    this.currentModule = mod;
    this.currentInstance = instance;

    // Switch to training view
    this.el.mainMenu.classList.add('hidden');
    this.el.trainingView.classList.remove('hidden');
    this.el.hudModuleName.textContent = mod.name;
    this.el.canvas.style.cursor = 'none';

    // Set up HUD
    this.el.hudStats.innerHTML = '';

    // Show current sensitivity in HUD
    document.getElementById('hud-sens-val').textContent = GameSettings.get().sensitivity.toFixed(2);

    // Handle completion
    instance._onComplete = (result) => this._showResult(result, mod);
    instance._onEscape = () => this._backToMenu();

    // Start
    instance.start(settings);
    this._updateHUDFromInstance();

    // Poll HUD updates
    this._hudInterval = setInterval(() => this._updateHUDFromInstance(), 100);
  },

  _updateHUDFromInstance() {
    if (!this.currentInstance) return;
    const inst = this.currentInstance;
    if (inst.updateHUD) inst.updateHUD(this.el.hudStats);
  },

  /**
   * Show result overlay
   */
  _showResult(result, mod) {
    clearInterval(this._hudInterval);
    this.el.canvas.style.cursor = 'default';

    // Save stats
    StatsManager.record(mod.id, result);

    const best = StatsManager.getBest(mod.id);

    this.el.resultTitle.textContent = '训练结束';
    let html = '<div class="result-stats">';
    for (const [key, label] of Object.entries(result.labels || {})) {
      const val = result[key];
      const isBest = best && best[key] === val;
      html += `<div class="result-stat${isBest ? ' best' : ''}">`;
      html += `<div class="stat-value">${val}${result.units?.[key] || ''}</div>`;
      html += `<div class="stat-label">${label}${isBest ? ' · 最佳' : ''}</div>`;
      html += '</div>';
    }
    html += '</div>';
    this.el.resultContent.innerHTML = html;
    this.el.resultOverlay.classList.remove('hidden');
  },

  /**
   * Go back to main menu from training
   */
  _backToMenu() {
    clearInterval(this._hudInterval);
    if (this.currentInstance && this.currentInstance.running) {
      this.currentInstance.stop();
    }
    this.currentModule = null;
    this.currentInstance = null;
    this.el.mainMenu.classList.remove('hidden');
    this.el.trainingView.classList.add('hidden');
    this.el.resultOverlay.classList.add('hidden');
    this.el.settingsOverlay.classList.add('hidden');
    this.el.canvas.style.cursor = 'default';
  },

  /**
   * Show stats panel
   */
  _showStats() {
    const mods = this.getModules();
    const activeMods = StatsManager.getActiveModules();
    let html = '';

    if (activeMods.length === 0) {
      html = '<p style="text-align:center;color:var(--text-muted);padding:20px;">暂无训练记录，快去练枪吧！</p>';
    } else {
      html = '<table class="stats-table"><thead><tr><th>模块</th><th>训练次数</th><th>最近训练</th></tr></thead><tbody>';

      mods.forEach((mod) => {
        const stats = StatsManager.getModule(mod.id);
        if (stats.totalPlays > 0) {
          const lastDate = stats.lastPlayed ? new Date(stats.lastPlayed).toLocaleDateString('zh-CN') : '-';
          html += `<tr>
            <td>${mod.name}</td>
            <td>${stats.totalPlays} 次</td>
            <td>${lastDate}</td>
          </tr>`;
        }
      });

      html += '</tbody></table>';
    }

    this.el.statsContent.innerHTML = html;
    this.el.statsOverlay.classList.remove('hidden');
  },

  /**
   * Bind global events
   */
  _bindEvents() {
    // Back button
    document.getElementById('btn-back').addEventListener('click', () => this._backToMenu());

    // Settings save
    document.getElementById('btn-settings-save').addEventListener('click', () => {
      const pending = this._pendingModule;
      if (!pending) return;

      // Collect settings from inputs
      const settings = { ...pending.presets[this._currentPreset] };
      pending.defs.forEach((def) => {
        const el = this.el.settingsContent.querySelector(`[data-setting="${def.key}"]`);
        if (el) {
          let val = el.value;
          if (def.type === 'range') val = Number(val);
          settings[def.key] = val;
        }
      });

      // Save sensitivity from settings panel
      const sensSlider = document.getElementById('setting-sensitivity');
      if (sensSlider) {
        const gs = GameSettings.get();
        gs.sensitivity = parseFloat(sensSlider.value);
        GameSettings.save(gs);
      }

      this.el.settingsOverlay.classList.add('hidden');
      this.startTraining(pending.mod, pending.instance, settings);
    });

    // Settings cancel
    document.getElementById('btn-settings-cancel').addEventListener('click', () => {
      this.el.settingsOverlay.classList.add('hidden');
      this._pendingModule = null;
    });

    // Result: retry
    document.getElementById('btn-retry').addEventListener('click', () => {
      this.el.resultOverlay.classList.add('hidden');
      // Re-open the same module settings
      if (this._pendingModule) {
        this._openSettings(this._pendingModule.mod);
      }
    });

    // Result: back to menu
    document.getElementById('btn-menu').addEventListener('click', () => {
      this._backToMenu();
    });

    // Training HUD gear button → crosshair settings
    document.getElementById('btn-settings').addEventListener('click', () => this._openCrosshairPanel());



    // Stats panel
    document.getElementById('btn-stats-panel').addEventListener('click', () => this._showStats());
    document.getElementById('btn-stats-close').addEventListener('click', () => {
      this.el.statsOverlay.classList.add('hidden');
    });
    document.getElementById('btn-stats-reset').addEventListener('click', () => {
      if (confirm('确定要清除所有训练统计数据吗？此操作不可撤销。')) {
        StatsManager.resetAll();
        this._showStats();
      }
    });

    // Crosshair panel
    this._initCrosshairPanel();

    // Window resize
    window.addEventListener('resize', () => {
      if (this.currentInstance) {
        this.currentInstance.resize();
      }
    });
  },

  /**
   * Open crosshair settings panel
   */
  _openCrosshairPanel() {
    this._syncCrosshairUI();
    this.el.crosshairOverlay.classList.remove('hidden');
  },

  /**
   * Sync UI controls to current crosshair settings
   */
  _syncCrosshairUI() {
    const cs = CrosshairSettings.get();
    const gs = GameSettings.get();
    document.getElementById('ch-size').value = cs.size;
    document.getElementById('ch-gap').value = cs.gap;
    document.getElementById('ch-thickness').value = cs.thickness;
    document.getElementById('ch-opacity').value = cs.opacity;
    document.getElementById('ch-outline').checked = cs.outline;
    document.getElementById('ch-center-dot').checked = cs.centerDot;
    document.getElementById('ch-sensitivity').value = gs.sensitivity;
    const sensInput = document.getElementById('ch-sens-input');
    if (sensInput) sensInput.value = gs.sensitivity.toFixed(2);
    document.getElementById('ch-raw-input').checked = gs.rawInput;
    this._updateChStyleUI(cs.style);
    this._updateChColorUI(cs.color);
  },

  _updateChStyleUI(activeStyle) {
    document.querySelectorAll('.ch-style-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.style === activeStyle);
    });
  },

  _updateChColorUI(activeColor) {
    document.querySelectorAll('.ch-color-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.color === activeColor);
    });
  },

  /**
   * Initialize crosshair settings panel UI
   */
  _initCrosshairPanel() {
    const cs = CrosshairSettings.get();

    // Style buttons
    const styleRow = document.getElementById('ch-styles');
    const styles = [
      { key: 'cross', label: '十字' },
      { key: 'crossdot', label: '十字+点' },
      { key: 'dot', label: '圆点' },
      { key: 'circle', label: '圆圈' },
      { key: 'crosscircle', label: '十字+圈' },
    ];
    styles.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'ch-style-btn';
      btn.dataset.style = s.key;
      btn.textContent = s.label;
      btn.addEventListener('click', () => {
        this._updateChStyleUI(s.key);
        this._applyCrosshairSettings();
      });
      styleRow.appendChild(btn);
    });

    // Color buttons
    const colorRow = document.getElementById('ch-colors');
    CrosshairSettings.colorPresets.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'ch-color-btn';
      btn.dataset.color = c.hex;
      btn.style.backgroundColor = c.hex;
      btn.title = c.name;
      btn.addEventListener('click', () => {
        this._updateChColorUI(c.hex);
        this._applyCrosshairSettings();
      });
      colorRow.appendChild(btn);
    });

    // Slider changes
    ['ch-size', 'ch-gap', 'ch-thickness', 'ch-opacity'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => this._applyCrosshairSettings());
    });

    // Sensitivity — bidirectional sync slider ↔ number input
    const chSensSlider = document.getElementById('ch-sensitivity');
    const chSensInput = document.getElementById('ch-sens-input');
    chSensSlider.addEventListener('input', () => {
      chSensInput.value = parseFloat(chSensSlider.value).toFixed(2);
      this._applyCrosshairSettings();
    });
    chSensInput.addEventListener('input', () => {
      let v = parseFloat(chSensInput.value);
      if (isNaN(v)) return;
      v = Math.max(0.01, Math.min(3.00, v));
      chSensSlider.value = v;
      this._applyCrosshairSettings();
    });
    chSensInput.addEventListener('change', () => {
      let v = parseFloat(chSensInput.value);
      if (isNaN(v)) { chSensInput.value = chSensSlider.value; return; }
      v = Math.max(0.01, Math.min(3.00, v));
      chSensInput.value = v.toFixed(2);
      chSensSlider.value = v;
      this._applyCrosshairSettings();
    });

    // Toggles
    document.getElementById('ch-outline').addEventListener('change', () => this._applyCrosshairSettings());
    document.getElementById('ch-center-dot').addEventListener('change', () => this._applyCrosshairSettings());
    document.getElementById('ch-raw-input').addEventListener('change', () => this._applyCrosshairSettings());

    // Save/Close/Reset
    document.getElementById('btn-ch-save').addEventListener('click', () => {
      this.el.crosshairOverlay.classList.add('hidden');
    });
    document.getElementById('btn-ch-close').addEventListener('click', () => {
      this.el.crosshairOverlay.classList.add('hidden');
    });
    document.getElementById('btn-ch-reset').addEventListener('click', () => {
      CrosshairSettings.reset();
      this._syncCrosshairUI();
    });

    // Initial UI state
    this._syncCrosshairUI();
  },

  /**
   * Quick adjust sensitivity from HUD buttons
   */
  _adjustSens(delta) {
    const gs = GameSettings.get();
    const newSens = Utils.clamp(+(gs.sensitivity + delta).toFixed(2), 0.01, 3.00);
    gs.sensitivity = newSens;
    GameSettings.save(gs);
    document.getElementById('hud-sens-val').textContent = newSens.toFixed(2);
  },

  /**
   * Read UI controls and save crosshair settings
   */
  _applyCrosshairSettings() {
    const settings = {
      style: document.querySelector('.ch-style-btn.active')?.dataset?.style || 'cross',
      color: document.querySelector('.ch-color-btn.active')?.dataset?.color || '#00e5a0',
      size: Number(document.getElementById('ch-size').value),
      gap: Number(document.getElementById('ch-gap').value),
      thickness: Number(document.getElementById('ch-thickness').value),
      opacity: Number(document.getElementById('ch-opacity').value),
      outline: document.getElementById('ch-outline').checked,
      centerDot: document.getElementById('ch-center-dot').checked,
    };
    CrosshairSettings.save(settings);

    // Save sensitivity + rawInput
    GameSettings.save({
      ...GameSettings.get(),
      sensitivity: Number(document.getElementById('ch-sensitivity').value),
      rawInput: document.getElementById('ch-raw-input').checked,
    });
  },
};

// Boot on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
