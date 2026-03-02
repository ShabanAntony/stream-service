export async function fetchCategoryStreamsPageByName(categoryName, first = 40, after = '') {
  const name = String(categoryName || '').trim();
  if (!name) {
    throw new Error('Missing category name');
  }

  const url = new URL('/api/twitch/streams-by-game', window.location.origin);
  url.searchParams.set('name', name);
  url.searchParams.set('first', String(Math.min(Math.max(Number(first || 40), 1), 100)));
  if (after) {
    url.searchParams.set('after', String(after));
  }

  const res = await fetch(url.toString(), { credentials: 'same-origin' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Category streams API error: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`);
  }

  const json = await res.json();
  const data = Array.isArray(json.data) ? json.data : [];
  const cursor = json && json.pagination && typeof json.pagination.cursor === 'string' ? json.pagination.cursor : '';
  return {
    data,
    pagination: {
      cursor,
    },
  };
}

export async function fetchCategoryStreamsByName(categoryName, first = 40) {
  const page = await fetchCategoryStreamsPageByName(categoryName, first);
  return page.data;
}
