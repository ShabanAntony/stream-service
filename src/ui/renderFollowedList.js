import { escapeHtml } from '../utils/escapeHtml.js';
import { getStreams } from '../store.js';
import { formatNumber } from '../utils/format.js';

const defaultAvatar = '<span class="followed-card__avatar-placeholder" aria-hidden="true"></span>';

export function renderFollowedList(listEl, channels) {
  if (!listEl) return;
  const items = Array.isArray(channels) ? channels : [];
  if (!items.length) {
    listEl.innerHTML = '<div class="followed__empty">No followed channels yet.</div>';
    return;
  }

  const streamById = new Map(getStreams().map((stream) => [stream.id, stream]));

  listEl.innerHTML = items
    .map((channel) => {
      const stream = streamById.get(channel.id);
      const isLive = stream ? stream.isLive !== false : false;
      const viewersLabel = stream && isLive ? `${formatNumber(stream.viewerCount)} viewers` : 'Currently offline';
      const avatarHtml = channel.profileImageUrl
        ? `<img class="followed-card__avatar-img" src="${escapeHtml(channel.profileImageUrl)}" alt="${escapeHtml(channel.displayName)} avatar" loading="lazy" />`
        : defaultAvatar;

      return `
        <article class="followed-card" data-id="${channel.id}" data-live="${isLive ? 1 : 0}">
          <div class="followed-card__left">
            <div class="followed-card__avatar">${avatarHtml}</div>
            <div class="followed-card__meta">
              <strong class="followed-card__name">${escapeHtml(channel.displayName)}</strong>
              <span class="followed-card__login">@${escapeHtml(channel.login)}</span>
              <span class="followed-card__status">${viewersLabel}</span>
            </div>
          </div>
          <div class="followed-card__actions">
            <button class="action-btn action-btn--primary js-add-btn" type="button" data-id="${channel.id}" ${isLive ? '' : 'disabled'}>
              Add
            </button>
            <a class="action-btn" href="${escapeHtml(channel.url)}" target="_blank" rel="noreferrer">Open</a>
          </div>
        </article>
      `;
    })
    .join('');
}
