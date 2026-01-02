# Analisis: Auto Logout Akun

## Temuan Analisis

### 1. **JWT Token TIDAK Memiliki Expiry**
```typescript
// functions/api/login.ts
const token = jwt.sign(payload, c.env.JWT_SECRET, { algorithm: 'HS256' });
// ❌ Tidak ada expiresIn option
```

**Masalah:**
- Token tidak pernah expired secara otomatis
- Token valid selamanya sampai user logout manual
- Ini sebenarnya BUKAN auto-logout, tapi **tidak ada mekanisme session management**

### 2. **Tidak Ada Error Handling untuk 401**
Frontend tidak menangani response 401 (Unauthorized) dengan baik:
- Tidak ada global error handler
- Tidak ada auto-redirect ke login saat token invalid
- User harus refresh manual atau logout manual

### 3. **LocalStorage Persistence**
Token disimpan di localStorage yang:
- Persistent (tidak hilang saat close browser)
- Tidak ada TTL (Time To Live)
- Bisa hilang jika:
  - User clear browser data
  - Browser storage penuh
  - Incognito/private mode

## Kemungkinan Penyebab "Auto Logout"

### A. **Browser Clear Data** (Paling Mungkin)
- User atau browser otomatis clear localStorage
- Browser privacy settings
- Incognito mode

### B. **Token Invalid di Server**
- JWT_SECRET berubah (saat redeploy dengan env berbeda)
- Token corruption

### C. **Multiple Tab/Device**
- User logout di tab/device lain
- LocalStorage shared antar tab

## Rekomendasi Solusi

### Solusi 1: **Tambahkan Token Expiry** (Recommended)
```typescript
// Set token expired dalam 7 hari
const token = jwt.sign(payload, c.env.JWT_SECRET, { 
  algorithm: 'HS256',
  expiresIn: '7d' // atau '24h', '30d', dll
});
```

**Pro:**
- Security lebih baik
- Token otomatis invalid setelah periode tertentu
- Paksa user re-login secara berkala

**Con:**
- User harus login ulang setelah expired
- Perlu implementasi refresh token untuk UX lebih baik

### Solusi 2: **Global Error Handler untuk 401** (Recommended)
Tambahkan di `nav.js`:
```javascript
// Intercept semua fetch request
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch(...args);
  
  // Auto logout jika 401
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login.html';
  }
  
  return response;
};
```

**Pro:**
- Konsisten di semua halaman
- Auto-redirect ke login saat token invalid
- User experience lebih baik

**Con:**
- Perlu testing menyeluruh

### Solusi 3: **Session Timeout dengan Activity Tracking**
```javascript
// Track last activity
let lastActivity = Date.now();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 menit

function checkSession() {
  if (Date.now() - lastActivity > SESSION_TIMEOUT) {
    logout();
  }
}

// Reset timer on activity
['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
  document.addEventListener(event, () => {
    lastActivity = Date.now();
  });
});

// Check every minute
setInterval(checkSession, 60000);
```

**Pro:**
- Logout otomatis saat tidak ada aktivitas
- Security lebih baik

**Con:**
- Bisa mengganggu user yang sedang membaca/berpikir
- Kompleksitas lebih tinggi

### Solusi 4: **Token Refresh Mechanism** (Advanced)
Implementasi refresh token untuk seamless experience:
- Access token: 1 jam (short-lived)
- Refresh token: 30 hari (long-lived)
- Auto-refresh sebelum expired

**Pro:**
- Security terbaik
- UX terbaik (tidak perlu login ulang)

**Con:**
- Implementasi kompleks
- Perlu perubahan backend & frontend

## Rekomendasi Implementasi

### **Quick Win (Prioritas Tinggi):**
1. ✅ Tambahkan token expiry 7 hari
2. ✅ Implementasi global 401 handler
3. ✅ Tambahkan error message yang jelas

### **Medium Term:**
4. Implementasi session timeout (30 menit inactivity)
5. Tambahkan "Remember Me" option

### **Long Term:**
6. Implementasi refresh token mechanism
7. Tambahkan session management di backend

## Kesimpulan

**Apakah benar ada auto logout?**
- ❌ Tidak ada auto logout di sistem saat ini
- ✅ Yang terjadi: Token hilang dari localStorage (browser clear data) atau token invalid (JWT_SECRET berubah)

**Solusi terbaik:**
1. Tambahkan token expiry (7 hari) untuk security
2. Implementasi global 401 handler untuk UX
3. Berikan feedback jelas ke user saat logout

**Trade-off:**
- Tanpa expiry: Token valid selamanya (security risk, tapi UX bagus)
- Dengan expiry: Lebih secure, tapi user harus login ulang (bisa diatasi dengan refresh token)
