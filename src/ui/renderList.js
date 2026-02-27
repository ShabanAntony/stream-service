import { getStreams, runtime, state } from '../store.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { ageTierLabel, formatNumber, getAgeTier } from '../utils/format.js';

function matchesQuery(stream) {
  if (!state.q) return true;
  let q = state.q.toLowerCase().trim();
  q = q.replace(/^https?:\/\/(www\.)?twitch\.tv\//, '');
  q = q.split(/[/?#]/)[0] || q;
  return (
    stream.title.toLowerCase().includes(q) ||
    stream.channel.toLowerCase().includes(q) ||
    stream.category.toLowerCase().includes(q)
  );
}

function matchesFilters(stream) {
  const languageSelect = document.querySelector('.js-language-select');
  const selectedLanguage = String(
    (languageSelect instanceof HTMLSelectElement ? languageSelect.value : state.language) || ''
  )
    .trim()
    .toLowerCase();

  if (selectedLanguage) {
    const streamLanguage = String(stream.language || '').toLowerCase();
    if (!streamLanguage || (streamLanguage !== selectedLanguage && !streamLanguage.startsWith(`${selectedLanguage}-`))) {
      return false;
    }
  }
  // Platform filter is disabled for multiview directory until unified cross-platform support returns.
  // if (state.platform && stream.platform !== state.platform) return false;
  if (state.age) return getAgeTier(stream.createdAt) === state.age;
  return true;
}

function sortStreams(list) {
  const sorted = [...list];

  sorted.sort((a, b) => {
    if (state.sort === 'online_asc') return a.viewerCount - b.viewerCount;
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

export function buildDirectoryListModel() {
  const followedSet = state.followedFilter
    ? new Set(state.followedChannels.map((channel) => channel.id))
    : null;
  const filtered = getStreams().filter((s) => {
    if (!matchesQuery(s)) return false;
    if (!matchesFilters(s)) return false;
    if (followedSet && !followedSet.has(s.id)) return false;
    return true;
  });
  const finalList = sortStreams(filtered);

  const protocolHint = location.protocol === 'file:' ? ' (open via http://localhost:3000)' : '';
  const sourceLabel =
    runtime.source === 'live'
      ? ' · live'
      : runtime.source === 'error'
        ? ' · fallback (API error)'
        : ' · fallback';

  const metaText = `${finalList.length} results${sourceLabel}${protocolHint}`;
  const html = finalList
    .map((s) => {
      const isLive = s.isLive !== false;
      const tierLabel = ageTierLabel(getAgeTier(s.createdAt));
      const platformLabel = s.platform === 'twitch' ? 'Twitch' : 'Other';
      const viewersLabel = isLive ? `${formatNumber(s.viewerCount)} viewers` : 'Currently offline';
      const avatarHtml = s.profileImageUrl
        ? `<img class="stream-card__avatar-img" src="${escapeHtml(s.profileImageUrl)}" alt="${escapeHtml(s.title)}" loading="lazy" />`
        : '';

      return `
        <article class="stream-card" data-id="${s.id}">
          <div class="stream-card__avatar" aria-hidden="true">${avatarHtml}</div>
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
            <button class="action-btn action-btn--primary js-watch-slot-btn" type="button" data-id="${s.id}" ${isLive ? '' : 'disabled'}>
              Watch
            </button>
            <button class="action-btn js-add-btn" type="button" data-id="${s.id}" ${isLive ? '' : 'disabled'}>
              Add
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  return { finalList, metaText, html };
}

export function renderList(listEl, resultsMetaEl) {
  if (!listEl || !resultsMetaEl) return;
  const model = buildDirectoryListModel();
  resultsMetaEl.textContent = model.metaText;
  listEl.innerHTML = model.html;
}
