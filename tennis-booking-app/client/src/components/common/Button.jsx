import React from 'react';
import PropTypes from 'prop-types';
import { Loader2 } from 'lucide-react'; // For loading spinner

/**
 * A versatile Button component with multiple variants, sizes, and loading state.
 *
 * @param {object} props - The component's props.
 * @param {React.ReactNode} props.children - The content of the button.
 * @param {() => void} [props.onClick] - Click handler.
 * @param {'button' | 'submit' | 'reset'} [props.type='button'] - Button type.
 * @param {'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'link'} [props.variant='primary'] - Button style variant.
 * @param {'sm' | 'md' | 'lg'} [props.size='md'] - Button size.
 * @param {React.ElementType} [props.icon] - Optional icon component to render before children.
 * @param {'left' | 'right'} [props.iconPosition='left'] - Position of the icon.
 * @param {boolean} [props.isLoading=false] - If true, shows a loading spinner.
 * @param {boolean} [props.disabled=false] - If true, disables the button.
 * @param {string} [props.className] - Additional CSS classes.
 * @param {boolean} [props.fullWidth=false] - If true, button takes full width of its container.
 */
const Button = React.forwardRef(
  (
    {
      children,
      onClick,
      type = 'button',
      variant = 'primary',
      size = 'md',
      icon: Icon,
      iconPosition = 'left',
      isLoading = false,
      disabled = false,
      className = '',
      fullWidth = false,
      ...rest
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ease-in-out';

    const variantClasses = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 disabled:bg-primary-300',
      secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-400',
      danger: 'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500 disabled:bg-error-300',
      outline: 'border border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-primary-500 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent',
      ghost: 'text-primary-600 hover:bg-primary-50 focus:ring-primary-500 disabled:text-gray-400 disabled:hover:bg-transparent',
      link: 'text-primary-600 hover:text-primary-700 underline focus:ring-primary-500 disabled:text-gray-400',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    
    const iconSizeClasses = {
      sm: 'h-3.5 w-3.5',
      md: 'h-4 w-4',
      lg: 'h-5 w-5',
    }

    const widthClass = fullWidth ? 'w-full' : '';

    const combinedDisabled = isLoading || disabled;

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={combinedDisabled}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className} ${combinedDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        {...rest}
      >
        {isLoading && (
          <Loader2 className={`animate-spin ${iconPosition === 'left' ? 'mr-2' : 'ml-2'} ${iconSizeClasses[size]}`} />
        )}

        {!isLoading && Icon && iconPosition === 'left' && (
          <Icon className={`mr-2 ${iconSizeClasses[size]}`} aria-hidden="true" />
        )}
        
        {children}

        {!isLoading && Icon && iconPosition === 'right' && (
          <Icon className={`ml-2 ${iconSizeClasses[size]}`} aria-hidden="true" />
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'outline', 'ghost', 'link']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  icon: PropTypes.elementType,
  iconPosition: PropTypes.oneOf(['left', 'right']),
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  fullWidth: PropTypes.bool,
};

export default Button;
