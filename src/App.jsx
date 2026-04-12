import React, { useState, useEffect, useCallback } from 'react';
import {
  getAllTimeSlotsForDate, bookSlot, getSettings,
  isClosedDay, getAdminPassword
} from './utils/bookingStore';
import CalendarPicker from './components/CalendarPicker';
import BookingModal from './components/BookingModal';
import AdminDashboard from './components/AdminDashboard';
import CustomerQueryModal from './components/CustomerQueryModal';
import { PromptModal } from './components/CustomModals';
import './App.css';

const App = () => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [allSlots, setAllSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null); // { time }
  const [view, setView] = useState('customer');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showQuery, setShowQuery] = useState(false);
  const [settings, setSettings] = useState(getSettings());
  const [toast, setToast] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0); // admin'den dönerken yeniden yükleme için

  const loadSlots = useCallback(() => {
    const fresh = getSettings();
    setSettings(fresh);
    setAllSlots(getAllTimeSlotsForDate(selectedDate));
  }, [selectedDate, refreshTick]); // refreshTick bağımlılığı: admin kaydı sonrası zorla yenile

  useEffect(() => { loadSlots(); }, [loadSlots]);

  const showToast = (title, desc, type = 'success') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleConfirmBooking = (slotId, barberId, name, phone, service, note) => {
    bookSlot(selectedDate, barberId, slotId, name, phone, service, note);
    loadSlots();
    setSelectedSlot(null);
    showToast('Randevunuz Alındı! 🎉', 'Berberimiz en kısa sürede onaylayacaktır.', 'success');
  };

  const handleAdminLogin = (pwd) => {
    setShowAdminLogin(false);
    if (pwd === getAdminPassword()) {
      setView('admin');
    } else {
      showToast('Hatalı Şifre', 'Lütfen tekrar deneyin.', 'error');
    }
  };

  const isClosed = isClosedDay(selectedDate, settings);
  const availableCount = allSlots.filter(s => s.status === 'available').length;
  const pendingCount   = allSlots.filter(s => s.status === 'pending').length;
  const fullCount      = allSlots.filter(s => s.status === 'full').length;

  const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const fmtDate = (ds) => {
    const d = new Date(ds + 'T12:00:00');
    return `${TR_DAYS[d.getDay()]}, ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
  };

  // Admin'den müşteri görünümüne dönerken refreshTick'i artır → loadSlots yeniden çalışır
  const handleBackToCustomer = () => {
    setRefreshTick(t => t + 1);
    setView('customer');
  };

  if (view === 'admin') {
    return (
      <AdminDashboard
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onBackToCustomer={handleBackToCustomer}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Topbar */}
      <header className="topbar glass-panel">
        <div className="topbar-brand">
          <span className="brand-icon">💈</span>
          <span className="brand-name">Bizim <strong>Berber</strong></span>
        </div>
        <nav className="topbar-nav">
          <button className="topbar-query-btn" onClick={() => setShowQuery(true)}>
            📞 Randevumu Sorgula
          </button>
          <button className="topbar-admin-link" onClick={() => setShowAdminLogin(true)}>
            Yönetici Girişi
          </button>
        </nav>
      </header>

      <main className="main-layout">
        {/* ---- LEFT: Calendar ---- */}
        <aside className="sidebar">
          <CalendarPicker
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </aside>

        {/* ---- RIGHT: All Time Slots ---- */}
        <section className="slots-section">
          <div className="slots-header">
            <div>
              <h2 className="slots-title">
                {fmtDate(selectedDate)}
              </h2>
              {!isClosed && allSlots.length > 0 && (
                <p className="slots-subtitle">
                  <span className="avail-count">🟢 {availableCount} müsait</span>
                  {pendingCount > 0 && <span className="pending-count">  🟡 {pendingCount} bekliyor</span>}
                  {fullCount > 0 && <span className="full-count">  🔴 {fullCount} dolu</span>}
                </p>
              )}
            </div>
          </div>

          {isClosed && (
            <div className="closed-day-msg glass-panel">
              <span>🚫</span>
              <p>Bu tarihte berberimiz kapalıdır.</p>
            </div>
          )}

          {!isClosed && allSlots.length === 0 && (
            <div className="closed-day-msg glass-panel">
              <span>📅</span>
              <p>Bu tarih için henüz saat oluşturulmamış.</p>
            </div>
          )}

          {!isClosed && allSlots.length > 0 && (
            <div className="slots-grid">
              {allSlots.map(({ time, status }) => {
                const hour = parseInt(time.split(':')[0], 10);
                const isAvailable = status === 'available';
                const isPending   = status === 'pending';
                const isFull      = status === 'full';
                const isCampaign  = isAvailable && hour >= 11 && hour <= 15;
                const isClickable = isAvailable; // Bekliyor ve dolu tıklanamaz
                return (
                  <div
                    key={time}
                    className={[
                      'slot-tile',
                      isFull     ? 'slot-tile-full'      : '',
                      isPending  ? 'slot-tile-pending'   : '',
                      isAvailable && !isCampaign ? 'slot-tile-available' : '',
                      isCampaign ? 'slot-tile-campaign'  : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => isClickable && setSelectedSlot({ time })}
                    title={
                      isFull    ? 'Dolu' :
                      isPending ? 'Onay Bekleniyor' :
                      isCampaign ? '%20 İndirim Fırsatı!' :
                      'Müsait - Tıkla'
                    }
                  >
                    <span className="slot-tile-time">{time}</span>
                    <span className="slot-tile-status">
                      {isFull    ? 'Dolu'      :
                       isPending ? 'Bekliyor'  :
                       isCampaign ? '% İndirim' :
                       'Müsait'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Booking Modal — service + barber selection inside */}
      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          dateStr={selectedDate}
          onConfirm={handleConfirmBooking}
          onClose={() => setSelectedSlot(null)}
        />
      )}

      {/* Admin Login */}
      {showAdminLogin && (
        <PromptModal
          title="Yönetici Girişi"
          message="Admin şifresini girin"
          placeholder="••••"
          isPassword
          onConfirm={handleAdminLogin}
          onClose={() => setShowAdminLogin(false)}
        />
      )}

      {/* Customer Query */}
      {showQuery && <CustomerQueryModal onClose={() => setShowQuery(false)} />}

      {/* Toast */}
      {toast && (
        <div className={`toast-notification ${toast.type} animate-slide-up`}>
          <strong>{toast.title}</strong>
          {toast.desc && <p>{toast.desc}</p>}
        </div>
      )}
    </div>
  );
};

export default App;
