const crypto = require('crypto');
const express = require('express');

const SESSION_COOKIE = 'streamhub_sid';
const STATE_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const VALIDATE_INTERVAL_MS = 55 * 60 * 1000;

function randomId(bytes = 24) {
  return crypto.randomBytes(bytes).toString('hex');
}

function parseCookies(headerValue) {
  const out = {};
  const raw = String(headerValue || '');
  if (!raw) return out;

  raw.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx <= 0) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(value);
  });

  return out;
}

function buildCookie(name, value, { maxAgeSec, httpOnly = true, sameSite = 'Lax', secure = false, path = '/' }) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (typeof maxAgeSec === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`);
  }
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function isSafeReturnTo(returnTo) {
  return typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//');
}

function createTwitchAuthRouter({ twitchClient, clientId, redirectUri, scopes = [] }) {
  const router = express.Router();
  const oauthStateStore = new Map();
  const sessions = new Map();

  function getCookieConfig(req) {
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '');
    const secure = req.secure || forwardedProto.includes('https');
    return { secure };
  }

  function setSessionCookie(res, req, sessionId) {
    const { secure } = getCookieConfig(req);
    res.setHeader(
      'Set-Cookie',
      buildCookie(SESSION_COOKIE, sessionId, {
        maxAgeSec: SESSION_TTL_MS / 1000,
        httpOnly: true,
        sameSite: 'Lax',
        secure,
      })
    );
  }

  function clearSessionCookie(res, req) {
    const { secure } = getCookieConfig(req);
    res.setHeader(
      'Set-Cookie',
      buildCookie(SESSION_COOKIE, '', {
        maxAgeSec: 0,
        httpOnly: true,
        sameSite: 'Lax',
        secure,
      })
    );
  }

  function getSessionId(req) {
    const cookies = parseCookies(req.headers.cookie);
    return cookies[SESSION_COOKIE] || null;
  }

  function deleteSession(req, res) {
    const sessionId = getSessionId(req);
    if (!sessionId) {
      clearSessionCookie(res, req);
      return null;
    }

    const session = sessions.get(sessionId) || null;
    sessions.delete(sessionId);
    clearSessionCookie(res, req);
    return session;
  }

  async function ensureFreshSession(req, res) {
    const sessionId = getSessionId(req);
    if (!sessionId) return null;

    const session = sessions.get(sessionId);
    if (!session) {
      clearSessionCookie(res, req);
      return null;
    }

    if (session.expiresAtMs <= Date.now()) {
      sessions.delete(sessionId);
      clearSessionCookie(res, req);
      return null;
    }

    const needsValidate =
      !session.lastValidatedAtMs || Date.now() - session.lastValidatedAtMs > VALIDATE_INTERVAL_MS;

    if (!needsValidate) {
      return { sessionId, session };
    }

    try {
      const validation = await twitchClient.validateAccessToken({ accessToken: session.accessToken });
      session.lastValidatedAtMs = Date.now();
      session.scopes = Array.isArray(validation.scopes) ? validation.scopes : session.scopes;
      session.login = validation.login || session.login;
      session.userId = validation.user_id || session.userId;
      sessions.set(sessionId, session);
      return { sessionId, session };
    } catch (err) {
      if (!session.refreshToken) {
        sessions.delete(sessionId);
        clearSessionCookie(res, req);
        return null;
      }

      try {
        const refreshed = await twitchClient.refreshUserToken({ refreshToken: session.refreshToken });
        session.accessToken = refreshed.access_token;
        session.refreshToken = refreshed.refresh_token || session.refreshToken;
        session.scopes = Array.isArray(refreshed.scope) ? refreshed.scope : session.scopes;
        session.expiresAtMs = Date.now() + Number(refreshed.expires_in || 0) * 1000;
        session.lastValidatedAtMs = 0;

        const validation = await twitchClient.validateAccessToken({ accessToken: session.accessToken });
        session.lastValidatedAtMs = Date.now();
        session.scopes = Array.isArray(validation.scopes) ? validation.scopes : session.scopes;
        session.login = validation.login || session.login;
        session.userId = validation.user_id || session.userId;

        sessions.set(sessionId, session);
        return { sessionId, session };
      } catch {
        sessions.delete(sessionId);
        clearSessionCookie(res, req);
        return null;
      }
    }
  }

  function compactStores() {
    const now = Date.now();
    for (const [state, record] of oauthStateStore.entries()) {
      if (!record || record.expiresAtMs <= now) {
        oauthStateStore.delete(state);
      }
    }
    for (const [sid, session] of sessions.entries()) {
      if (!session || session.expiresAtMs <= now) {
        sessions.delete(sid);
      }
    }
  }

  router.get('/twitch/login', (req, res) => {
    compactStores();

    if (!clientId) {
      res.status(500).json({ error: 'Missing env var: TWITCH_CLIENT_ID' });
      return;
    }

    const state = randomId(18);
    const requestedReturnTo = String(req.query.returnTo || '/');
    const returnTo = isSafeReturnTo(requestedReturnTo) ? requestedReturnTo : '/';

    oauthStateStore.set(state, {
      returnTo,
      expiresAtMs: Date.now() + STATE_TTL_MS,
    });

    const authUrl = new URL('https://id.twitch.tv/oauth2/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('force_verify', 'false');
    authUrl.searchParams.set('state', state);
    if (scopes.length) {
      authUrl.searchParams.set('scope', scopes.join(' '));
    }

    res.redirect(authUrl.toString());
  });

  router.get('/twitch/callback', async (req, res) => {
    compactStores();

    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    const error = String(req.query.error || '');
    const errorDescription = String(req.query.error_description || '');

    const stateRecord = oauthStateStore.get(state);
    oauthStateStore.delete(state);

    if (!stateRecord || stateRecord.expiresAtMs <= Date.now()) {
      res.status(400).send('Invalid or expired OAuth state.');
      return;
    }

    if (error) {
      const destination = new URL(stateRecord.returnTo, 'http://localhost');
      destination.searchParams.set('auth_error', error);
      if (errorDescription) {
        destination.searchParams.set('auth_error_description', errorDescription);
      }
      res.redirect(destination.pathname + destination.search);
      return;
    }

    if (!code) {
      res.status(400).send('Missing authorization code.');
      return;
    }

    try {
      const tokenJson = await twitchClient.exchangeAuthCode({ code, redirectUri });
      const accessToken = tokenJson.access_token;
      const refreshToken = tokenJson.refresh_token || null;
      const expiresInSec = Number(tokenJson.expires_in || 0);
      const scope = Array.isArray(tokenJson.scope) ? tokenJson.scope : [];

      const validation = await twitchClient.validateAccessToken({ accessToken });
      const user = await twitchClient.getCurrentUser({ accessToken });

      const sessionId = randomId(24);
      sessions.set(sessionId, {
        accessToken,
        refreshToken,
        scopes: scope,
        expiresAtMs: Date.now() + expiresInSec * 1000,
        lastValidatedAtMs: Date.now(),
        userId: validation.user_id || user?.id || null,
        login: validation.login || user?.login || null,
        profile: user
          ? {
              id: user.id,
              login: user.login,
              displayName: user.display_name,
              profileImageUrl: user.profile_image_url || null,
              description: user.description || '',
              createdAt: user.created_at || null,
            }
          : null,
      });

      setSessionCookie(res, req, sessionId);
      res.redirect(stateRecord.returnTo);
    } catch (err) {
      const destination = new URL(stateRecord.returnTo, 'http://localhost');
      destination.searchParams.set('auth_error', 'callback_failed');
      destination.searchParams.set('auth_error_description', String(err.message || err));
      res.redirect(destination.pathname + destination.search);
    }
  });

  router.get('/me', async (req, res) => {
    const hydrated = await ensureFreshSession(req, res);
    if (!hydrated) {
      res.json({ authenticated: false, provider: 'twitch' });
      return;
    }

    const { session } = hydrated;
    res.json({
      authenticated: true,
      provider: 'twitch',
      user: session.profile,
      scopes: session.scopes || [],
    });
  });

  router.get('/twitch/follows', async (req, res) => {
    try {
      const hydrated = await ensureFreshSession(req, res);
      if (!hydrated) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { session } = hydrated;
      const first = Math.min(Math.max(Number(req.query.first || 40), 1), 100);
      const after = req.query.after ? String(req.query.after) : undefined;
      console.log(
        '[auth:twitch:follows] requesting follows',
        {
          userId: session.userId,
          first,
          after,
        }
      );
      const payload = await twitchClient.getFollowedUsers({
        accessToken: session.accessToken,
        userId: session.userId,
        first,
        after,
      });

      console.log('[auth:twitch:follows] received', payload.data.length, 'items', 'pagination', payload.pagination);
      res.json({
        data: payload.data,
        pagination: payload.pagination,
      });
    } catch (err) {
      const status = err && err.statusCode ? err.statusCode : 500;
      console.error('[auth:twitch:follows] failed', {
        status,
        message: String(err.message || err),
        body: err?.body,
      });
      res.status(status).json({ error: String(err.message || err) });
    }
  });

  router.get('/twitch/validate', async (req, res) => {
    try {
      const hydrated = await ensureFreshSession(req, res);
      if (!hydrated) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { session } = hydrated;
      const validation = await twitchClient.validateAccessToken({ accessToken: session.accessToken });
      res.json({
        status: 'ok',
        validation,
        scopes: session.scopes || [],
        user: session.profile,
      });
    } catch (err) {
      const status = err && err.statusCode ? err.statusCode : 500;
      console.error('[auth:twitch:validate] failed', {
        status,
        message: String(err.message || err),
        body: err?.body,
      });
      res.status(status).json({ error: String(err.message || err) });
    }
  });

  router.get('/twitch/user', async (req, res) => {
    try {
      const hydrated = await ensureFreshSession(req, res);
      if (!hydrated) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { session } = hydrated;
      const user = await twitchClient.getCurrentUser({ accessToken: session.accessToken });
      res.json({ user });
    } catch (err) {
      const status = err && err.statusCode ? err.statusCode : 500;
      console.error('[auth:twitch:user] failed', {
        status,
        message: String(err.message || err),
        body: err?.body,
      });
      res.status(status).json({ error: String(err.message || err) });
    }
  });

  router.post('/twitch/logout', async (req, res) => {
    const session = deleteSession(req, res);
    if (session && session.accessToken) {
      await twitchClient.revokeToken({ token: session.accessToken });
    }
    res.json({ ok: true });
  });

  return router;
}

module.exports = {
  createTwitchAuthRouter,
};
