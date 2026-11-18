import { createAudioPlayer, AudioPlayer } from 'expo-audio';

let _click:     AudioPlayer | null = null;
let _buzz:      AudioPlayer | null = null;
let _key:       AudioPlayer | null = null;
let _gameStart: AudioPlayer | null = null;
let _right:     AudioPlayer | null = null;
let _wrong:     AudioPlayer | null = null;
let _previous:  AudioPlayer | null = null;
let _loaded = false;

export function loadSounds() {
  if (_loaded) return;
  _loaded = true;
  try {
    _click = createAudioPlayer(require('../assets/sounds/press_button_UI.mp3'));
    _click.volume = 0.8;
  } catch {}
  try {
    _buzz = createAudioPlayer(require('../assets/sounds/buzz.mp3'));
    _buzz.volume = 1;
  } catch {}
  try {
    _key = createAudioPlayer(require('../assets/sounds/sound_keyboard.mp3'));
    _key.volume = 0.7;
  } catch {}
  try {
    _gameStart = createAudioPlayer(require('../assets/sounds/sound_GameStart.mp3'));
    _gameStart.volume = 1;
  } catch {}
  try {
    _right = createAudioPlayer(require('../assets/sounds/Right_answer.mp3'));
    _right.volume = 1;
  } catch {}
  try {
    _wrong = createAudioPlayer(require('../assets/sounds/Wrong_answer.mp3'));
    _wrong.volume = 1;
  } catch {}
  try {
    _previous = createAudioPlayer(require('../assets/sounds/sound_previous.mp3'));
    _previous.volume = 0.8;
  } catch {}
}

export function playClick() {
  try { _click?.seekTo(0); _click?.play(); } catch {}
}

export function playBuzz() {
  try { _buzz?.seekTo(0); _buzz?.play(); } catch {}
}

export function playKey() {
  try { _key?.seekTo(0); _key?.play(); } catch {}
}

export function playGameStart() {
  try { _gameStart?.seekTo(0); _gameStart?.play(); } catch {}
}

export function playRight() {
  try { _right?.seekTo(0); _right?.play(); } catch {}
}

export function playWrong() {
  try { _wrong?.seekTo(0); _wrong?.play(); } catch {}
}

export function playPrevious() {
  try { _previous?.seekTo(0); _previous?.play(); } catch {}
}

export function unloadSounds() {
  _click?.remove();
  _buzz?.remove();
  _key?.remove();
  _gameStart?.remove();
  _right?.remove();
  _wrong?.remove();
  _previous?.remove();
  _click     = null;
  _buzz      = null;
  _key       = null;
  _gameStart = null;
  _right     = null;
  _wrong     = null;
  _previous  = null;
  _loaded = false;
}
