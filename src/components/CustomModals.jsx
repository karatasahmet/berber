import React, { useState, useEffect } from 'react';
import './CustomModals.css';

export const PromptModal = ({ title, message, defaultValue = "", placeholder = "", onConfirm, onClose, isPassword = false }) => {
  const [val, setVal] = useState(defaultValue);

  useEffect(() => { setVal(defaultValue); }, [defaultValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(val);
  };

  return (
    <div className="modal-overlay custom-modal-overlay">
      <div className="modal-content glass-panel custom-modal-content animate-slide-up">
        <h2>{title}</h2>
        {message && <p className="mb-4 text-secondary">{message}</p>}
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type={isPassword ? "password" : "text"}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={placeholder}
            className="custom-input mb-4"
          />
          <div className="custom-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Vazgeç</button>
            <button type="submit" className="btn-confirm">Onayla</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ConfirmModal = ({ title, message, onConfirm, onClose }) => {
  return (
    <div className="modal-overlay custom-modal-overlay">
      <div className="modal-content glass-panel custom-modal-content animate-slide-up">
        <h2>{title}</h2>
        <p className="mb-4 text-secondary">{message}</p>
        <div className="custom-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>Vazgeç</button>
          <button type="button" className="btn-danger" onClick={() => { onConfirm(); onClose(); }}>Evet, İptal Et</button>
        </div>
      </div>
    </div>
  );
};

// Numeric prompt for discount rate input
export const DiscountModal = ({ title, message, onConfirm, onClose }) => {
  const [rate, setRate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseInt(rate, 10);
    if (num > 0 && num <= 100) {
      onConfirm(num);
    }
  };

  return (
    <div className="modal-overlay custom-modal-overlay">
      <div className="modal-content glass-panel custom-modal-content animate-slide-up">
        <h2>{title || 'İndirim Tanımla'}</h2>
        <p className="mb-4 text-secondary">{message || 'Randevuya uygulanacak indirim oranını girin.'}</p>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <input
              autoFocus
              type="number"
              min="1"
              max="100"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Örn: 20"
              className="custom-input"
              style={{ flex: 1 }}
            />
            <span style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: '1.5rem' }}>%</span>
          </div>
          <div className="custom-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Vazgeç</button>
            <button type="submit" className="btn-confirm">İndirimli Onayla</button>
          </div>
        </form>
      </div>
    </div>
  );
};
