import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');

async function setup(play = () => Promise.resolve(), random, autoStart = true) {
  let randomCalls = 0;
  random ??= () => (++randomCalls % 100) / 100;
  const elements = {};
  for (const id of ['cat', 'picture', 'audio', 'music', 'status', 'yes', 'no', 'question', 'again', 'start', 'music-volume', 'voice-volume', 'volume-controls']) {
    elements[id] = {
      hidden: ['status', 'again', 'question', 'yes', 'no'].includes(id),
      style: {}, offsetWidth: 300, offsetHeight: 332, currentTime: 0,
      listeners: {},
      addEventListener(event, callback) { this.listeners[event] = callback; },
      setAttribute(name, value) { this[name] = value; },
      getBoundingClientRect() {
        const left = parseFloat(this.style.left) || 0;
        const top = parseFloat(this.style.top) || 0;
        return { left, top, right: left + this.offsetWidth, bottom: top + this.offsetHeight };
      },
    };
  }
  for (const id of ['yes', 'no']) {
    elements[id].offsetWidth = 48;
    elements[id].offsetHeight = 32;
  }
  elements['volume-controls'].offsetHeight = 48;
  elements['music-volume'].value = '85';
  elements['voice-volume'].value = '110';
  const gain = { gain: { value: 1 }, connect() {} };
  let plays = 0;
  let pauses = 0;
  const timers = new Map();
  const window = {
    innerWidth: 1280, innerHeight: 720, listeners: {},
    addEventListener(event, callback) { this.listeners[event] = callback; },
  };
  elements.audio.play = () => { plays++; return play(); };
  elements.audio.pause = () => { pauses++; };
  let musicPlays = 0;
  elements.music.paused = true;
  elements.music.play = () => { musicPlays++; elements.music.paused = false; return Promise.resolve(); };
  elements.music.pause = () => { elements.music.paused = true; };
  vm.runInNewContext(source, {
    AudioContext: class {
      createGain() { return gain; }
      createMediaElementSource() { return { connect() {} }; }
      resume() { return Promise.resolve(); }
    },
    document: { getElementById: (id) => elements[id] }, window,
    Math: { max: Math.max, min: Math.min, floor: Math.floor, random },
    setTimeout: (callback, delay) => { timers.set(callback, delay); return callback; },
    clearTimeout: (id) => timers.delete(id),
  });
  if (autoStart) elements.start.listeners.click();
  pauses = 0;
  await new Promise(setImmediate);
  return { elements, window, timers, gain, plays: () => plays, pauses: () => pauses, musicPlays: () => musicPlays };
}

test('opening screen waits for Start before questions and first voice clip', async () => {
  const app = await setup(undefined, undefined, false);
  assert.equal(app.plays(), 0);
  assert.equal(app.elements.start.hidden, false);
  assert.equal(app.elements.yes.hidden, true);
  assert.equal(app.elements.no.hidden, true);
  assert.equal(app.elements.question.hidden, true);
  app.elements.yes.listeners.click();
  assert.equal(app.plays(), 0);
  app.elements.start.listeners.click();
  assert.equal(app.plays(), 1);
  assert.equal(app.elements.start.hidden, true);
  assert.equal(app.elements.yes.hidden, false);
  assert.equal(app.elements.no.hidden, false);
  assert.equal(app.elements.question.hidden, false);
  assert.equal(app.elements.picture.src, 'src/assets/cats/cat1.png');
  assert.equal(app.elements.audio.src, 'src/assets/lobme_mp4/youlobme1.m4a');
  await access(new URL('../src/assets/cats/cat_start.png', import.meta.url));
});

test('volume defaults lower music to 85% and boost voices to 110%', async () => {
  const app = await setup();
  assert.equal(app.elements.music.volume, 0.85);
  assert.equal(app.gain.gain.value, 1.1);
  app.elements.no.listeners.click();
  assert.equal(app.gain.gain.value, 1);
  app.elements.audio.listeners.ended();
  assert.equal(app.gain.gain.value, 0.85);
  app.elements.again.listeners.click();
  assert.equal(app.gain.gain.value, 1.1);
});

