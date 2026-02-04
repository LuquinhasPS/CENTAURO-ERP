import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reusable Button component with variants and loading state.
 * 
 * @param {'primary'|'secondary'|'danger'|'ghost'} variant - Button style variant
 * @param {boolean} isLoading - Shows spinner and disables button
 * @param {React.Component} icon - Optional Lucide icon component
 * @param {string} size - Optional size ('sm' for small)
 * @param {React.ReactNode} children - Button content
 * @param {...any} props - All other props passed to <button>
 */
const Button = ({
  variant = 'primary',
  isLoading = false,
  icon: Icon,
  size,
  children,
  disabled,
  className = '',
  ...props
}) => {
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost'
  };

  const sizeClasses = size === 'sm' ? 'btn-sm' : '';

  return (
    <button
      className={`btn ${variantClasses[variant] || 'btn-primary'} ${sizeClasses} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : 16} />
      ) : null}
      {children}
    </button>
  );
};

export default Button;
