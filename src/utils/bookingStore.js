// ============================================================
// BERBER BOOKING STORE — v5
// Multi-barber • Service durations • Notes • Phone lookup • Admin pwd
// ============================================================

const SETTINGS_KEY = 'berber_settings_v3';
const BOOKINGS_KEY = 'berber_bookings_v3';
const PWD_KEY = 'berber_admin_pwd';

// --- DEFAULT SETTINGS ---
export const getDefaultSettings = () => ({
  shopName: 'Bizim Berber',
  shopLogo: '',
  startTime: '08:00',
  endTime: '20:00',
  interval: 15,
  closedDays: [0],
  holidays: [],
  dateOverrides: {}, // { '2026-04-15': { startTime: '10:00', endTime: '18:00' }, ... }
  barbers: [{ id: 'default', name: 'Berber', color: '#D4AF37', active: true }],
  prices: {
    "Saç Kesimi":         { price: 300, duration: 30 },
    "Sakal Kesimi":       { price: 150, duration: 15 },
    "Saç + Sakal Kesimi": { price: 400, duration: 45 },
    "Saç Boyama":         { price: 500, duration: 60 },
    "Cilt Bakımı":        { price: 250, duration: 45 },
  }
});

// --- SETTINGS ---
export const getSettings = () => {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (data) {
    const s = JSON.parse(data);
    if (!s.holidays) s.holidays = [];
    if (!s.barbers || !s.barbers.length)
      s.barbers = [{ id: 'default', name: 'Berber', color: '#D4AF37', active: true }];
    if (!s.shopName) s.shopName = 'Bizim Berber';
    if (s.shopLogo === undefined) s.shopLogo = '';
    if (!s.dateOverrides) s.dateOverrides = {};
    // Migrate: price number → {price, duration}
    if (s.prices) {
      Object.keys(s.prices).forEach(k => {
        if (typeof s.prices[k] === 'number') {
          s.prices[k] = { price: s.prices[k], duration: 30 };
        }
      });
    }
    return s;
  }
  const def = getDefaultSettings();
  saveSettings(def);
  return def;
};

export const saveSettings = (settings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  clearFutureUnbookedSlots();
};

// --- ADMIN PASSWORD ---
export const getAdminPassword = () => localStorage.getItem(PWD_KEY) || '1234';
export const setAdminPassword = (pwd) => localStorage.setItem(PWD_KEY, pwd);

// --- HOLIDAY / CLOSED HELPERS ---
export const isHoliday = (dateStr, settings) => (settings || getSettings()).holidays.includes(dateStr);

export const isClosedDay = (dateStr, settings) => {
  const s = settings || getSettings();
  const dow = new Date(dateStr + 'T12:00:00').getDay();
  return s.closedDays.includes(dow) || s.holidays.includes(dateStr);
};

// --- SERVICE HELPERS ---
export const getServicePrice = (serviceName, settings) => {
  const s = settings || getSettings();
  const svc = s.prices?.[serviceName];
  if (!svc) return 0;
  return typeof svc === 'object' ? svc.price : svc;
};

export const getServiceDuration = (serviceName, settings) => {
  const s = settings || getSettings();
  const svc = s.prices?.[serviceName];
  if (!svc) return s.interval || 15;
  return typeof svc === 'object' ? (svc.duration || s.interval) : s.interval;
};

export const getServiceNames = (settings) => {
  const s = settings || getSettings();
  return Object.keys(s.prices || {});
};

// --- SLOT MIGRATION ---
const migrateSlot = (slot) => {
  if (slot.status !== undefined) return slot;
  return { ...slot, status: slot.isBooked ? 'booked' : 'available' };
};

// --- STORAGE ---
const getAllBookings = () => {
  const data = localStorage.getItem(BOOKINGS_KEY);
  if (!data) return {};
  const raw = JSON.parse(data);
  const migrated = {};
  Object.entries(raw).forEach(([dateStr, dateData]) => {
    if (Array.isArray(dateData)) {
      migrated[dateStr] = { default: dateData.map(migrateSlot) };
    } else {
      migrated[dateStr] = dateData;
    }
  });
  return migrated;
};

const saveAllBookings = (all) => localStorage.setItem(BOOKINGS_KEY, JSON.stringify(all));

