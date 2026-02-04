import React from 'react';

/**
 * Reusable Input component with label and error message support.
 * 
 * @param {string} label - Optional label text
 * @param {string} error - Optional error message
 * @param {string} wrapperClassName - Additional class for wrapper div
 * @param {boolean} fullWidth - If true, applies full-width styling
 * @param {...any} props - All other props passed to <input>
 */
const Input = ({
  label,
  error,
  wrapperClassName = '',
  fullWidth = false,
  ...props
}) => {
  return (
    <div className={`form-group ${fullWidth ? 'full-width' : ''} ${wrapperClassName}`}>
      {label && <label className="label">{label}</label>}
      <input
        className={`input ${error ? 'input-error' : ''}`}
        {...props}
      />
      {error && <span className="error-text" style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{error}</span>}
    </div>
  );
};

export default Input;
