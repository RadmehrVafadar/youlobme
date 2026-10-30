const cat = document.getElementById('cat');
const picture = document.getElementById('picture');
const audio = document.getElementById('audio');
const music = document.getElementById('music');
const yes = document.getElementById('yes');
const no = document.getElementById('no');
const question = document.getElementById('question');
const again = document.getElementById('again');
const status = document.getElementById('status');
const musicVolume = document.getElementById('music-volume');
const voiceVolume = document.getElementById('voice-volume');
// A gain node allows the voice clips to exceed the media element's 100% limit.
const audioContext = new AudioContext();
const voiceGain = audioContext.createGain();
audioContext.createMediaElementSource(audio).connect(voiceGain);
voiceGain.connect(audioContext.destination);
let current = 1;
let replay;
let state = 'question';
let playback = 0;

function updateVolumes() {
  music.volume = Number(musicVolume.value) / 100;
  voiceGain.gain.value = state === 'question' ? Number(voiceVolume.value) / 100
    : state === 'sad' ? music.volume : 1;
  musicVolume.setAttribute('aria-valuetext', `${musicVolume.value}%`);
  voiceVolume.setAttribute('aria-valuetext', `${voiceVolume.value}%`);
}

for (const slider of [musicVolume, voiceVolume]) {
  slider.addEventListener('input', () => {
    updateVolumes();
    void audioContext.resume().catch(() => {});
    void playHappyMusic();
  });
}

async function playHappyMusic() {
  if (!music.paused || (state !== 'question' && state !== 'happy')) return;
  try {
    await music.play();
  } catch (error) {
    if (error.name !== 'NotAllowedError' && (state === 'question' || state === 'happy')) {
      status.textContent = 'Background music could not play. Reload to try again.';
      status.hidden = false;
    }
  }
}

function positionElements() {
  if (state !== 'question') return;
  const gap = 8;
  const bounds = {
    left: gap, top: gap, right: window.innerWidth - gap,
    bottom: window.innerHeight - document.getElementById('volume-controls').offsetHeight - gap * 3,
  };
  cat.style.left = `${gap + Math.random() * Math.max(0, bounds.right - gap - cat.offsetWidth)}px`;
  // Leave enough room for a row of buttons even on narrow screens.
  cat.style.top = `${gap + Math.random() * Math.max(0, bounds.bottom - gap * 2 - cat.offsetHeight - Math.max(yes.offsetHeight, no.offsetHeight))}px`;
  const occupied = [cat.getBoundingClientRect()];
  for (const button of [yes, no]) {
    let spaces = [bounds];
    for (const rect of occupied) {
      spaces = spaces.flatMap(space => {
        if (rect.right + gap <= space.left || rect.left - gap >= space.right ||
            rect.bottom + gap <= space.top || rect.top - gap >= space.bottom) return [space];
        return [
          { ...space, right: Math.min(space.right, rect.left - gap) },
          { ...space, left: Math.max(space.left, rect.right + gap) },
          { ...space, bottom: Math.min(space.bottom, rect.top - gap) },
          { ...space, top: Math.max(space.top, rect.bottom + gap) },
        ];
      }).filter(space => space.right - space.left >= button.offsetWidth && space.bottom - space.top >= button.offsetHeight);
    }
    const space = spaces[Math.floor(Math.random() * spaces.length)];
    button.style.left = `${space.left + Math.random() * (space.right - space.left - button.offsetWidth)}px`;
    button.style.top = `${space.top + Math.random() * (space.bottom - space.top - button.offsetHeight)}px`;
    occupied.push(button.getBoundingClientRect());
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
  updateVolumes();
  void audioContext.resume().catch(() => {});
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
    void playHappyMusic();
    return;
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
  void playHappyMusic();
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
  if (state === 'question' || state === 'happy') {
    music.pause();
    music.currentTime = 0;
    showEnding('hissing');
  }
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
  music.pause();
  music.currentTime = 0;
  void playHappyMusic();
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
updateVolumes();
void playAudio();
void playHappyMusic();
