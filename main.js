const kickStreams = [
  {
    id: 'kick-trainwreckstv',
    platform: 'kick',
    channel: 'trainwreckstv',
    title: 'Trainwreckstv',
    category: 'Just Chatting',
    language: 'en',
    region: 'NA',
    viewerCount: 8200,
    createdAt: '2023-01-10',
    url: 'https://kick.com/trainwreckstv',
  },
  {
    id: 'kick-xqc',
    platform: 'kick',
    channel: 'xqc',
    title: 'xQc',
    category: 'Overwatch 2',
    language: 'en',
    region: 'NA',
    viewerCount: 17800,
    createdAt: '2014-12-01',
    url: 'https://kick.com/xqc',
  },
];

const preferredGameName = 'Dota 2';

// Used when the API proxy isn't running / configured yet.
const fallbackStreams = [
  {
    id: 'twitch-alohadancetv',
    platform: 'twitch',
    channel: 'alohadancetv',
    title: 'alohadancetv',
    category: 'Unknown',
    language: 'ru',
    region: null,
    viewerCount: 0,
    createdAt: null,
    url: 'https://www.twitch.tv/alohadancetv',
  },
  {
    id: 'twitch-admiralbulldog',
    platform: 'twitch',
    channel: 'admiralbulldog',
    title: 'admiralbulldog',
    category: 'Unknown',
    language: 'en',
    region: null,
    viewerCount: 0,
    createdAt: null,
    url: 'https://www.twitch.tv/admiralbulldog',
  },
  {
    id: 'twitch-iltw1',
    platform: 'twitch',
    channel: 'iltw1',
    title: 'iltw1',
    category: 'Unknown',
    language: 'ru',
    region: null,
    viewerCount: 0,
    createdAt: null,
    url: 'https://www.twitch.tv/iltw1',
  },
  {
    id: 'twitch-dnmdota',
    platform: 'twitch',
    channel: 'dnmdota',
    title: 'dnmdota',
    category: 'Unknown',
    language: 'ru',
    region: null,
    viewerCount: 0,
    createdAt: null,
    url: 'https://www.twitch.tv/dnmdota',
  },
  ...kickStreams,
];

let streams = [...fallbackStreams];

const runtime = {
  source: 'fallback',
  error: '',
};

const page = document.querySelector('.js-page');
const dockButtons = document.querySelectorAll('.js-dock-btn');
const searchInput = document.querySelector('.js-search-input');
const listEl = document.querySelector('.js-stream-list');
const resultsMetaEl = document.querySelector('.js-results-meta');
const sortButtons = document.querySelectorAll('.js-sort-btn');
const ageButtons = document.querySelectorAll('.js-age-btn');
const languageSelect = document.querySelector('.js-language-select');
const platformSelect = document.querySelector('.js-platform-select');
const slotButtons = document.querySelectorAll('.js-slot-btn');
const slotEls = document.querySelectorAll('.js-slot');

const state = {
  dock: 'left',
  q: '',
  sort: 'online_desc',
  language: '',
  platform: '',
  age: '',
  targetSlot: 1,
  activeSlot: 1,
  slots: {
    1: null,
    2: null,
    3: null,
    4: null,
  },
};

function daysBetween(a, b) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((b.getTime() - a.getTime()) / dayMs);
}

function getAgeTier(createdAt) {
  if (!createdAt) {
    return '';
  }

  const created = new Date(createdAt);
  const now = new Date();
  const ageDays = daysBetween(created, now);

  if (ageDays < 183) {
    return 'recruit';
  }

  if (ageDays < 730) {
    return 'experienced';
  }

  return 'veteran';
}

function formatNumber(n) {
  return new Intl.NumberFormat('en-US').format(n);
}

function loadPersisted() {
  try {
    const saved = JSON.parse(localStorage.getItem('streamHubState') || 'null');
    if (saved && typeof saved === 'object') {
      if (saved.dock === 'right' || saved.dock === 'left') {
        state.dock = saved.dock;
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
    }
  } catch {
    // ignore
  }
}

function persist() {
  try {
    localStorage.setItem(
      'streamHubState',
      JSON.stringify({
        dock: state.dock,
        slots: state.slots,
        targetSlot: state.targetSlot,
        activeSlot: state.activeSlot,
      })
    );
  } catch {
    // ignore
  }
}

function applyDock() {
  if (!page) {
    return;
  }

  page.classList.toggle('is-dock-right', state.dock === 'right');
  dockButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.dock === state.dock);
  });
}

function applyTargetSlotUI() {
  slotButtons.forEach((btn) => {
    btn.classList.toggle('is-active', Number(btn.dataset.slot) === state.targetSlot);
  });
}

function applyActiveSlotUI() {
  slotEls.forEach((el) => {
    el.classList.toggle('is-active', Number(el.dataset.slot) === state.activeSlot);
  });
}

function getStreamById(id) {
  return streams.find((s) => s.id === id) || null;
}

function setSlot(slotNumber, streamId) {
  state.slots[String(slotNumber)] = streamId;
  renderSlots();
  persist();
}

