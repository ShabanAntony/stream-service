export async function fetchAuthMe() {
  try {
    const res = await fetch('/api/auth/me', {
      credentials: 'same-origin',
    });

    if (!res.ok) {
      return { authenticated: false, error: `HTTP ${res.status}` };
    }

    return res.json();
  } catch (err) {
    return { authenticated: false, error: String(err.message || err) };
  }
}

export async function logoutTwitch() {
  const res = await fetch('/api/auth/twitch/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });

  if (!res.ok) {
    throw new Error(`Logout failed: ${res.status}`);
  }

  return res.json();
}

export async function fetchFollowedChannels() {
  try {
    const res = await fetch('/api/auth/twitch/follows?first=40', {
      credentials: 'same-origin',
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (err) {
    console.warn('Failed to load followed channels', err);
    return [];
  }
}