// Clear future dates with no real bookings when settings change
const clearFutureUnbookedSlots = () => {
  const today = new Date().toISOString().split('T')[0];
  const all = getAllBookings();
  const cleaned = {};
  Object.entries(all).forEach(([dateStr, dateData]) => {
    if (dateStr < today) { cleaned[dateStr] = dateData; return; }
    let hasReal = false;
    Object.values(dateData).forEach(slots => {
      if (Array.isArray(slots) && slots.some(s => s.status === 'booked' || s.status === 'pending' || s.manualCampaign)) {
        hasReal = true;
      }
    });
    if (hasReal) cleaned[dateStr] = dateData;
  });
  saveAllBookings(cleaned);
};

// --- SLOT GENERATION ---
const timeToMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const minutesToTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export const generateDynamicSlots = (dateStr, barberId, settings) => {
  if (isClosedDay(dateStr, settings)) return [];
  const override = settings.dateOverrides?.[dateStr];
  const startMins = timeToMinutes(override?.startTime || settings.startTime);
  const endMins = timeToMinutes(override?.endTime || settings.endTime);
  const slots = [];
  for (let cur = startMins; cur < endMins; cur += settings.interval) {
    const time = minutesToTime(cur);
    slots.push({
      id: `slot-${dateStr}-${time.replace(':', '')}-${barberId}`,
      time, status: 'available',
      customerName: null, phone: null, service: null,
      note: null, duration: 0, occupiedSlotIds: [], blockedBy: null,
      barberId, manualCampaign: null,
    });
  }
  return slots;
};

// --- CORE: GET DATE DATA (multi-barber dict) ---
// Returns { barberId: [slots], ... }
// Always generates fresh slots based on current settings, then merges existing data
const getDateData = (dateStr) => {
  const settings = getSettings();
  if (isClosedDay(dateStr, settings)) return {};

  const all = getAllBookings();
  const dd = all[dateStr] || {};
  const activeBarbers = settings.barbers.filter(b => b.active);
  const result = {};

  for (const barber of activeBarbers) {
    const bid = barber.id;
    // Always generate fresh slots based on current settings
    const freshSlots = generateDynamicSlots(dateStr, bid, settings);

    if (dd[bid] && Array.isArray(dd[bid])) {
      const oldSlots = dd[bid].map(migrateSlot);
      // Build a lookup from old slots by time
      const oldByTime = {};
      oldSlots.forEach(s => { oldByTime[s.time] = s; });

      // Merge: for each fresh slot, use old data if it has real content
      result[bid] = freshSlots.map(fresh => {
        const old = oldByTime[fresh.time];
        if (old && (old.status === 'booked' || old.status === 'pending' || old.status === 'blocked' || old.manualCampaign)) {
          return { ...old, id: fresh.id, barberId: bid };
        }
        return fresh;
      });
    } else {
      result[bid] = freshSlots;
    }
  }

  all[dateStr] = result;
  saveAllBookings(all);
  return result;
};

// FLAT list of all "main" slots (not blocked) from all barbers — for CalendarPicker/admin stats
export const getBookingsForDate = (dateStr) => {
  const dd = getDateData(dateStr);
  const all = [];
  Object.values(dd).forEach(slots => {
    if (Array.isArray(slots)) {
      slots.filter(s => !s.blockedBy).forEach(s => all.push(s));
    }
  });
  return all;
};


// --- ALL TIME SLOTS FOR DATE (customer view: available / pending / full) ---
export const getAllTimeSlotsForDate = (dateStr) => {
  const settings = getSettings();
  if (isClosedDay(dateStr, settings)) return [];
  const dd = getDateData(dateStr);

  // Her saat için: müsait var mı, bekleyen var mı, en yüksek kampanya hangisi?
  const timeMap = {};

  const extractRate = (rateStr) => {
    if (!rateStr) return 0;
    const m = rateStr.match(/(\d+)/);
    return m ? parseInt(m[1]) : 0;
  };

  Object.entries(dd).forEach(([bid, slots]) => {
    if (!Array.isArray(slots)) return;
    slots.filter(s => !s.blockedBy).forEach(s => {
      if (!timeMap[s.time]) timeMap[s.time] = { hasAvailable: false, hasPending: false, campaign: null, maxRate: 0 };
      if (s.status === 'available') {
        timeMap[s.time].hasAvailable = true;
        // En yüksek indirim oranını bul
        if (s.manualCampaign) {
          const rate = extractRate(s.manualCampaign.rate);
          if (rate > timeMap[s.time].maxRate) {
            timeMap[s.time].maxRate = rate;
            timeMap[s.time].campaign = s.manualCampaign.rate;
          }
        }
      }
      if (s.status === 'pending') timeMap[s.time].hasPending = true;
    });
  });

  return Object.entries(timeMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, { hasAvailable, hasPending, campaign, maxRate }]) => ({
      time,
      status: hasAvailable ? 'available' : hasPending ? 'pending' : 'full',
      campaign,
      campaignRate: maxRate, // numeric rate for styling (e.g. 50+ = red blink)
    }));
};

