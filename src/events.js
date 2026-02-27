import { hydrateTwitchStreams } from './api/hydrateTwitch.js';
import { logoutTwitch } from './api/auth.js';
import { fetchCategoryStreamsByName } from './api/categoryStreams.js';
import {
  clearCategoriesTagFilters,
  persist,
  runtime,
  setCategoriesSort,
  setCategoryStreams,
  setCategoryStreamsError,
  setCategoryStreamsLoading,
  setFallbackStreams,
  setFollowedFilter,
  setMultiviewContext,
  setRoutePath,
  getStreams,
  setStreams,
  state,
  toggleCategoriesTagFilter,
} from './store.js';
import {
  applyDock,
  applyTargetSlotUI,
} from './ui/applyLayout.js';
import { renderCategoriesView } from './ui/renderCategoriesView.js';
import { buildDirectoryListModel, renderList } from './ui/renderList.js';

function getMultiviewBridge() {
  return window.multiviewBridge || null;
}

function pruneLegacySlotsToKnownStreams(knownStreams) {
  const knownIds = new Set((Array.isArray(knownStreams) ? knownStreams : []).map((s) => s?.id).filter(Boolean));
  let changed = false;
  for (const slot of [1, 2, 3, 4]) {
    const key = String(slot);
    const id = state.slots[key];
    if (id && !knownIds.has(id)) {
      state.slots[key] = null;
      changed = true;
    }
  }

  const occupied = [1, 2, 3, 4].filter((slot) => Boolean(state.slots[String(slot)]));
  const fallbackSlot = occupied.length ? occupied[0] : 1;
  if (!occupied.includes(state.targetSlot)) {
    state.targetSlot = fallbackSlot;
    changed = true;
  }
  if (!occupied.includes(state.activeSlot)) {
    state.activeSlot = fallbackSlot;
    changed = true;
  }
  return changed;
}

