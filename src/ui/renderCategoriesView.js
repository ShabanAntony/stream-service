import { state } from '../store.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatNumber } from '../utils/format.js';

function getRouteInfo() {
  const path = window.location.pathname || '/';
  if (path === '/categories') {
    return { page: 'categories-list', categoryId: null };
  }
  const match = path.match(/^\/categories\/([^/]+)$/);
  if (match) {
    return { page: 'category-detail', categoryId: decodeURIComponent(match[1]) };
  }
  return { page: 'directory', categoryId: null };
}

function buildTagMap(categories) {
  void categories;
  // Temporarily disable Twitch stream-level tags on Categories page:
  // they are too noisy/user-defined for category taxonomy filtering.
  return new Map();
}

function getFilteredCategories(categories) {
  // Tag filtering is temporarily disabled until curated category taxonomy is added.
  const activeTagIds = [];
  const filtered = categories.filter((category) => {
    if (!activeTagIds.length) return true;
    const tagSet = new Set((category.tags || []).map((tag) => tag.id));
    return activeTagIds.every((tagId) => tagSet.has(tagId));
  });

  filtered.sort((a, b) => {
    if (state.categoriesSort === 'viewer_asc') {
      return Number(a.viewerCount || 0) - Number(b.viewerCount || 0);
    }
    return Number(b.viewerCount || 0) - Number(a.viewerCount || 0);
  });

  return filtered;
}

function renderSort(refs) {
  if (!refs.categorySortButtons) return;
  refs.categorySortButtons.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.sort === state.categoriesSort);
  });
}

function renderActiveTags(refs, tagMap) {
  if (!refs.categoryActiveList) return;
  if (state.categoriesLoading) {
    refs.categoryActiveList.innerHTML = '<div class="category-filter__empty">Loading...</div>';
    return;
  }
  if (!tagMap.size) {
    refs.categoryActiveList.innerHTML = '<div class="category-filter__empty">Category tags are disabled for now</div>';
    return;
  }
  if (state.categoriesError) {
    refs.categoryActiveList.innerHTML = '<div class="category-filter__empty">Unavailable</div>';
    return;
  }
  if (!state.categoriesTagFilters.length) {
    refs.categoryActiveList.innerHTML = '<div class="category-filter__empty">No active filters</div>';
    return;
  }

  refs.categoryActiveList.innerHTML = state.categoriesTagFilters
    .map((tagId) => {
      const tag = tagMap.get(tagId);
      if (!tag) return '';
      return `<button class="chip chip--tag is-active js-category-tag-chip" type="button" data-tag="${escapeHtml(
        tag.id
      )}">${escapeHtml(tag.name)}</button>`;
    })
    .join('');
}

