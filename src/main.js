import { fetchAuthMe } from './api/auth.js';
import { loadPersisted } from './store.js';
import { getDomRefs } from './ui/domRefs.js';
import { renderAuthState } from './ui/renderAuth.js';
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
  renderAuthState(refs, { authenticated: false });

  bindEvents(refs);

  void (async () => {
    const authState = await fetchAuthMe();
    renderAuthState(refs, authState);

    const url = new URL(window.location.href);
    const authError = url.searchParams.get('auth_error');
    if (authError) {
      console.warn('Twitch auth error:', authError, url.searchParams.get('auth_error_description') || '');
      url.searchParams.delete('auth_error');
      url.searchParams.delete('auth_error_description');
      window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    }
  })();
}

init();