test('buttons never overlap the cat or each other even with repeated identical random values', async () => {
  for (const random of [() => 0, () => 0.5, () => 0.999]) {
    const app = await setup(undefined, random);
    const check = () => {
      const rects = ['cat', 'yes', 'no'].map(id => app.elements[id].getBoundingClientRect());
      for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i], b = rects[j];
          assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
        }
      }
    };
    check();
    for (let i = 0; i < 4; i++) {
      app.elements.yes.listeners.click();
      check();
    }
    for (const [width, height] of [[375, 667], [320, 480], [667, 375]]) {
      app.window.innerWidth = width;
      app.window.innerHeight = height;
      app.elements.cat.offsetWidth = Math.min(300, width - 16);
      app.elements.cat.offsetHeight = Math.min(300, height - 220) + 34;
      for (let i = 0; i < 20; i++) {
        app.window.listeners.resize();
        check();
        for (const id of ['cat', 'yes', 'no']) {
          const rect = app.elements[id].getBoundingClientRect();
          assert.ok(rect.left >= 8 && rect.right <= width - 8);
          assert.ok(rect.top >= 8 && rect.bottom <= height - 72);
        }
      }
    }
  }
});

test('volume sliders adjust voices and both background tracks independently', async () => {
  const app = await setup();
  app.elements['music-volume'].value = '40';
  app.elements['music-volume'].listeners.input();
  assert.equal(app.elements.music.volume, 0.4);
  assert.equal(app.gain.gain.value, 1.1);
  app.elements['voice-volume'].value = '125';
  app.elements['voice-volume'].listeners.input();
  assert.equal(app.gain.gain.value, 1.25);
  app.elements.no.listeners.click();
  app.elements.audio.listeners.ended();
  assert.equal(app.gain.gain.value, 0.4);
  app.elements['music-volume'].value = '0';
  app.elements['music-volume'].listeners.input();
  assert.equal(app.gain.gain.value, 0);
});

test('happy background music plays alongside questions and stops before the hiss', async () => {
  const app = await setup();
  assert.ok(app.musicPlays() >= 1);
  assert.equal(app.elements.music.paused, false);
  app.elements.music.currentTime = 12;
  app.elements.yes.listeners.click();
  assert.equal(app.elements.music.currentTime, 12);
  assert.equal(app.elements.music.paused, false);
  app.elements.no.listeners.click();
  assert.equal(app.elements.music.paused, true);
  app.elements.audio.listeners.ended();
  assert.equal(app.elements.music.paused, true);
});

test('starts audio immediately and waits five seconds after it ends', async () => {
  const app = await setup();
  assert.equal(app.plays(), 1);
  app.elements.audio.listeners.ended();
  assert.equal(app.plays(), 1);
  const [[replay, delay]] = app.timers;
  assert.equal(delay, 5000);
  replay();
  assert.equal(app.plays(), 2);
});

test('Yes cancels replay and advances matching pairs through cat 5', async () => {
  const app = await setup();
  app.elements.audio.listeners.ended();
  for (let number = 2; number <= 5; number++) {
    app.elements.yes.listeners.click();
    assert.equal(app.elements.picture.src, `src/assets/cats/cat${number}.png`);
    assert.equal(app.elements.audio.src, `src/assets/lobme_mp4/youlobme${number}.m4a`);
    assert.equal(app.timers.size, 0);
  }
  app.elements.yes.listeners.click();
  assert.equal(app.elements.cat.hidden, false);
  assert.equal(app.elements.yes.hidden, true);
  assert.equal(app.elements.no.hidden, true);
  assert.equal(app.elements.question.hidden, true);
  assert.equal(app.elements.picture.src, 'src/assets/cats/cat_jumping.gif');
  assert.equal(app.elements.music.paused, false);
  assert.equal(app.elements.again.hidden, false);
  assert.equal(app.elements.again.textContent, 'again <3');
  assert.equal(app.plays(), 5);
});

test('No plays the hiss with the angry cat, then sad GIF and looping music', async () => {
  const app = await setup();
  app.elements.audio.listeners.ended();
  app.elements.no.listeners.click();
  assert.equal(app.elements.cat.hidden, false);
  assert.equal(app.elements.question.hidden, true);
  assert.equal(app.pauses(), 1);
  assert.equal(app.timers.size, 0);
  assert.equal(app.elements.picture.src, 'src/assets/cats/cat_angry.png');
  assert.equal(app.elements.audio.src, 'src/assets/lobme_mp4/hissing.m4a');
  assert.equal(app.elements.audio.loop, false);
  assert.equal(app.elements.again.hidden, true);
  app.elements.audio.listeners.ended();
  assert.equal(app.elements.picture.src, 'src/assets/cats/cat_sad.gif');
  assert.equal(app.elements.audio.src, 'src/assets/backgroundMusic/cat_sad_backgrondmusic.m4a');
  assert.equal(app.elements.audio.loop, true);
  assert.equal(app.elements.again.textContent, 'GO AGAIN !!!!!');
  assert.equal(app.elements.again.hidden, false);
  app.elements.audio.listeners.ended();
  assert.equal(app.timers.size, 0);
});

