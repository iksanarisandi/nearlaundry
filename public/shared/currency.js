/**
 * NearMe Currency Formatter
 * Utility untuk format input nominal uang dengan pemisah ribuan (titik)
 * 
 * Usage:
 * 1. Include script: <script src="/shared/currency.js" defer></script>
 * 2. Add attribute: <input type="text" inputmode="numeric" data-currency />
 * 3. Get raw value: NearMeCurrency.parseCurrency(input.value)
 */
const NearMeCurrency = {
  /**
   * Format number to Indonesian thousand-separated string
   * @param {number} value - Raw integer value (e.g., 1500000)
   * @returns {string} Formatted string with dots (e.g., "1.500.000")
   */
  formatCurrency(value) {
    // Handle edge cases
    if (value === null || value === undefined || value === '') return '';
    
    // Convert to number and handle non-numeric
    const num = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, ''), 10) : Math.floor(value);
    
    // Handle NaN, negative, or zero
    if (isNaN(num) || num < 0) return '0';
    if (num === 0) return '0';
    
    // Format with thousand separators (dots)
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },

  /**
   * Parse formatted string back to integer
   * @param {string} formatted - Formatted string (e.g., "1.500.000")
   * @returns {number} Raw integer value (e.g., 1500000)
   */
  parseCurrency(formatted) {
    // Handle edge cases
    if (formatted === null || formatted === undefined || formatted === '') return 0;
    
    // Convert to string if needed
    const str = String(formatted);
    
    // Remove all non-digit characters
    const digitsOnly = str.replace(/[^0-9]/g, '');
    
    // Parse to integer, return 0 if empty or NaN
    const num = parseInt(digitsOnly, 10);
    return isNaN(num) ? 0 : num;
  },

  /**
   * Attach currency formatting to a single input element
   * @param {HTMLInputElement} input - Input element to attach
   */
  attachToInput(input) {
    if (!input || input._currencyAttached) return;
    
    // Mark as attached to prevent double-binding
    input._currencyAttached = true;
    
    // Format existing value if any
    if (input.value) {
      const raw = this.parseCurrency(input.value);
      if (raw > 0) {
        input.value = this.formatCurrency(raw);
      }
    }
    
    // Handle input event for real-time formatting
    input.addEventListener('input', (e) => {
      const target = e.target;
      const cursorPos = target.selectionStart;
      const oldValue = target.value;
      const oldLength = oldValue.length;
      
      // Get raw value and format
      const raw = this.parseCurrency(oldValue);
      const formatted = raw > 0 ? this.formatCurrency(raw) : '';
      
      // Update value
      target.value = formatted;
      
      // Adjust cursor position
      const newLength = formatted.length;
      const diff = newLength - oldLength;
      let newCursorPos = cursorPos + diff;
      
      // Ensure cursor is within bounds
      if (newCursorPos < 0) newCursorPos = 0;
      if (newCursorPos > newLength) newCursorPos = newLength;
      
      // Set cursor position
      target.setSelectionRange(newCursorPos, newCursorPos);
    });
    
    // Handle paste event
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData('text');
      const raw = this.parseCurrency(pastedText);
      const formatted = raw > 0 ? this.formatCurrency(raw) : '';
      
      // Insert at cursor position or replace selection
      const target = e.target;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const currentValue = target.value;
      
      // Combine current value with pasted content
      const beforeCursor = currentValue.substring(0, start);
      const afterCursor = currentValue.substring(end);
      const combined = beforeCursor + formatted + afterCursor;
      
      // Re-parse and format the combined value
      const combinedRaw = this.parseCurrency(combined);
      target.value = combinedRaw > 0 ? this.formatCurrency(combinedRaw) : '';
      
      // Set cursor to end of pasted content
      const newPos = target.value.length;
      target.setSelectionRange(newPos, newPos);
    });
    
    // Handle keydown to prevent non-numeric input
    input.addEventListener('keydown', (e) => {
      // Allow: backspace, delete, tab, escape, enter, arrows
      const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
                          'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                          'Home', 'End'];
      if (allowedKeys.includes(e.key)) return;
      
      // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
      
      // Block non-numeric keys
      if (!/^[0-9]$/.test(e.key)) {
        e.preventDefault();
      }
    });
  },

  /**
   * Initialize all inputs with data-currency attribute
   * Called automatically on DOMContentLoaded
   */
  initCurrencyInputs() {
    const inputs = document.querySelectorAll('input[data-currency]');
    inputs.forEach(input => this.attachToInput(input));
  }
};

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  NearMeCurrency.initCurrencyInputs();
});

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.NearMeCurrency = NearMeCurrency;
}
