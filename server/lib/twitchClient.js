function mustEnv(value, name) {
  if (!value) {
    const err = new Error(`Missing env var: ${name}`);
    err.statusCode = 500;
    throw err;
  }
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function createTwitchClient({ clientId, clientSecret }) {
  let tokenCache = null;

  async function getAppToken() {
    mustEnv(clientId, 'TWITCH_CLIENT_ID');
    mustEnv(clientSecret, 'TWITCH_CLIENT_SECRET');

    if (tokenCache && tokenCache.expiresAtMs > Date.now()) {
      return tokenCache.accessToken;
    }

    const url = new URL('https://id.twitch.tv/oauth2/token');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('client_secret', clientSecret);
    url.searchParams.set('grant_type', 'client_credentials');

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`Twitch token error: ${res.status} ${text}`);
      err.statusCode = 502;
      throw err;
    }

    const json = await res.json();
    const expiresInSec = Number(json.expires_in || 0);
    const skewMs = 30_000;

    tokenCache = {
      accessToken: json.access_token,
      expiresAtMs: Date.now() + expiresInSec * 1000 - skewMs,
    };

    return tokenCache.accessToken;
  }

  async function fetchJson(url, token) {
    const res = await fetch(url, {
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`Twitch API error: ${res.status} ${text}`);
      err.statusCode = 502;
      throw err;
    }

    return res.json();
  }

  async function getUsersById({ token, userIds }) {
    const usersById = new Map();

    for (const group of chunk(userIds, 100)) {
      const url = new URL('https://api.twitch.tv/helix/users');
      group.forEach((id) => url.searchParams.append('id', id));
      const json = await fetchJson(url, token);
      const users = Array.isArray(json.data) ? json.data : [];
      users.forEach((u) => usersById.set(u.id, u));
    }

    return usersById;
  }

  async function getGameIdByName({ token, name }) {
    const url = new URL('https://api.twitch.tv/helix/games');
    url.searchParams.set('name', name);

    const json = await fetchJson(url, token);
    const games = Array.isArray(json.data) ? json.data : [];
    const first = games[0];
    return first && first.id ? String(first.id) : null;
  }

  async function getStreamsByGameName({ name, first }) {
    const token = await getAppToken();
    const gameId = await getGameIdByName({ token, name });
    if (!gameId) {
      const err = new Error(`Game not found: ${name}`);
      err.statusCode = 404;
      throw err;
    }

    const url = new URL('https://api.twitch.tv/helix/streams');
    url.searchParams.set('first', String(first));
    url.searchParams.set('game_id', gameId);

    const streamsJson = await fetchJson(url, token);
    const items = Array.isArray(streamsJson.data) ? streamsJson.data : [];
    const userIds = Array.from(new Set(items.map((s) => s.user_id).filter(Boolean)));
    const usersById = await getUsersById({ token, userIds });

    return items.map((s) => {
      const user = usersById.get(s.user_id) || {};
      const channel = (s.user_login || s.user_name || '').toLowerCase();
      const id = `twitch-${channel}`;

      return {
        id,
        platform: 'twitch',
        channel,
        title: s.user_name || channel,
        profileImageUrl: user.profile_image_url || null,
        category: s.game_name || 'Unknown',
        language: s.language || '',
        region: null,
        viewerCount: Number(s.viewer_count || 0),
        createdAt: user.created_at ? String(user.created_at).slice(0, 10) : null,
        url: channel ? `https://www.twitch.tv/${channel}` : 'https://www.twitch.tv/',
        isLive: true,
      };
    });
  }

  return {
    getStreamsByGameName,
  };
}

module.exports = {
  createTwitchClient,
};

