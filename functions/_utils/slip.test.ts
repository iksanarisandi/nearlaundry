import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
  generateSlipFilename, 
  generateWhatsAppLink, 
  generateSlipHTML, 
  sanitizeName,
  MONTH_NAMES,
  SlipData 
} from './slip';

/**
 * Slip Generation Property-Based Tests
 * Feature: payroll-slip-whatsapp
 */

// Letters for name generation
const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '.split('');
const DIGITS = '0123456789'.split('');

/**
 * Generator for valid employee names (non-empty strings with letters)
 */
const validName = fc.array(fc.constantFrom(...LETTERS), { minLength: 2, maxLength: 30 })
  .map(chars => chars.join(''))
  .filter(s => s.trim().length > 0);

/**
 * Generator for valid month numbers (1-12)
 */
const validMonth = fc.integer({ min: 1, max: 12 });

/**
 * Generator for valid year numbers
 */
const validYear = fc.integer({ min: 2020, max: 2030 });

/**
 * Generator for digit strings of specified length
 */
const digitString = (minLen: number, maxLen: number) => 
  fc.integer({ min: minLen, max: maxLen }).chain(len =>
    fc.array(fc.constantFrom(...DIGITS), { minLength: len, maxLength: len })
      .map(digits => digits.join(''))
  );

/**
 * Generator for valid normalized Indonesian phone numbers (62xxxxxxxxxx)
 */
const validNormalizedPhone = fc.tuple(
  fc.constantFrom('81', '82', '83', '85', '87', '88', '89'),
  digitString(8, 11)
).map(([prefix, rest]) => `62${prefix}${rest}`);


/**
 * Generator for valid period strings
 */
const validPeriod = fc.tuple(validMonth, validYear)
  .map(([month, year]) => `${MONTH_NAMES[month]} ${year}`);

/**
 * Generator for valid outlet names
 */
const validOutletName = fc.array(fc.constantFrom(...LETTERS), { minLength: 1, maxLength: 20 })
  .map(chars => chars.join(''))
  .filter(s => s.trim().length > 0);

/**
 * Generator for valid SlipData objects
 */
const validSlipData: fc.Arbitrary<SlipData> = fc.record({
  name: validName,
  phone: fc.option(validNormalizedPhone, { nil: null }),
  month: validMonth,
  year: validYear,
  outletName: validOutletName,
  gaji_pokok: fc.integer({ min: 0, max: 10000000 }),
  uang_makan: fc.integer({ min: 0, max: 1000000 }),
  uang_transport: fc.integer({ min: 0, max: 1000000 }),
  lembur_jam: fc.integer({ min: 0, max: 100 }),
  lembur_jam_rate: fc.integer({ min: 5000, max: 20000 }),
  lembur_libur: fc.integer({ min: 0, max: 30 }),
  lembur_libur_rate: fc.integer({ min: 20000, max: 50000 }),
  tunjangan_jabatan: fc.integer({ min: 0, max: 2000000 }),
  thr: fc.integer({ min: 0, max: 5000000 }),
  komisi_total: fc.integer({ min: 0, max: 5000000 }),
  denda_terlambat: fc.integer({ min: 0, max: 500000 }),
  denda: fc.integer({ min: 0, max: 500000 }),
  kasbon: fc.integer({ min: 0, max: 2000000 }),
  pendapatan: fc.integer({ min: 0, max: 20000000 }),
  potongan: fc.integer({ min: 0, max: 3000000 }),
  gaji_bersih: fc.integer({ min: -1000000, max: 20000000 })
});