function findFirstEmptySlot() {
  for (let i = 1; i <= 4; i += 1) {
    if (!state.slots[String(i)]) {
      return i;
    }
  }

  return null;
}

function addToSlot(streamId) {
  const preferred = state.targetSlot;
  if (!state.slots[String(preferred)]) {
    setSlot(preferred, streamId);
    state.activeSlot = preferred;
    applyActiveSlotUI();
    persist();
    return;
  }

  const empty = findFirstEmptySlot();
  if (empty) {
    setSlot(empty, streamId);
    state.activeSlot = empty;
    applyActiveSlotUI();
    persist();
    return;
  }

  setSlot(state.activeSlot, streamId);
}

function renderSlots() {
  slotEls.forEach((slotEl) => {
    const slotNumber = Number(slotEl.dataset.slot);
    const streamId = state.slots[String(slotNumber)];
    const body = slotEl.querySelector('.js-slot-body');
    const titleEl = slotEl.querySelector('.slot__title');

    if (!body || !titleEl) {
      return;
    }

    if (!streamId) {
      titleEl.textContent = `Slot ${slotNumber}`;
      body.innerHTML = '<div class="slot__empty">Empty</div>';
      return;
    }

    const stream = getStreamById(streamId);
    if (!stream) {
      titleEl.textContent = `Slot ${slotNumber}`;
      body.innerHTML = '<div class="slot__empty">Missing stream</div>';
      return;
    }

    const ageTier = getAgeTier(stream.createdAt);
    const tierLabel =
      ageTier === 'recruit'
        ? 'Recruit'
        : ageTier === 'experienced'
          ? 'Experienced'
          : ageTier === 'veteran'
            ? 'Veteran'
            : '';

    const isLive = stream.isLive !== false;
    titleEl.textContent = `${stream.platform.toUpperCase()} | ${stream.channel}${isLive ? '' : ' (offline)'}`;

    if (!isLive) {
      body.innerHTML = `
        <div class="slot__content">
          <div>
            <div class="slot__name">${escapeHtml(stream.title)}</div>
            <div class="slot__meta">
              <span>Currently offline</span>
              ${tierLabel ? `<span>${tierLabel}</span>` : ''}
            </div>
          </div>
          <div></div>
          <div class="slot__links">
            <a class="slot__link" href="${stream.url}" target="_blank" rel="noreferrer">Open</a>
            <button class="slot__action js-slot-clear" type="button" data-slot="${slotNumber}">Clear</button>
          </div>
        </div>
      `;
      return;
    }

    const parent = location.hostname || 'localhost';
    let embedUrl = '';

    if (stream.platform === 'twitch') {
      const url = new URL('https://player.twitch.tv/');
      url.searchParams.set('channel', stream.channel);
      url.searchParams.append('parent', parent);
      url.searchParams.set('autoplay', 'true');
      url.searchParams.set('muted', 'true');
      embedUrl = url.toString();
    } else if (stream.platform === 'kick') {
      const url = new URL(`https://player.kick.com/${stream.channel}`);
      url.searchParams.set('autoplay', 'true');
      url.searchParams.set('muted', 'true');
      embedUrl = url.toString();
    } else {
      embedUrl = stream.url;
    }

    body.innerHTML = `
      <iframe
        class="slot__iframe"
        src="${escapeHtml(embedUrl)}"
        title="${escapeHtml(stream.title)}"
        allow="autoplay; fullscreen"
        allowfullscreen
      ></iframe>
      <div class="slot__overlay">
        <a class="slot__overlay-link" href="${stream.url}" target="_blank" rel="noreferrer">Open</a>
      </div>
    `;
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function matchesQuery(stream) {
  if (!state.q) {
    return true;
  }

  const q = state.q.toLowerCase();
  return (
    stream.title.toLowerCase().includes(q) ||
    stream.channel.toLowerCase().includes(q) ||
    stream.category.toLowerCase().includes(q)
  );
}

function matchesFilters(stream) {
  if (state.language && stream.language !== state.language) {
    return false;
  }

  if (state.platform && stream.platform !== state.platform) {
    return false;
  }

  if (state.age) {
    return getAgeTier(stream.createdAt) === state.age;
  }

  return true;
}

function sortStreams(list) {
  const sorted = [...list];

  sorted.sort((a, b) => {
    if (state.sort === 'online_asc') {
      return a.viewerCount - b.viewerCount;
    }

    if (state.sort === 'created_desc') {
      return new Date(b.createdAt || '1970-01-01').getTime() - new Date(a.createdAt || '1970-01-01').getTime();
    }

    if (state.sort === 'created_asc') {
      return new Date(a.createdAt || '1970-01-01').getTime() - new Date(b.createdAt || '1970-01-01').getTime();
    }

    return b.viewerCount - a.viewerCount;
  });

  return sorted;
}

function renderList() {
  if (!listEl || !resultsMetaEl) {
    return;
  }

  const filtered = streams.filter((s) => matchesQuery(s) && matchesFilters(s));
  const finalList = sortStreams(filtered);

  const protocolHint = location.protocol === 'file:' ? ' (open via http://localhost:3000)' : '';
  const sourceLabel =
    runtime.source === 'live'
      ? ' · live'
      : runtime.source === 'error'
        ? ' · fallback (API error)'
        : ' · fallback';

  resultsMetaEl.textContent = `${finalList.length} results${sourceLabel}${protocolHint}`;

  listEl.innerHTML = finalList
    .map((s) => {
      const isLive = s.isLive !== false;
      const tier = getAgeTier(s.createdAt);
      const tierLabel = tier === 'recruit' ? 'Recruit' : tier === 'experienced' ? 'Experienced' : 'Veteran';
      const platformLabel = s.platform === 'twitch' ? 'Twitch' : 'Kick';
      const viewersLabel = isLive ? `${formatNumber(s.viewerCount)} viewers` : 'Currently offline';

      return `
        <article class="stream-card" data-id="${s.id}">
          <div class="stream-card__avatar" aria-hidden="true"></div>
          <div>
            <h3 class="stream-card__title">${escapeHtml(s.title)}</h3>
            <div class="stream-card__sub">
              <span>${platformLabel}</span>
              <span>${escapeHtml(s.category)}</span>
              <span>${escapeHtml(s.language ? s.language.toUpperCase() : '')}</span>
              <span>${viewersLabel}</span>
              <span>${tierLabel}</span>
            </div>
          </div>
          <div class="stream-card__actions">
            <button class="action-btn action-btn--primary js-add-btn" type="button" data-id="${s.id}" ${isLive ? '' : 'disabled'}>
              Add
            </button>
            <a class="action-btn" href="${s.url}" target="_blank" rel="noreferrer">Open</a>
          </div>
        </article>
      `;
    })
    .join('');
}

function setSort(sort) {
  state.sort = sort;
  sortButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.sort === sort);
  });
  renderList();
}

