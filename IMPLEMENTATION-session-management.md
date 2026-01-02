# Implementasi: Session Management & Auto Logout

## Perubahan yang Diimplementasikan

### 1. **Token Expiry (7 Hari)**
**File:** `functions/api/login.ts`

```typescript
// BEFORE
const token = jwt.sign(payload, c.env.JWT_SECRET, { algorithm: 'HS256' });

// AFTER
const token = jwt.sign(payload, c.env.JWT_SECRET, { 
  algorithm: 'HS256',
  expiresIn: '7d' // Token expired setelah 7 hari
});
```

**Benefit:**
- ✅ Token otomatis invalid setelah 7 hari
- ✅ Security lebih baik (token tidak valid selamanya)
- ✅ Paksa user re-login secara berkala

### 2. **Global 401 Error Handler**
**File:** `public/shared/nav.js`

```javascript
// Intercept semua fetch request
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch(...args);
  
  // Auto logout jika 401 (Unauthorized)
  if (response.status === 401) {
    const clonedResponse = response.clone();
    try {
      const data = await clonedResponse.json();
      // Hanya auto-logout jika error terkait token
      if (data.message && (data.message.includes('token') || data.message.includes('Token'))) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
        window.location.href = '/auth/login.html';
      }
    } catch {
      // Jika tidak bisa parse JSON, tetap logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login.html';
    }
  }
  
  return response;
};
```

**Benefit:**
- ✅ Auto-redirect ke login saat token invalid/expired
- ✅ Konsisten di semua halaman (tidak perlu implementasi per halaman)
- ✅ User mendapat notifikasi jelas
- ✅ Menangani semua kasus 401 (token expired, invalid, atau hilang)

### 3. **Improved Error Messages**
**File:** `functions/_utils/auth.ts`

```typescript
// BEFORE
catch {
  return c.json({ message: 'Token tidak valid' }, 401);
}

// AFTER
catch (err: any) {
  // Berikan pesan error spesifik
  if (err.name === 'TokenExpiredError') {
    return c.json({ message: 'Token telah kadaluarsa. Silakan login kembali.' }, 401);
  }
  return c.json({ message: 'Token tidak valid' }, 401);
}
```

**Benefit:**
- ✅ User tahu alasan logout (expired vs invalid)
- ✅ Debugging lebih mudah
- ✅ UX lebih baik

## Skenario yang Ditangani

### Skenario 1: Token Expired (Setelah 7 Hari)
1. User login → Token dibuat dengan expiry 7 hari
2. Setelah 7 hari → Token expired
3. User akses halaman → API return 401 "Token telah kadaluarsa"
4. Global handler detect 401 → Auto logout + alert
5. User redirect ke login

### Skenario 2: Token Invalid (JWT_SECRET Berubah)
1. Token dibuat dengan JWT_SECRET lama
2. Server restart dengan JWT_SECRET baru
3. User akses halaman → API return 401 "Token tidak valid"
4. Global handler detect 401 → Auto logout + alert
5. User redirect ke login

### Skenario 3: Token Hilang dari LocalStorage
1. Browser clear data / Incognito mode
2. User akses halaman → Tidak ada token
3. `ensureRole()` check → Redirect ke login
4. Atau API call → 401 "Token tidak ditemukan"

### Skenario 4: User Logout Manual
1. User klik "Keluar"
2. `logout()` function → Clear localStorage
3. Redirect ke login

## Testing

### Test 1: Token Expiry
```bash
# Login dan simpan token
# Tunggu 7 hari (atau ubah expiresIn ke '10s' untuk testing)
# Akses halaman → Harus auto logout
```

### Test 2: Invalid Token
```bash
# Login dan simpan token
# Ubah JWT_SECRET di environment
# Restart server
# Akses halaman → Harus auto logout
```

### Test 3: Manual Logout
```bash
# Login
# Klik tombol "Keluar"
# Harus redirect ke login
# Token harus hilang dari localStorage
```

## User Experience

### Sebelum:
- ❌ Token valid selamanya (security risk)
- ❌ Tidak ada feedback saat token invalid
- ❌ User bingung kenapa "auto logout"
- ❌ Harus refresh manual atau logout manual

### Sesudah:
- ✅ Token expired setelah 7 hari (security)
- ✅ Auto logout dengan alert yang jelas
- ✅ User tahu alasan logout
- ✅ Seamless redirect ke login

## Konfigurasi

### Mengubah Token Expiry
Edit `functions/api/login.ts`:
```typescript
expiresIn: '7d'  // 7 hari (default)
expiresIn: '24h' // 24 jam
expiresIn: '30d' // 30 hari
expiresIn: '1h'  // 1 jam
```

### Menonaktifkan Alert
Edit `public/shared/nav.js`:
```javascript
// Hapus baris ini jika tidak ingin alert
alert('Sesi Anda telah berakhir. Silakan login kembali.');
```

## Monitoring

### Metrics yang Perlu Dimonitor:
1. **Login frequency** - Apakah user sering login ulang?
2. **401 errors** - Berapa banyak token expired?
3. **User complaints** - Apakah user komplain tentang logout?

### Adjustment:
- Jika user sering login ulang → Perpanjang expiry (14d atau 30d)
- Jika security concern → Perpendek expiry (24h atau 3d)
- Jika banyak komplain → Implementasi refresh token

## Next Steps (Optional)

### 1. Refresh Token Mechanism
Implementasi refresh token untuk seamless experience:
- Access token: 1 jam (short-lived)
- Refresh token: 30 hari (long-lived)
- Auto-refresh sebelum expired

### 2. Session Timeout (Inactivity)
Logout otomatis setelah 30 menit tidak ada aktivitas:
```javascript
let lastActivity = Date.now();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 menit

function checkSession() {
  if (Date.now() - lastActivity > SESSION_TIMEOUT) {
    logout();
  }
}

setInterval(checkSession, 60000);
```

### 3. Remember Me Option
Tambahkan checkbox "Ingat Saya" di login:
- Checked: Token 30 hari
- Unchecked: Token 24 jam

## Kesimpulan

**Masalah Awal:**
- User melaporkan "auto logout" tanpa sebab jelas
- Tidak ada mekanisme session management
- Token valid selamanya (security risk)

**Solusi:**
- ✅ Token expiry 7 hari
- ✅ Global 401 handler dengan auto logout
- ✅ Error message yang jelas
- ✅ Better UX dan security

**Status:** ✅ Deployed to Production

**Tanggal:** 2 Januari 2026
