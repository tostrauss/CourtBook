import React from 'react'
import Modal from './Modal'

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary' 
}) => {
  const variantClasses = {
    primary: 'btn-primary',
    danger: 'btn-danger',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={variantClasses[variant]}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmDialog