import { getStreams, runtime, state } from '../store.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { ageTierLabel, formatNumber, getAgeTier } from '../utils/format.js';

function matchesQuery(stream) {
  if (!state.q) return true;
  const q = state.q.toLowerCase();
  return (
    stream.title.toLowerCase().includes(q) ||
    stream.channel.toLowerCase().includes(q) ||
    stream.category.toLowerCase().includes(q)
  );
}

function matchesFilters(stream) {
  if (state.language && stream.language !== state.language) return false;
  if (state.platform && stream.platform !== state.platform) return false;
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

export function renderList(listEl, resultsMetaEl) {
  if (!listEl || !resultsMetaEl) return;

  const filtered = getStreams().filter((s) => matchesQuery(s) && matchesFilters(s));
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
      const tierLabel = ageTierLabel(getAgeTier(s.createdAt));
      const platformLabel = s.platform === 'twitch' ? 'Twitch' : s.platform === 'trovo' ? 'Trovo' : 'Other';
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
