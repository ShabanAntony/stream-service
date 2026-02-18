import { loadPersisted } from './store.js';
import { getDomRefs } from './ui/domRefs.js';
import {
  applyActiveSlotUI,
  applyDock,
  applyFocusMode,
  applyFocusTarget,
  applyFocusToggle,
  applyTargetSlotUI,
} from './ui/applyLayout.js';
import { bindEvents } from './events.js';

function init() {
  loadPersisted();

  const refs = getDomRefs();

  applyDock(refs.page, refs.dockButtons);
  applyFocusMode(refs.page);
  applyFocusToggle(refs.focusToggle);
  applyTargetSlotUI(refs.slotButtons);
  applyActiveSlotUI(refs.slotEls);
  applyFocusTarget(refs.slotEls);

  bindEvents(refs);
}

init();
