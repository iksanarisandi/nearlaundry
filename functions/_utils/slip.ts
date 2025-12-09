/**
 * Slip Generation Utilities
 * For generating payroll slip images and WhatsApp links
 * 
 * Feature: payroll-slip-whatsapp
 * Requirements: 2.3, 3.2, 3.3, 4.2
 */

/**
 * Slip data interface for generating slip HTML
 */
export interface SlipData {
  name: string;
  phone: string | null;
  month: number;
  year: number;
  outletName: string;
  gaji_pokok: number;
  uang_makan: number;
  uang_transport: number;
  lembur_jam: number;
  lembur_jam_rate: number;
  lembur_libur: number;
  lembur_libur_rate: number;
  tunjangan_jabatan: number;
  thr: number;
  komisi_total: number;
  denda_terlambat: number;
  denda: number;
  kasbon: number;
  pendapatan: number;
  potongan: number;
  gaji_bersih: number;
}

/**
 * Month names in Indonesian
 */
export const MONTH_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Sanitize name for filename by replacing spaces with underscores
 * and removing special characters
 */
export function sanitizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
}

/**
 * Generate slip filename following pattern: slip_gaji_{sanitized_name}_{month_name}_{year}.png
 * 
 * @param name - Employee name
 * @param month - Month number (1-12)
 * @param year - Year number
 * @returns Filename string
 * 
 * Requirements: 2.3
 */
export function generateSlipFilename(name: string, month: number, year: number): string {
  const sanitizedName = sanitizeName(name);
  const monthName = MONTH_NAMES[month] || '';
  return `slip_gaji_${sanitizedName}_${monthName}_${year}.png`;
}


/**
 * Generate WhatsApp link with pre-filled phone number and message
 * 
 * @param phone - Normalized phone number (62xxxxxxxxxx format)
 * @param name - Employee name
 * @param period - Period string (e.g., "Januari 2024")
 * @returns WhatsApp URL string (https://wa.me/62xxx?text=encoded_message)
 * 
 * Requirements: 3.2, 3.3
 */
export function generateWhatsAppLink(phone: string, name: string, period: string): string {
  const message = `Halo ${name}, berikut slip gaji Anda untuk periode ${period}. Silakan cek lampiran gambar.`;
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encodedMessage}`;
}

/**
 * Format number as Indonesian Rupiah
 */
function formatRupiah(value: number): string {
  return 'Rp ' + (value || 0).toLocaleString('id-ID');
}

/**
 * Generate slip HTML for rendering and conversion to image
 * 
 * @param data - SlipData object with all payroll information
 * @returns HTML string for the slip
 * 
 * Requirements: 4.2
 */
export function generateSlipHTML(data: SlipData): string {
  const monthName = MONTH_NAMES[data.month] || '';
  const period = `${monthName} ${data.year}`;
  
  // Calculate lembur totals
  const lemburJamTotal = (data.lembur_jam || 0) * (data.lembur_jam_rate || 7000);
  const lemburLiburTotal = (data.lembur_libur || 0) * (data.lembur_libur_rate || 35000);
  
  // Build income items (only show non-zero values)
  const incomeItems: Array<{ label: string; value: number }> = [];
  if (data.gaji_pokok > 0) incomeItems.push({ label: 'Gaji Pokok', value: data.gaji_pokok });
  if (data.uang_makan > 0) incomeItems.push({ label: 'Uang Makan', value: data.uang_makan });
  if (data.uang_transport > 0) incomeItems.push({ label: 'Uang Transport', value: data.uang_transport });
  if (lemburJamTotal > 0) incomeItems.push({ 
    label: `Lembur Jam (${data.lembur_jam} jam x ${formatRupiah(data.lembur_jam_rate || 7000)})`, 
    value: lemburJamTotal 
  });
  if (lemburLiburTotal > 0) incomeItems.push({ 
    label: `Lembur Libur (${data.lembur_libur} shift x ${formatRupiah(data.lembur_libur_rate || 35000)})`, 
    value: lemburLiburTotal 
  });
  if (data.tunjangan_jabatan > 0) incomeItems.push({ label: 'Tunjangan Jabatan', value: data.tunjangan_jabatan });
  if (data.thr > 0) incomeItems.push({ label: 'THR', value: data.thr });
  if (data.komisi_total > 0) incomeItems.push({ label: 'Komisi', value: data.komisi_total });
  
  // Build deduction items (only show non-zero values)
  const deductionItems: Array<{ label: string; value: number }> = [];
  if (data.denda_terlambat > 0) deductionItems.push({ label: 'Denda Keterlambatan', value: data.denda_terlambat });
  if (data.denda > 0) deductionItems.push({ label: 'Denda Lainnya', value: data.denda });
  if (data.kasbon > 0) deductionItems.push({ label: 'Kasbon', value: data.kasbon });
  
  const incomeRowsHTML = incomeItems.map(item => `
    <tr>
      <td style="padding: 4px 8px; font-size: 12px;">${item.label}</td>
      <td style="padding: 4px 8px; font-size: 12px; text-align: right;">${formatRupiah(item.value)}</td>
    </tr>
  `).join('');
  
  const deductionRowsHTML = deductionItems.map(item => `
    <tr>
      <td style="padding: 4px 8px; font-size: 12px;">${item.label}</td>
      <td style="padding: 4px 8px; font-size: 12px; text-align: right;">${formatRupiah(item.value)}</td>
    </tr>
  `).join('');

  return `
