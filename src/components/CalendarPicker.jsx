import React, { useState, useMemo } from 'react';
import { getDayStats, getSettings, isClosedDay } from '../utils/bookingStore';
import './CalendarPicker.css';

const TR_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

// Returns status of a date: 'closed' | 'full' | 'busy' | 'pending' | 'available'
const getDayStatus = (dateStr, settings) => {
  const stats = getDayStats(dateStr);
  if (stats.closed) return 'closed';
  if (stats.total === 0) return 'closed';
  const ratio = (stats.booked + stats.pending) / stats.total;
  if (stats.booked >= stats.total) return 'full';
  if (ratio >= 1) return 'full';
  if (ratio >= 0.6) return 'busy';
  if (stats.pending > 0) return 'pending';
  return 'available';
};

const CalendarPicker = ({ selectedDate, onDateSelect }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewYear, setViewYear] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T12:00:00') : today;
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate + 'T12:00:00') : today;
    return d.getMonth();
  });

  const settings = useMemo(() => getSettings(), [selectedDate]);

  const handlePrev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const handleNext = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    // Monday-first: Sunday=0 -> 6, Mon=1 -> 0, ...
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cellDate = new Date(viewYear, viewMonth, d);
      const isPast = cellDate < today;
      const status = isPast ? 'past' : getDayStatus(dateStr, settings);
      cells.push({ day: d, dateStr, status, isPast });
    }
    return cells;
  }, [viewYear, viewMonth, selectedDate, settings]);

  const handleDayClick = (cell) => {
    if (!cell || cell.isPast || cell.status === 'closed') return;
    onDateSelect(cell.dateStr);
  };

  const selectedFormatted = useMemo(() => {
    if (!selectedDate) return null;
    const d = new Date(selectedDate + 'T12:00:00');
    const dayName = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][d.getDay()];
    return `${dayName}, ${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }, [selectedDate]);

  return (
    <div className="calendar-picker glass-panel">
      <div className="calendar-header">
        <button className="cal-nav-btn" onClick={handlePrev} aria-label="Önceki ay">‹</button>
        <span className="calendar-title">
          {TR_MONTHS[viewMonth]} {viewYear}
        </span>
        <button className="cal-nav-btn" onClick={handleNext} aria-label="Sonraki ay">›</button>
      </div>

      <div className="calendar-grid">
        {TR_DAYS.map(d => (
          <div key={d} className="cal-day-label">{d}</div>
        ))}
        {calendarDays.map((cell, i) => (
          <div
            key={i}
            className={[
              'cal-cell',
              !cell ? 'cal-empty' : '',
              cell?.status === 'past' ? 'cal-past' : '',
              cell?.status === 'closed' ? 'cal-closed' : '',
              cell?.status === 'full' ? 'cal-full' : '',
              cell?.status === 'busy' ? 'cal-busy' : '',
              cell?.status === 'available' ? 'cal-available' : '',
              cell?.dateStr === selectedDate ? 'cal-selected' : '',
              cell?.dateStr === today.toISOString().split('T')[0] ? 'cal-today' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => handleDayClick(cell)}
            title={cell ? (cell.status === 'closed' ? 'Kapalı' : cell.status === 'full' ? 'Dolu' : cell.status === 'busy' ? 'Dolmak Üzere' : 'Müsait') : ''}
          >
            {cell && <span className="cal-day-num">{cell.day}</span>}
            {cell && !cell.isPast && cell.status !== 'past' && (
              <span className={`cal-dot dot-${cell.status}`}></span>
            )}
          </div>
        ))}
      </div>

      <div className="calendar-legend">
        <span className="leg-item"><span className="leg-dot dot-available"></span> Müsait</span>
        <span className="leg-item"><span className="leg-dot dot-pending"></span> Bekliyor</span>
        <span className="leg-item"><span className="leg-dot dot-busy"></span> Azalıyor</span>
        <span className="leg-item"><span className="leg-dot dot-full"></span> Dolu</span>
        <span className="leg-item"><span className="leg-dot dot-closed"></span> Kapalı</span>
      </div>

      {selectedFormatted && (
        <div className="calendar-selected-label">
          📅 {selectedFormatted}
        </div>
      )}
    </div>
  );
};

export default CalendarPicker;
