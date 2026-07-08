const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadAppContext() {
  const store = new Map();
  const contexts = [];

  class FakeParam {
    constructor(value = 0) {
      this.value = value;
      this.events = [];
    }

    setValueAtTime(value, time) {
      this.events.push(['set', value, time]);
      this.value = value;
    }

    linearRampToValueAtTime(value, time) {
      this.events.push(['linear', value, time]);
      this.value = value;
    }

    exponentialRampToValueAtTime(value, time) {
      this.events.push(['exp', value, time]);
      this.value = value;
    }
  }

  class FakeOscillator {
    constructor(ctx) {
      this.ctx = ctx;
      this.type = 'sine';
      this.frequency = new FakeParam(440);
      this.starts = [];
      this.stops = [];
      ctx.oscillators.push(this);
    }

    connect() {}

    start(time) {
      this.starts.push(time);
    }

    stop(time) {
      this.stops.push(time);
    }
  }

  class FakeGain {
    constructor(ctx) {
      this.ctx = ctx;
      this.gain = new FakeParam(1);
      ctx.gains.push(this);
    }

    connect() {}
  }

  class FakeAudioContext {
    constructor() {
      this.currentTime = 10;
      this.destination = {};
      this.oscillators = [];
      this.gains = [];
      contexts.push(this);
    }

    createOscillator() {
      return new FakeOscillator(this);
    }

    createGain() {
      return new FakeGain(this);
    }
  }

  const context = {
    console,
    localStorage: {
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        store.set(key, String(value));
      },
      removeItem(key) {
        store.delete(key);
      },
    },
    window: { AudioContext: FakeAudioContext },
  };

  vm.createContext(context);
  for (const file of ['js/settings.js', 'js/utils.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
  vm.runInContext('globalThis.__testExports = { GameSettings, Utils };', context);

  return { ...context.__testExports, contexts };
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test('hit sound plays a layered kill-confirm cue', () => {
  const { GameSettings, Utils, contexts } = loadAppContext();
  GameSettings.save({ ...GameSettings.get(), soundEnabled: true, soundVolume: 0.5 });

  Utils.playHit();

  assert.strictEqual(contexts.length, 1);
  assert.ok(contexts[0].oscillators.length >= 3);
  assert.deepStrictEqual(
    contexts[0].oscillators.map((osc) => osc.type),
    ['triangle', 'square', 'sine']
  );
});

test('hit sound respects the global sound toggle', () => {
  const { GameSettings, Utils, contexts } = loadAppContext();
  GameSettings.save({ ...GameSettings.get(), soundEnabled: false });

  Utils.playHit();

  assert.strictEqual(contexts.length, 0);
});
