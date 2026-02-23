import { hydrateTwitchStreams } from './api/hydrateTwitch.js';
import { hydrateTrovoStreams } from './api/hydrateTrovo.js';
import { logoutTwitch } from './api/auth.js';
import {
  clearCategoriesTagFilters,
  persist,
  runtime,
  setCategoriesSort,
  setFallbackStreams,
  setFollowedFilter,
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
  if (path === '/categories' || path === '/categories/') {
    return 'categories';
  }
  if (/^\/categories\/[^/]+\/?$/.test(path)) {
    return 'category-detail';
  }
  return 'directory';
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

  const applyRouteUI = () => {
    const routeKind = getRouteKind(state.routePath);
    const isCategoriesRoute = routeKind === 'categories' || routeKind === 'category-detail';

    if (page) {
      page.classList.toggle('is-categories-route', isCategoriesRoute);
      page.classList.toggle('is-directory-route', !isCategoriesRoute);
    }

    if (directoryPage) {
      directoryPage.hidden = isCategoriesRoute;
    }
    if (categoriesPage) {
      categoriesPage.hidden = !isCategoriesRoute;
    }

    navLinks.forEach((link) => {
      const route = link.dataset.route || '/';
      const active =
        route === '/categories'
          ? isCategoriesRoute
          : !isCategoriesRoute && route === '/';
      link.classList.toggle('is-active', active);
    });

    renderCategories();
  };

  const navigateTo = (path, push = true) => {
    const nextPath = typeof path === 'string' && path ? path : '/';
    if (push && window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setRoutePath(window.location.pathname || nextPath);
    applyRouteUI();
    persist();
  };

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
      renderDirectoryList();
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
      renderDirectoryList();
    });
  });

  ageButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.age = btn.dataset.age || '';
      ageButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.age === state.age));
      renderDirectoryList();
    });
  });

  if (languageSelect) {
    languageSelect.addEventListener('change', () => {
      state.language = languageSelect.value;
      renderDirectoryList();
    });
  }

  if (platformSelect) {
    platformSelect.addEventListener('change', () => {
      state.platform = platformSelect.value;
      renderDirectoryList();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.q = searchInput.value.trim();
      renderDirectoryList();
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

  setRoutePath(window.location.pathname || '/');
  applyRouteUI();

  (async () => {
    setFallbackStreams();
    renderDirectoryList();
    renderSlots(slotEls);
    renderCategories();

    const [twitchData, trovoData] = await Promise.all([hydrateTwitchStreams(), hydrateTrovoStreams()]);
    const merged = [...(twitchData || []), ...(trovoData || [])];

    if (merged.length) {
      setStreams(merged, 'live');
      renderDirectoryList();
      renderSlots(slotEls);
      return;
    }

    runtime.source = 'error';
    runtime.error = runtime.error || 'No data';
    renderDirectoryList();
  })();
}
