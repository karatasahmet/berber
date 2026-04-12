import React, { useState, useEffect } from 'react';
import { getSettings, getServiceNames, getAllBarbersWithStatusForSlot, getBarbersWithCampaigns, getServicePrice } from '../utils/bookingStore';
import './BookingModal.css';

const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const BookingModal = ({ slot, dateStr, onConfirm, onClose }) => {
  const settings = getSettings();
  const services = getServiceNames(settings);

  // Step 1: Berber, Step 2: Hizmet, Step 3: Bilgiler
  const [barbersOverview, setBarbersOverview] = useState([]); // berbers with campaign info
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [allBarbers, setAllBarbers] = useState([]); // berbers with availability for selected service
  const [selectedService, setSelectedService] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');

  // Load barbers overview on mount (with campaign info, before service selection)
  useEffect(() => {
    const barbers = getBarbersWithCampaigns(dateStr, slot.time);
    setBarbersOverview(barbers);
  }, [dateStr, slot.time]);

  // When barber is selected and service changes, check availability
  useEffect(() => {
    if (selectedBarber && selectedService) {
      const barbers = getAllBarbersWithStatusForSlot(dateStr, slot.time, selectedService);
      setAllBarbers(barbers);
      // Check if the selected barber is still available for this service
      const match = barbers.find(b => b.id === selectedBarber.id);
      if (match && !match.available) {
        // Berber bu hizmet için uygun değil, uyar
        setSelectedBarber(prev => ({ ...prev, slotId: null, unavailableForService: true }));
      } else if (match && match.available) {
        setSelectedBarber(prev => ({ ...prev, slotId: match.slotId, unavailableForService: false }));
      }
    }
  }, [selectedService, selectedBarber?.id, dateStr, slot.time]);

  const d = new Date(dateStr + 'T12:00:00');
  const dateLabel = `${TR_DAYS[d.getDay()]}, ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;

  const svcInfo = settings.prices?.[selectedService];
  const svcDuration = svcInfo?.duration || settings.interval || 30;
  const svcPrice = selectedService ? getServicePrice(selectedService, settings) : 0;

  const canShowServices = !!selectedBarber;
  const canShowForm = !!selectedBarber && !!selectedService && !selectedBarber.unavailableForService;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedService || !selectedBarber || !selectedBarber.slotId) return;
    onConfirm(selectedBarber.slotId, selectedBarber.id, name, phone, selectedService, note);
  };

  const handleBarberSelect = (barber) => {
    if (!barber.available) return;
    setSelectedBarber({ ...barber, unavailableForService: false });
    setSelectedService(''); // Reset service when barber changes
  };

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
          <div className={`bm-step ${selectedBarber ? 'bm-step-done' : 'bm-step-active'}`}>
            <span className="bm-step-num">1</span>
            <span className="bm-step-label">Berber</span>
          </div>
          <div className="bm-step-line" />
          <div className={`bm-step ${!selectedBarber ? 'bm-step-waiting' : selectedService ? 'bm-step-done' : 'bm-step-active'}`}>
            <span className="bm-step-num">2</span>
            <span className="bm-step-label">Hizmet</span>
          </div>
          <div className="bm-step-line" />
          <div className={`bm-step ${!selectedService ? 'bm-step-waiting' : 'bm-step-active'}`}>
            <span className="bm-step-num">3</span>
            <span className="bm-step-label">Bilgiler</span>
          </div>
        </div>

        {/* Step 1: Berber Selection */}
        <div className="bm-section">
          <p className="bm-section-label">
            1️⃣ Berber Seçin
            {barbersOverview.length > 0 && (
              <span className="bm-barber-avail-hint">
                {' — '}{barbersOverview.filter(b => b.available).length}/{barbersOverview.length} berber müsait
              </span>
            )}
          </p>
          <div className="bm-barber-grid">
            {barbersOverview.map(b => {
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
                  onClick={() => handleBarberSelect(b)}
                  type="button"
                  disabled={!b.available}
                  title={!b.available ? 'Bu saatte dolu' : `${b.name} — Müsait`}
                >
                  <span className="bm-barber-dot" style={{ background: b.color }} />
                  <span className="bm-barber-name">{b.name}</span>
                  {b.available ? (
                    <span className="bm-barber-status bm-status-avail">Müsait</span>
                  ) : (
                    <span className="bm-barber-status bm-status-full">Dolu</span>
                  )}
                  {b.campaign && (() => {
                    const rateMatch = b.campaign.match(/(\d+)/);
                    const rate = rateMatch ? parseInt(rateMatch[1]) : 0;
                    const isHot = rate >= 50;
                    return (
                      <span className={`bm-barber-campaign ${isHot ? 'bm-barber-campaign-hot' : ''}`}>
                        {b.campaign} {isHot && '🔥'}
                      </span>
                    );
                  })()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Service Selection */}
        {canShowServices && (
          <div className="bm-section">
            <p className="bm-section-label">2️⃣ Hizmet Seçin</p>
            <div className="bm-service-grid">
              {services.map(svc => {
                const info = settings.prices?.[svc];
                const dur = info?.duration || settings.interval || 30;
                const price = typeof info === 'object' ? info.price : info;
                return (
                  <button
                    key={svc}
                    className={`bm-service-btn ${selectedService === svc ? 'bm-selected' : ''}`}
                    onClick={() => setSelectedService(svc)}
                    type="button"
                  >
                    <span className="bm-svc-name">{svc}</span>
                    <span className="bm-svc-meta">
                      <span className="bm-svc-dur">{dur} dk</span>
                      <span className="bm-svc-price">{price?.toLocaleString('tr-TR')} ₺</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Warning if selected barber is not available for this service */}
            {selectedBarber?.unavailableForService && selectedService && (
              <p className="bm-no-barber">
                ⚠️ <strong>{selectedBarber.name}</strong> berberi, <strong>{selectedService}</strong> ({svcDuration} dk) için bu saatte uygun değil.
                Farklı bir hizmet veya saat seçin.
              </p>
            )}
          </div>
        )}

        {/* Step 3: Personal info + Price Summary */}
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

            {/* Price Summary */}
            <div className="bm-price-summary">
              <div className="bm-price-row">
                <span>💈 {selectedService}</span>
                <span>{svcDuration} dk</span>
              </div>
              <div className="bm-price-row">
                <span style={{ color: selectedBarber?.color ?? 'var(--accent-gold)' }}>
                  <span className="bm-barber-dot" style={{ background: selectedBarber?.color }} />
                  {selectedBarber?.name}
                </span>
                <span>{slot.time}</span>
              </div>
              <div className="bm-price-divider" />
              <div className="bm-price-row bm-price-total">
                <span>💰 Ödenecek Tutar</span>
                <span className="bm-total-amount">{svcPrice.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>

            <button type="submit" className="confirm-btn">RANDEVUYU ONAYLA</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
