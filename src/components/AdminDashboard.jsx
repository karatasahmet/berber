import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAdminSlotsForDate, cancelBooking, editBooking, setManualCampaign,
  getActiveCampaigns, getSettings, getPendingBookings, getPendingCount,
  approveBooking, rejectBooking
} from '../utils/bookingStore';
import { ConfirmModal, DiscountModal } from './CustomModals';
import EditBookingModal from './EditBookingModal';
import SmsModal from './SmsModal';
import AdminSettings from './AdminSettings';
import WeeklyOverview from './WeeklyOverview';
import MonthlyOverview from './MonthlyOverview';
import RevenueReport from './RevenueReport';
import CalendarPicker from './CalendarPicker';
import Toast from './Common/Toast';
import './AdminDashboard.css';

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  return `${days[d.getDay()]} ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
};

const AdminDashboard = ({ onBackToCustomer, selectedDate, onDateChange }) => {
  const [slots, setSlots] = useState([]);
  const [campaigns, setCampaigns] = useState({});
  const [activeTab, setActiveTab] = useState('pending');
  const [sysSettings, setSysSettings] = useState(getSettings());
  const [pendingBookings, setPendingBookings] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedBarberFilter, setSelectedBarberFilter] = useState('all');
  const [expandedSlots, setExpandedSlots] = useState({}); // track expanded service detail rows
  const [showCalendar, setShowCalendar] = useState(false); // takvim popup'ı

  // Modals
  const [confirmCancelSlot, setConfirmCancelSlot] = useState(null);
  const [editSlot, setEditSlot] = useState(null);
  const [campaignPromptSlot, setCampaignPromptSlot] = useState(null);
  const [campaignRate, setCampaignRate] = useState('');
  const [rejectConfirmSlot, setRejectConfirmSlot] = useState(null);
  const [discountSlot, setDiscountSlot] = useState(null);
  const [smsState, setSmsState] = useState(null); // {slot, dateStr, type}
  const [toast, setToast] = useState(null);

  const loadData = useCallback(() => {
    const fresh = getSettings();
    setSysSettings(fresh);
    const filterId = selectedBarberFilter === 'all' ? null : selectedBarberFilter;
    const data = getAdminSlotsForDate(selectedDate, filterId);
    setSlots(data);
    setCampaigns(getActiveCampaigns(data));
    const pending = getPendingBookings();
    setPendingBookings(pending);
    setPendingCount(pending.length);
  }, [selectedDate, activeTab, selectedBarberFilter]);

  useEffect(() => { loadData(); }, [loadData, activeTab]);

  // Takvim dışına tıklanınca kapat
  const calendarRef = useRef(null);
  useEffect(() => {
    if (!showCalendar) return;
    const handleOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showCalendar]);

  // --- STATS CALCULATION ---
  const settings = sysSettings;
  
  // 1. Daily Revenue (Confirmed)
  let dailyConfirmedRevenue = 0;
  // 2. Daily Intensity (Booked Slots / Total Slots)
  let bookedSlotsCount = 0;
  
  slots.forEach(slot => {
    if (slot.status === 'booked' && slot.service) {
      bookedSlotsCount++;
      const svc = settings.prices?.[slot.service];
      let price = typeof svc === 'object' ? (svc?.price || 0) : (svc || 0);
      if (slot.manualCampaign) {
        const m = slot.manualCampaign.rate.match(/(\d+)/);
        if (m) price -= price * parseInt(m[1]) / 100;
      }
      dailyConfirmedRevenue += price;
    }
  });

  const totalSlotsCount = slots.length;
  const dailyIntensity = totalSlotsCount > 0 ? Math.round((bookedSlotsCount / totalSlotsCount) * 100) : 0;

  // --- Pending actions ---
  const handleApprove = (dateStr, barberId, slotId, slot) => {
    approveBooking(dateStr, barberId, slotId, null);
    setSmsState({ slot, dateStr, type: 'approve' });
    setToast({ message: 'Randevu onaylandı ve SMS taslağı hazırlandı.', type: 'success' });
    loadData();
  };
  const handleDiscountApprove = (discountRate) => {
    if (discountSlot && discountRate) {
      approveBooking(discountSlot.dateStr, discountSlot.barberId, discountSlot.slotId, discountRate);
      setSmsState({ slot: discountSlot.slot, dateStr: discountSlot.dateStr, type: 'approve' });
      setToast({ message: 'İndirim uygulandı ve onaylandı.', type: 'success' });
    }
    setDiscountSlot(null);
    loadData();
  };
  const handleRejectConfirm = () => {
    if (rejectConfirmSlot) {
      rejectBooking(rejectConfirmSlot.dateStr, rejectConfirmSlot.barberId, rejectConfirmSlot.slotId);
      setSmsState({ slot: rejectConfirmSlot.slot, dateStr: rejectConfirmSlot.dateStr, type: 'reject' });
      setToast({ message: 'Randevu talebi reddedildi.', type: 'warning' });
      setRejectConfirmSlot(null);
      loadData();
    }
  };

  // --- Booking table actions ---
  const executeCancel = () => {
    if (confirmCancelSlot) {
      cancelBooking(confirmCancelSlot.dateStr, confirmCancelSlot.barberId, confirmCancelSlot.slotId);
      setToast({ message: 'Randevu başarıyla iptal edildi.', type: 'danger' });
      setConfirmCancelSlot(null);
      loadData();
    }
  };
  const executeEdit = (fields) => {
    if (editSlot) {
      editBooking(editSlot.dateStr, editSlot.barberId, editSlot.slotId, fields);
      setEditSlot(null);
      loadData();
    }
  };
  const handleToggleCampaign = (slot) => {
    if (slot.manualCampaign) {
      setManualCampaign(selectedDate, slot.barberId, slot.id, null);
      loadData();
    } else {
      // Toggle inline input at the slot
      if (campaignPromptSlot?.id === slot.id) {
        setCampaignPromptSlot(null);
        setCampaignRate('');
      } else {
        setCampaignPromptSlot(slot);
        setCampaignRate('');
      }
    }
  };

  const handleInlineCampaignConfirm = () => {
    const num = parseInt(campaignRate, 10);
    if (num > 0 && num <= 100 && campaignPromptSlot) {
      setManualCampaign(selectedDate, campaignPromptSlot.barberId, campaignPromptSlot.id, `%${num} İndirim Fırsatı!`);
      setCampaignPromptSlot(null);
      setCampaignRate('');
      loadData();
    }
  };

  const handleOverviewDaySelect = (dateStr) => {
    onDateChange(dateStr);
    setActiveTab('bookings');
  };

  const barberName = (barberId) => {
    const b = settings.barbers?.find(b => b.id === barberId);
    return b ? b.name : barberId;
  };
  const barberColor = (barberId) => {
    const b = settings.barbers?.find(b => b.id === barberId);
    return b?.color || '#D4AF37';
  };

  const toggleSlotExpand = (slotId) => {
    setExpandedSlots(prev => ({ ...prev, [slotId]: !prev[slotId] }));
  };

  const getSlotPriceInfo = (slot) => {
    if (!slot.service) return null;
    const svc = settings.prices?.[slot.service];
    const basePrice = typeof svc === 'object' ? (svc?.price || 0) : (svc || 0);
    let discountRate = 0;
    if (slot.manualCampaign) {
      const m = slot.manualCampaign.rate.match(/(\d+)/);
      if (m) discountRate = parseInt(m[1]);
    }
    const discountAmount = basePrice * discountRate / 100;
    const finalPrice = basePrice - discountAmount;
    return { basePrice, discountRate, discountAmount, finalPrice };
  };

  const tabs = [
    { id: 'pending', label: `🔔 Bekleyen${pendingCount > 0 ? ` (${pendingCount})` : ''}`, alert: pendingCount > 0 },
    { id: 'bookings', label: '📅 Randevular' },
    { id: 'weekly', label: '📊 Haftalık' },
    { id: 'monthly', label: '🗓️ Aylık' },
    { id: 'report', label: '📈 Raporlama' },
    { id: 'settings', label: '⚙️ Ayarlar' },
  ];

  const PendingActions = ({ slot, dateStr }) => (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
      <button className="action-btn approve-btn"
        onClick={() => handleApprove(dateStr, slot.barberId, slot.id, slot)}>
        ✓ Onayla
      </button>
      <button className="action-btn discount-approve-btn"
        onClick={() => setDiscountSlot({ dateStr, barberId: slot.barberId, slotId: slot.id, slot })}>
        % İndirimli
      </button>
      <button className="action-btn cancel-btn"
        onClick={() => setRejectConfirmSlot({ dateStr, barberId: slot.barberId, slotId: slot.id, slot })}>
        ✕ Reddet
      </button>
    </div>
  );

  return (
    <div className="admin-dashboard animate-slide-up">
      <div className="admin-header glass-panel">
        <div className="admin-title">
          <h2>BİZİM BERBER <span>Panel</span></h2>
          <p>Yönetici Paneli (Finans ve Planlama)</p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {tabs.map(tab => (
              <button key={tab.id}
                className={`action-btn ${activeTab === tab.id ? 'remove-campaign-btn' : 'add-campaign-btn'} ${tab.alert && activeTab !== tab.id ? 'tab-alert' : ''}`}
                onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <button className="back-btn" onClick={onBackToCustomer}>← Siteye Dön</button>
      </div>

      {/* ===== STATS WIDGETS ===== */}
      <div className="admin-stats-row">
        <div className="stat-card glass-panel animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <span className="stat-label">Günlük Kazanç</span>
            <span className="stat-value">{dailyConfirmedRevenue.toLocaleString('tr-TR')} ₺</span>
            <span className="stat-trend" style={{ color: 'var(--success)' }}>Onaylanmış</span>
          </div>
        </div>

        <div className="stat-card glass-panel animate-slide-up" style={{ animationDelay: '0.2s' }} onClick={() => setActiveTab('pending')}>
          <div className="stat-icon">🔔</div>
          <div className="stat-info">
            <span className="stat-label">Bekleyen Onaylar</span>
            <span className="stat-value">{pendingCount} Adet</span>
            <span className="stat-trend" style={{ color: pendingCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {pendingCount > 0 ? 'İşlem Gerekli' : 'Hepsi Tamam'}
            </span>
          </div>
        </div>

        <div className="stat-card glass-panel animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <span className="stat-label">Bugünlük Yoğunluk</span>
            <span className="stat-value">%{dailyIntensity} Dolu</span>
            <div className="stat-progress-bg">
              <div className="stat-progress-bar" style={{ width: `${dailyIntensity}%` }} />
            </div>
          </div>
        </div>

        <div className="stat-card glass-panel animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="stat-icon">👤</div>
          <div className="stat-info">
            <span className="stat-label">Aktif Berber</span>
            <span className="stat-value">{settings.barbers?.filter(b => b.active).length || 0}</span>
            <span className="stat-trend">Hizmet Veriyor</span>
          </div>
        </div>
      </div>

      <div className="admin-content">

        {/* ===== PENDING ===== */}
        {activeTab === 'pending' && (
          <div className="table-responsive glass-panel">
            <div style={{ padding: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--accent-gold)' }}>
                🔔 Onay Bekleyen Randevular
                {pendingCount > 0 && (
                  <span style={{ marginLeft: '0.75rem', background: 'var(--danger)', color: '#fff', borderRadius: '999px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 700 }}>{pendingCount}</span>
                )}
              </h3>
              {pendingCount === 0 && <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Bekleyen randevu bulunmuyor.</p>}
            </div>
            {pendingBookings.length > 0 && (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tarih</th><th>Saat</th><th>Müşteri</th>
                    <th>Hizmet / Detay</th><th>Berber</th><th>Not</th><th>Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingBookings.map(slot => {
                    const priceInfo = getSlotPriceInfo(slot);
                    const isExpanded = expandedSlots[`p-${slot.dateStr}-${slot.id}`];
                    return (
                      <React.Fragment key={`${slot.dateStr}-${slot.id}`}>
                        <tr className="row-pending">
                          <td style={{ fontSize: '0.9rem' }}>{formatDate(slot.dateStr)}</td>
                          <td className="col-time">{slot.time}</td>
                          <td>
                            <div className="cust-name">{slot.customerName}</div>
                            <div className="cust-phone">{slot.phone}</div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{slot.service}</span>
                              {priceInfo && (
                                <button
                                  className="detail-toggle-btn"
                                  onClick={() => toggleSlotExpand(`p-${slot.dateStr}-${slot.id}`)}
                                  title="Detay göster"
                                >
                                  {isExpanded ? '▾' : '▸'} ₺
                                </button>
                              )}
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{slot.duration} dk</span>
                            {slot.manualCampaign && (
                              <div style={{ marginTop: '3px' }}>
                                <span className="campaign-badge" style={{ fontSize: '0.72rem' }}>{slot.manualCampaign.rate}</span>
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ color: barberColor(slot.barberId), fontWeight: 600, fontSize: '0.85rem' }}>
                              {barberName(slot.barberId)}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '120px' }}>
                            {slot.note || '—'}
                          </td>
                          <td><PendingActions slot={slot} dateStr={slot.dateStr} /></td>
                        </tr>
                        {isExpanded && priceInfo && (
                          <tr className="detail-row">
                            <td colSpan="7">
                              <div className="detail-row-content">
                                <span>💈 {slot.service}</span>
                                <span>Fiyat: <strong>{priceInfo.basePrice.toLocaleString('tr-TR')} ₺</strong></span>
                                {priceInfo.discountRate > 0 && (
                                  <>
                                    <span style={{ color: 'var(--danger)' }}>İndirim: %{priceInfo.discountRate} (-{priceInfo.discountAmount.toLocaleString('tr-TR')} ₺)</span>
                                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>Ödenecek: {priceInfo.finalPrice.toLocaleString('tr-TR')} ₺</span>
                                  </>
                                )}
                                {priceInfo.discountRate === 0 && (
                                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>Ödenecek: {priceInfo.finalPrice.toLocaleString('tr-TR')} ₺</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ===== BOOKINGS ===== */}
        {activeTab === 'bookings' && (
          <div className="table-responsive glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div ref={calendarRef} style={{ position: 'relative' }}>
                  <label style={{ marginRight: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Tarih:</label>
                  <button
                    className="admin-calendar-toggle-btn"
                    onClick={() => setShowCalendar(v => !v)}
                  >
                    📅 {formatDate(selectedDate)}
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>{showCalendar ? '▲' : '▼'}</span>
                  </button>
                  {showCalendar && (
                    <div className="admin-calendar-dropdown" onClick={e => e.stopPropagation()}>
                      <CalendarPicker
                        selectedDate={selectedDate}
                        onDateSelect={(d) => { onDateChange(d); setShowCalendar(false); }}
                      />
                    </div>
                  )}
                </div>
                {sysSettings.barbers && sysSettings.barbers.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Berber:</label>
                    <select
                      className="custom-input"
                      style={{ width: 'auto', paddingRight: '2rem' }}
                      value={selectedBarberFilter}
                      onChange={e => setSelectedBarberFilter(e.target.value)}
                    >
                      <option value="all">Tümü</option>
                      {sysSettings.barbers.filter(b => b.active).map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    {selectedBarberFilter !== 'all' && (
                      <span
                        style={{
                          width: 10, height: 10, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
                          background: sysSettings.barbers.find(b => b.id === selectedBarberFilter)?.color || '#D4AF37'
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {slots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Bu tarihte slot bulunamadı.</div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Saat</th><th>Durum</th><th>Müşteri</th>
                    <th>Hizmet / Süre</th><th>Berber</th><th>Not</th><th>Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map(slot => {
                    const isBooked = slot.status === 'booked';
                    const isPending = slot.status === 'pending';
                    
                    // NEW: Past/Upcoming logic
                    const now = new Date();
                    const todayStr = now.toISOString().split('T')[0];
                    const [h, m] = slot.time.split(':').map(Number);
                    const slotDate = new Date(selectedDate + 'T12:00:00');
                    slotDate.setHours(h, m, 0, 0);
                    const isPast = slotDate < now;
                    
                    const rowClass = [
                      isBooked ? 'row-booked' : isPending ? 'row-pending' : 'row-available',
                      isPast ? 'row-past' : 'row-upcoming'
                    ].join(' ');

                    const priceInfo = getSlotPriceInfo(slot);
                    const isExpanded = expandedSlots[`b-${slot.id}`];

                    return (
                      <React.Fragment key={slot.id}>
                        <tr className={rowClass}>
                          <td className="col-time">{slot.time}</td>
                          <td>
                            {isBooked && (isPast ? <span className="status-badge status-completed">Tamamlandı</span> : <span className="status-badge status-booked">Dolu</span>)}
                            {isPending && <span className="status-badge status-pending">Bekliyor</span>}
                            {!isBooked && !isPending && (isPast ? <span className="status-badge status-expired">Geçti</span> : <span className="status-badge status-available">Müsait</span>)}
                            {slot.manualCampaign && (
                              <div style={{ marginTop: '4px' }}>
                                <span className="campaign-badge" style={{ fontSize: '0.7rem' }}>{slot.manualCampaign.rate}</span>
                              </div>
                            )}
                          </td>
                          <td>
                            {(isBooked || isPending) ? (<><div className="cust-name">{slot.customerName}</div><div className="cust-phone">{slot.phone}</div></>) : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{slot.service || '—'}</span>
                              {priceInfo && (isBooked || isPending) && (
                                <button
                                  className="detail-toggle-btn"
                                  onClick={() => toggleSlotExpand(`b-${slot.id}`)}
                                  title="Fiyat detayı"
                                >
                                  {isExpanded ? '▾' : '▸'} ₺
                                </button>
                              )}
                            </div>
                            {slot.duration > 0 && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{slot.duration} dk</div>}
                          </td>
                          <td>
                            <span style={{ color: barberColor(slot.barberId), fontWeight: 600, fontSize: '0.85rem' }}>
                              {barberName(slot.barberId)}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '100px' }}>
                            {slot.note || '—'}
                          </td>
                          <td>
                            {isPending && <PendingActions slot={slot} dateStr={selectedDate} />}
                            {isBooked && (
                              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <button className="action-btn" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-thin)' }}
                                  onClick={() => setEditSlot({ ...slot, dateStr: selectedDate })}>
                                  ✏️ Düzenle
                                </button>
                                <button className="action-btn cancel-btn"
                                  onClick={() => setConfirmCancelSlot({ dateStr: selectedDate, barberId: slot.barberId, slotId: slot.id })}>
                                  İptal Et
                                </button>
                              </div>
                            )}
                            {!isBooked && !isPending && (
                              <div style={{ position: 'relative' }}>
                                <button
                                  className={`action-btn ${slot.manualCampaign ? 'remove-campaign-btn' : 'add-campaign-btn'}`}
                                  onClick={() => handleToggleCampaign(slot)}>
                                  {slot.manualCampaign ? '★ Kaldır' : '★ İndirim Ekle'}
                                </button>
                                {campaignPromptSlot?.id === slot.id && (
                                  <div className="inline-campaign-input">
                                    <input
                                      type="number" min="1" max="100" autoFocus
                                      className="custom-input"
                                      value={campaignRate}
                                      onChange={e => setCampaignRate(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') handleInlineCampaignConfirm(); if (e.key === 'Escape') { setCampaignPromptSlot(null); setCampaignRate(''); } }}
                                      placeholder="%"
                                      style={{ width: 60, padding: '0.3rem 0.4rem', fontSize: '0.8rem' }}
                                    />
                                    <button className="action-btn add-campaign-btn" style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                                      onClick={handleInlineCampaignConfirm}>✓</button>
                                    <button className="action-btn cancel-btn" style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                                      onClick={() => { setCampaignPromptSlot(null); setCampaignRate(''); }}>✕</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                        {isExpanded && priceInfo && (
                          <tr className="detail-row">
                            <td colSpan="7">
                              <div className="detail-row-content">
                                <span>💈 {slot.service}</span>
                                <span>Fiyat: <strong>{priceInfo.basePrice.toLocaleString('tr-TR')} ₺</strong></span>
                                {priceInfo.discountRate > 0 && (
                                  <>
                                    <span style={{ color: 'var(--danger)' }}>İndirim: %{priceInfo.discountRate} (-{priceInfo.discountAmount.toLocaleString('tr-TR')} ₺)</span>
                                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>Ödenecek: {priceInfo.finalPrice.toLocaleString('tr-TR')} ₺</span>
                                  </>
                                )}
                                {priceInfo.discountRate === 0 && (
                                  <span style={{ color: 'var(--success)', fontWeight: 700 }}>Ödenecek: {priceInfo.finalPrice.toLocaleString('tr-TR')} ₺</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'weekly' && <WeeklyOverview onDaySelect={handleOverviewDaySelect} />}
        {activeTab === 'monthly' && <MonthlyOverview onDaySelect={handleOverviewDaySelect} />}
        {activeTab === 'report' && <RevenueReport />}
        {activeTab === 'settings' && <AdminSettings />}
      </div>

      {/* ===== MODALS ===== */}
      {confirmCancelSlot && (
        <ConfirmModal title="Randevuyu İptal Et?" message="Bu randevu iptal edilecek ve saat yeniden açılacaktır."
          onConfirm={executeCancel} onClose={() => setConfirmCancelSlot(null)} />
      )}

      {editSlot && (
        <EditBookingModal
          slot={editSlot}
          dateStr={editSlot.dateStr}
          barberId={editSlot.barberId}
          onSave={executeEdit}
          onClose={() => setEditSlot(null)}
        />
      )}




      {rejectConfirmSlot && (
        <ConfirmModal title="Randevuyu Reddet?" message="Bu talep reddedilecek ve müşteriye bildirim önizlemesi gösterilecektir."
          onConfirm={handleRejectConfirm} onClose={() => setRejectConfirmSlot(null)} />
      )}

      {discountSlot && (
        <DiscountModal title="İndirimli Onayla"
          message="Randevuya uygulanacak indirim oranını girin."
          onConfirm={handleDiscountApprove} onClose={() => setDiscountSlot(null)} />
      )}

      {smsState && (
        <SmsModal
          slot={smsState.slot}
          dateStr={smsState.dateStr}
          type={smsState.type}
          onClose={() => setSmsState(null)}
        />
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

export default AdminDashboard;
