import React, { useState } from 'react';
import { lookupByPhone } from '../utils/bookingStore';
import './CustomerQueryModal.css';

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  return `${days[d.getDay()]} ${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const CustomerQueryModal = ({ onClose }) => {
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    const found = lookupByPhone(phone);
    setResults(found);
    setSearched(true);
  };

  const statusLabel = (status) => {
    if (status === 'booked') return { text: 'Onaylandı ✓', color: 'var(--success)' };
    if (status === 'pending') return { text: 'Onay Bekleniyor ⏳', color: '#eab308' };
    return { text: status, color: 'var(--text-muted)' };
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-slide-up customer-query-modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="query-title">📞 Randevumu Sorgula</h2>
        <p className="query-sub">Telefon numaranızı girerek randevularınızın durumunu öğrenin.</p>

        <form onSubmit={handleSearch} className="query-form">
          <input
            type="tel"
            className="custom-input"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="05XX XXX XX XX"
            autoFocus
            required
          />
          <button type="submit" className="query-search-btn">Sorgula</button>
        </form>

        {searched && results !== null && (
          <div className="query-results">
            {results.length === 0 ? (
              <div className="query-empty">
                <span>🔍</span>
                <p>Bu numara ile randevu bulunamadı.</p>
              </div>
            ) : (
              <>
                <p className="query-count">{results.length} randevu bulundu</p>
                {results.map(slot => {
                  const st = statusLabel(slot.status);
                  return (
                    <div key={`${slot.dateStr}-${slot.id}`} className="query-result-card glass-panel">
                      <div className="qrc-header">
                        <span className="qrc-date">{formatDate(slot.dateStr)}</span>
                        <span className="qrc-time">{slot.time}</span>
                      </div>
                      <div className="qrc-service">{slot.service || '—'}</div>
                      {slot.note && <div className="qrc-note">📝 {slot.note}</div>}
                      <div className="qrc-status" style={{ color: st.color }}>
                        {st.text}
                      </div>
                      {slot.manualCampaign && (
                        <div className="qrc-discount">🏷️ {slot.manualCampaign.rate}</div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerQueryModal;
