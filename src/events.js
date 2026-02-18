import { hydrateTwitchStreams } from './api/hydrateTwitch.js';
import { persist, runtime, setFallbackStreams, state } from './store.js';
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
  } = refs;

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
      applyActiveSlotUI(slotEls);
      applyFocusTarget(slotEls);
      renderSlots(slotEls);
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
      applyTargetSlotUI(slotButtons);
      persist();
    }
  });

  // Initial load/hydration
  (async () => {
    setFallbackStreams();
    renderList(listEl, resultsMetaEl);
    renderSlots(slotEls);

    const data = await hydrateTwitchStreams();
    if (data) {
      renderList(listEl, resultsMetaEl);
      renderSlots(slotEls);
      return;
    }

    runtime.source = 'error';
    renderList(listEl, resultsMetaEl);
  })();
}
