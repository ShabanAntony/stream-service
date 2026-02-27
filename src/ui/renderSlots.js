import { getStreamById, state } from '../store.js';
import { escapeHtml } from '../utils/escapeHtml.js';

export function renderSlots(slotEls) {
  const occupiedSlotNumbers = [1, 2, 3, 4].filter((slot) => Boolean(state.slots[String(slot)]));
  const highestOccupiedSlot = occupiedSlotNumbers.length ? Math.max(...occupiedSlotNumbers) : 1;
  const visibleSlotsCount = Math.max(1, Math.min(4, highestOccupiedSlot));
  const multiviewEl = slotEls[0]?.closest('.js-multiview');
  if (multiviewEl) {
    multiviewEl.setAttribute('data-layout', String(visibleSlotsCount));
  }

  slotEls.forEach((slotEl) => {
    const slotNumber = Number(slotEl.dataset.slot);
    slotEl.hidden = slotNumber > visibleSlotsCount;
    const isActive = slotNumber === state.activeSlot;
    const streamId = state.slots[String(slotNumber)];
    const body = slotEl.querySelector('.js-slot-body');
    const titleEl = slotEl.querySelector('.slot__title');

    if (!body || !titleEl) return;

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

    const isLive = stream.isLive !== false;
    titleEl.textContent = `${stream.platform.toUpperCase()} | ${stream.channel}${isLive ? '' : ' (offline)'}`;

    if (!isLive) {
      body.innerHTML = `
        <div class="slot__content">
          <div>
            <div class="slot__name">${escapeHtml(stream.title)}</div>
            <div class="slot__meta">
              <span>Currently offline</span>
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
    const shouldUnmute = Boolean(state.focusMode) && isActive;
    let embedUrl = '';

    if (stream.platform === 'twitch') {
      const url = new URL('https://player.twitch.tv/');
      url.searchParams.set('channel', stream.channel);
      url.searchParams.append('parent', parent);
      url.searchParams.set('autoplay', 'true');
      url.searchParams.set('muted', shouldUnmute ? 'false' : 'true');
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