// --- AVAILABLE BARBERS FOR A SLOT (service+time combo, returns barberId+slotId) ---
export const getAvailableBarbersForSlot = (dateStr, time, serviceName) => {
  const settings = getSettings();
  const duration = getServiceDuration(serviceName, settings);
  const interval = settings.interval || 15;
  const slotsNeeded = Math.ceil(duration / interval);
  const dd = getDateData(dateStr);
  const result = [];

  Object.entries(dd).forEach(([bid, slots]) => {
    if (!Array.isArray(slots)) return;
    const startIdx = slots.findIndex(s => s.time === time);
    if (startIdx === -1 || slots[startIdx].status !== 'available') return;
    let canFit = true;
    for (let j = 0; j < slotsNeeded; j++) {
      const s = slots[startIdx + j];
      if (!s || s.status !== 'available') { canFit = false; break; }
    }
    if (canFit) {
      const barber = settings.barbers?.find(b => b.id === bid && b.active);
      if (barber) result.push({ id: barber.id, name: barber.name, color: barber.color, slotId: slots[startIdx].id });
    }
  });

  return result;
};

// --- ALL BARBERS WITH STATUS FOR A SLOT (müsait + dolu birlikte, tüm aktif berberler) ---
// Müşteri berber seçim ekranı için: dolu berberlerin de görünmesi ama pasif olması
export const getAllBarbersWithStatusForSlot = (dateStr, time, serviceName) => {
  const settings = getSettings();
  const duration = getServiceDuration(serviceName, settings);
  const interval = settings.interval || 15;
  const slotsNeeded = Math.ceil(duration / interval);
  const dd = getDateData(dateStr);
  const activeBarbers = settings.barbers?.filter(b => b.active) || [];

  return activeBarbers.map(barber => {
    const slots = dd[barber.id];
    if (!Array.isArray(slots)) {
      return { id: barber.id, name: barber.name, color: barber.color, available: false, slotId: null, reason: 'no-slots' };
    }
    const startIdx = slots.findIndex(s => s.time === time);
    if (startIdx === -1) {
      return { id: barber.id, name: barber.name, color: barber.color, available: false, slotId: null, reason: 'no-slot-at-time' };
    }
    // Check if enough consecutive slots are available
    let canFit = true;
    for (let j = 0; j < slotsNeeded; j++) {
      const s = slots[startIdx + j];
      if (!s || s.status !== 'available') { canFit = false; break; }
    }
    if (canFit) {
      return { id: barber.id, name: barber.name, color: barber.color, available: true, slotId: slots[startIdx].id, reason: null };
    }
    // Slot var ama dolu — nedenini belirle
    const firstSlot = slots[startIdx];
    const reason = firstSlot.status === 'booked' || firstSlot.status === 'pending' ? 'booked' : 'not-enough-time';
    return { id: barber.id, name: barber.name, color: barber.color, available: false, slotId: null, reason };
  });
};

// --- GET BARBERS WITH CAMPAIGNS for a time slot (customer view: berber seçimi) ---
export const getBarbersWithCampaigns = (dateStr, time) => {
  const settings = getSettings();
  const dd = getDateData(dateStr);
  const activeBarbers = settings.barbers?.filter(b => b.active) || [];

  return activeBarbers.map(barber => {
    const slots = dd[barber.id];
    let campaign = null;
    let hasAvailableSlot = false;

    if (Array.isArray(slots)) {
      const slot = slots.find(s => s.time === time && !s.blockedBy);
      if (slot) {
        if (slot.status === 'available') hasAvailableSlot = true;
        if (slot.manualCampaign) campaign = slot.manualCampaign.rate;
      }
    }

    return {
      id: barber.id,
      name: barber.name,
      color: barber.color,
      available: hasAvailableSlot,
      campaign,
    };
  });
};

