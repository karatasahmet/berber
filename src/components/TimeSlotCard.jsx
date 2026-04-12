import React from 'react';
import './TimeSlotCard.css';

const TimeSlotCard = ({ slot, isCampaign, onSelect }) => {
  const { time, status } = slot;

  const isPending = status === 'pending';
  const isBooked = status === 'booked';
  const isAvailable = status === 'available';

  const cardClasses = [
    'time-slot-card glass-panel',
    isAvailable ? 'available' : '',
    isBooked ? 'booked' : '',
    isPending ? 'pending' : '',
    isCampaign && isAvailable ? 'campaign animate-pulse-glow' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      onClick={() => isAvailable && onSelect(slot)}
    >
      <div className="time-indicator">
        <span className="time-text">{time}</span>
      </div>

      <div className="slot-details">
        {isBooked && <span className="status-badge closed">Dolu</span>}
        {isPending && <span className="status-badge pending-badge">Bekliyor</span>}
        {isAvailable && (
          <>
            <span className="status-badge open">Müsait</span>
            {isCampaign && (
              <span className="campaign-badge">{isCampaign}</span>
            )}
          </>
        )}
      </div>

      {isAvailable && (
        <div className="action-area">
          <button className="book-btn">Seç</button>
        </div>
      )}
    </div>
  );
};

export default TimeSlotCard;
