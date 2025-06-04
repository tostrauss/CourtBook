import React from 'react';
import PropTypes from 'prop-types'; // For type checking props

/**
 * A reusable Card component for displaying content in a structured manner.
 * It supports an optional header and footer.
 *
 * @param {object} props - The component's props.
 * @param {React.ReactNode} [props.header] - Content to display in the card header.
 * @param {React.ReactNode} props.children - The main content of the card (card body).
 * @param {React.ReactNode} [props.footer] - Content to display in the card footer.
 * @param {string} [props.className] - Additional CSS classes to apply to the card container.
 * @param {string} [props.headerClassName] - Additional CSS classes for the header.
 * @param {string} [props.bodyClassName] - Additional CSS classes for the body.
 * @param {string} [props.footerClassName] - Additional CSS classes for the footer.
 * @param {boolean} [props.noPadding] - If true, removes default padding from the body.
 * @param {() => void} [props.onClick] - Optional click handler for the entire card.
 */
const Card = ({
  header,
  children,
  footer,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  noPadding = false,
  onClick,
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      {/* Card Header */}
      {header && (
        <div className={`px-4 py-3 sm:px-6 border-b border-gray-200 ${headerClassName}`}>
          {typeof header === 'string' ? (
            <h3 className="text-lg font-medium leading-6 text-gray-900">{header}</h3>
          ) : (
            header
          )}
        </div>
      )}

      {/* Card Body */}
      <div className={`${noPadding ? '' : 'p-4 sm:p-6'} ${bodyClassName}`}>
        {children}
      </div>

      {/* Card Footer */}
      {footer && (
        <div className={`px-4 py-3 sm:px-6 bg-gray-50 border-t border-gray-200 ${footerClassName}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

Card.propTypes = {
  header: PropTypes.node,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  className: PropTypes.string,
  headerClassName: PropTypes.string,
  bodyClassName: PropTypes.string,
  footerClassName: PropTypes.string,
  noPadding: PropTypes.bool,
  onClick: PropTypes.func,
};

export default Card;
