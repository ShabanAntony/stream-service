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
