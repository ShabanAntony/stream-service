require('dotenv').config();

const express = require('express');

const app = express();
const port = Number(process.env.PORT || 3000);

const twitchClientId = process.env.TWITCH_CLIENT_ID;
const twitchClientSecret = process.env.TWITCH_CLIENT_SECRET;

let twitchToken = null;

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

async function getTwitchAppToken() {
  mustEnv(twitchClientId, 'TWITCH_CLIENT_ID');
  mustEnv(twitchClientSecret, 'TWITCH_CLIENT_SECRET');

  if (twitchToken && twitchToken.expiresAtMs > Date.now()) {
    return twitchToken.accessToken;
  }

  const url = new URL('https://id.twitch.tv/oauth2/token');
  url.searchParams.set('client_id', twitchClientId);
  url.searchParams.set('client_secret', twitchClientSecret);
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

  twitchToken = {
    accessToken: json.access_token,
    expiresAtMs: Date.now() + expiresInSec * 1000 - skewMs,
  };

  return twitchToken.accessToken;
}

async function twitchFetchJson(url, token) {
  const res = await fetch(url, {
    headers: {
      'Client-ID': twitchClientId,
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

async function twitchGetStreams({ token, first, language, logins }) {
  const url = new URL('https://api.twitch.tv/helix/streams');

  if (Array.isArray(logins) && logins.length) {
    logins.forEach((login) => url.searchParams.append('user_login', login));
  } else {
    url.searchParams.set('first', String(first));
    if (language) {
      url.searchParams.set('language', language);
    }
  }

  if (language && Array.isArray(logins) && logins.length) {
    url.searchParams.set('language', language);
  }

  return twitchFetchJson(url, token);
}

async function twitchGetUsersById({ token, userIds }) {
  const usersById = new Map();

  for (const group of chunk(userIds, 100)) {
    const url = new URL('https://api.twitch.tv/helix/users');
    group.forEach((id) => url.searchParams.append('id', id));

    const json = await twitchFetchJson(url, token);
    const users = Array.isArray(json.data) ? json.data : [];
    users.forEach((u) => usersById.set(u.id, u));
  }

  return usersById;
}

async function twitchGetUsersByLogin({ token, logins }) {
  const usersByLogin = new Map();

  for (const group of chunk(logins, 100)) {
    const url = new URL('https://api.twitch.tv/helix/users');
    group.forEach((login) => url.searchParams.append('login', login));

    const json = await twitchFetchJson(url, token);
    const users = Array.isArray(json.data) ? json.data : [];
    users.forEach((u) => {
      if (u && u.login) {
        usersByLogin.set(String(u.login).toLowerCase(), u);
      }
    });
  }

  return usersByLogin;
}

async function twitchGetGameIdByName({ token, name }) {
  const url = new URL('https://api.twitch.tv/helix/games');
  url.searchParams.set('name', name);

  const json = await twitchFetchJson(url, token);
  const games = Array.isArray(json.data) ? json.data : [];
  const first = games[0];

  return first && first.id ? String(first.id) : null;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/twitch/streams-by-game', async (req, res) => {
  try {
    const token = await getTwitchAppToken();

    const name = String(req.query.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'Missing query param: name' });
      return;
    }

    const first = Math.min(Math.max(Number(req.query.first || 10), 1), 100);

    const gameId = await twitchGetGameIdByName({ token, name });
    if (!gameId) {
      res.status(404).json({ error: `Game not found: ${name}` });
      return;
    }

    const url = new URL('https://api.twitch.tv/helix/streams');
    url.searchParams.set('first', String(first));
    url.searchParams.set('game_id', gameId);

    const streamsJson = await twitchFetchJson(url, token);
    const items = Array.isArray(streamsJson.data) ? streamsJson.data : [];
    const userIds = Array.from(new Set(items.map((s) => s.user_id).filter(Boolean)));

    const usersById = await twitchGetUsersById({ token, userIds });

    const normalized = items.map((s) => {
      const user = usersById.get(s.user_id) || {};
      const channel = (s.user_login || s.user_name || '').toLowerCase();
      const id = `twitch-${channel}`;

      return {
        id,
        platform: 'twitch',
        channel,
        title: s.user_name || channel,
        category: s.game_name || 'Unknown',
        language: s.language || '',
        region: null,
        viewerCount: Number(s.viewer_count || 0),
        createdAt: user.created_at ? String(user.created_at).slice(0, 10) : null,
        url: channel ? `https://www.twitch.tv/${channel}` : 'https://www.twitch.tv/',
        isLive: true,
      };
    });

    res.json({ data: normalized });
  } catch (err) {
    const status = err && err.statusCode ? err.statusCode : 500;
    res.status(status).json({ error: String(err.message || err) });
  }
});

app.get('/api/twitch/streams', async (req, res) => {
  try {
    const token = await getTwitchAppToken();

    const first = Math.min(Math.max(Number(req.query.first || 40), 1), 100);
    const language = String(req.query.language || '');

    const loginsParam = req.query.logins;
    const logins =
      typeof loginsParam === 'string'
        ? loginsParam
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        : [];

    if (logins.length) {
      const usersByLogin = await twitchGetUsersByLogin({ token, logins });

      const streamsJson = await twitchGetStreams({
        token,
        first,
        language,
        logins,
      });

      const liveItems = Array.isArray(streamsJson.data) ? streamsJson.data : [];
      const liveByLogin = new Map(
        liveItems.map((s) => [String(s.user_login || '').toLowerCase(), s])
      );

      const ordered = logins.map((login) => {
        const user = usersByLogin.get(login) || {};
        const stream = liveByLogin.get(login) || null;
        const channel = login;

        return {
          id: `twitch-${channel}`,
          platform: 'twitch',
          channel,
          title: user.display_name || channel,
          category: stream ? stream.game_name || 'Unknown' : 'Offline',
          language: stream ? stream.language || '' : '',
          region: null,
          viewerCount: stream ? Number(stream.viewer_count || 0) : 0,
          createdAt: user.created_at ? String(user.created_at).slice(0, 10) : null,
          url: `https://www.twitch.tv/${channel}`,
          isLive: Boolean(stream),
        };
      });

      res.json({ data: ordered });
      return;
    }

    const streamsJson = await twitchGetStreams({
      token,
      first,
      language,
      logins,
    });

    const items = Array.isArray(streamsJson.data) ? streamsJson.data : [];
    const userIds = Array.from(new Set(items.map((s) => s.user_id).filter(Boolean)));

    const usersById = await twitchGetUsersById({ token, userIds });

    const normalized = items.map((s) => {
      const user = usersById.get(s.user_id) || {};
      const channel = (s.user_login || s.user_name || '').toLowerCase();
      const id = `twitch-${channel}`;

      return {
        id,
        platform: 'twitch',
        channel,
        title: s.user_name || channel,
        category: s.game_name || 'Unknown',
        language: s.language || '',
        region: null,
        viewerCount: Number(s.viewer_count || 0),
        createdAt: user.created_at ? String(user.created_at).slice(0, 10) : null,
        url: channel ? `https://www.twitch.tv/${channel}` : 'https://www.twitch.tv/',
        isLive: true,
      };
    });

    res.json({ data: normalized });
  } catch (err) {
    const status = err && err.statusCode ? err.statusCode : 500;
    res.status(status).json({ error: String(err.message || err) });
  }
});

app.use(express.static(process.cwd()));

app.listen(port, () => {
  console.log(`Stream Hub running on http://localhost:${port}`);
});
