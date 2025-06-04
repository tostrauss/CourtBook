import React from 'react'
import ReactModal from 'react-modal'
import { X } from 'lucide-react'

ReactModal.setAppElement('#root')

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onClose}
      className={`${sizeClasses[size]} w-full mx-auto my-8 bg-white rounded-lg shadow-xl outline-none`}
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </ReactModal>
  )
}

export default Modal