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

// Global fetch interceptor for handling 401 errors
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch(...args);
  
  // Auto logout if token is invalid or expired
  if (response.status === 401) {
    const clonedResponse = response.clone();
    try {
      const data = await clonedResponse.json();
      // Only auto-logout if it's an auth error, not other 401s
      if (data.message && (data.message.includes('token') || data.message.includes('Token'))) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
        window.location.href = '/auth/login.html';
      }
    } catch {
      // If can't parse JSON, still logout on 401
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login.html';
    }
  }
  
  return response;
};

function renderAdminNav(currentPage) {
  const menuItems = [
    { href: '/admin/dashboard.html', label: 'Dashboard', key: 'dashboard' },
    { href: '/admin/tracking.html', label: 'Tracking', key: 'tracking' },
    { href: '/admin/absensi.html', label: 'Absensi', key: 'absensi' },
    { href: '/admin/audit-produksi.html', label: 'Audit', key: 'audit-produksi' },
    { href: '/admin/omzet.html', label: 'Omzet', key: 'omzet' },
    { href: '/admin/pengeluaran.html', label: 'Pengeluaran', key: 'pengeluaran' },
    { href: '/admin/payroll-v2.html', label: 'Payroll', key: 'payroll' },
    { href: '/admin/kasbon.html', label: 'Kasbon', key: 'kasbon' },
    { href: '/admin/komisi.html', label: 'Komisi', key: 'komisi' },
    { href: '/admin/stok.html', label: 'Stok', key: 'stok' },
    { href: '/admin/outlet.html', label: 'Outlet', key: 'outlet' },
    { href: '/admin/users.html', label: 'User', key: 'users' },
    { href: '/admin/settings.html', label: 'Settings', key: 'settings' },
  ];

  const nav = document.querySelector('header nav');
  if (!nav) return;

  nav.innerHTML = menuItems.map(item => {
    const isActive = item.key === currentPage;
    const cls = isActive ? 'text-primary font-semibold' : '';
    return `<a href="${item.href}" class="${cls}">${item.label}</a>`;
  }).join('') + '<button onclick="NearMeNav.logout()" class="ml-2 text-red-500">Keluar</button>';
}

// v2 - unified admin nav
window.NearMeNav = { getUser, getToken, logout, ensureRole, renderAdminNav };
