const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

function loadAppContext() {
  const store = new Map();
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
    window: {},
    document: {
      pointerLockElement: null,
      addEventListener() {},
      removeEventListener() {},
      exitPointerLock() {},
    },
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame() {},
  };

  vm.createContext(context);
  for (const file of ['js/settings.js', 'js/utils.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
  vm.runInContext(
    'globalThis.__testExports = { GameSettings, TrainingModule, Utils };',
    context
  );
  return context.__testExports;
}

function createCanvas() {
  const pointerLockCalls = [];
  return {
    offsetWidth: 800,
    offsetHeight: 600,
    pointerLockCalls,
    addEventListener() {},
    removeEventListener() {},
    requestPointerLock(options) {
      pointerLockCalls.push(options);
    },
    getBoundingClientRect() {
      return { left: 10, top: 20 };
    },
    getContext() {
      return {};
    },
  };
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

const { GameSettings, TrainingModule } = loadAppContext();

test('normalizes global sensitivity to Valorant-style range', () => {
  assert.strictEqual(GameSettings.normalizeSensitivity(0), 0.01);
  assert.strictEqual(GameSettings.normalizeSensitivity(9), 3);
  assert.strictEqual(GameSettings.normalizeSensitivity('1.234'), 1.23);
  assert.strictEqual(GameSettings.normalizeSensitivity('bad'), 0.5);
});

test('applies sensitivity directly to movement deltas', () => {
  assert.strictEqual(GameSettings.applySensitivity(20, 0.5), 10);
  assert.strictEqual(GameSettings.applySensitivity(-12, 1.25), -15);
  assert.strictEqual(GameSettings.applySensitivity(8, 'bad'), 4);
});

test('pointer-lock movement updates virtual cursor without smoothing or inertia', () => {
  GameSettings.save({ ...GameSettings.get(), sensitivity: 0.5 });
  const module = new TrainingModule(createCanvas(), {});
  module._pointerLocked = true;
  module._virtX = 400;
  module._virtY = 300;

  module._onMouseMove({ movementX: 20, movementY: -10 });
  assert.strictEqual(module.mouseX, 410);
  assert.strictEqual(module.mouseY, 295);

  module._onMouseMove({ movementX: 0, movementY: 0 });
  assert.strictEqual(module.mouseX, 410);
  assert.strictEqual(module.mouseY, 295);
});

test('absolute fallback tracks the browser cursor one-to-one', () => {
  const module = new TrainingModule(createCanvas(), {});
  module._pointerLocked = false;

  module._onMouseMove({ clientX: 250, clientY: 140 });
  assert.strictEqual(module.mouseX, 240);
  assert.strictEqual(module.mouseY, 120);
});

test('raw input requests unadjusted pointer-lock movement when enabled', () => {
  GameSettings.save({ ...GameSettings.get(), rawInput: true });
  const canvas = createCanvas();
  const module = new TrainingModule(canvas, {});

  module._requestPointerLock();
  assert.strictEqual(canvas.pointerLockCalls[0].unadjustedMovement, true);
});