function renderTagCheckboxes(refs, tagMap) {
  if (!refs.categoryTagList) return;
  if (state.categoriesLoading) {
    refs.categoryTagList.innerHTML = '<div class="ui-note">Loading tags...</div>';
    return;
  }
  if (state.categoriesError) {
    refs.categoryTagList.innerHTML = `<div class="ui-note ui-note--error">${escapeHtml(state.categoriesError)}</div>`;
    return;
  }

  const active = new Set(state.categoriesTagFilters);
  const sortedTags = [...tagMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  if (!sortedTags.length) {
    refs.categoryTagList.innerHTML =
      '<div class="ui-note">Category taxonomy tags are temporarily disabled. We will replace Twitch user tags with curated category tags.</div>';
    return;
  }

  refs.categoryTagList.innerHTML = sortedTags
    .map((tag) => {
      const checked = active.has(tag.id) ? 'checked' : '';
      const label = escapeHtml(tag.name);
      return `
        <label class="tag-check">
          <input class="tag-check__input js-category-tag-checkbox" type="checkbox" data-tag="${escapeHtml(tag.id)}" ${checked} />
          <span class="tag-check__box" aria-hidden="true"></span>
          <span class="tag-check__label">${label}</span>
        </label>
      `;
    })
    .join('');
}

function renderCategoryCards(refs, categories, routeInfo) {
  if (!refs.categoryGrid || !refs.categoryMetaEl) return;

  if (state.categoriesLoading) {
    refs.categoryMetaEl.textContent = 'Loading categories...';
    refs.categoryGrid.innerHTML = '<div class="ui-note">Loading categories...</div>';
    return;
  }

  if (state.categoriesError) {
    refs.categoryMetaEl.textContent = 'Categories load failed';
    refs.categoryGrid.innerHTML = `<div class="ui-note ui-note--error">${escapeHtml(state.categoriesError)}</div>`;
    return;
  }

  const getBoxArtUrl = (boxArtUrl, size = 'card') => {
    if (!boxArtUrl) return '';
    // Twitch game box_art is portrait-oriented. Request portrait dimensions
    // and crop in CSS to avoid server-side stretching.
    const dims = size === 'detail' ? { width: '570', height: '760' } : { width: '285', height: '380' };
    return boxArtUrl
      .replace('{width}', dims.width)
      .replace('{height}', dims.height);
  };

  if (routeInfo.page === 'category-detail' && routeInfo.categoryId) {
    const selected = categories.find((category) => category.id === routeInfo.categoryId) || null;
    refs.categoryMetaEl.textContent = selected ? 'Category page' : 'Category not found';
    refs.categoryGrid.innerHTML = selected
      ? `
        <article class="category-card category-card--detail">
          <div class="category-card__media">
            ${
              selected.boxArtUrl
                ? `<img class="category-card__art" src="${escapeHtml(
                    getBoxArtUrl(selected.boxArtUrl, 'detail')
                  )}" alt="${escapeHtml(selected.name)} cover" loading="lazy" />`
                : ''
            }
          </div>
          <div class="category-card__body">
            <div class="category-card__back">
              <a class="action-btn js-route-link" href="/categories" data-route="/categories">Back to categories</a>
            </div>
            <h2 class="category-card__title category-card__title--lg">${escapeHtml(selected.name)}</h2>
            <div class="category-card__stats">${formatNumber(Number(selected.viewerCount || 0))} viewers (sampled)</div>
            <div class="category-card__tags">${
              '<div class="category-card__tags-empty">Category tags coming soon</div>'
            }</div>
            <div class="category-card__placeholder">Streamers inside this category will be shown here next.</div>
          </div>
        </article>
      `
      : '<div class="category-card__placeholder">Unknown category.</div>';
    return;
  }

  const filtered = getFilteredCategories(categories);
  refs.categoryMetaEl.textContent = `${filtered.length} categories`;

  refs.categoryGrid.innerHTML = filtered
    .map((category) => {
      const boxArt = category.boxArtUrl
        ? `<img class="category-card__art" src="${escapeHtml(
            getBoxArtUrl(category.boxArtUrl, 'card')
          )}" alt="${escapeHtml(category.name)} cover" loading="lazy" />`
        : '';
      const tagsHtml =
        '<div class="category-card__tags-empty">Category tags coming soon</div>';

      return `
        <article class="category-card">
          <a class="category-card__link js-route-link" href="/categories/${encodeURIComponent(category.id)}" data-route="/categories/${encodeURIComponent(
        category.id
      )}">
            <div class="category-card__media">${boxArt}</div>
            <div class="category-card__body">
              <h3 class="category-card__title">${escapeHtml(category.name)}</h3>
              <div class="category-card__stats">${formatNumber(Number(category.viewerCount || 0))} viewers</div>
              <div class="category-card__tags">${tagsHtml}</div>
            </div>
          </a>
        </article>
      `;
    })
    .join('');
}

export function renderCategoriesView(refs, categories) {
  const categoryList = Array.isArray(categories) ? categories : [];
  const routeInfo = getRouteInfo();
  const tagMap = buildTagMap(categoryList);

  renderSort(refs);
  renderActiveTags(refs, tagMap);
  renderTagCheckboxes(refs, tagMap);
  renderCategoryCards(refs, categoryList, routeInfo);
}
