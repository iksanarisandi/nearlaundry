/**
 * Timezone Utility for Frontend
 * Handles WIB (UTC+7) timezone display for Cloudflare D1 applications
 * 
 * Usage:
 * <script src="/shared/timezone.js"></script>
 * 
 * Then use:
 * - WibTime.formatDateTime(timestamp)
 * - WibTime.formatTime(timestamp)
 * - WibTime.formatDate(timestamp)
 * - WibTime.getTodayWib()
 * - WibTime.getCurrentMonthWib()
 */

const WibTime = {
  /**
   * Ensure timestamp has 'Z' suffix for proper UTC parsing
   * D1 SQLite may return timestamps without 'Z' suffix
   */
  ensureUtcSuffix(timestamp) {
    if (!timestamp) return timestamp;
    return timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
  },

  /**
   * Format timestamp to full datetime in WIB
   * @param {string} timestamp - UTC timestamp from database
   * @returns {string} Formatted datetime (e.g., "03/01/2025, 14:30")
   */
  formatDateTime(timestamp) {
    if (!timestamp) return '-';
    const ts = this.ensureUtcSuffix(timestamp);
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return timestamp;
    return d.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Format timestamp to time only in WIB
   * @param {string} timestamp - UTC timestamp from database
   * @returns {string} Formatted time (e.g., "14:30:00")
   */
  formatTime(timestamp) {
    if (!timestamp) return '-';
    const ts = this.ensureUtcSuffix(timestamp);
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return timestamp;
    return d.toLocaleTimeString('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

  /**
   * Format timestamp to date only in WIB
   * @param {string} timestamp - UTC timestamp from database
   * @returns {string} Formatted date (e.g., "03/01/2025")
   */
  formatDate(timestamp) {
    if (!timestamp) return '-';
    const ts = this.ensureUtcSuffix(timestamp);
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return timestamp;
    return d.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },

  /**
   * Get current date in WIB timezone as YYYY-MM-DD
   * Use for date picker default values and "today" checks
   * @returns {string} Date string (e.g., "2025-01-03")
   */
  getTodayWib() {
    const now = new Date();
    const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return wibTime.toISOString().split('T')[0];
  },

  /**
   * Get current month and year in WIB timezone
   * Use for payroll and monthly report defaults
   * @returns {{month: number, year: number}}
   */
  getCurrentMonthWib() {
    const now = new Date();
    const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    return {
      month: wibTime.getMonth() + 1,
      year: wibTime.getFullYear()
    };
  },

  /**
   * Check if a timestamp is from today (WIB)
   * @param {string} timestamp - UTC timestamp from database
   * @returns {boolean}
   */
  isToday(timestamp) {
    if (!timestamp) return false;
    const ts = this.ensureUtcSuffix(timestamp);
    const d = new Date(ts);
    const wibDate = new Date(d.getTime() + (7 * 60 * 60 * 1000));
    const today = this.getTodayWib();
    return wibDate.toISOString().split('T')[0] === today;
  },

  /**
   * Format timestamp to relative time (e.g., "2 jam lalu")
   * @param {string} timestamp - UTC timestamp from database
   * @returns {string}
   */
  formatRelative(timestamp) {
    if (!timestamp) return '-';
    const ts = this.ensureUtcSuffix(timestamp);
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return timestamp;
    
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return this.formatDate(timestamp);
  }
};

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WibTime;
}
