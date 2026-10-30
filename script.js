const cat = document.getElementById('cat');
const picture = document.getElementById('picture');
const audio = document.getElementById('audio');
const yes = document.getElementById('yes');
const no = document.getElementById('no');
const question = document.getElementById('question');
const again = document.getElementById('again');
const status = document.getElementById('status');
let current = 1;
let replay;
let state = 'question';
let playback = 0;

function positionElements() {
  if (state !== 'question') return;
  const margin = 8;
  for (const element of [cat, yes, no]) {
    const width = Math.max(0, window.innerWidth - element.offsetWidth - margin * 2);
    const height = Math.max(0, window.innerHeight - element.offsetHeight - margin * 2);
    element.style.left = `${margin + Math.random() * width}px`;
    element.style.top = `${margin + Math.random() * height}px`;
  }
}

function stopAudio() {
  playback++;
  clearTimeout(replay);
  audio.pause();
  audio.currentTime = 0;
}

async function playAudio() {
  const attempt = ++playback;
  status.hidden = true;
  try {
    await audio.play();
  } catch (error) {
    // An earlier play request can reject after Yes or No changes the pair.
    if (attempt !== playback) return;
    if (state === 'hissing') {
      showEnding('sad');
      return;
    }
    if (error.name !== 'NotAllowedError') {
      status.textContent = 'Audio could not play. Reload to try again.';
      status.hidden = false;
      positionElements();
    }
  }
}

function showEnding(ending) {
  stopAudio();
  state = ending;
  cat.className = 'ending';
  cat.style.left = '';
  cat.style.top = '';
  yes.hidden = true;
  no.hidden = true;
  question.hidden = true;
  again.hidden = ending === 'hissing';
  audio.loop = ending !== 'hissing';
  if (ending === 'hissing') {
    picture.src = 'src/assets/cats/cat_angry.png';
    picture.alt = 'Angry cat';
    audio.src = 'src/assets/lobme_mp4/hissing.m4a';
  } else if (ending === 'happy') {
    picture.src = 'src/assets/cats/cat_jumping.gif';
    picture.alt = 'Happy jumping cat';
    again.textContent = 'again';
    audio.src = 'src/assets/backgroundMusic/cat_happy_backgroundmusic.mp3';
  } else {
    picture.src = 'src/assets/cats/cat_sad.gif';
    picture.alt = 'Sad cat';
    again.textContent = 'GO AGAIN';
    audio.src = 'src/assets/backgroundMusic/cat_sad_backgrondmusic.m4a';
  }
  void playAudio();
}

yes.addEventListener('click', () => {
  if (state !== 'question') return;
  if (current === 5) {
    showEnding('happy');
    return;
  }
  stopAudio();
  current++;
  picture.src = `src/assets/cats/cat${current}.png`;
  picture.alt = `Cat ${current}`;
  audio.src = `src/assets/lobme_mp4/youlobme${current}.m4a`;
  positionElements();
  void playAudio();
});

no.addEventListener('click', () => {
  if (state === 'question' || state === 'happy') showEnding('hissing');
});
again.addEventListener('click', () => {
  stopAudio();
  state = 'question';
  current = 1;
  cat.className = '';
  question.hidden = false;
  yes.hidden = false;
  no.hidden = false;
  again.hidden = true;
  picture.src = 'src/assets/cats/cat1.png';
  picture.alt = 'Cat 1';
  audio.loop = false;
  audio.src = 'src/assets/lobme_mp4/youlobme1.m4a';
  positionElements();
  void playAudio();
});
audio.addEventListener('ended', () => {
  clearTimeout(replay);
  if (state === 'hissing') showEnding('sad');
  else if (state === 'question') replay = setTimeout(() => void playAudio(), 5000);
});
audio.addEventListener('error', () => {
  if (state === 'hissing') showEnding('sad');
});
window.addEventListener('resize', positionElements);
positionElements();
void playAudio();