<div id="slip-container" style="width: 400px; padding: 20px; background: white; font-family: Arial, sans-serif; border: 1px solid #ddd;">
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 16px; border-bottom: 2px solid #333; padding-bottom: 12px;">
    <h1 style="margin: 0; font-size: 18px; font-weight: bold;">SLIP GAJI KARYAWAN</h1>
    <p style="margin: 4px 0 0 0; font-size: 14px; color: #666;">NearMe Laundry</p>
  </div>
  
  <!-- Employee Info -->
  <div style="margin-bottom: 16px; font-size: 12px;">
    <table style="width: 100%;">
      <tr>
        <td style="padding: 2px 0; width: 100px;">Nama</td>
        <td style="padding: 2px 0;">: <strong>${data.name}</strong></td>
      </tr>
      <tr>
        <td style="padding: 2px 0;">Periode</td>
        <td style="padding: 2px 0;">: ${period}</td>
      </tr>
      <tr>
        <td style="padding: 2px 0;">Cabang</td>
        <td style="padding: 2px 0;">: ${data.outletName}</td>
      </tr>
    </table>
  </div>
  
  <!-- Income Section -->
  <div style="margin-bottom: 12px;">
    <div style="background: #f0f9f0; padding: 6px 8px; font-weight: bold; font-size: 13px; border-left: 3px solid #22c55e;">
      PENDAPATAN
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      ${incomeRowsHTML}
      <tr style="border-top: 1px solid #ddd; font-weight: bold;">
        <td style="padding: 6px 8px; font-size: 12px;">Total Pendapatan</td>
        <td style="padding: 6px 8px; font-size: 12px; text-align: right; color: #22c55e;">${formatRupiah(data.pendapatan)}</td>
      </tr>
    </table>
  </div>
  
  <!-- Deduction Section -->
  <div style="margin-bottom: 12px;">
    <div style="background: #fef2f2; padding: 6px 8px; font-weight: bold; font-size: 13px; border-left: 3px solid #ef4444;">
      POTONGAN
    </div>
    <table style="width: 100%; border-collapse: collapse;">
      ${deductionRowsHTML.length > 0 ? deductionRowsHTML : '<tr><td style="padding: 4px 8px; font-size: 12px; color: #999;">Tidak ada potongan</td></tr>'}
      <tr style="border-top: 1px solid #ddd; font-weight: bold;">
        <td style="padding: 6px 8px; font-size: 12px;">Total Potongan</td>
        <td style="padding: 6px 8px; font-size: 12px; text-align: right; color: #ef4444;">${formatRupiah(data.potongan)}</td>
      </tr>
    </table>
  </div>
  
  <!-- Net Salary -->
  <div style="background: #1e40af; color: white; padding: 12px; text-align: center; margin-top: 16px;">
    <div style="font-size: 12px; margin-bottom: 4px;">GAJI BERSIH</div>
    <div style="font-size: 20px; font-weight: bold;">${formatRupiah(data.gaji_bersih)}</div>
  </div>
  
  <!-- Footer -->
  <div style="margin-top: 12px; text-align: center; font-size: 10px; color: #999;">
    Slip gaji ini digenerate secara otomatis oleh sistem NearMe Laundry
  </div>
</div>
  `.trim();
}
