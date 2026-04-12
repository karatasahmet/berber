import React, { useState, useMemo } from 'react';
import { getRevenueForRange } from '../utils/bookingStore';
import './RevenueReport.css';

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const today = new Date().toISOString().split('T')[0];
const firstOfMonth = today.slice(0, 7) + '-01';

const RevenueReport = () => {
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);

  const report = useMemo(() => {
    if (startDate && endDate && startDate <= endDate) {
      return getRevenueForRange(startDate, endDate);
    }
    return null;
  }, [startDate, endDate]);

  const noData = report && report.totalBookings === 0;

  const exportToCsv = () => {
    if (!report || !report.detailRows || report.detailRows.length === 0) return;
    const headers = ['Tarih', 'Saat', 'Müşteri', 'Telefon', 'Hizmet', 'İndirim', 'Ücret (₺)'];
    const rows = report.detailRows.map(r => [
      r.dateStr, r.time, r.customerName || '', r.phone || '', r.service || '', r.discount || '', r.price
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `berber-rapor-${startDate}-${endDate}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="revenue-report animate-slide-up">
      {/* Date range picker */}
      <div className="report-range-bar glass-panel">
        <div className="range-inputs">
          <div className="range-field">
            <label>Başlangıç Tarihi</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="custom-input"
            />
          </div>
          <div className="range-sep">—</div>
          <div className="range-field">
            <label>Bitiş Tarihi</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="custom-input"
              min={startDate}
            />
          </div>
        </div>
        {startDate && endDate && (
          <div className="range-label">
            📅 {formatDate(startDate)} → {formatDate(endDate)}
          </div>
        )}
        {report && !noData && (
          <button className="csv-btn" onClick={exportToCsv}>
            📥 CSV İndir
          </button>
        )}
      </div>

      {!report && (
        <div className="report-empty glass-panel">Lütfen geçerli bir tarih aralığı seçin.</div>
      )}

      {report && noData && (
        <div className="report-empty glass-panel">
          Bu tarih aralığında onaylanmış randevu bulunmamaktadır.
        </div>
      )}

      {report && !noData && (
        <>
          {/* Summary Cards */}
          <div className="report-summary-grid">
            <div className="report-card glass-panel">
              <div className="report-card-icon">💰</div>
              <div className="report-card-body">
                <div className="report-card-label">Toplam Kazanç</div>
                <div className="report-card-value gold">{report.totalRevenue.toLocaleString('tr-TR')} ₺</div>
              </div>
            </div>
            <div className="report-card glass-panel">
              <div className="report-card-icon">✂️</div>
              <div className="report-card-body">
                <div className="report-card-label">Toplam Randevu</div>
                <div className="report-card-value">{report.totalBookings}</div>
              </div>
            </div>
            <div className="report-card glass-panel">
              <div className="report-card-icon">📊</div>
              <div className="report-card-body">
                <div className="report-card-label">Randevu Başı Ort.</div>
                <div className="report-card-value">
                  {report.totalBookings > 0
                    ? Math.round(report.totalRevenue / report.totalBookings).toLocaleString('tr-TR') + ' ₺'
                    : '—'}
                </div>
              </div>
            </div>
            {report.topDay && (
              <div className="report-card glass-panel">
                <div className="report-card-icon">🏆</div>
                <div className="report-card-body">
                  <div className="report-card-label">En Yoğun Gün</div>
                  <div className="report-card-value" style={{ fontSize: '1rem' }}>
                    {formatDate(report.topDay.dateStr)}
                    <span style={{ color: 'var(--accent-gold)', display: 'block', fontSize: '1.2rem' }}>
                      {report.topDay.revenue.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Service Breakdown */}
          <div className="glass-panel report-section">
            <h3 className="report-section-title">💈 Hizmet Bazlı Dökümü</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Hizmet</th>
                  <th>Randevu Sayısı</th>
                  <th>Toplam Kazanç</th>
                  <th>Pay</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(report.byService)
                  .sort((a, b) => b[1].revenue - a[1].revenue)
                  .map(([svc, data]) => (
                    <tr key={svc}>
                      <td>{svc}</td>
                      <td>{data.count}</td>
                      <td className="gold-text">{data.revenue.toLocaleString('tr-TR')} ₺</td>
                      <td>
                        <div className="mini-bar-wrapper">
                          <div
                            className="mini-bar"
                            style={{ width: `${Math.round((data.revenue / report.totalRevenue) * 100)}%` }}
                          ></div>
                        </div>
                        <span className="mini-pct">
                          {Math.round((data.revenue / report.totalRevenue) * 100)}%
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Daily Detail */}
          {report.byDate.length > 0 && (
            <div className="glass-panel report-section">
              <h3 className="report-section-title">📅 Günlük Detay</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Randevu</th>
                    <th>Kazanç</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byDate
                    .sort((a, b) => b.revenue - a.revenue)
                    .map(day => (
                      <tr key={day.dateStr}
                        className={report.topDay?.dateStr === day.dateStr ? 'top-day-row' : ''}>
                        <td>{formatDate(day.dateStr)}</td>
                        <td>{day.count}</td>
                        <td className="gold-text">{day.revenue.toLocaleString('tr-TR')} ₺</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RevenueReport;
