import React, { useState, useMemo } from 'react';
import { getWeeklySummary } from '../utils/bookingStore';
import './WeeklyOverview.css';

const TR_DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TR_DAY_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
};

const WeeklyOverview = ({ onDaySelect }) => {
  const today = new Date().toISOString().split('T')[0];
  const [weekStart, setWeekStart] = useState(() => getMonday(today));

  const summary = useMemo(() => getWeeklySummary(weekStart), [weekStart]);

  const weekLabel = useMemo(() => {
    const start = new Date(weekStart + 'T12:00:00');
    const end = new Date(weekStart + 'T12:00:00');
    end.setDate(end.getDate() + 6);
    return `${start.getDate()} ${TR_MONTHS[start.getMonth()]} – ${end.getDate()} ${TR_MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  }, [weekStart]);

  const totalRevenue = summary.reduce((sum, d) => sum + d.revenue, 0);
  const totalBooked = summary.reduce((sum, d) => sum + d.bookedCount, 0);

  const prevWeek = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };
  const nextWeek = () => {
    const d = new Date(weekStart + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  return (
    <div className="weekly-overview animate-slide-up">
      {/* Week Navigator */}
      <div className="week-nav glass-panel">
        <button className="week-nav-btn" onClick={prevWeek}>‹ Önceki Hafta</button>
        <div className="week-nav-center">
          <span className="week-label">{weekLabel}</span>
          <div className="week-totals">
            <span className="week-stat">
              <span className="week-stat-val">{totalBooked}</span> Randevu
            </span>
            <span className="week-sep">·</span>
            <span className="week-stat">
              <span className="week-stat-val gold">{totalRevenue.toLocaleString('tr-TR')} ₺</span> Beklenen
            </span>
          </div>
        </div>
        <button className="week-nav-btn" onClick={nextWeek}>Sonraki Hafta ›</button>
      </div>

      {/* Day Cards Grid */}
      <div className="week-cards-grid">
        {summary.map((day) => {
          const d = new Date(day.dateStr + 'T12:00:00');
          const isToday = day.dateStr === today;
          const fillPct = day.totalSlots > 0 ? Math.round((day.bookedCount / day.totalSlots) * 100) : 0;

          return (
            <div
              key={day.dateStr}
              className={[
                'week-day-card glass-panel',
                day.closed ? 'day-closed' : '',
                isToday ? 'day-today' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => !day.closed && onDaySelect(day.dateStr)}
            >
              <div className="day-card-header">
                <span className="day-short">{TR_DAY_SHORT[day.dayOfWeek]}</span>
                <span className={`day-num ${isToday ? 'today-badge' : ''}`}>{d.getDate()}</span>
              </div>

              {day.closed ? (
                <div className="day-closed-label">Kapalı</div>
              ) : (
                <>
                  <div className="fill-bar-wrapper">
                    <div
                      className="fill-bar"
                      style={{
                        width: `${fillPct}%`,
                        background: fillPct >= 100 ? 'var(--danger)' : fillPct >= 60 ? '#f59e0b' : 'var(--success)'
                      }}
                    ></div>
                  </div>
                  <div className="day-card-stats">
                    <span>{day.bookedCount}/{day.totalSlots}</span>
                    <span className="day-revenue">{day.revenue > 0 ? `${day.revenue.toLocaleString('tr-TR')} ₺` : '—'}</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyOverview;
