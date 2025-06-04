import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Eye, EyeOff, AlertCircle } from 'lucide-react'; // For password toggle and error icon

/**
 * A reusable Input component with label, error handling, and optional icon.
 *
 * @param {object} props - The component's props.
 * @param {string} props.id - Unique ID for the input and label association.
 * @param {string} [props.label] - Text for the input label.
 * @param {'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'time' | 'datetime-local'} [props.type='text'] - Input type.
 * @param {string} [props.name] - Input name attribute.
 * @param {string | number} [props.value] - Controlled input value.
 * @param {(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void} [props.onChange] - Change handler for controlled input.
 * @param {string} [props.placeholder] - Placeholder text.
 * @param {string} [props.error] - Error message to display.
 * @param {boolean} [props.disabled=false] - If true, disables the input.
 * @param {boolean} [props.isLoading=false] - If true, can show a loading state (visuals not implemented in this basic version).
 * @param {React.ElementType} [props.icon] - Optional icon component to render inside the input (typically left).
 * @param {string} [props.className] - Additional CSS classes for the wrapper div.
 * @param {string} [props.inputClassName] - Additional CSS classes for the input element itself.
 * @param {string} [props.labelClassName] - Additional CSS classes for the label.
 * @param {object} [props.register] - Props from React Hook Form's register function.
 * @param {boolean} [props.isTextArea=false] - If true, renders a textarea instead of an input.
 * @param {number} [props.rows] - Number of rows for textarea.
 */
const Input = React.forwardRef(
  (
    {
      id,
      label,
      type = 'text',
      name,
      value,
      onChange,
      placeholder,
      error,
      disabled = false,
      isLoading = false, // isLoading prop added, but visual state needs to be implemented if desired
      icon: Icon,
      className = '',
      inputClassName = '',
      labelClassName = '',
      register, // For React Hook Form
      isTextArea = false,
      rows = 3,
      ...rest
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const Tag = isTextArea ? 'textarea' : 'input';

    const baseInputClasses =
      'block w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-150 ease-in-out';
    const paddingClasses = Icon ? 'pl-10' : 'px-3';
    const errorClasses = error ? 'border-error-500 focus:ring-error-500 focus:border-error-500' : 'border-gray-300';
    const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white';

    const togglePasswordVisibility = () => {
      if (type === 'password') {
        setShowPassword(!showPassword);
      }
    };

    const currentType = type === 'password' && showPassword ? 'text' : type;

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label htmlFor={id} className={`block text-sm font-medium text-gray-700 mb-1 ${labelClassName}`}>
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
          )}
          <Tag
            id={id}
            type={currentType}
            name={name}
            ref={ref} // Forward ref for React Hook Form or direct manipulation
            value={value} // For controlled components
            onChange={onChange} // For controlled components
            placeholder={placeholder}
            disabled={disabled || isLoading}
            rows={isTextArea ? rows : undefined}
            className={`${baseInputClasses} ${paddingClasses} py-2 ${errorClasses} ${disabledClasses} ${inputClassName}`}
            {...(register && register)} // Spread register props from RHF
            {...rest} // Spread other native input props
          />
          {type === 'password' && (
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={disabled}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          )}
          {error && type !== 'password' && ( // Don't show error icon if password toggle is present
             <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <AlertCircle className="h-5 w-5 text-error-500" aria-hidden="true" />
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-error-600" id={`${id}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

Input.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  type: PropTypes.oneOf(['text', 'email', 'password', 'number', 'tel', 'date', 'time', 'datetime-local']),
  name: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  error: PropTypes.string,
  disabled: PropTypes.bool,
  isLoading: PropTypes.bool,
  icon: PropTypes.elementType,
  className: PropTypes.string,
  inputClassName: PropTypes.string,
  labelClassName: PropTypes.string,
  register: PropTypes.object, // For React Hook Form
  isTextArea: PropTypes.bool,
  rows: PropTypes.number,
};

export default Input;
