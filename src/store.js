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
  followedChannels: [],
  followedFilter: false,
  categories: [],
  categoriesLoading: false,
  categoriesError: '',
  categoriesTagFilters: [],
  categoriesSort: 'viewer_desc',
  categoryStreams: [],
  categoryStreamsLoading: false,
  categoryStreamsError: '',
  multiviewContext: {
    categoryId: null,
    categoryName: '',
    platform: 'twitch',
  },
  routePath: '/',
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

export function setFollowedChannels(channels) {
  state.followedChannels = Array.isArray(channels) ? [...channels] : [];
}

export function setFollowedFilter(active) {
  state.followedFilter = Boolean(active);
}

export function setCategories(categories) {
  state.categories = Array.isArray(categories) ? [...categories] : [];
}

export function setCategoriesLoading(loading) {
  state.categoriesLoading = Boolean(loading);
  if (loading) {
    state.categoriesError = '';
  }
}

export function setCategoriesError(message) {
  state.categoriesError =
    message === '' ? '' : String(message || 'Failed to load categories');
  state.categoriesLoading = false;
}

export function setCategoryStreams(streams) {
  state.categoryStreams = Array.isArray(streams) ? [...streams] : [];
}

export function setCategoryStreamsLoading(loading) {
  state.categoryStreamsLoading = Boolean(loading);
  if (loading) {
    state.categoryStreamsError = '';
  }
}

export function setCategoryStreamsError(message) {
  state.categoryStreamsError =
    message === '' ? '' : String(message || 'Failed to load category streams');
  state.categoryStreamsLoading = false;
}

export function setMultiviewContext(context) {
  const next = context && typeof context === 'object' ? context : {};
  state.multiviewContext = {
    categoryId: next.categoryId ? String(next.categoryId) : null,
    categoryName: next.categoryName ? String(next.categoryName) : '',
    platform: 'twitch',
  };
}

export function toggleCategoriesTagFilter(tagId) {
  const existing = state.categoriesTagFilters.includes(tagId);
  if (existing) {
    state.categoriesTagFilters = state.categoriesTagFilters.filter((id) => id !== tagId);
  } else {
    state.categoriesTagFilters = [...state.categoriesTagFilters, tagId];
  }
}

export function clearCategoriesTagFilters() {
  state.categoriesTagFilters = [];
}

export function setCategoriesSort(sort) {
  state.categoriesSort = sort === 'viewer_asc' ? 'viewer_asc' : 'viewer_desc';
}

export function setRoutePath(path) {
  state.routePath = typeof path === 'string' ? path : '/';
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
        followedFilter: state.followedFilter,
        categoriesTagFilters: state.categoriesTagFilters,
        categoriesSort: state.categoriesSort,
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

    const hasAnySlot = Object.values(state.slots).some(Boolean);
    if (!hasAnySlot) {
      state.targetSlot = 1;
      state.activeSlot = 1;
    }

    if (typeof saved.followedFilter === 'boolean') {
      state.followedFilter = saved.followedFilter;
    }

    if (Array.isArray(saved.categoriesTagFilters)) {
      state.categoriesTagFilters = [...saved.categoriesTagFilters];
    }

    if (saved.categoriesSort === 'viewer_asc' || saved.categoriesSort === 'viewer_desc') {
      state.categoriesSort = saved.categoriesSort;
    }
  } catch {
    // ignore
  }
}
