function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem('token');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/auth/login.html';
}

function ensureRole(expectedRoles) {
  const user = getUser();
  if (!user || !expectedRoles.includes(user.role)) {
    window.location.href = '/auth/login.html';
  }
}

window.NearMeNav = { getUser, getToken, logout, ensureRole };
