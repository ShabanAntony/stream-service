import { fallbackStreams } from './data/fallbackStreams.js';

export const runtime = {
  source: 'fallback',
  error: '',
};

export const state = {
  dock: 'left',
  q: '',
  sort: 'online_desc',
  language: '',
  platform: '',
  age: '',
  focusMode: false,
  hoverSlot: null,
  targetSlot: 1,
  activeSlot: 1,
  slots: {
    1: null,
    2: null,
    3: null,
    4: null,
  },
};

let streams = [...fallbackStreams];

export function getStreams() {
  return streams;
}

export function setStreams(nextStreams, source = 'live') {
  streams = Array.isArray(nextStreams) ? nextStreams : [];
  runtime.source = source;
  runtime.error = '';
}

export function setFallbackStreams() {
  streams = [...fallbackStreams];
  runtime.source = 'fallback';
  runtime.error = '';
}

export function getStreamById(id) {
  return streams.find((s) => s.id === id) || null;
}

export function persist() {
  try {
    localStorage.setItem(
      'streamHubState',
      JSON.stringify({
        dock: state.dock,
        focusMode: state.focusMode,
        slots: state.slots,
        targetSlot: state.targetSlot,
        activeSlot: state.activeSlot,
      })
    );
  } catch {
    // ignore
  }
}

export function loadPersisted() {
  try {
    const saved = JSON.parse(localStorage.getItem('streamHubState') || 'null');
    if (!saved || typeof saved !== 'object') {
      return;
    }

    if (saved.dock === 'right' || saved.dock === 'left') {
      state.dock = saved.dock;
    }

    if (typeof saved.focusMode === 'boolean') {
      state.focusMode = saved.focusMode;
    }

    if (saved.slots && typeof saved.slots === 'object') {
      state.slots = {
        1: saved.slots['1'] || null,
        2: saved.slots['2'] || null,
        3: saved.slots['3'] || null,
        4: saved.slots['4'] || null,
      };
    }

    if (Number.isInteger(saved.targetSlot) && saved.targetSlot >= 1 && saved.targetSlot <= 4) {
      state.targetSlot = saved.targetSlot;
    }

    if (Number.isInteger(saved.activeSlot) && saved.activeSlot >= 1 && saved.activeSlot <= 4) {
      state.activeSlot = saved.activeSlot;
    }
  } catch {
    // ignore
  }
}
