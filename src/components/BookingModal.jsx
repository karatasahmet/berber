import React, { useState, useEffect } from 'react';
import { getSettings, getServiceNames, getAllBarbersWithStatusForSlot } from '../utils/bookingStore';
import './BookingModal.css';

const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const BookingModal = ({ slot, dateStr, onConfirm, onClose }) => {
  const settings = getSettings();
  const services = getServiceNames(settings);

  const [selectedService, setSelectedService] = useState('');
  const [allBarbers, setAllBarbers] = useState([]); // [{id, name, color, available, slotId, reason}]
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');

  // Hizmet değişince tüm berberleri yükle (müsait + dolu)
  useEffect(() => {
    if (selectedService) {
      const barbers = getAllBarbersWithStatusForSlot(dateStr, slot.time, selectedService);
      setAllBarbers(barbers);
      setSelectedBarber(null);
    } else {
      setAllBarbers([]);
      setSelectedBarber(null);
    }
  }, [selectedService, dateStr, slot.time]);

  const d = new Date(dateStr + 'T12:00:00');
  const dateLabel = `${TR_DAYS[d.getDay()]}, ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedService || !selectedBarber) return;
    onConfirm(selectedBarber.slotId, selectedBarber.id, name, phone, selectedService, note);
  };

  const svcInfo = settings.prices?.[selectedService];
  const svcDuration = svcInfo?.duration || settings.interval || 30;

  const canShowBarbers = !!selectedService;
  const canShowForm = !!selectedBarber;

  const availableCount = allBarbers.filter(b => b.available).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel animate-slide-up booking-modal"
        onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* Header */}
        <div className="bm-header">
          <h2 className="modal-title">Randevu Oluştur</h2>
          <div className="bm-time-badge">
            <span className="bm-date">{dateLabel}</span>
            <span className="bm-time">{slot.time}</span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="bm-steps">
          <div className={`bm-step ${selectedService ? 'bm-step-done' : 'bm-step-active'}`}>
            <span className="bm-step-num">1</span>
            <span className="bm-step-label">Hizmet</span>
          </div>
          <div className="bm-step-line" />
          <div className={`bm-step ${!selectedService ? 'bm-step-waiting' : selectedBarber ? 'bm-step-done' : 'bm-step-active'}`}>
            <span className="bm-step-num">2</span>
            <span className="bm-step-label">Berber</span>
          </div>
          <div className="bm-step-line" />
          <div className={`bm-step ${!selectedBarber ? 'bm-step-waiting' : 'bm-step-active'}`}>
            <span className="bm-step-num">3</span>
            <span className="bm-step-label">Bilgiler</span>
          </div>
        </div>

        {/* Step 1: Service */}
        <div className="bm-section">
          <p className="bm-section-label">1️⃣ Hizmet Seçin</p>
          <div className="bm-service-grid">
            {services.map(svc => {
              const info = settings.prices?.[svc];
              const dur = info?.duration || settings.interval || 30;
              return (
                <button
                  key={svc}
                  className={`bm-service-btn ${selectedService === svc ? 'bm-selected' : ''}`}
                  onClick={() => setSelectedService(svc)}
                  type="button"
                >
                  <span className="bm-svc-name">{svc}</span>
                  <span className="bm-svc-dur">{dur} dk</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Barber — tüm aktif berberler, dolu olanlar pasif */}
        {canShowBarbers && (
          <div className="bm-section">
            <p className="bm-section-label">
              2️⃣ Berber Seçin
              {allBarbers.length > 0 && (
                <span className="bm-barber-avail-hint">
                  {availableCount === 0
                    ? ' — Bu saatte hiçbir berber müsait değil'
                    : availableCount === allBarbers.length
                    ? ` — ${availableCount} berber müsait`
                    : ` — ${availableCount}/${allBarbers.length} berber müsait`}
                </span>
              )}
            </p>
            <div className="bm-barber-grid">
              {allBarbers.map(b => {
                const isSelected = selectedBarber?.id === b.id;
                return (
                  <button
                    key={b.id}
                    className={[
                      'bm-barber-btn',
                      isSelected ? 'bm-selected' : '',
                      !b.available ? 'bm-barber-disabled' : '',
                    ].filter(Boolean).join(' ')}
                    style={{ '--barber-color': b.color }}
                    onClick={() => b.available && setSelectedBarber(b)}
                    type="button"
                    disabled={!b.available}
                    title={!b.available ? 'Bu saatte dolu' : `${b.name} — Müsait`}
                  >
                    <span
                      className="bm-barber-dot"
                      style={{ background: b.color }}
                    />
                    <span className="bm-barber-name">{b.name}</span>
                    {b.available ? (
                      <span className="bm-barber-status bm-status-avail">Müsait</span>
                    ) : (
                      <span className="bm-barber-status bm-status-full">Dolu</span>
                    )}
                  </button>
                );
              })}
            </div>
            {availableCount === 0 && allBarbers.length > 0 && (
              <p className="bm-no-barber">
                ⚠️ <strong>{selectedService}</strong> ({svcDuration} dk) için bu saatte hiçbir berber uygun değil.
                Farklı bir saat veya hizmet seçin.
              </p>
            )}
          </div>
        )}

        {/* Step 3: Personal info */}
        {canShowForm && (
          <form className="bm-form" onSubmit={handleSubmit}>
            <p className="bm-section-label">3️⃣ Bilgileriniz</p>

            <div className="form-group">
              <label htmlFor="bm-name">AD SOYAD</label>
              <input id="bm-name" type="text" className="custom-input"
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Ahmet Yılmaz" required autoFocus />
            </div>

            <div className="form-group">
              <label htmlFor="bm-phone">TELEFON</label>
              <input id="bm-phone" type="tel" className="custom-input"
                value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="05XX XXX XX XX" required />
            </div>

            <div className="form-group">
              <label htmlFor="bm-note">
                ÖZEL NOT <span style={{ color: 'var(--text-muted)', textTransform: 'none', fontSize: '0.75rem' }}>(isteğe bağlı)</span>
              </label>
              <textarea id="bm-note" className="custom-input" rows={2}
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="Alerji, tercih..." style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </div>

            {/* Summary */}
            <div className="bm-summary">
              <span>💈 {selectedService} • {svcDuration} dk</span>
              <span style={{ color: selectedBarber?.color ?? 'var(--accent-gold)' }}>
                <span className="bm-barber-dot" style={{ background: selectedBarber?.color }} />
                {selectedBarber?.name}
              </span>
            </div>

            <button type="submit" className="confirm-btn">RANDEVUYU ONAYLA</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
