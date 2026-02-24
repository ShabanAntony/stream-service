function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export async function fetchCategoryTaxonomy() {
  const res = await fetch('/src/data/category-taxonomy.json', {
    credentials: 'same-origin',
  });

  if (!res.ok) {
    throw new Error(`Taxonomy load failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

function buildTaxonomyIndices(taxonomy) {
  const byId = new Map();
  const byName = new Map();
  const entries = Object.entries(taxonomy?.categories || {});

  entries.forEach(([key, entry]) => {
    if (!entry || typeof entry !== 'object') return;

    const providerGameId = entry.providerGameId || (/^\d+$/.test(key) ? key : null);
    if (providerGameId) {
      byId.set(String(providerGameId), entry);
    }

    const names = [entry.displayName, ...(Array.isArray(entry.matchNames) ? entry.matchNames : [])]
      .map(normalizeText)
      .filter(Boolean);

    names.forEach((name) => {
      if (!byName.has(name)) {
        byName.set(name, entry);
      }
    });
  });

  return { byId, byName };
}

function mapTagSlugsToTags(tagSlugs, taxonomy) {
  const catalog = taxonomy?.tagCatalog || {};
  const out = [];

  (Array.isArray(tagSlugs) ? tagSlugs : []).forEach((slug) => {
    const key = String(slug || '').trim();
    if (!key) return;
    const item = catalog[key];
    out.push({
      id: key,
      name: item?.label || key,
      group: item?.group || '',
    });
  });

  return out;
}

export function applyCategoryTaxonomy(categories, taxonomy) {
  const list = Array.isArray(categories) ? categories : [];
  if (!taxonomy || typeof taxonomy !== 'object') {
    return {
      data: list.map((category) => ({ ...category, tags: [] })),
      meta: { matched: 0, total: list.length, taxonomyLoaded: false },
    };
  }

  const { byId, byName } = buildTaxonomyIndices(taxonomy);
  let matched = 0;

  const data = list.map((category) => {
    const byCategoryId = byId.get(String(category.id || ''));
    const byCategoryName = byName.get(normalizeText(category.name));
    const entry = byCategoryId || byCategoryName || null;

    if (entry) {
      matched += 1;
    }

    const taxonomyTags = mapTagSlugsToTags(entry?.tagSlugs, taxonomy);

    return {
      ...category,
      tags: taxonomyTags,
      taxonomyStatus: entry?.status || (entry ? 'mapped' : 'unmapped'),
      taxonomySlug: entry?.slug || null,
    };
  });

  return {
    data,
    meta: { matched, total: list.length, taxonomyLoaded: true },
  };
}
