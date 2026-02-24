import { state } from '../store.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { formatNumber, getAgeTier } from '../utils/format.js';

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
  const map = new Map();
  categories.forEach((category) => {
    (category.tags || []).forEach((tag) => {
      if (!tag || !tag.id) return;
      if (!map.has(tag.id)) {
        map.set(tag.id, tag);
      }
    });
  });
  return map;
}

function getFilteredCategories(categories) {
  const activeTagIds = state.categoriesTagFilters;
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

function getFilteredCategoryStreams(streams) {
  const followedSet = state.followedFilter
    ? new Set(state.followedChannels.map((channel) => channel.id))
    : null;

  const qRaw = String(state.q || '').toLowerCase().trim();
  let q = qRaw.replace(/^https?:\/\/(www\.)?twitch\.tv\//, '');
  q = q.split(/[/?#]/)[0] || q;

  const filtered = (Array.isArray(streams) ? streams : []).filter((stream) => {
    if (q) {
      const qMatch =
        stream.title?.toLowerCase().includes(q) ||
        stream.channel?.toLowerCase().includes(q) ||
        stream.category?.toLowerCase().includes(q);
      if (!qMatch) return false;
    }
    if (state.language && stream.language !== state.language) return false;
    if (state.platform && stream.platform !== state.platform) return false;
    if (state.age && getAgeTier(stream.createdAt) !== state.age) return false;
    if (followedSet && !followedSet.has(stream.id)) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (state.sort === 'online_asc') return Number(a.viewerCount || 0) - Number(b.viewerCount || 0);
    if (state.sort === 'created_desc') {
      return new Date(b.createdAt || '1970-01-01').getTime() - new Date(a.createdAt || '1970-01-01').getTime();
    }
    if (state.sort === 'created_asc') {
      return new Date(a.createdAt || '1970-01-01').getTime() - new Date(b.createdAt || '1970-01-01').getTime();
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
    refs.categoryTagList.innerHTML = '<div class="ui-note">No curated category tags found for current categories yet.</div>';
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
    refs.categoryMetaEl.textContent = selected ? 'Channels' : 'Category not found';
    if (!selected) {
      refs.categoryGrid.innerHTML = '<div class="category-card__placeholder">Unknown category.</div>';
      return;
    }

    const categoryTagsHtml =
      (selected.tags || [])
        .map((tag) => `<span class="chip chip--tag">${escapeHtml(tag.name)}</span>`)
        .join('') || '<div class="category-card__tags-empty">No category tags</div>';

    const filteredStreams = getFilteredCategoryStreams(state.categoryStreams);

    const streamsSection = (() => {
      if (state.categoryStreamsLoading) {
        return '<div class="ui-note">Loading channels for this category...</div>';
      }

      if (state.categoryStreamsError) {
        return `<div class="ui-note ui-note--error">${escapeHtml(state.categoryStreamsError)}</div>`;
      }

      if (!state.categoryStreams.length) {
        return '<div class="ui-note">No live channels found for this category.</div>';
      }

      if (!filteredStreams.length) {
        return '<div class="ui-note">No channels match current filters.</div>';
      }

      return `
        <div class="category-channel-grid">
          ${filteredStreams
            .map((stream) => {
              const avatarHtml = stream.profileImageUrl
                ? `<img class="stream-card__avatar-img" src="${escapeHtml(stream.profileImageUrl)}" alt="${escapeHtml(stream.title)}" loading="lazy" />`
                : '';
              const viewersLabel =
                stream.isLive === false ? 'Currently offline' : `${formatNumber(Number(stream.viewerCount || 0))} viewers`;
              return `
                <article class="category-channel-card" data-id="${escapeHtml(stream.id)}">
                  <div class="category-channel-card__media">
                    <div class="stream-card__avatar category-channel-card__avatar" aria-hidden="true">${avatarHtml}</div>
                  </div>
                  <div class="category-channel-card__body">
                    <h3 class="category-channel-card__title">${escapeHtml(stream.title)}</h3>
                    <div class="category-channel-card__meta">
                      <span>${escapeHtml(stream.channel)}</span>
                      <span>${escapeHtml(stream.language ? stream.language.toUpperCase() : '')}</span>
                      <span>${viewersLabel}</span>
                    </div>
                  </div>
                  <div class="category-channel-card__actions">
                    <button
                      class="action-btn action-btn--primary js-watch-stream-btn"
                      type="button"
                      data-stream-id="${escapeHtml(stream.id)}"
                      data-category-id="${escapeHtml(selected.id)}"
                      data-category-name="${escapeHtml(selected.name)}"
                      ${stream.isLive === false ? 'disabled' : ''}
                    >
                      Watch
                    </button>
                    <a class="action-btn" href="${escapeHtml(stream.url)}" target="_blank" rel="noreferrer">Open</a>
                  </div>
                </article>
              `;
            })
            .join('')}
        </div>
      `;
    })();

    refs.categoryGrid.innerHTML = selected
      ? `
        <article class="category-card category-card--detail">
          <div class="category-card__body">
            <div class="category-detail-head">
              <div class="category-detail-head__media">
                ${
                  selected.boxArtUrl
                    ? `<img class="category-card__art" src="${escapeHtml(
                        getBoxArtUrl(selected.boxArtUrl, 'detail')
                      )}" alt="${escapeHtml(selected.name)} cover" loading="lazy" />`
                    : ''
                }
              </div>
              <div class="category-detail-head__meta">
                <div class="category-card__back">
                  <a class="action-btn js-route-link" href="/categories" data-route="/categories">Back to categories</a>
                </div>
                <h2 class="category-card__title category-card__title--lg">${escapeHtml(selected.name)}</h2>
                <div class="category-card__stats">${formatNumber(Number(selected.viewerCount || 0))} viewers (sampled)</div>
                <div class="category-card__tags">${categoryTagsHtml}</div>
              </div>
            </div>
            <div class="category-card__section-title">Live channels (${filteredStreams.length})</div>
            ${streamsSection}
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
        (category.tags || [])
          .map((tag) => `<span class="chip chip--tag">${escapeHtml(tag.name)}</span>`)
          .join('') || '<div class="category-card__tags-empty">No category tags</div>';

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
