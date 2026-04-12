import React, { useEffect } from 'react';
import './Toast.css';

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: '✓',
    danger: '✕',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div className={`toast-container animate-slide-in-right`}>
      <div className={`toast-box glass-panel toast-${type}`}>
        <span className="toast-icon">{icons[type]}</span>
        <span className="toast-message">{message}</span>
        <button className="toast-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
};

export default Toast;