test('blocked autoplay keeps only Yes and No and Yes plays the next clip', async () => {
  let blocked = true;
  const app = await setup(() => blocked
    ? Promise.reject({ name: 'NotAllowedError' }) : Promise.resolve());
  assert.equal(app.elements.status.hidden, true);
  assert.equal(app.elements.yes.hidden, false);
  assert.equal(app.elements.no.hidden, false);
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /Start sound/);
  assert.equal((html.match(/<button /g) ?? []).length, 4);
  blocked = false;
  app.elements.yes.listeners.click();
  assert.equal(app.elements.audio.src, 'src/assets/lobme_mp4/youlobme2.m4a');
  assert.equal(app.plays(), 2);
});

test('stale playback failures do not show controls after No', async () => {
  let reject;
  const app = await setup(() => new Promise((_, fail) => { reject = fail; }));
  app.elements.no.listeners.click();
  reject({ name: 'NotAllowedError' });
  await new Promise(setImmediate);
  assert.equal(app.elements.status.hidden, true);
});

test('cat and buttons get independent random positions within the viewport', async () => {
  const { elements, window } = await setup();
  const positions = new Set();
  for (const id of ['cat', 'yes', 'no']) {
    const element = elements[id];
    const x = parseFloat(element.style.left);
    const y = parseFloat(element.style.top);
    assert.ok(x >= 8 && x + element.offsetWidth <= window.innerWidth - 8);
    assert.ok(y >= 8 && y + element.offsetHeight <= window.innerHeight - 8);
    positions.add(`${x},${y}`);
  }
  assert.equal(positions.size, 3);
  assert.equal(elements.question.style.left, undefined);
  assert.equal(elements.question.style.top, undefined);
});

test('all five cat and audio files exist', async () => {
  for (let number = 1; number <= 5; number++) {
    await access(new URL(`../src/assets/cats/cat${number}.png`, import.meta.url));
    await access(new URL(`../src/assets/lobme_mp4/youlobme${number}.m4a`, import.meta.url));
  }
  for (const path of ['cats/cat_angry.png', 'cats/cat_jumping.gif', 'cats/cat_sad.gif',
    'lobme_mp4/hissing.m4a', 'backgroundMusic/cat_happy_backgroundmusic.mp3',
    'backgroundMusic/cat_sad_backgrondmusic.m4a']) {
    await access(new URL(`../src/assets/${path}`, import.meta.url));
  }
});

test('both ending buttons stop music and restart all five questions', async () => {
  for (const ending of ['happy', 'sad']) {
    const app = await setup();
    if (ending === 'happy') {
      for (let i = 0; i < 5; i++) app.elements.yes.listeners.click();
    } else {
      app.elements.no.listeners.click();
      app.elements.audio.listeners.ended();
    }
    assert.equal(app.elements.cat.className, 'ending');
    const pauses = app.pauses();
    app.elements.again.listeners.click();
    assert.equal(app.pauses(), pauses + 1);
    assert.equal(app.elements.audio.loop, false);
    assert.equal(app.elements.audio.src, 'src/assets/lobme_mp4/youlobme1.m4a');
    assert.equal(app.elements.picture.src, 'src/assets/cats/cat1.png');
    assert.equal(app.elements.cat.className, '');
    assert.equal(app.elements.question.hidden, false);
    assert.equal(app.elements.yes.hidden, false);
    assert.equal(app.elements.no.hidden, false);
    assert.equal(app.elements.again.hidden, true);
    assert.equal(app.elements.music.paused, false);
    assert.equal(app.elements.music.currentTime, 0);
    app.elements.yes.listeners.click();
    assert.equal(app.elements.picture.src, 'src/assets/cats/cat2.png');
  }
});

test('No interrupts happy music and plays hiss without looping it', async () => {
  const app = await setup();
  for (let i = 0; i < 5; i++) app.elements.yes.listeners.click();
  const pauses = app.pauses();
  app.elements.no.listeners.click();
  assert.equal(app.pauses(), pauses + 1);
  assert.equal(app.elements.audio.src, 'src/assets/lobme_mp4/hissing.m4a');
  assert.equal(app.elements.audio.loop, false);
  app.elements.audio.listeners.ended();
  assert.equal(app.elements.audio.src, 'src/assets/backgroundMusic/cat_sad_backgrondmusic.m4a');
});

test('unavailable hiss still reaches the sad ending', async () => {
  const app = await setup();
  app.elements.no.listeners.click();
  app.elements.audio.listeners.error();
  assert.equal(app.elements.picture.src, 'src/assets/cats/cat_sad.gif');
  assert.equal(app.elements.again.hidden, false);
  assert.equal(app.elements.audio.loop, true);
});