function getRouteKind(pathname) {
  const path = pathname || '/';
  if (path === '/' || path === '/categories' || path === '/categories/') {
    return 'categories';
  }
  if (path === '/multiview' || path === '/multiview/') {
    return 'multiview';
  }
  if (/^\/categories\/[^/]+\/?$/.test(path)) {
    return 'category-detail';
  }
  return 'multiview';
}

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
    authLoginBtn,
    authLogoutBtn,
    followedToggleBtn,
    navLinks,
    directoryPage,
    categoriesPage,
    categoryGrid,
    categoryActiveList,
    categoryClearBtn,
    categoryTagList,
    categorySortButtons,
  } = refs;

  const renderDirectoryList = () => {
    const listModel = buildDirectoryListModel();
    if (listEl && resultsMetaEl) {
      const routeKind = getRouteKind(state.routePath);
      if (routeKind === 'multiview') {
        const bridge = getMultiviewBridge();
        if (bridge?.setDirectoryList) {
          bridge.setDirectoryList(listModel.finalList, listModel.metaText);
        } else {
          resultsMetaEl.textContent = listModel.metaText;
          listEl.innerHTML = listModel.html;
        }
      } else {
        renderList(listEl, resultsMetaEl);
      }
    }

    const slotsChanged = pruneLegacySlotsToKnownStreams(getStreams());
    if (slotsChanged) {
      applyTargetSlotUI(slotButtons);
      const bridge = getMultiviewBridge();
      if (bridge?.setTargetSlot) bridge.setTargetSlot(state.targetSlot);
      if (bridge?.setActiveSlot) bridge.setActiveSlot(state.activeSlot);
    }

    const bridge = getMultiviewBridge();
    if (bridge && typeof bridge.setStreams === 'function') {
      bridge.setStreams(getStreams(), runtime.source === 'live' ? 'live' : runtime.source || 'sample');
    }
  };

  const renderCategories = () => {
    renderCategoriesView(refs, state.categories);
  };

  const rerenderByRoute = () => {
    const routeKind = getRouteKind(state.routePath);
    if (routeKind === 'multiview') {
      renderDirectoryList();
      return;
    }
    if (routeKind === 'categories' || routeKind === 'category-detail') {
      renderCategories();
      return;
    }
    renderDirectoryList();
  };

  const getNextAddSlot = () => {
    for (let slot = 1; slot <= 4; slot += 1) {
      if (!state.slots[String(slot)]) {
        return slot;
      }
    }
    return 4;
  };

  const getFilledSlotsCount = () => Object.values(state.slots).filter(Boolean).length;
  const getHighestOccupiedSlot = () => {
    const occupied = [1, 2, 3, 4].filter((slot) => Boolean(state.slots[String(slot)]));
    return occupied.length ? Math.max(...occupied) : 0;
  };

  const updateHeaderControlsVisibility = () => {
    const routeKind = getRouteKind(state.routePath);
    const isMultiviewRoute = routeKind === 'multiview';
    const visibleSlotButtonsCount = getHighestOccupiedSlot();

    if (focusToggle) {
      focusToggle.hidden = !isMultiviewRoute || getFilledSlotsCount() < 2;
    }

    const slotToggleEl = slotButtons[0]?.closest('.slot-toggle');
    if (slotToggleEl) {
      slotToggleEl.hidden = !isMultiviewRoute || visibleSlotButtonsCount < 2;
    }

    slotButtons.forEach((btn) => {
      const slot = Number(btn.dataset.slot) || 0;
      btn.hidden = !isMultiviewRoute || visibleSlotButtonsCount < 2 || slot > visibleSlotButtonsCount;
    });
  };

  let categoryStreamsRequestId = 0;

  const getSelectedCategoryFromRoute = () => {
    const match = (state.routePath || '').match(/^\/categories\/([^/]+)\/?$/);
    if (!match) return null;
    const categoryId = decodeURIComponent(match[1]);
    return state.categories.find((item) => item.id === categoryId) || null;
  };

  const ensureCategoryStreamsLoaded = async (category) => {
    if (!category || !category.name) return;
    const requestId = ++categoryStreamsRequestId;
    setCategoryStreamsLoading(true);
    renderCategories();

    try {
      const streams = await fetchCategoryStreamsByName(category.name, 40);
      if (requestId !== categoryStreamsRequestId) return;
      setCategoryStreams(streams);
      setCategoryStreamsLoading(false);
      setCategoryStreamsError('');
      renderCategories();
      return streams;
    } catch (error) {
      if (requestId !== categoryStreamsRequestId) return;
      console.error('[category-streams] load failed', error);
      setCategoryStreams([]);
      setCategoryStreamsError(error instanceof Error ? error.message : 'Failed to load category streams');
      renderCategories();
      return [];
    }
  };

  const syncMultiviewContextFromUrl = () => {
    const url = new URL(window.location.href);
    const categoryId = url.searchParams.get('categoryId');
    const categoryName = url.searchParams.get('categoryName');
    if (!categoryId && !categoryName) {
      setMultiviewContext({ categoryId: null, categoryName: '', platform: 'twitch' });
      return;
    }
    setMultiviewContext({
      categoryId,
      categoryName,
      platform: 'twitch',
    });
  };

  const seedMultiviewSlotFromQuery = (streams = []) => {
    const url = new URL(window.location.href);
    const seedId = url.searchParams.get('seed');
    if (!seedId) return;

    const seedStream = streams.find((item) => item.id === seedId);
    if (!seedStream) return;

    state.slots = {
      1: seedStream.id,
      2: null,
      3: null,
      4: null,
    };
    state.activeSlot = 1;
    state.targetSlot = 1;
    applyTargetSlotUI(slotButtons);
    const bridge = getMultiviewBridge();
    if (bridge?.assignStreamToSlot) {
      bridge.assignStreamToSlot(1, seedStream.id);
    } else if (bridge?.assignStream) {
      bridge.assignStream(seedStream.id);
    }
    if (bridge?.setTargetSlot) bridge.setTargetSlot(1);
    if (bridge?.setActiveSlot) bridge.setActiveSlot(1);
    persist();
  };

  const ensureMultiviewSidebarContext = async () => {
    syncMultiviewContextFromUrl();
    if (!state.multiviewContext.categoryName) {
      return;
    }
    const streams = await ensureCategoryStreamsLoaded({
      id: state.multiviewContext.categoryId,
      name: state.multiviewContext.categoryName,
    });
    if (Array.isArray(streams) && streams.length) {
      setStreams(streams, 'live');
      renderDirectoryList();
      seedMultiviewSlotFromQuery(streams);
    }
  };

  const applyRouteUI = () => {
    const routeKind = getRouteKind(state.routePath);
    const isCategoriesRoute = routeKind === 'categories' || routeKind === 'category-detail';
    const isMultiviewRoute = routeKind === 'multiview';
    const isCategoryDetailRoute = routeKind === 'category-detail';

    if (page) {
      page.classList.toggle('is-categories-route', isCategoriesRoute);
      page.classList.toggle('is-directory-route', isMultiviewRoute);
      page.classList.toggle('is-category-detail-route', isCategoryDetailRoute);
    }

    if (directoryPage) {
      directoryPage.hidden = !(isMultiviewRoute || isCategoryDetailRoute);
    }
    if (categoriesPage) {
      categoriesPage.hidden = !isCategoriesRoute;
    }

    navLinks.forEach((link) => {
      const route = link.dataset.route || '/';
      const active =
        route === '/categories'
          ? isCategoriesRoute
          : isMultiviewRoute && route === '/multiview';
      link.classList.toggle('is-active', active);
    });

    if (searchInput) {
      if (routeKind === 'multiview') {
        searchInput.placeholder = 'Find by Twitch login...';
      } else if (routeKind === 'category-detail') {
        searchInput.placeholder = 'Search streamers in category...';
      } else if (routeKind === 'categories') {
        searchInput.placeholder = 'Search categories...';
      }
    }

    updateHeaderControlsVisibility();
    renderCategories();
    if (isCategoriesRoute && routeKind === 'category-detail') {
      const selectedCategory = getSelectedCategoryFromRoute();
      void ensureCategoryStreamsLoaded(selectedCategory);
    }
    if (isMultiviewRoute) {
      void ensureMultiviewSidebarContext();
    }
  };

  const navigateTo = (path, push = true) => {
    const nextPath = typeof path === 'string' && path ? path : '/';
    const currentFullPath = `${window.location.pathname}${window.location.search}`;
    if (push && currentFullPath !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setRoutePath(window.location.pathname || nextPath);
    applyRouteUI();
    persist();
  };

  if (authLoginBtn) {
    authLoginBtn.addEventListener('click', () => {
      const returnTo = `${window.location.pathname || '/'}${window.location.search || ''}`;
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

  if (followedToggleBtn) {
    const updateFollowToggle = () => {
      const active = state.followedFilter;
      followedToggleBtn.classList.toggle('is-active', active);
      followedToggleBtn.textContent = active ? 'Show all channels' : 'Followed only';
    };

    updateFollowToggle();
    followedToggleBtn.addEventListener('click', () => {
      setFollowedFilter(!state.followedFilter);
      updateFollowToggle();
      rerenderByRoute();
      persist();
    });
  }

  window.addEventListener('popstate', () => {
    setRoutePath(window.location.pathname || '/');
    applyRouteUI();
  });

  window.addEventListener('multiview:state-change', (event) => {
    const detail = event && typeof event === 'object' ? event.detail : null;
    if (!detail || typeof detail !== 'object') return;
    const slots = detail.slots && typeof detail.slots === 'object' ? detail.slots : null;
    if (slots) {
      state.slots = {
        1: slots['1'] || null,
        2: slots['2'] || null,
        3: slots['3'] || null,
        4: slots['4'] || null,
      };
    }
    const nextTarget = Number(detail.targetSlot);
    const nextActive = Number(detail.activeSlot);
    if (nextTarget >= 1 && nextTarget <= 4) {
      state.targetSlot = nextTarget;
    }
    if (nextActive >= 1 && nextActive <= 4) {
      state.activeSlot = nextActive;
    }
    if (typeof detail.focusMode === 'boolean') {
      state.focusMode = detail.focusMode;
    }
    applyTargetSlotUI(slotButtons);
    updateHeaderControlsVisibility();
  });

  dockButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.dock = btn.dataset.dock === 'right' ? 'right' : 'left';
      applyDock(page, dockButtons);
      persist();
    });
  });

  sortButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.sort = btn.dataset.sort || 'online_desc';
      sortButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.sort === state.sort));
      rerenderByRoute();
    });
  });

  ageButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.age = btn.dataset.age || '';
      ageButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.age === state.age));
      rerenderByRoute();
    });
  });

  if (languageSelect) {
    languageSelect.addEventListener('change', () => {
      state.language = String(languageSelect.value || '')
        .trim()
        .toLowerCase();
      rerenderByRoute();
    });
  }

  if (platformSelect) {
    platformSelect.addEventListener('change', () => {
      state.platform = platformSelect.value;
      rerenderByRoute();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.q = searchInput.value.trim();
      rerenderByRoute();
    });
  }

  if (categorySortButtons) {
    categorySortButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const sort = btn.dataset.sort || 'viewer_desc';
        setCategoriesSort(sort);
        renderCategories();
        persist();
      });
    });
  }

  if (categoryTagList) {
    categoryTagList.addEventListener('change', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.matches('.js-category-tag-checkbox')) return;
      const tagId = target.dataset.tag;
      if (!tagId) return;
      toggleCategoriesTagFilter(tagId);
      renderCategories();
      persist();
    });
  }

  if (categoryActiveList) {
    categoryActiveList.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const chip = target.closest('.js-category-tag-chip');
      if (!chip) return;
      const tagId = chip.getAttribute('data-tag');
      if (!tagId) return;
      toggleCategoriesTagFilter(tagId);
      renderCategories();
      persist();
    });
  }

  if (categoryClearBtn) {
    categoryClearBtn.addEventListener('click', () => {
      if (!state.categoriesTagFilters.length) return;
      clearCategoriesTagFilters();
      renderCategories();
      persist();
    });
  }

  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const routeLink = target.closest('.js-route-link');
    if (routeLink instanceof HTMLAnchorElement) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const route = routeLink.dataset.route || routeLink.getAttribute('href');
      if (route && route.startsWith('/')) {
        e.preventDefault();
        navigateTo(route, true);
        return;
      }
    }

    const watchBtn = target.closest('.js-watch-stream-btn');
    if (watchBtn) {
      const streamId = watchBtn.getAttribute('data-stream-id');
      const categoryId = watchBtn.getAttribute('data-category-id');
      const categoryName = watchBtn.getAttribute('data-category-name') || '';
      if (!streamId) return;

      const nextUrl = new URL('/multiview', window.location.origin);
      if (categoryId) nextUrl.searchParams.set('categoryId', categoryId);
      if (categoryName) nextUrl.searchParams.set('categoryName', categoryName);
      nextUrl.searchParams.set('platform', 'twitch');
      nextUrl.searchParams.set('seed', streamId);

      e.preventDefault();
      navigateTo(`${nextUrl.pathname}${nextUrl.search}`, true);
      return;
    }

    const addBtn = target.closest('.js-add-btn');
    if (addBtn) {
      const id = addBtn.getAttribute('data-id');
      if (id) {
        const slotToUse = getNextAddSlot();
        state.targetSlot = slotToUse;
        state.activeSlot = slotToUse;
        state.slots[String(slotToUse)] = id;
        const bridge = getMultiviewBridge();
        if (bridge?.assignStreamToSlot) {
          bridge.assignStreamToSlot(slotToUse, id);
        } else if (bridge?.assignStream) {
          bridge.assignStream(id);
        }
        applyTargetSlotUI(slotButtons);
        updateHeaderControlsVisibility();
        persist();
      }
      return;
    }

    const watchSlotBtn = target.closest('.js-watch-slot-btn');
    if (watchSlotBtn) {
      const id = watchSlotBtn.getAttribute('data-id');
      if (id) {
        const slotToUse = state.targetSlot || state.activeSlot || 1;
        state.activeSlot = slotToUse;
        state.targetSlot = slotToUse;
        state.slots[String(slotToUse)] = id;
        const bridge = getMultiviewBridge();
        if (bridge?.assignStreamToSlot) {
          bridge.assignStreamToSlot(slotToUse, id);
        } else if (bridge?.assignStream) {
          bridge.assignStream(id);
        }
        applyTargetSlotUI(slotButtons);
        updateHeaderControlsVisibility();
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
        const bridge = getMultiviewBridge();
        if (bridge?.clearSlot) {
          bridge.clearSlot(slot);
        }
        updateHeaderControlsVisibility();
        persist();
      }
    }
  });

  setRoutePath(window.location.pathname || '/');
  applyRouteUI();

  (async () => {
    setFallbackStreams();
    renderDirectoryList();
    const bridge = getMultiviewBridge();
    if (bridge?.setStreams) bridge.setStreams(getStreams(), runtime.source || 'fallback');
    updateHeaderControlsVisibility();
    renderCategories();

    const initialRouteKind = getRouteKind(window.location.pathname || '/');
    if (initialRouteKind === 'multiview') {
      const url = new URL(window.location.href);
      const hasCategoryContext = Boolean(url.searchParams.get('categoryId') || url.searchParams.get('categoryName'));
      if (hasCategoryContext) {
        return;
      }
    }

    const merged = (await hydrateTwitchStreams()) || [];

    if (merged.length) {
      setStreams(merged, 'live');
      renderDirectoryList();
      const bridge = getMultiviewBridge();
      if (bridge?.setStreams) bridge.setStreams(getStreams(), runtime.source || 'live');
      updateHeaderControlsVisibility();
      return;
    }

    runtime.source = 'error';
    runtime.error = runtime.error || 'No data';
    renderDirectoryList();
  })();
}
