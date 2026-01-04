---
inclusion: fileMatch
fileMatchPattern: "**/*.html"
---

# Modal/Popup Pattern - NearMe Laundry

Panduan implementasi modal popup yang konsisten dan centered di semua halaman.

## Pattern yang WAJIB Digunakan

Gunakan inline style untuk memastikan modal selalu centered, karena Tailwind classes kadang tidak bekerja dengan baik untuk positioning.

### Struktur Modal yang Benar

```html
<!-- Modal Container -->
<div id="modal-xxx" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999;">
  <!-- Backdrop + Centering Container -->
  <div id="xxx-backdrop" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; padding: 16px;">
    <!-- Modal Content -->
    <div style="background: white; border-radius: 8px; padding: 20px; width: 100%; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
      <h3 class="text-base font-semibold mb-3">Judul Modal</h3>
      <!-- Konten modal di sini -->
      <div class="flex justify-end gap-2 pt-3">
        <button type="button" onclick="closeModal()" class="btn-secondary text-xs">Batal</button>
        <button type="submit" class="btn-primary text-xs">Simpan</button>
      </div>
    </div>
  </div>
</div>
```

### Inline Styles yang WAJIB Ada

| Element | Style | Keterangan |
|---------|-------|------------|
| Container | `position: fixed; top: 0; left: 0; right: 0; bottom: 0;` | Full screen overlay |
| Container | `background: rgba(0,0,0,0.5);` | Semi-transparent backdrop |
| Container | `z-index: 9999;` | Di atas semua element |
| Centering Div | `display: flex; align-items: center; justify-content: center;` | Centering modal |
| Centering Div | `padding: 16px;` | Margin dari edge screen |
| Content | `background: white; border-radius: 8px;` | Modal appearance |
| Content | `max-width: 400px;` | Limit width (sesuaikan) |
| Content | `box-shadow: 0 4px 20px rgba(0,0,0,0.3);` | Depth effect |

### Variasi Max-Width

- Form sederhana: `max-width: 400px`
- Form dengan tabel: `max-width: 500px`
- Form kompleks: `max-width: 600px`

### Modal dengan Scroll

Untuk modal dengan konten panjang:

```html
<div style="background: white; border-radius: 8px; padding: 20px; width: 100%; max-width: 500px; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
```

### JavaScript Pattern

```javascript
// Open modal
function openModal() {
  document.getElementById('modal-xxx').style.display = 'block';
}

// Close modal
function closeModal() {
  document.getElementById('modal-xxx').style.display = 'none';
}

// Close on backdrop click
document.getElementById('xxx-backdrop').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});
```

## JANGAN Gunakan

❌ Tailwind classes saja untuk positioning modal:
```html
<!-- SALAH - Modal bisa tidak centered -->
<div class="fixed inset-0 z-50 flex items-center justify-center">
```

❌ Relative positioning untuk modal content:
```html
<!-- SALAH - Modal bisa di pojok -->
<div class="relative bg-white rounded-lg">
```

## Contoh Implementasi

Lihat implementasi yang benar di:
- `public/admin/pengeluaran.html` - Modal edit pengeluaran
- `public/admin/audit-produksi.html` - Modal edit dan history

## Checklist Modal

- [ ] Container menggunakan `position: fixed` dengan inline style
- [ ] Background overlay `rgba(0,0,0,0.5)`
- [ ] z-index minimal 9999
- [ ] Centering div dengan `display: flex; align-items: center; justify-content: center;`
- [ ] Content div dengan `max-width` yang sesuai
- [ ] Padding 16px pada centering div untuk mobile
- [ ] Box shadow untuk depth effect
- [ ] Close handler pada backdrop click
