import { hydrateTwitchStreams } from './api/hydrateTwitch.js';
import { hydrateTrovoStreams } from './api/hydrateTrovo.js';
import { logoutTwitch } from './api/auth.js';
import { persist, runtime, setFallbackStreams, setStreams, state } from './store.js';
import {
  applyActiveSlotUI,
  applyDock,
  applyFocusMode,
  applyFocusTarget,
  applyFocusToggle,
  applyTargetSlotUI,
} from './ui/applyLayout.js';
import { renderList } from './ui/renderList.js';
import { renderSlots } from './ui/renderSlots.js';

export function bindEvents(refs) {
  const {
    page,
    dockButtons,
    focusToggle,
    searchInput,
    listEl,
    resultsMetaEl,
    sortButtons,
    ageButtons,
    languageSelect,
    platformSelect,
    slotButtons,
    slotEls,
    authLoginBtn,
    authLogoutBtn,
  } = refs;

  if (authLoginBtn) {
    authLoginBtn.addEventListener('click', () => {
      const returnTo = window.location.pathname || '/';
      const url = `/api/auth/twitch/login?returnTo=${encodeURIComponent(returnTo)}`;
      window.location.assign(url);
    });
  }

  if (authLogoutBtn) {
    authLogoutBtn.addEventListener('click', async () => {
      authLogoutBtn.disabled = true;
      try {
        await logoutTwitch();
      } catch (err) {
        console.error(err);
      } finally {
        window.location.assign(window.location.pathname || '/');
      }
    });
  }

  dockButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.dock = btn.dataset.dock === 'right' ? 'right' : 'left';
      applyDock(page, dockButtons);
      persist();
    });
  });

  if (focusToggle) {
    focusToggle.addEventListener('click', () => {
      state.focusMode = !state.focusMode;
      if (!state.focusMode) {
        state.hoverSlot = null;
      }
      applyFocusMode(page);
      applyFocusToggle(focusToggle);
      applyFocusTarget(slotEls);
      renderSlots(slotEls);
      persist();
    });
  }

  sortButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.sort = btn.dataset.sort || 'online_desc';
      sortButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.sort === state.sort));
      renderList(listEl, resultsMetaEl);
    });
  });

  ageButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.age = btn.dataset.age || '';
      ageButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.age === state.age));
      renderList(listEl, resultsMetaEl);
    });
  });

  if (languageSelect) {
    languageSelect.addEventListener('change', () => {
      state.language = languageSelect.value;
      renderList(listEl, resultsMetaEl);
    });
  }

  if (platformSelect) {
    platformSelect.addEventListener('change', () => {
      state.platform = platformSelect.value;
      renderList(listEl, resultsMetaEl);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.q = searchInput.value.trim();
      renderList(listEl, resultsMetaEl);
    });
  }

  slotButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.targetSlot = Number(btn.dataset.slot) || 1;
      applyTargetSlotUI(slotButtons);

      // Keep header target and clicked/active slot in sync.
      state.activeSlot = state.targetSlot;
      applyActiveSlotUI(slotEls);
      applyFocusTarget(slotEls);
      if (state.focusMode) {
        renderSlots(slotEls);
      }
      persist();
    });
  });

  slotEls.forEach((slotEl) => {
    slotEl.addEventListener('click', (e) => {
      const target = e.target;
      if (target && target instanceof Element && target.closest('.js-slot-clear')) {
        return;
      }

      const slot = Number(slotEl.dataset.slot) || 1;
      state.activeSlot = slot;
      state.targetSlot = slot;
      applyActiveSlotUI(slotEls);
      applyTargetSlotUI(slotButtons);
      applyFocusTarget(slotEls);
      if (state.focusMode) {
        renderSlots(slotEls);
      }
      persist();
    });

    slotEl.addEventListener('mouseenter', () => {
      if (!state.focusMode) return;
      state.hoverSlot = Number(slotEl.dataset.slot) || null;
      applyFocusTarget(slotEls);
    });

    slotEl.addEventListener('mouseleave', () => {
      if (!state.focusMode) return;
      state.hoverSlot = null;
      applyFocusTarget(slotEls);
    });
  });

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const addBtn = target.closest('.js-add-btn');
    if (addBtn) {
      const id = addBtn.getAttribute('data-id');
      if (id) {
        state.slots[String(state.targetSlot)] = id;
        state.activeSlot = state.targetSlot;
        applyActiveSlotUI(slotEls);
        applyFocusTarget(slotEls);
        renderSlots(slotEls);
        persist();
      }
      return;
    }

    const clearBtn = target.closest('.js-slot-clear');
    if (clearBtn) {
      const slotFromData = Number(clearBtn.getAttribute('data-slot'));
      const slot = slotFromData || Number(clearBtn.closest('.js-slot')?.getAttribute('data-slot'));
      if (slot >= 1 && slot <= 4) {
        state.slots[String(slot)] = null;
        renderSlots(slotEls);
        persist();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.focusMode) {
      state.focusMode = false;
      state.hoverSlot = null;
      applyFocusMode(page);
      applyFocusToggle(focusToggle);
      applyFocusTarget(slotEls);
      renderSlots(slotEls);
      persist();
      return;
    }

    if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') {
      state.targetSlot = Number(e.key);
      state.activeSlot = state.targetSlot;
      applyTargetSlotUI(slotButtons);
      applyActiveSlotUI(slotEls);
      applyFocusTarget(slotEls);
      if (state.focusMode) {
        renderSlots(slotEls);
      }
      persist();
    }
  });

  // Initial load/hydration
  (async () => {
    setFallbackStreams();
    renderList(listEl, resultsMetaEl);
    renderSlots(slotEls);

    const [twitchData, trovoData] = await Promise.all([hydrateTwitchStreams(), hydrateTrovoStreams()]);
    const merged = [...(twitchData || []), ...(trovoData || [])];

    if (merged.length) {
      setStreams(merged, 'live');
      renderList(listEl, resultsMetaEl);
      renderSlots(slotEls);
      return;
    }

    runtime.source = 'error';
    runtime.error = runtime.error || 'No data';
    renderList(listEl, resultsMetaEl);
  })();
}
