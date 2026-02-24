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

  async function fetchUserJson(url, accessToken) {
    mustEnv(clientId, 'TWITCH_CLIENT_ID');

    const res = await fetch(url, {
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`Twitch API error: ${res.status} ${text}`);
      err.statusCode = res.status === 401 ? 401 : 502;
      err.body = text;
      throw err;
    }

    return res.json();
  }

  async function exchangeAuthCode({ code, redirectUri }) {
    mustEnv(clientId, 'TWITCH_CLIENT_ID');
    mustEnv(clientSecret, 'TWITCH_CLIENT_SECRET');

    const url = new URL('https://id.twitch.tv/oauth2/token');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('client_secret', clientSecret);
    url.searchParams.set('code', code);
    url.searchParams.set('grant_type', 'authorization_code');
    url.searchParams.set('redirect_uri', redirectUri);

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`Twitch auth code exchange failed: ${res.status} ${text}`);
      err.statusCode = 502;
      throw err;
    }

    return res.json();
  }

  async function refreshUserToken({ refreshToken }) {
    mustEnv(clientId, 'TWITCH_CLIENT_ID');
    mustEnv(clientSecret, 'TWITCH_CLIENT_SECRET');

    const url = new URL('https://id.twitch.tv/oauth2/token');
    url.searchParams.set('grant_type', 'refresh_token');
    url.searchParams.set('refresh_token', refreshToken);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('client_secret', clientSecret);

    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`Twitch token refresh failed: ${res.status} ${text}`);
      err.statusCode = 401;
      throw err;
    }

    return res.json();
  }

  async function validateAccessToken({ accessToken }) {
    const res = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`Twitch token validate failed: ${res.status} ${text}`);
      err.statusCode = res.status === 401 ? 401 : 502;
      throw err;
    }

    return res.json();
  }

  async function getCurrentUser({ accessToken }) {
    const json = await fetchUserJson('https://api.twitch.tv/helix/users', accessToken);
    const users = Array.isArray(json.data) ? json.data : [];
    return users[0] || null;
  }

  async function revokeToken({ token }) {
    if (!token) return;
    mustEnv(clientId, 'TWITCH_CLIENT_ID');

    const url = new URL('https://id.twitch.tv/oauth2/revoke');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('token', token);

    await fetch(url, { method: 'POST' }).catch(() => null);
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
        tagIds: Array.isArray(s.tag_ids) ? [...s.tag_ids] : [],
      };
    });
  }

  async function getGameById({ token, id }) {
    const url = new URL('https://api.twitch.tv/helix/games');
    url.searchParams.set('id', id);
    const json = await fetchJson(url, token);
    const games = Array.isArray(json.data) ? json.data : [];
    return games[0] || null;
  }

  async function getTopCategoriesWithTags({ first = 10 }) {
    const topFirst = Math.min(Math.max(Number(first || 10), 3), 30);
    const token = await getAppToken();

    const topUrl = new URL('https://api.twitch.tv/helix/games/top');
    topUrl.searchParams.set('first', String(topFirst));
    const topJson = await fetchJson(topUrl, token);
    const games = Array.isArray(topJson.data) ? topJson.data : [];

    if (!games.some((g) => g.name?.toLowerCase() === 'just chatting')) {
      const jc = await getGameById({ token, id: '509658' });
      if (jc) {
        games.unshift(jc);
      }
    }

    const categoryEntries = [];

    for (const game of games.slice(0, topFirst)) {
      const streamUrl = new URL('https://api.twitch.tv/helix/streams');
      streamUrl.searchParams.set('first', '20');
      streamUrl.searchParams.set('game_id', game.id);

      let streamItems = [];
      try {
        const streamJson = await fetchJson(streamUrl, token);
        streamItems = Array.isArray(streamJson.data) ? streamJson.data : [];
      } catch {
        streamItems = [];
      }

      const categoryTags = new Map();
      let viewerCount = 0;

      streamItems.forEach((stream) => {
        viewerCount += Number(stream.viewer_count || 0);
        const streamTags = Array.isArray(stream.tags) ? stream.tags : [];
        streamTags.forEach((name) => {
          if (!name || typeof name !== 'string') return;
          const normalized = name.trim();
          if (!normalized) return;
          const tagId = `tag-${normalized.toLowerCase()}`;
          if (!categoryTags.has(tagId)) {
            categoryTags.set(tagId, {
              id: tagId,
              name: normalized,
              description: '',
            });
          }
        });
      });

      categoryEntries.push({
        id: game.id,
        name: game.name,
        boxArtUrl: game.box_art_url,
        viewerCount,
        streamCount: streamItems.length,
        tags: Array.from(categoryTags.values()),
      });
    }

    return categoryEntries.map((category) => ({
      id: category.id,
      name: category.name,
      boxArtUrl: category.boxArtUrl,
      viewerCount: category.viewerCount,
      streamCount: category.streamCount,
      tags: category.tags,
    }));
  }

  async function getFollowedUsers({ accessToken, userId, first = 20, after }) {
    if (!userId) {
      const err = new Error('Missing user id for follows request');
      err.statusCode = 400;
      throw err;
    }

    const pageSize = Math.min(Math.max(Number(first || 20), 1), 100);
    const url = new URL('https://api.twitch.tv/helix/users/follows');
    url.searchParams.set('from_id', String(userId));
    url.searchParams.set('first', String(pageSize));
    if (after) {
      url.searchParams.set('after', String(after));
    }

    const json = await fetchUserJson(url, accessToken);
    const followEntries = Array.isArray(json.data) ? json.data : [];
    const userIds = Array.from(new Set(followEntries.map((rec) => rec.to_id).filter(Boolean)));
    const usersById = userIds.length ? await getUsersById({ token: accessToken, userIds }) : new Map();

    const data = followEntries.map((entry) => {
      const user = usersById.get(entry.to_id) || {};
      const login = (user.login || entry.to_login || '').toLowerCase();
      const displayName = user.display_name || entry.to_name || login || 'Unknown';
      const id = login ? `twitch-${login}` : `twitch-${entry.to_id}`;

      return {
        id,
        login,
        displayName,
        url: login ? `https://www.twitch.tv/${login}` : `https://www.twitch.tv/${entry.to_id}`,
        profileImageUrl: user.profile_image_url || null,
        followedAt: entry.followed_at ? String(entry.followed_at) : null,
      };
    });

    return {
      data,
      pagination: json.pagination || {},
    };
  }

  return {
    getStreamsByGameName,
    getTopCategoriesWithTags,
    getFollowedUsers,
    exchangeAuthCode,
    refreshUserToken,
    validateAccessToken,
    getCurrentUser,
    revokeToken,
  };
}

module.exports = {
  createTwitchClient,
};
