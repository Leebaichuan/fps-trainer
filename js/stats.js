// ========== FPS Aim Trainer - Statistics Manager ==========

const StatsManager = {
  STORAGE_KEY: 'fps-trainer-stats',

  /**
   * Get all stats from localStorage
   */
  getAll() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  },

  /**
   * Save all stats to localStorage
   */
  saveAll(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save stats:', e);
    }
  },

  /**
   * Get stats for a specific module
   */
  getModule(moduleId) {
    const all = this.getAll();
    return all[moduleId] || { best: null, history: [], totalPlays: 0 };
  },

  /**
   * Record a training result
   * @param {string} moduleId - e.g. 'reaction', 'clicking'
   * @param {object} result - training results
   */
  record(moduleId, result) {
    const all = this.getAll();
    if (!all[moduleId]) {
      all[moduleId] = { best: null, history: [], totalPlays: 0 };
    }

    const mod = all[moduleId];
    mod.totalPlays++;
    mod.lastPlayed = Date.now();

    const entry = {
      date: Date.now(),
      ...result,
    };
    mod.history.push(entry);

    // Keep only last 50 sessions
    if (mod.history.length > 50) {
      mod.history = mod.history.slice(-50);
    }

    // Update best score (module-specific scoring)
    this._updateBest(mod, entry);

    this.saveAll(all);
  },

  /**
   * Update best record for a module
   */
  _updateBest(mod, entry) {
    // Each module defines its own "score" key for ranking
    const scoreKeys = {
      reaction: 'avgReaction',   // lower is better
      clicking: 'accuracy',       // higher is better
      tracking: 'accuracy',       // higher is better
      switching: 'hits',          // higher is better
      precision: 'accuracy',      // higher is better
      gridshot: 'hits',           // higher is better
    };

    // Only update best if we know the module's score key
    // Module-specific records handle it per entry
    mod.best = entry;
  },

  /**
   * Get best score for a module (returns entry object or null)
   */
  getBest(moduleId) {
    return this.getModule(moduleId).best;
  },

  /**
   * Get recent history for a module
   * @param {number} n - number of recent entries
   */
  getRecent(moduleId, n = 10) {
    const mod = this.getModule(moduleId);
    return mod.history.slice(-n).reverse();
  },

  /**
   * Get all modules that have data
   */
  getActiveModules() {
    const all = this.getAll();
    return Object.keys(all).filter(k => all[k].history && all[k].history.length > 0);
  },

  /**
   * Reset all stats
   */
  resetAll() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  /**
   * Reset stats for a specific module
   */
  resetModule(moduleId) {
    const all = this.getAll();
    delete all[moduleId];
    this.saveAll(all);
  },
};