export const getAvailableSlotsForService = (dateStr, serviceName, filteredBarberId = null) => {
  const settings = getSettings();
  const duration = getServiceDuration(serviceName, settings);
  const interval = settings.interval || 15;
  const slotsNeeded = Math.ceil(duration / interval);

  const dd = getDateData(dateStr);
  const results = []; // { time, slotId, barberId }

  Object.entries(dd).forEach(([bid, slots]) => {
    if (filteredBarberId && bid !== filteredBarberId) return;
    if (!Array.isArray(slots)) return;
    for (let i = 0; i <= slots.length - slotsNeeded; i++) {
      const startSlot = slots[i];
      if (startSlot.blockedBy) continue;
      let canFit = true;
      for (let j = 0; j < slotsNeeded; j++) {
        const s = slots[i + j];
        if (!s || s.status !== 'available') { canFit = false; break; }
      }
      if (canFit) results.push({ time: startSlot.time, slotId: startSlot.id, barberId: bid, slot: startSlot });
    }
  });

  if (filteredBarberId) {
    // Tek berber — deduplication gerekmez
    return results.sort((a, b) => a.time.localeCompare(b.time));
  }

  // Auto-assign: deduplicate by time, keep first barber
  const byTime = {};
  results.forEach(r => { if (!byTime[r.time]) byTime[r.time] = r; });
  return Object.values(byTime).sort((a, b) => a.time.localeCompare(b.time));
};

// --- ADMIN SLOTS FOR DATE (with optional barber filter) ---
export const getAdminSlotsForDate = (dateStr, filteredBarberId = null) => {
  const dd = getDateData(dateStr);
  const all = [];
  Object.entries(dd).forEach(([bid, slots]) => {
    if (filteredBarberId && bid !== filteredBarberId) return;
    if (Array.isArray(slots)) {
      slots.filter(s => !s.blockedBy).forEach(s => all.push({ ...s, barberId: bid }));
    }
  });
  return all.sort((a, b) => a.time.localeCompare(b.time));
};

// --- BOOK SLOT (pending + duration blocking) ---
export const bookSlot = (dateStr, barberId, slotId, customerName, phone, service, note) => {
  const settings = getSettings();
  const duration = getServiceDuration(service, settings);
  const interval = settings.interval || 15;
  const slotsNeeded = Math.ceil(duration / interval);

  const all = getAllBookings();
  const dd = all[dateStr] || {};
  const slots = dd[barberId] || [];

  const startIdx = slots.findIndex(s => s.id === slotId);
  if (startIdx === -1) return;

  const occupiedSlotIds = [];
  for (let i = 1; i < slotsNeeded; i++) {
    if (slots[startIdx + i]) occupiedSlotIds.push(slots[startIdx + i].id);
  }

  const updated = slots.map((s, idx) => {
    if (s.id === slotId) {
      return { ...s, status: 'pending', customerName, phone, service, note: note || null, duration, occupiedSlotIds, barberId };
    }
    if (occupiedSlotIds.includes(s.id)) {
      return { ...s, status: 'blocked', blockedBy: slotId };
    }
    return s;
  });

  dd[barberId] = updated;
  all[dateStr] = dd;
  saveAllBookings(all);
};

// --- APPROVE ---
export const approveBooking = (dateStr, barberId, slotId, discountRate) => {
  const all = getAllBookings();
  const slots = all[dateStr]?.[barberId] || [];
  const updated = slots.map(s => {
    if (s.id !== slotId) return s;
    return { ...s, status: 'booked', manualCampaign: discountRate ? { rate: `%${discountRate} İndirim` } : s.manualCampaign };
  });
  all[dateStr][barberId] = updated;
  saveAllBookings(all);
};

// --- REJECT ---
export const rejectBooking = (dateStr, barberId, slotId) => {
  const all = getAllBookings();
  const slots = all[dateStr]?.[barberId] || [];
  const target = slots.find(s => s.id === slotId);
  const occupied = target?.occupiedSlotIds || [];

  const updated = slots.map(s => {
    if (s.id === slotId || occupied.includes(s.id)) {
      return { ...s, status: 'available', customerName: null, phone: null, service: null, note: null, duration: 0, occupiedSlotIds: [], blockedBy: null, manualCampaign: null };
    }
    return s;
  });
  all[dateStr][barberId] = updated;
  saveAllBookings(all);
};

