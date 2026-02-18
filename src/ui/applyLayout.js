import { state } from '../store.js';

export function applyDock(page, dockButtons) {
  if (!page) return;
  page.classList.toggle('is-dock-right', state.dock === 'right');
  dockButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.dock === state.dock);
  });
}

export function applyTargetSlotUI(slotButtons) {
  slotButtons.forEach((btn) => {
    btn.classList.toggle('is-active', Number(btn.dataset.slot) === state.targetSlot);
  });
}

export function applyActiveSlotUI(slotEls) {
  slotEls.forEach((el) => {
    el.classList.toggle('is-active', Number(el.dataset.slot) === state.activeSlot);
  });
}

export function applyFocusMode(page) {
  if (!page) return;
  page.classList.toggle('is-focus-mode', Boolean(state.focusMode));
}

export function applyFocusToggle(focusToggle) {
  if (!focusToggle) return;
  focusToggle.classList.toggle('is-active', Boolean(state.focusMode));
  focusToggle.setAttribute('aria-pressed', state.focusMode ? 'true' : 'false');
}

export function applyFocusTarget(slotEls) {
  const activeSlot = state.focusMode ? state.activeSlot : null;
  const hoverSlot = state.focusMode ? state.hoverSlot : null;
  slotEls.forEach((el) => {
    const slotNumber = Number(el.dataset.slot);
    const isTarget =
      activeSlot !== null &&
      (slotNumber === activeSlot || (hoverSlot !== null && slotNumber === hoverSlot));
    el.classList.toggle('is-focus-target', isTarget);
  });
}
