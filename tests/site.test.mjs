import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../script.js', import.meta.url), 'utf8');

async function setup(play = () => Promise.resolve()) {
  const elements = {};
  for (const id of ['cat', 'picture', 'audio', 'status', 'yes', 'no', 'question', 'again']) {
    elements[id] = {
      hidden: ['status', 'again'].includes(id),
      style: {}, offsetWidth: 300, offsetHeight: 332, currentTime: 0,
      listeners: {},
      addEventListener(event, callback) { this.listeners[event] = callback; },
    };
  }
  let plays = 0;
  let randomCalls = 0;
  let pauses = 0;
  const timers = new Map();
  const window = { innerWidth: 1280, innerHeight: 720, addEventListener() {} };
  elements.audio.play = () => { plays++; return play(); };
  elements.audio.pause = () => { pauses++; };
  vm.runInNewContext(source, {
    document: { getElementById: (id) => elements[id] }, window,
    Math: { max: Math.max, random: () => (++randomCalls) / 100 },
    setTimeout: (callback, delay) => { timers.set(callback, delay); return callback; },
    clearTimeout: (id) => timers.delete(id),
  });
  await new Promise(setImmediate);
  return { elements, window, timers, plays: () => plays, pauses: () => pauses };
}

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
  assert.equal(app.elements.audio.src, 'src/assets/backgroundMusic/cat_happy_backgroundmusic.mp3');
  assert.equal(app.elements.audio.loop, true);
  assert.equal(app.elements.again.hidden, false);
  assert.equal(app.elements.again.textContent, 'again');
  assert.equal(app.plays(), 6);
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
  assert.equal(app.elements.again.textContent, 'GO AGAIN');
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
  assert.doesNotMatch(html, /Start sound|id="start"/);
  assert.equal((html.match(/<button /g) ?? []).length, 3);
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
