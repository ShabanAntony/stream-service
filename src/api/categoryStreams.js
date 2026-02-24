export async function fetchCategoryStreamsByName(categoryName, first = 40) {
  const name = String(categoryName || '').trim();
  if (!name) {
    throw new Error('Missing category name');
  }

  const url = `/api/twitch/streams-by-game?name=${encodeURIComponent(name)}&first=${Math.min(
    Math.max(Number(first || 40), 1),
    100
  )}`;

  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Category streams API error: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`);
  }

  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}
