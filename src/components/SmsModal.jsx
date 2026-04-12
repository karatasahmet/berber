import React from 'react';
import './SmsModal.css';

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return `${days[d.getDay()]} ${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const SmsModal = ({ slot, dateStr, type, onClose }) => {
  const isApproved = type === 'approve';
  const cleanPhone = (slot.phone || '').replace(/\D/g, '');

  const message = isApproved
    ? `Sayın ${slot.customerName}, ${formatDate(dateStr)} tarihinde saat ${slot.time}'deki ${slot.service || 'randevu'} randevunuz onaylanmıştır. İyi günler dileriz. 💈 Bizim Berber`
    : `Sayın ${slot.customerName}, ${formatDate(dateStr)} tarihindeki randevu talebiniz kabul edilememiştir. Farklı bir saat seçmek için sitemizi ziyaret edebilirsiniz. 💈 Bizim Berber`;

  const waLink = `https://wa.me/90${cleanPhone}?text=${encodeURIComponent(message)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message).catch(() => null);
    alert('Mesaj panoya kopyalandı!');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-slide-up sms-modal">
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className={`sms-header ${isApproved ? 'sms-approved' : 'sms-rejected'}`}>
          <span className="sms-icon">{isApproved ? '✅' : '❌'}</span>
          <h2>{isApproved ? 'Randevu Onaylandı' : 'Randevu Reddedildi'}</h2>
        </div>

        <p className="sms-sub">Müşteriye gönderebileceğiniz bildirim mesajı:</p>

        <div className="sms-preview">
          <div className="sms-bubble">{message}</div>
        </div>

        <div className="sms-actions">
          <button className="sms-copy-btn" onClick={handleCopy}>
            📋 Kopyala
          </button>
          {cleanPhone.length >= 10 && (
            <a className="sms-wa-btn" href={waLink} target="_blank" rel="noopener noreferrer">
              <span>💬</span> WhatsApp'ta Gönder
            </a>
          )}
        </div>

        <button className="sms-close-btn" onClick={onClose}>Kapat</button>
      </div>
    </div>
  );
};

export default SmsModal;
