export async function fetchCategories() {
  try {
    const res = await fetch('/api/twitch/categories', {
      credentials: 'same-origin',
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const message = `Categories API error: ${res.status} ${res.statusText}${body ? ` - ${body}` : ''}`;
      console.error('[categories] request failed', {
        status: res.status,
        statusText: res.statusText,
        body,
      });
      throw new Error(message);
    }

    const json = await res.json();
    const data = Array.isArray(json.data) ? json.data : [];
    console.info('[categories] loaded', {
      count: data.length,
      categoriesWithTags: data.filter((item) => Array.isArray(item.tags) && item.tags.length > 0).length,
    });
    return data;
  } catch (error) {
    console.error('[categories] fetch exception', error);
    throw error instanceof Error ? error : new Error('Categories request failed');
  }
}
