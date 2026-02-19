function mustEnv(value, name) {
  if (!value) {
    const err = new Error(`Missing env var: ${name}`);
    err.statusCode = 500;
    throw err;
  }
}

function normalizeLang(code) {
  const s = String(code || '').trim();
  return s ? s.toLowerCase() : '';
}

function pickCategoryIdByName(categories, name) {
  const target = String(name || '').trim().toLowerCase();
  if (!target) return null;

  const exact = categories.find((c) => String(c.name || '').trim().toLowerCase() === target);
  if (exact && exact.id) return String(exact.id);

  const first = categories[0];
  return first && first.id ? String(first.id) : null;
}

function createTrovoClient({ clientId }) {
  async function postJson(path, body) {
    mustEnv(clientId, 'TROVO_CLIENT_ID');

    const url = new URL(`https://open-api.trovo.live/openplatform/${path}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Client-ID': clientId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
    });

    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`Trovo API error ${path}: ${res.status} ${text}`);
      err.statusCode = 502;
      throw err;
    }

    return res.json();
  }

  async function searchCategories({ query, limit }) {
    const json = await postJson('searchcategory', { query, limit });
    return Array.isArray(json.category_info) ? json.category_info : [];
  }

  async function getTopChannels({ limit, categoryId }) {
    const json = await postJson('gettopchannels', {
      limit,
      after: true,
      token: '',
      cursor: 0,
      category_id: categoryId || '',
    });

    return Array.isArray(json.top_channels_lists) ? json.top_channels_lists : [];
  }

  async function getStreamsByCategoryName({ name, first }) {
    const categories = await searchCategories({ query: name, limit: 20 });
    const categoryId = pickCategoryIdByName(categories, name);
    if (!categoryId) {
      const err = new Error(`Category not found: ${name}`);
      err.statusCode = 404;
      throw err;
    }

    const channels = await getTopChannels({ limit: first, categoryId });

    return channels
      .filter((c) => c && c.is_live)
      .map((c) => {
        const username = String(c.username || '').trim();
        const channel = (username || String(c.nick_name || '').trim()).toLowerCase();

        return {
          id: `trovo-${channel}`,
          platform: 'trovo',
          channel,
          title: c.nick_name || channel,
          profileImageUrl: c.profile_pic || null,
          category: c.category_name || name || 'Unknown',
          language: normalizeLang(c.language_code),
          region: c.channel_country || null,
          viewerCount: Number(c.current_viewers || 0),
          createdAt: null,
          url: username ? `https://trovo.live/${username}` : 'https://trovo.live/',
          isLive: true,
        };
      });
  }

  return {
    getStreamsByCategoryName,
  };
}

module.exports = {
  createTrovoClient,
};

