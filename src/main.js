import { fetchAuthMe, fetchFollowedChannels } from './api/auth.js';
import { fetchCategories } from './api/categories.js';
import { applyCategoryTaxonomy, fetchCategoryTaxonomy } from './api/categoryTaxonomy.js';
import {
  loadPersisted,
  setCategories,
  setCategoriesError,
  setCategoriesLoading,
  setFollowedChannels,
  setRoutePath,
} from './store.js';
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
import { renderFollowedList } from './ui/renderFollowedList.js';
import { renderCategoriesView } from './ui/renderCategoriesView.js';

function init() {
  loadPersisted();
  setRoutePath(window.location.pathname || '/');

  const refs = getDomRefs();

  applyDock(refs.page, refs.dockButtons);
  applyFocusMode(refs.page);
  applyFocusToggle(refs.focusToggle);
  applyTargetSlotUI(refs.slotButtons);
  applyActiveSlotUI(refs.slotEls);
  applyFocusTarget(refs.slotEls);
  renderAuthState(refs, { authenticated: false });
  renderFollowedList(refs.followedList, []);
  renderCategoriesView(refs, []);

  bindEvents(refs);

  void (async () => {
    const authState = await fetchAuthMe();
    renderAuthState(refs, authState);

    if (authState.authenticated) {
      const follows = await fetchFollowedChannels();
      setFollowedChannels(follows);
      renderFollowedList(refs.followedList, follows);
    } else {
      setFollowedChannels([]);
      renderFollowedList(refs.followedList, []);
    }

    setCategoriesLoading(true);
    renderCategoriesView(refs, []);
    try {
      const [categories, taxonomy] = await Promise.all([
        fetchCategories(),
        fetchCategoryTaxonomy().catch((error) => {
          console.error('[taxonomy] load failed', error);
          return null;
        }),
      ]);

      const enriched = applyCategoryTaxonomy(categories, taxonomy);
      console.info('[taxonomy] applied', enriched.meta);

      setCategories(enriched.data);
      setCategoriesLoading(false);
      renderCategoriesView(refs, enriched.data);
      window.dispatchEvent(new Event('popstate'));
    } catch (err) {
      console.error('[categories] render load failed', err);
      setCategories([]);
      setCategoriesError(err instanceof Error ? err.message : 'Failed to load categories');
      renderCategoriesView(refs, []);
    }

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
