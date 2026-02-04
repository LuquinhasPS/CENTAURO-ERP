import React from 'react';

/**
 * Reusable Select component with label and error message support.
 * 
 * @param {string} label - Optional label text
 * @param {Array<{value: string|number, label: string}>} options - Array of options
 * @param {string} placeholder - Optional placeholder (first empty option)
 * @param {string} error - Optional error message
 * @param {string} wrapperClassName - Additional class for wrapper div
 * @param {boolean} fullWidth - If true, applies full-width styling
 * @param {...any} props - All other props passed to <select>
 */
const Select = ({
  label,
  options = [],
  placeholder,
  error,
  wrapperClassName = '',
  fullWidth = false,
  children,
  ...props
}) => {
  return (
    <div className={`form-group ${fullWidth ? 'full-width' : ''} ${wrapperClassName}`}>
      {label && <label className="label">{label}</label>}
      <select
        className={`input ${error ? 'input-error' : ''}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children ? children : options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <span className="error-text" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{error}</span>}
    </div>
  );
};

export default Select;
