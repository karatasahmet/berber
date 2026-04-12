import React, { useState, useMemo } from 'react';
import { getMonthlyData } from '../utils/bookingStore';
import './MonthlyOverview.css';

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const TR_DAY_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
// Monday-first order
const HEADER_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const MonthlyOverview = ({ onDaySelect }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  const todayStr = today.toISOString().split('T')[0];

  const data = useMemo(() => getMonthlyData(viewYear, viewMonth), [viewYear, viewMonth]);

  const totals = useMemo(() => ({
    revenue: data.reduce((s, d) => s + d.revenue, 0),
    booked: data.reduce((s, d) => s + d.bookedCount, 0),
    pending: data.reduce((s, d) => s + d.pendingCount, 0),
  }), [data]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid cells (Monday-first)
  const gridCells = useMemo(() => {
    const cells = [];
    // Leading empty cells: day 1's weekday offset (Mon=0 ... Sun=6)
    const firstDayOfWeek = data[0]?.dayOfWeek ?? 1;
    let offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = 0; i < offset; i++) cells.push(null);
    data.forEach(d => cells.push(d));
    return cells;
  }, [data]);

  return (
    <div className="monthly-overview animate-slide-up">
      {/* Header nav */}
      <div className="month-nav glass-panel">
        <button className="week-nav-btn" onClick={prevMonth}>‹ Önceki Ay</button>
        <div className="week-nav-center">
          <span className="week-label">{TR_MONTHS[viewMonth]} {viewYear}</span>
          <div className="week-totals">
            <span className="week-stat"><span className="week-stat-val">{totals.booked}</span> Randevu</span>
            <span className="week-sep">·</span>
            <span className="week-stat"><span className="week-stat-val gold">{totals.revenue.toLocaleString('tr-TR')} ₺</span> Kazanç</span>
            {totals.pending > 0 && (
              <>
                <span className="week-sep">·</span>
                <span className="week-stat" style={{ color: '#eab308' }}>
                  <span className="week-stat-val" style={{ color: '#eab308' }}>{totals.pending}</span> Bekleyen
                </span>
              </>
            )}
          </div>
        </div>
        <button className="week-nav-btn" onClick={nextMonth}>Sonraki Ay ›</button>
      </div>

      {/* Day headers */}
      <div className="month-day-headers">
        {HEADER_DAYS.map(d => (
          <div key={d} className="month-day-header">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="month-grid">
        {gridCells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} className="month-cell empty" />;
          const isToday = cell.dateStr === todayStr;
          const fillPct = cell.totalSlots > 0
            ? Math.round(((cell.bookedCount + cell.pendingCount) / cell.totalSlots) * 100)
            : 0;
          const fillColor = fillPct >= 100 ? 'var(--danger)' :
            fillPct >= 60 ? '#f59e0b' :
              cell.pendingCount > 0 ? '#eab308' : 'var(--success)';

          return (
            <div
              key={cell.dateStr}
              className={[
                'month-cell glass-panel',
                cell.closed ? 'month-cell-closed' : 'month-cell-open',
                isToday ? 'month-cell-today' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => !cell.closed && onDaySelect && onDaySelect(cell.dateStr)}
            >
              <div className="month-cell-header">
                <span className={`month-day-num ${isToday ? 'today-num' : ''}`}>{cell.day}</span>
                {!cell.closed && cell.totalSlots > 0 && (
                  <span className="month-day-abbr">{TR_DAY_SHORT[cell.dayOfWeek]}</span>
                )}
              </div>

              {cell.closed ? (
                <div className="month-cell-closed-label">Kapalı</div>
              ) : (
                <>
                  <div className="month-fill-bar">
                    <div style={{ width: `${fillPct}%`, background: fillColor }} className="month-fill" />
                  </div>
                  <div className="month-cell-stats">
                    <span>{cell.bookedCount}/{cell.totalSlots}</span>
                    {cell.pendingCount > 0 && (
                      <span className="pending-chip">{cell.pendingCount} bkl.</span>
                    )}
                    {cell.revenue > 0 && (
                      <span className="month-revenue">{cell.revenue.toLocaleString('tr-TR')}₺</span>
                    )}
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

export default MonthlyOverview;
