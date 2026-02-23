export function renderAuthState(refs, authState) {
  const { authLoginBtn, authLogoutBtn, authUserEl, authAvatarEl, authNameEl } = refs;
  const authenticated = Boolean(authState && authState.authenticated);
  const user = authenticated ? authState.user || {} : null;

  if (authLoginBtn) {
    authLoginBtn.hidden = authenticated;
  }

  if (authLogoutBtn) {
    authLogoutBtn.hidden = !authenticated;
  }

  if (authUserEl) {
    authUserEl.hidden = !authenticated;
  }

  if (authAvatarEl) {
    authAvatarEl.src = authenticated && user?.profileImageUrl ? user.profileImageUrl : '';
    authAvatarEl.alt = authenticated ? `${user.displayName || user.login || 'Twitch'} avatar` : '';
  }

  if (authNameEl) {
    authNameEl.textContent = authenticated
      ? user?.displayName || user?.login || 'Twitch user'
      : '';
  }
}