function setAge(age) {
  state.age = age;
  ageButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.age === age);
  });
  renderList();
}

async function hydrateTwitchStreams() {
  try {
    const url = `/api/twitch/streams-by-game?name=${encodeURIComponent(preferredGameName)}&first=10`;
    const res = await fetch(url);
    if (!res.ok) {
      runtime.source = 'error';
      runtime.error = `API ${res.status}`;
      renderList();
      return;
    }

    const json = await res.json();
    if (!json || !Array.isArray(json.data)) {
      runtime.source = 'error';
      runtime.error = 'Invalid API response';
      renderList();
      return;
    }

    runtime.source = 'live';
    runtime.error = '';

    const twitchStreams = json.data;

    // Keep Kick items for now (until we have a stable Kick API).
    streams = [...twitchStreams, ...kickStreams];
    renderList();
    renderSlots();
  } catch (e) {
    runtime.source = 'error';
    runtime.error = e instanceof Error ? e.message : String(e);
    renderList();
  }
}

function attachEvents() {
  dockButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.dock = btn.dataset.dock === 'right' ? 'right' : 'left';
      applyDock();
      persist();
    });
  });

  sortButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setSort(btn.dataset.sort || 'online_desc');
    });
  });

  ageButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setAge(btn.dataset.age || '');
    });
  });

  if (languageSelect) {
    languageSelect.addEventListener('change', () => {
      state.language = languageSelect.value;
      renderList();
    });
  }

  if (platformSelect) {
    platformSelect.addEventListener('change', () => {
      state.platform = platformSelect.value;
      renderList();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.q = searchInput.value.trim();
      renderList();
    });
  }

  slotButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.targetSlot = Number(btn.dataset.slot) || 1;
      applyTargetSlotUI();
      persist();
    });
  });

  slotEls.forEach((slotEl) => {
    slotEl.addEventListener('click', (e) => {
      const target = e.target;
      if (target && target instanceof Element && target.closest('.js-slot-clear')) {
        return;
      }

      state.activeSlot = Number(slotEl.dataset.slot) || 1;
      applyActiveSlotUI();
      persist();
    });
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) {
      return;
    }

    const addBtn = target.closest('.js-add-btn');
    if (addBtn) {
      const id = addBtn.getAttribute('data-id');
      if (id) {
        addToSlot(id);
      }
      return;
    }

    const clearBtn = target.closest('.js-slot-clear');
    if (clearBtn) {
      const slotFromData = Number(clearBtn.getAttribute('data-slot'));
      const slot = slotFromData || Number(clearBtn.closest('.js-slot')?.getAttribute('data-slot'));
      if (slot >= 1 && slot <= 4) {
        setSlot(slot, null);
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') {
      state.targetSlot = Number(e.key);
      applyTargetSlotUI();
      persist();
    }
  });
}

function init() {
  loadPersisted();
  applyDock();

  applyTargetSlotUI();
  applyActiveSlotUI();
  setSort(state.sort);
  setAge(state.age);

  streams = [...fallbackStreams];
  runtime.source = 'fallback';
  runtime.error = '';

  renderList();
  renderSlots();

  attachEvents();
  hydrateTwitchStreams();
}

init();