// --- CANCEL (admin, already booked) ---
export const cancelBooking = (dateStr, barberId, slotId) => {
  rejectBooking(dateStr, barberId, slotId); // same logic
};

// --- FULL EDIT (admin) ---
export const editBooking = (dateStr, barberId, slotId, fields) => {
  const settings = getSettings();
  const all = getAllBookings();
  const slots = all[dateStr]?.[barberId] || [];
  const updated = slots.map(s => {
    if (s.id !== slotId) return s;
    const newService = fields.service || s.service;
    const newDuration = fields.service ? getServiceDuration(fields.service, settings) : s.duration;
    return {
      ...s,
      customerName: fields.name ?? s.customerName,
      phone: fields.phone ?? s.phone,
      service: newService,
      note: fields.note ?? s.note,
      duration: newDuration,
      manualCampaign: fields.discountRate !== undefined
        ? (fields.discountRate ? { rate: `%${fields.discountRate} İndirim` } : null)
        : s.manualCampaign,
    };
  });
  all[dateStr][barberId] = updated;
  saveAllBookings(all);
};

// --- MANUAL CAMPAIGN ---
export const setManualCampaign = (dateStr, barberId, slotId, rate) => {
  const all = getAllBookings();
  const slots = all[dateStr]?.[barberId] || [];
  const updated = slots.map(s =>
    s.id === slotId ? { ...s, manualCampaign: rate ? { rate } : null } : s
  );
  all[dateStr][barberId] = updated;
  saveAllBookings(all);
};

// --- AUTO CAMPAIGNS ---
export const getActiveCampaigns = (slots) => {
  const campaigns = {};
  slots.forEach(slot => {
    if (slot.manualCampaign) {
      campaigns[slot.id] = slot.manualCampaign.rate;
    }
  });
  return campaigns;
};

// --- PENDING BOOKINGS (all future dates, all barbers) ---
export const getPendingBookings = () => {
  const all = getAllBookings();
  const today = new Date().toISOString().split('T')[0];
  const pending = [];

  Object.entries(all).forEach(([dateStr, dateData]) => {
    if (dateStr < today) return;
    const dd = Array.isArray(dateData) ? { default: dateData } : dateData;
    Object.entries(dd).forEach(([barberId, slots]) => {
      if (!Array.isArray(slots)) return;
      slots.forEach(s => {
        const slot = migrateSlot(s);
        if (slot.status === 'pending') pending.push({ ...slot, dateStr, barberId });
      });
    });
  });

  return pending.sort((a, b) => a.dateStr.localeCompare(b.dateStr) || a.time.localeCompare(b.time));
};

export const getPendingCount = () => getPendingBookings().length;

// --- PHONE LOOKUP ---
export const lookupByPhoneAndName = (phone, customerName) => {
  const all = getAllBookings();
  const results = [];
  const normalizedPhone = phone.replace(/\D/g, '');
  const normalizedName = customerName.trim().toLocaleLowerCase('tr-TR');
  if (!normalizedPhone || normalizedPhone.length < 7 || !normalizedName) return results;

  Object.entries(all).forEach(([dateStr, dateData]) => {
    const dd = Array.isArray(dateData) ? { default: dateData } : dateData;
    Object.entries(dd).forEach(([barberId, slots]) => {
      if (!Array.isArray(slots)) return;
      slots.forEach(s => {
        const slot = migrateSlot(s);
        if (slot.phone && slot.customerName
            && slot.phone.replace(/\D/g, '').includes(normalizedPhone)
            && slot.customerName.toLocaleLowerCase('tr-TR').includes(normalizedName)
            && (slot.status === 'pending' || slot.status === 'booked')) {
          results.push({ ...slot, dateStr, barberId });
        }
      });
    });
  });

  return results.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
};

// --- DAY STATS (for CalendarPicker) ---
export const getDayStats = (dateStr) => {
  const settings = getSettings();
  if (isClosedDay(dateStr, settings)) return { closed: true, booked: 0, pending: 0, available: 0, total: 0 };
  const slots = getBookingsForDate(dateStr);
  const booked = slots.filter(s => s.status === 'booked').length;
  const pending = slots.filter(s => s.status === 'pending').length;
  const available = slots.filter(s => s.status === 'available').length;
  return { closed: false, booked, pending, available, total: slots.length };
};

