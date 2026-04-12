import React, { useState, useEffect } from 'react';
import { getSettings, getServiceNames } from '../utils/bookingStore';
import './EditBookingModal.css';

const EditBookingModal = ({ slot, dateStr, barberId, onSave, onClose }) => {
  const settings = getSettings();
  const services = getServiceNames(settings);

  const [name, setName] = useState(slot.customerName || '');
  const [phone, setPhone] = useState(slot.phone || '');
  const [service, setService] = useState(slot.service || '');
  const [note, setNote] = useState(slot.note || '');
  const [discountRate, setDiscountRate] = useState(
    slot.manualCampaign ? slot.manualCampaign.rate.match(/(\d+)/)?.[1] || '' : ''
  );

  useEffect(() => {
    setName(slot.customerName || '');
    setPhone(slot.phone || '');
    setService(slot.service || '');
    setNote(slot.note || '');
    setDiscountRate(slot.manualCampaign ? slot.manualCampaign.rate.match(/(\d+)/)?.[1] || '' : '');
  }, [slot]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, phone, service, note, discountRate: discountRate ? parseInt(discountRate) : 0 });
  };

  const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  const formatDate = (ds) => {
    const d = new Date(ds + 'T12:00:00');
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    return `${days[d.getDay()]} ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-slide-up edit-modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="edit-modal-title">✏️ Randevuyu Düzenle</h2>
        <p className="edit-modal-sub">
          {formatDate(dateStr)} — <strong>{slot.time}</strong>
        </p>

        <form onSubmit={handleSubmit} className="edit-form">
          <div className="edit-field">
            <label>Ad Soyad</label>
            <input type="text" className="custom-input" value={name}
              onChange={e => setName(e.target.value)} required />
          </div>

          <div className="edit-field">
            <label>Telefon</label>
            <input type="tel" className="custom-input" value={phone}
              onChange={e => setPhone(e.target.value)} required />
          </div>

          <div className="edit-field">
            <label>Hizmet</label>
            <select className="custom-input" value={service}
              onChange={e => setService(e.target.value)}>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="edit-field">
            <label>Özel Not</label>
            <textarea className="custom-input" rows={2} value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Müşteri notu..." style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <div className="edit-field">
            <label>İndirim Oranı (%)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="number" className="custom-input" value={discountRate}
                onChange={e => setDiscountRate(e.target.value)}
                min={0} max={100} placeholder="0" style={{ flex: 1 }} />
              <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>%</span>
            </div>
            {discountRate > 0 && service && (
              <p style={{ color: 'var(--accent-gold)', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                ✓ %{discountRate} indirim uygulanacak
              </p>
            )}
          </div>

          <div className="edit-actions">
            <button type="button" className="edit-cancel-btn" onClick={onClose}>Vazgeç</button>
            <button type="submit" className="edit-save-btn">Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBookingModal;
