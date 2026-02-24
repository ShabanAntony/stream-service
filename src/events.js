import { hydrateTwitchStreams } from './api/hydrateTwitch.js';
import { hydrateTrovoStreams } from './api/hydrateTrovo.js';
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
  setStreams,
  state,
  toggleCategoriesTagFilter,
} from './store.js';
import {
  applyActiveSlotUI,
  applyDock,
  applyFocusMode,
  applyFocusTarget,
  applyFocusToggle,
  applyTargetSlotUI,
} from './ui/applyLayout.js';
import { renderCategoriesView } from './ui/renderCategoriesView.js';
import { renderList } from './ui/renderList.js';
import { renderSlots } from './ui/renderSlots.js';

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
    slotEls,
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
    if (listEl && resultsMetaEl) {
      renderList(listEl, resultsMetaEl);
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
    const filledCount = getFilledSlotsCount();
    const visibleSlotButtonsCount = getHighestOccupiedSlot();

    if (focusToggle) {
      focusToggle.hidden = !isMultiviewRoute || filledCount < 2;
    }

    const slotToggleEl = slotButtons[0]?.closest('.slot-toggle');
    if (slotToggleEl) {
      slotToggleEl.hidden = !isMultiviewRoute || visibleSlotButtonsCount < 2;
    }

    slotButtons.forEach((btn) => {
      const slot = Number(btn.dataset.slot) || 0;
      btn.hidden = !isMultiviewRoute || slot > visibleSlotButtonsCount || visibleSlotButtonsCount < 2;
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
    const platform = url.searchParams.get('platform');
    if (!categoryId && !categoryName) {
      setMultiviewContext({ categoryId: null, categoryName: '', platform: 'twitch' });
      return;
    }
    setMultiviewContext({
      categoryId,
      categoryName,
      platform: platform === 'trovo' ? 'trovo' : 'twitch',
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
    applyActiveSlotUI(slotEls);
    applyFocusTarget(slotEls);
    renderSlots(slotEls);
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
      renderSlots(slotEls);
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
      state.language = languageSelect.value;
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

  slotButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.targetSlot = Number(btn.dataset.slot) || 1;
      applyTargetSlotUI(slotButtons);

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
      if (target instanceof Element && target.closest('.js-slot-clear')) {
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
        state.slots[String(slotToUse)] = id;
        state.targetSlot = slotToUse;
        state.activeSlot = slotToUse;
        applyActiveSlotUI(slotEls);
        applyTargetSlotUI(slotButtons);
        applyFocusTarget(slotEls);
        renderSlots(slotEls);
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
        state.slots[String(slotToUse)] = id;
        state.activeSlot = slotToUse;
        state.targetSlot = slotToUse;
        applyActiveSlotUI(slotEls);
        applyTargetSlotUI(slotButtons);
        applyFocusTarget(slotEls);
        renderSlots(slotEls);
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
        renderSlots(slotEls);
        updateHeaderControlsVisibility();
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
      updateHeaderControlsVisibility();
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
      updateHeaderControlsVisibility();
      persist();
    }
  });

  setRoutePath(window.location.pathname || '/');
  applyRouteUI();

  (async () => {
    setFallbackStreams();
    renderDirectoryList();
    renderSlots(slotEls);
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

    const [twitchData, trovoData] = await Promise.all([hydrateTwitchStreams(), hydrateTrovoStreams()]);
    const merged = [...(twitchData || []), ...(trovoData || [])];

    if (merged.length) {
      setStreams(merged, 'live');
      renderDirectoryList();
      renderSlots(slotEls);
      updateHeaderControlsVisibility();
      return;
    }

    runtime.source = 'error';
    runtime.error = runtime.error || 'No data';
    renderDirectoryList();
  })();
}