describe('Slip Generation - Property-Based Tests', () => {
  /**
   * **Feature: payroll-slip-whatsapp, Property 4: Filename generation follows pattern**
   * **Validates: Requirements 2.3**
   * 
   * For any employee name, month (1-12), and year, the generated filename SHALL match 
   * pattern `slip_gaji_{sanitized_name}_{month_name}_{year}.png` where sanitized_name 
   * replaces spaces with underscores.
   */
  it('Property 4: Filename generation follows pattern', () => {
    fc.assert(
      fc.property(validName, validMonth, validYear, (name, month, year) => {
        const filename = generateSlipFilename(name, month, year);
        const sanitized = sanitizeName(name);
        const monthName = MONTH_NAMES[month];
        
        // Must start with slip_gaji_
        const startsCorrectly = filename.startsWith('slip_gaji_');
        // Must end with .png
        const endsWithPng = filename.endsWith('.png');
        // Must contain the sanitized name
        const containsSanitizedName = filename.includes(sanitized);
        // Must contain the month name
        const containsMonthName = filename.includes(monthName);
        // Must contain the year
        const containsYear = filename.includes(year.toString());
        // Must match exact pattern
        const expectedFilename = `slip_gaji_${sanitized}_${monthName}_${year}.png`;
        const matchesPattern = filename === expectedFilename;
        
        return startsCorrectly && endsWithPng && containsSanitizedName && 
               containsMonthName && containsYear && matchesPattern;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: payroll-slip-whatsapp, Property 5: WhatsApp URL contains phone number**
   * **Validates: Requirements 3.2**
   * 
   * For any valid normalized phone number, the generated WhatsApp URL SHALL start with 
   * `https://wa.me/` followed by the phone number.
   */
  it('Property 5: WhatsApp URL contains phone number', () => {
    fc.assert(
      fc.property(validNormalizedPhone, validName, validPeriod, (phone, name, period) => {
        const url = generateWhatsAppLink(phone, name, period);
        
        // Must start with https://wa.me/
        const startsWithWaMe = url.startsWith('https://wa.me/');
        // Must contain the phone number after wa.me/
        const containsPhone = url.startsWith(`https://wa.me/${phone}`);
        // Must have query parameter
        const hasQueryParam = url.includes('?text=');
        
        return startsWithWaMe && containsPhone && hasQueryParam;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: payroll-slip-whatsapp, Property 6: WhatsApp message contains employee info**
   * **Validates: Requirements 3.3**
   * 
   * For any employee name and period string, the generated WhatsApp message SHALL 
   * contain both the employee name and the period.
   */
  it('Property 6: WhatsApp message contains employee info', () => {
    fc.assert(
      fc.property(validNormalizedPhone, validName, validPeriod, (phone, name, period) => {
        const url = generateWhatsAppLink(phone, name, period);
        
        // Decode the message from URL
        const textParam = url.split('?text=')[1];
        const decodedMessage = decodeURIComponent(textParam);
        
        // Must contain employee name
        const containsName = decodedMessage.includes(name);
        // Must contain period
        const containsPeriod = decodedMessage.includes(period);
        
        return containsName && containsPeriod;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: payroll-slip-whatsapp, Property 7: Slip HTML contains required elements**
   * **Validates: Requirements 4.2**
   * 
   * For any valid SlipData object, the generated slip HTML SHALL contain: 
   * company name, employee name, period (month/year), and gaji_bersih value.
   */
  it('Property 7: Slip HTML contains required elements', () => {
    fc.assert(
      fc.property(validSlipData, (data) => {
        const html = generateSlipHTML(data);
        const monthName = MONTH_NAMES[data.month];
        
        // Must contain company name
        const containsCompanyName = html.includes('NearMe Laundry');
        // Must contain employee name
        const containsEmployeeName = html.includes(data.name);
        // Must contain period (month name and year)
        const containsMonthName = html.includes(monthName);
        const containsYear = html.includes(data.year.toString());
        // Must contain gaji_bersih value (formatted as Rupiah)
        const gajiBersihFormatted = (data.gaji_bersih || 0).toLocaleString('id-ID');
        const containsGajiBersih = html.includes(gajiBersihFormatted);
        // Must have minimum width of 400px (Requirement 4.1)
        const hasMinWidth = html.includes('width: 400px');
        
        return containsCompanyName && containsEmployeeName && 
               containsMonthName && containsYear && containsGajiBersih && hasMinWidth;
      }),
      { numRuns: 100 }
    );
  });
});


describe('Slip Generation - Unit Tests', () => {
  describe('sanitizeName', () => {
    it('replaces spaces with underscores', () => {
      expect(sanitizeName('John Doe')).toBe('John_Doe');
    });

    it('removes special characters', () => {
      expect(sanitizeName('John@Doe#123')).toBe('JohnDoe123');
    });

    it('handles multiple spaces', () => {
      expect(sanitizeName('John   Doe')).toBe('John_Doe');
    });

    it('trims whitespace', () => {
      expect(sanitizeName('  John Doe  ')).toBe('John_Doe');
    });
  });

  describe('generateSlipFilename', () => {
    it('generates correct filename format', () => {
      const filename = generateSlipFilename('Budi Santoso', 1, 2024);
      expect(filename).toBe('slip_gaji_Budi_Santoso_Januari_2024.png');
    });

    it('handles single word names', () => {
      const filename = generateSlipFilename('Budi', 12, 2024);
      expect(filename).toBe('slip_gaji_Budi_Desember_2024.png');
    });
  });

  describe('generateWhatsAppLink', () => {
    it('generates correct WhatsApp URL', () => {
      const url = generateWhatsAppLink('6281234567890', 'Budi', 'Januari 2024');
      expect(url).toContain('https://wa.me/6281234567890');
      expect(url).toContain('?text=');
    });

    it('includes employee name in message', () => {
      const url = generateWhatsAppLink('6281234567890', 'Budi Santoso', 'Januari 2024');
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('Budi Santoso');
    });

    it('includes period in message', () => {
      const url = generateWhatsAppLink('6281234567890', 'Budi', 'Februari 2024');
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('Februari 2024');
    });
  });

  describe('generateSlipHTML', () => {
    const sampleData: SlipData = {
      name: 'Budi Santoso',
      phone: '6281234567890',
      month: 1,
      year: 2024,
      outletName: 'Outlet Pusat',
      gaji_pokok: 3000000,
      uang_makan: 500000,
      uang_transport: 300000,
      lembur_jam: 10,
      lembur_jam_rate: 7000,
      lembur_libur: 2,
      lembur_libur_rate: 35000,
      tunjangan_jabatan: 200000,
      thr: 0,
      komisi_total: 150000,
      denda_terlambat: 50000,
      denda: 0,
      kasbon: 100000,
      pendapatan: 4220000,
      potongan: 150000,
      gaji_bersih: 4070000
    };

    it('contains company name', () => {
      const html = generateSlipHTML(sampleData);
      expect(html).toContain('NearMe Laundry');
    });

    it('contains employee name', () => {
      const html = generateSlipHTML(sampleData);
      expect(html).toContain('Budi Santoso');
    });

    it('contains period', () => {
      const html = generateSlipHTML(sampleData);
      expect(html).toContain('Januari');
      expect(html).toContain('2024');
    });

    it('contains outlet name', () => {
      const html = generateSlipHTML(sampleData);
      expect(html).toContain('Outlet Pusat');
    });

    it('contains gaji bersih', () => {
      const html = generateSlipHTML(sampleData);
      expect(html).toContain('GAJI BERSIH');
      expect(html).toContain('4.070.000');
    });

    it('has minimum width of 400px', () => {
      const html = generateSlipHTML(sampleData);
      expect(html).toContain('width: 400px');
    });

    it('contains income section', () => {
      const html = generateSlipHTML(sampleData);
      expect(html).toContain('PENDAPATAN');
      expect(html).toContain('Gaji Pokok');
    });

    it('contains deduction section', () => {
      const html = generateSlipHTML(sampleData);
      expect(html).toContain('POTONGAN');
      expect(html).toContain('Denda Keterlambatan');
    });
  });
});
