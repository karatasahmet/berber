import React, { useState } from 'react';
import { getSettings, saveSettings, getAdminPassword, setAdminPassword } from '../utils/bookingStore';
import Toast from './Common/Toast';
import './AdminSettings.css';

const AdminSettings = () => {
  const [settings, setSettings] = useState(getSettings());
  const [toast, setToast] = useState(null); // {message, type}

  // Password change
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  // New holiday
  const [holidayInput, setHolidayInput] = useState('');

  // New service
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceDuration, setNewServiceDuration] = useState('30');

  // New barber
  const [newBarberName, setNewBarberName] = useState('');
  const [newBarberColor, setNewBarberColor] = useState('#D4AF37');
  const [colorPickerOpen, setColorPickerOpen] = useState(null); // barberId or 'new'

  const handleSave = () => {
    saveSettings(settings);
    setToast({ message: 'Tüm ayarlar başarıyla kaydedildi!', type: 'success' });
  };

  // Date-specific override hours
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideStart, setOverrideStart] = useState('08:00');
  const [overrideEnd, setOverrideEnd] = useState('20:00');

  const addOverride = () => {
    if (!overrideDate || !overrideStart || !overrideEnd) return;
    if (overrideStart >= overrideEnd) {
      setToast({ message: 'Açılış saati kapanıştan önce olmalı!', type: 'error' });
      return;
    }
    setSettings(prev => ({
      ...prev,
      dateOverrides: {
        ...prev.dateOverrides,
        [overrideDate]: { startTime: overrideStart, endTime: overrideEnd }
      }
    }));
    setToast({ message: `${overrideDate} için özel saatler tanımlandı.`, type: 'success' });
    setOverrideDate('');
  };

  const removeOverride = (date) => {
    setSettings(prev => {
      const copy = { ...prev.dateOverrides };
      delete copy[date];
      return { ...prev, dateOverrides: copy };
    });
  };

  const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const toggleClosedDay = (day) => {
    setSettings(prev => ({
      ...prev,
      closedDays: prev.closedDays.includes(day)
        ? prev.closedDays.filter(d => d !== day)
        : [...prev.closedDays, day]
    }));
  };

  // Holiday
  const addHoliday = () => {
    if (!holidayInput) return;
    if (settings.holidays.includes(holidayInput)) return;
    setSettings(prev => ({ ...prev, holidays: [...prev.holidays, holidayInput].sort() }));
    setToast({ message: 'Tatil günü eklendi.', type: 'success' });
    setHolidayInput('');
  };
  const removeHoliday = (date) => {
    setSettings(prev => ({ ...prev, holidays: prev.holidays.filter(h => h !== date) }));
  };

  // Service
  const updateServicePrice = (name, price) => {
    setSettings(prev => ({
      ...prev,
      prices: { ...prev.prices, [name]: { ...prev.prices[name], price: Number(price) } }
    }));
  };
  const updateServiceDuration = (name, dur) => {
    setSettings(prev => ({
      ...prev,
      prices: { ...prev.prices, [name]: { ...prev.prices[name], duration: Number(dur) } }
    }));
  };
  const removeService = (name) => {
    const p = { ...settings.prices };
    delete p[name];
    setSettings(prev => ({ ...prev, prices: p }));
  };
  const addService = () => {
    if (!newServiceName || !newServicePrice || !newServiceDuration) return;
    setSettings(prev => ({
      ...prev,
      prices: {
        ...prev.prices,
        [newServiceName]: { price: Number(newServicePrice), duration: Number(newServiceDuration) }
      }
    }));
    setToast({ message: `Hizmet eklendi: ${newServiceName}`, type: 'success' });
    setNewServiceName(''); setNewServicePrice(''); setNewServiceDuration('30');
  };

  // Barbers
  const toggleBarber = (id, field, value) => {
    setSettings(prev => ({
      ...prev,
      barbers: prev.barbers.map(b => b.id === id ? { ...b, [field]: value } : b)
    }));
  };
  const removeBarber = (id) => {
    setSettings(prev => ({ ...prev, barbers: prev.barbers.filter(b => b.id !== id) }));
  };
  const addBarber = () => {
    if (!newBarberName.trim()) return;
    const id = `barber-${Date.now()}`;
    setSettings(prev => ({
      ...prev,
      barbers: [...prev.barbers, { id, name: newBarberName.trim(), color: newBarberColor, active: true }]
    }));
    setToast({ message: `Berber eklendi: ${newBarberName}`, type: 'success' });
    setNewBarberName(''); setNewBarberColor('#D4AF37');
  };

  // Admin password
  const handleChangePwd = () => {
    if (curPwd !== getAdminPassword()) { setPwdMsg('Mevcut şifre yanlış!'); return; }
    if (newPwd.length < 4) { setPwdMsg('Yeni şifre en az 4 karakter olmalı.'); return; }
    setAdminPassword(newPwd);
    setCurPwd(''); setNewPwd('');
    setPwdMsg('Şifre başarıyla güncellendi! ✓');
    setTimeout(() => setPwdMsg(''), 3000);
  };

  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const BARBER_COLORS = [
    { hex: '#D4AF37', name: 'Altın' },
    { hex: '#22c55e', name: 'Yeşil' },
    { hex: '#3b82f6', name: 'Mavi' },
    { hex: '#a855f7', name: 'Mor' },
    { hex: '#ef4444', name: 'Kırmızı' },
    { hex: '#f59e0b', name: 'Turuncu' },
    { hex: '#06b6d4', name: 'Turkuaz' },
    { hex: '#ec4899', name: 'Pembe' },
    { hex: '#8b5cf6', name: 'Lavanta' },
    { hex: '#14b8a6', name: 'Nane' },
  ];

  return (
    <div className="admin-settings animate-slide-up">

      {/* Shop Info */}
      <div className="settings-section glass-panel">
        <h3 className="settings-section-title">🏪 Dükkan Bilgileri</h3>
        <div className="settings-row">
          <div className="settings-field" style={{ flex: 2 }}>
            <label>Dükkan Adı</label>
            <input type="text" className="custom-input" value={settings.shopName || ''}
              onChange={e => updateSetting('shopName', e.target.value)}
              placeholder="Berber dükkanı adı" />
          </div>
          <div className="settings-field" style={{ flex: 2 }}>
            <label>Logo URL <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(opsiyonel)</span></label>
            <input type="text" className="custom-input" value={settings.shopLogo || ''}
              onChange={e => updateSetting('shopLogo', e.target.value)}
              placeholder="https://... veya boş bırakın" />
          </div>
          {settings.shopLogo && (
            <div className="settings-field" style={{ alignItems: 'center' }}>
              <label>Önizleme</label>
              <img src={settings.shopLogo} alt="Logo" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-gold)' }} />
            </div>
          )}
        </div>
      </div>

      {/* Working Hours — General */}
      <div className="settings-section glass-panel">
        <h3 className="settings-section-title">🕐 Çalışma Saatleri — <span style={{ color: 'var(--accent-gold)' }}>Genel</span></h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
          Tüm günler için varsayılan çalışma saatleri. Belirli bir gün için özel saatler tanımlamak isterseniz aşağıdaki "Özel Gün Saatleri" bölümünü kullanın.
        </p>
        <div className="settings-row">
          <div className="settings-field">
            <label>Açılış Saati</label>
            <input type="time" className="custom-input" value={settings.startTime}
              onChange={e => updateSetting('startTime', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Kapanış Saati</label>
            <input type="time" className="custom-input" value={settings.endTime}
              onChange={e => updateSetting('endTime', e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Aralık (dk)</label>
            <select className="custom-input" value={settings.interval}
              onChange={e => updateSetting('interval', Number(e.target.value))}>
              <option value={15}>15 dakika</option>
              <option value={30}>30 dakika</option>
              <option value={60}>60 dakika</option>
            </select>
          </div>
        </div>

        <div className="settings-field" style={{ marginTop: '1rem' }}>
          <label>Kapalı Günler</label>
          <div className="day-toggle-row">
            {days.map((day, i) => (
              <button key={i}
                className={`day-toggle-btn ${settings.closedDays.includes(i) ? 'day-closed' : 'day-open'}`}
                onClick={() => toggleClosedDay(i)}>{day}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Date-Specific Override Hours */}
      <div className="settings-section glass-panel">
        <h3 className="settings-section-title">🕐 Çalışma Saatleri — <span style={{ color: '#22c55e' }}>Özel Gün</span></h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1rem' }}>
          Belirli bir tarih için farklı açılış/kapanış saati belirleyin. Sadece seçilen gün için geçerli olur.
        </p>
        <div className="settings-row" style={{ alignItems: 'flex-end' }}>
          <div className="settings-field">
            <label>Tarih</label>
            <input type="date" className="custom-input" value={overrideDate}
              onChange={e => setOverrideDate(e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Açılış</label>
            <input type="time" className="custom-input" value={overrideStart}
              onChange={e => setOverrideStart(e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Kapanış</label>
            <input type="time" className="custom-input" value={overrideEnd}
              onChange={e => setOverrideEnd(e.target.value)} />
          </div>
          <button className="btn-gold" onClick={addOverride}>+ Özel Gün Ekle</button>
        </div>
        {Object.keys(settings.dateOverrides || {}).length === 0 && (
          <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', fontSize: '0.85rem' }}>Henüz özel gün saati tanımlanmadı.</p>
        )}
        <div className="holiday-list" style={{ marginTop: '0.75rem' }}>
          {Object.entries(settings.dateOverrides || {}).sort((a, b) => a[0].localeCompare(b[0])).map(([date, ov]) => (
            <div key={date} className="holiday-chip">
              <span>
                📅 {new Date(date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' — '}
                <strong style={{ color: 'var(--accent-gold)' }}>{ov.startTime} - {ov.endTime}</strong>
              </span>
              <button onClick={() => removeOverride(date)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Holidays */}
      <div className="settings-section glass-panel">
        <h3 className="settings-section-title">🏖️ Özel Tatil Günleri</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Bu günler takvimde kapalı görünecektir.
        </p>
        <div className="holiday-input-row">
          <input type="date" className="custom-input" value={holidayInput}
            onChange={e => setHolidayInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && addHoliday()}
            style={{ flex: 1 }} />
          <button className="btn-gold" onClick={addHoliday}>+ Tatil Ekle</button>
        </div>
        {settings.holidays.length === 0 && (
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.85rem' }}>Henüz özel tatil günü eklenmedi.</p>
        )}
        <div className="holiday-list">
          {settings.holidays.map(h => (
            <div key={h} className="holiday-chip">
              <span>{new Date(h + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <button onClick={() => removeHoliday(h)}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Services & Prices */}
      <div className="settings-section glass-panel">
        <h3 className="settings-section-title">💈 Hizmet, Fiyat ve Süre</h3>
        <div className="service-list">
          <div className="service-header-row">
            <span>HİZMET</span><span>FİYAT (₺)</span><span>SÜRE (dk)</span><span></span>
          </div>
          {Object.entries(settings.prices).map(([name, info]) => {
            const price = typeof info === 'object' ? info.price : info;
            const duration = typeof info === 'object' ? (info.duration || 30) : 30;
            return (
              <div key={name} className="service-row">
                <span className="service-name-label">{name}</span>
                <input type="number" className="custom-input service-input" value={price}
                  onChange={e => updateServicePrice(name, e.target.value)} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="number" className="custom-input service-input" value={duration}
                    min={5} max={240} step={5}
                    onChange={e => updateServiceDuration(name, e.target.value)} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>dk</span>
                </div>
                <button className="remove-x" onClick={() => removeService(name)}>✕</button>
              </div>
            );
          })}
        </div>
        <div className="add-service-row">
          <input type="text" className="custom-input" placeholder="Yeni hizmet adı" value={newServiceName}
            onChange={e => setNewServiceName(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && addService()}
            style={{ flex: 2 }} />
          <input type="number" className="custom-input" placeholder="Fiyat (₺)" value={newServicePrice}
            onChange={e => setNewServicePrice(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && addService()}
            style={{ flex: 1 }} />
          <input type="number" className="custom-input" placeholder="Süre (dk)" value={newServiceDuration}
            onChange={e => setNewServiceDuration(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && addService()}
            style={{ flex: 1 }} min={5} max={240} step={5} />
          <button className="btn-gold" onClick={addService}>+ Ekle</button>
        </div>
      </div>

      {/* Barbers */}
      <div className="settings-section glass-panel">
        <h3 className="settings-section-title">💇 Berber Yönetimi</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Her aktif berber bağımsız randevu takvimi oluşturur.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {settings.barbers.map(b => (
            <div key={b.id} className="barber-row-wrap">
              <div className="barber-row">
                <div
                  className="barber-color-dot barber-color-dot-clickable"
                  style={{ background: b.color }}
                  onClick={() => setColorPickerOpen(colorPickerOpen === b.id ? null : b.id)}
                  title="Renk seçmek için tıklayın"
                />
                <input type="text" className="custom-input" value={b.name}
                  onChange={e => toggleBarber(b.id, 'name', e.target.value)}
                  style={{ flex: 1 }} />
                <label className="toggle-label">
                  <input type="checkbox" checked={b.active}
                    onChange={e => toggleBarber(b.id, 'active', e.target.checked)} />
                  <span>Aktif</span>
                </label>
                {settings.barbers.length > 1 && (
                  <button className="remove-x" onClick={() => removeBarber(b.id)}>✕</button>
                )}
              </div>
              {colorPickerOpen === b.id && (
                <div className="color-palette color-palette-dropdown">
                  {BARBER_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      className={`color-swatch ${b.color === c.hex ? 'color-swatch-active' : ''}`}
                      style={{ background: c.hex }}
                      onClick={() => { toggleBarber(b.id, 'color', c.hex); setColorPickerOpen(null); }}
                      title={c.name}
                    >
                      <span className="color-swatch-label">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="add-service-row" style={{ marginTop: '1rem' }}>
          <input type="text" className="custom-input" placeholder="Berber adı" value={newBarberName}
            onChange={e => setNewBarberName(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && addBarber()}
            style={{ flex: 1 }} />
          <div
            className="barber-color-dot barber-color-dot-clickable"
            style={{ background: newBarberColor }}
            onClick={() => setColorPickerOpen(colorPickerOpen === 'new' ? null : 'new')}
            title="Renk seç"
          />
          {colorPickerOpen === 'new' && (
            <div className="color-palette color-palette-dropdown">
              {BARBER_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  className={`color-swatch ${newBarberColor === c.hex ? 'color-swatch-active' : ''}`}
                  style={{ background: c.hex }}
                  onClick={() => { setNewBarberColor(c.hex); setColorPickerOpen(null); }}
                  title={c.name}
                >
                  <span className="color-swatch-label">{c.name}</span>
                </button>
              ))}
            </div>
          )}
          <button className="btn-gold" onClick={addBarber}>+ Berber Ekle</button>
        </div>
      </div>

      {/* Admin Password */}
      <div className="settings-section glass-panel">
        <h3 className="settings-section-title">🔒 Güvenlik — Admin Şifresi</h3>
        <div className="settings-row">
          <div className="settings-field">
            <label>Mevcut Şifre</label>
            <input type="password" className="custom-input" value={curPwd}
              onChange={e => setCurPwd(e.target.value)} placeholder="••••" />
          </div>
          <div className="settings-field">
            <label>Yeni Şifre</label>
            <input type="password" className="custom-input" value={newPwd}
              onChange={e => setNewPwd(e.target.value)} placeholder="En az 4 karakter" />
          </div>
          <div className="settings-field" style={{ justifyContent: 'flex-end', paddingTop: '1.5rem' }}>
            <button className="btn-gold" onClick={handleChangePwd}>Şifreyi Değiştir</button>
          </div>
        </div>
        {pwdMsg && (
          <p style={{ color: pwdMsg.includes('✓') ? 'var(--success)' : 'var(--danger)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {pwdMsg}
          </p>
        )}
      </div>

      {/* Save */}
      <button className={`save-all-btn ${toast ? 'saved' : ''}`} onClick={handleSave}>
        {toast ? '✓ Kaydedildi!' : 'Tüm Ayarları Kaydet'}
      </button>

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

export default AdminSettings;
