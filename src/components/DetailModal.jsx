import React, { useState } from 'react';
import {
  Star,
  Calendar,
  Tv,
  Film,
  Edit,
  Trash2,
  Check,
  Bookmark,
  Clock,
  X,
  Quote,
  Tag,
  Sparkles
} from 'lucide-react';

// Format YYYY-MM-DD to legible British English format: 28 Oct 2026
function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  try {
    const raw = String(dateStr).substring(0, 10);
    const parts = raw.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(Date.UTC(year, month, day));
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      });
    }
    return raw;
  } catch {
    return dateStr;
  }
}

export default function DetailModal({
  isOpen,
  onClose,
  item,
  onEdit,
  onDelete,
  onStatusChange
}) {
  const [imgError, setImgError] = useState(false);

  if (!isOpen || !item) return null;

  const numRating = Number(item.rating) || 0;
  const starCount = Math.round(numRating / 2);
  const displayScore = numRating > 0 ? numRating.toFixed(1) : '-';
  const hasRealPoster = item.poster_url && !imgError;
  const watchedDateStr = item.watched_date ? formatDisplayDate(item.watched_date) : '';

  // Parse genres comma-separated
  const genres = item.genre
    ? item.genre
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean)
    : [];

  const statusLabel =
    item.status === 'completed'
      ? 'Watched'
      : item.status === 'watching'
      ? 'Currently Watching'
      : item.status === 'dropped'
      ? 'Dropped'
      : 'Plan to Watch';

  return (
    <div
      className="modal-backdrop detail-modal-backdrop"
      onClick={onClose}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      <div
        className="modal-window detail-modal-window"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        {/* Mobile Sheet Drag Handle */}
        <div className="sheet-drag-handle-bar" aria-hidden="true">
          <div className="sheet-drag-handle"></div>
        </div>

        {/* Ambient Cinema Backdrop & Floating Poster Hero */}
        <div className="detail-hero-section">
          {/* Ambient blurred backdrop background */}
          {hasRealPoster ? (
            <img
              src={item.poster_url}
              alt=""
              className="detail-poster-blur-bg"
              aria-hidden="true"
            />
          ) : (
            <div className="detail-procedural-backdrop" aria-hidden="true"></div>
          )}

          {/* Vignette Gradient Overlay */}
          <div className="detail-hero-gradient-fade" aria-hidden="true"></div>

          {/* Top Bar: Category Pill & Close Button */}
          <div className="detail-top-floating-bar">
            <div className="detail-top-left-group">
              <span className="detail-category-pill">
                {(item.content_type || item.category || 'Movie').toUpperCase()} • {(item.origin || 'BOLLYWOOD').toUpperCase()}
              </span>
              {item.availability === 'Uploaded' && (
                <span className="detail-uploaded-pill">UPLOADED</span>
              )}
            </div>
            <button
              type="button"
              className="circle-glass-btn detail-close-circle"
              onClick={onClose}
              title="Close details (Esc)"
              aria-label="Close details"
            >
              <X size={16} />
            </button>
          </div>

          {/* Floating Focal Poster Card */}
          <div className="detail-floating-poster-container">
            {hasRealPoster ? (
              <img
                src={item.poster_url}
                alt={item.title}
                className="detail-floating-poster-img"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="detail-floating-poster-fallback">
                <Film size={36} className="detail-fallback-film-icon" />
                <span className="detail-fallback-title">{item.title}</span>
              </div>
            )}
          </div>
        </div>

        {/* Title, Year & Status Identity Header */}
        <div className="detail-identity-header">
          <div className="detail-title-row">
            <h2 id="detail-title" className="detail-movie-title">
              {item.title}
            </h2>
            {item.release_year && (
              <span className="detail-year-tag">{item.release_year}</span>
            )}
          </div>
          <div className="detail-identity-meta-row">
            <span className={`detail-status-badge status-${item.status || 'plan_to_watch'}`}>
              {item.status === 'completed' && <Check size={12} strokeWidth={2.5} />}
              {item.status === 'watching' && <Clock size={12} strokeWidth={2.5} />}
              {item.status === 'plan_to_watch' && <Bookmark size={12} strokeWidth={2.5} />}
              <span>{statusLabel}</span>
            </span>
            {item.platform && (
              <span className="detail-platform-mini-tag">
                <Tv size={11} />
                <span>{item.platform}</span>
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="modal-body detail-modal-body">
          {/* Balanced 4-Metric Grid (2x2) */}
          <div className="detail-metrics-grid">
            {/* 1. Rating */}
            <div className="detail-metric-card">
              <div className="metric-icon-wrap amber">
                <Star size={15} fill="#F59E0B" strokeWidth={0} />
              </div>
              <div className="metric-content">
                <span className="metric-label">Rating</span>
                <div className="metric-val-row">
                  <span className="metric-score-large">{displayScore}</span>
                  <span className="metric-score-max">/10</span>
                </div>
                <div className="detail-stars-visual">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={10}
                      fill={i <= starCount ? '#F59E0B' : 'transparent'}
                      color={i <= starCount ? '#F59E0B' : 'rgba(255,255,255,0.2)'}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Watched Date */}
            <div className="detail-metric-card">
              <div className="metric-icon-wrap purple">
                <Calendar size={15} />
              </div>
              <div className="metric-content">
                <span className="metric-label">Watched Date</span>
                <span className="metric-val-text">
                  {watchedDateStr || 'Not recorded'}
                </span>
                <span className="metric-sub-hint">
                  {watchedDateStr ? 'Logged in timeline' : 'Tap Edit to add date'}
                </span>
              </div>
            </div>

            {/* 3. Platform / Service */}
            <div className="detail-metric-card">
              <div className="metric-icon-wrap cyan">
                <Tv size={15} />
              </div>
              <div className="metric-content">
                <span className="metric-label">Platform</span>
                <span className="metric-val-text">
                  {item.platform || 'Not specified'}
                </span>
                <span className="metric-sub-hint">Streaming / Cinema</span>
              </div>
            </div>

            {/* 4. Category & 4 Dimensions */}
            <div className="detail-metric-card">
              <div className="metric-icon-wrap pink">
                <Film size={15} />
              </div>
              <div className="metric-content">
                <span className="metric-label">Dimensions</span>
                <span className="metric-val-text">
                  {item.content_type || 'Movie'} · {item.origin || 'Bollywood'}
                </span>
                <span className="metric-sub-hint">
                  {item.availability === 'Uploaded' ? 'In Uploaded Library' : 'Not Uploaded'}
                </span>
              </div>
            </div>
          </div>

          {/* Genres Chips */}
          {genres.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-header">
                <Tag size={13} className="section-icon" />
                <span>Genres</span>
              </div>
              <div className="detail-genre-chips">
                {genres.map((g, idx) => (
                  <span key={idx} className="genre-chip">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Personal Review & Notes */}
          <div className="detail-section">
            <div className="detail-section-header">
              <Quote size={13} className="section-icon" />
              <span>Notes & Personal Review</span>
            </div>
            {item.notes && item.notes.trim() ? (
              <div className="detail-notes-callout">
                <p className="detail-notes-text">{item.notes}</p>
              </div>
            ) : (
              <button
                type="button"
                className="detail-notes-empty-prompt"
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                title="Tap to add personal review"
              >
                <Sparkles size={14} className="notes-prompt-icon" />
                <span>
                  No review added yet.{' '}
                  <strong className="notes-prompt-action" style={{ whiteSpace: 'nowrap' }}>Write personal thoughts →</strong>
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="modal-footer detail-modal-footer">
          {/* Full-width primary Edit button */}
          <button
            type="button"
            className="btn btn-primary detail-btn-edit-main"
            onClick={() => {
              if (onClose) onClose();
              if (onEdit) onEdit(item);
            }}
            title="Edit all fields of this title"
          >
            <Edit size={16} />
            <span>Edit Details</span>
          </button>

          {/* Secondary Action Row: Status Toggle + Delete */}
          <div className="detail-footer-sub-row">
            <button
              type="button"
              className="btn btn-secondary detail-btn-sub-action"
              onClick={() => {
                const next = item.status === 'completed' ? 'plan_to_watch' : 'completed';
                if (onStatusChange) onStatusChange(item.id, next);
                if (onClose) onClose();
              }}
              title={item.status === 'completed' ? 'Move to Plan to Watch' : 'Mark as Watched'}
            >
              <Check size={14} />
              <span>{item.status === 'completed' ? 'Mark Plan to Watch' : 'Mark as Watched'}</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary detail-btn-delete-action"
              onClick={() => {
                if (onDelete) onDelete(item.id, item.title);
                if (onClose) onClose();
              }}
              title="Delete title"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