// --- WEEKLY SUMMARY ---
export const getWeeklySummary = (startDateStr) => {
  const settings = getSettings();
  const summary = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDateStr + 'T12:00:00');
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const closed = isClosedDay(dateStr, settings);
    let bookedCount = 0, pendingCount = 0, totalSlots = 0, revenue = 0;

    if (!closed) {
      const slots = getBookingsForDate(dateStr);
      totalSlots = slots.length;
      slots.forEach(slot => {
        if (slot.status === 'booked') {
          bookedCount++;
          if (slot.service) {
            let price = getServicePrice(slot.service, settings);
            if (slot.manualCampaign) {
              const m = slot.manualCampaign.rate.match(/(\d+)/);
              if (m) price -= price * parseInt(m[1]) / 100;
            }
            revenue += price;
          }
        } else if (slot.status === 'pending') pendingCount++;
      });
    }

    summary.push({ dateStr, dayOfWeek: d.getDay(), closed, totalSlots, bookedCount, pendingCount, availableCount: totalSlots - bookedCount - pendingCount, revenue });
  }
  return summary;
};

// --- MONTHLY DATA ---
export const getMonthlyData = (year, month) => {
  const settings = getSettings();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const closed = isClosedDay(dateStr, settings);
    let bookedCount = 0, pendingCount = 0, totalSlots = 0, revenue = 0;

    if (!closed) {
      const slots = getBookingsForDate(dateStr);
      totalSlots = slots.length;
      slots.forEach(slot => {
        if (slot.status === 'booked') {
          bookedCount++;
          if (slot.service) {
            let price = getServicePrice(slot.service, settings);
            if (slot.manualCampaign) {
              const m = slot.manualCampaign.rate.match(/(\d+)/);
              if (m) price -= price * parseInt(m[1]) / 100;
            }
            revenue += price;
          }
        } else if (slot.status === 'pending') pendingCount++;
      });
    }

    result.push({ dateStr, day: d, dayOfWeek: new Date(dateStr + 'T12:00:00').getDay(), closed, totalSlots, bookedCount, pendingCount, revenue });
  }
  return result;
};

// --- REVENUE FOR RANGE ---
export const getRevenueForRange = (startDateStr, endDateStr) => {
  const settings = getSettings();
  const result = { totalRevenue: 0, totalBookings: 0, byService: {}, byBarber: {}, byDate: [], detailRows: [], topDay: null, topService: null };

  const start = new Date(startDateStr + 'T12:00:00');
  const end = new Date(endDateStr + 'T12:00:00');
  if (start > end) return result;

  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    const dateStr = cur.toISOString().split('T')[0];
    const closed = isClosedDay(dateStr, settings);
    if (closed) continue;

    const slots = getAdminSlotsForDate(dateStr);
    const booked = slots.filter(s => s.status === 'booked');
    let dayRevenue = 0;

    booked.forEach(slot => {
      let price = getServicePrice(slot.service, settings);
      if (slot.manualCampaign) {
        const m = slot.manualCampaign.rate.match(/(\d+)/);
        if (m) price -= price * parseInt(m[1]) / 100;
      }
      dayRevenue += price;

      if (slot.service) {
        if (!result.byService[slot.service]) result.byService[slot.service] = { count: 0, revenue: 0 };
        result.byService[slot.service].count++;
        result.byService[slot.service].revenue += price;
      }

      const bid = slot.barberId || 'default';
      if (!result.byBarber[bid]) result.byBarber[bid] = { count: 0, revenue: 0 };
      result.byBarber[bid].count++;
      result.byBarber[bid].revenue += price;

      result.detailRows.push({ dateStr, time: slot.time, customerName: slot.customerName, phone: slot.phone, service: slot.service || '', discount: slot.manualCampaign?.rate || '', price, barberId: bid });
    });

    result.totalRevenue += dayRevenue;
    result.totalBookings += booked.length;
    if (booked.length > 0) result.byDate.push({ dateStr, count: booked.length, revenue: dayRevenue });
  }

  if (result.byDate.length > 0) result.topDay = result.byDate.reduce((m, d) => d.revenue > m.revenue ? d : m, result.byDate[0]);
  const svcE = Object.entries(result.byService);
  if (svcE.length > 0) result.topService = svcE.reduce((m, c) => c[1].revenue > m[1].revenue ? c : m, svcE[0]);

  return result;
};
