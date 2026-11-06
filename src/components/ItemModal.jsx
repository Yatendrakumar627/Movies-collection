import React, { useState, useEffect } from 'react';
import FacebookDatePicker from './FacebookDatePicker';

export default function ItemModal({ isOpen, onClose, onSave, item, existingItems = [] }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'Bollywood',
    status: 'plan_to_watch',
    genre: '',
    release_year: '',
    rating: 8,
    watched_date: '',
    platform: '',
    poster_url: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState(null);

  // Check in real-time for duplicates as user types (case-insensitive & trimmed)
  useEffect(() => {
    const clean = (formData.title || '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (!clean || clean.length < 2) {
      setDuplicateMatch(null);
      return;
    }

    const currentId = item?.id;
    const match = existingItems.find((ex) => {
      if (currentId != null && ex.id === currentId) return false;
      const exClean = (ex.title || '').trim().replace(/\s+/g, ' ').toLowerCase();
      return exClean === clean;
    });

    setDuplicateMatch(match || null);
  }, [formData.title, item, existingItems]);

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || '',
        type: item.type || item.category || 'Bollywood',
        status: item.status || 'plan_to_watch',
        genre: item.genre || '',
        release_year: item.release_year || '',
        rating: item.rating != null ? item.rating : 8,
        watched_date: item.watched_date ? item.watched_date.substring(0, 10) : '',
        platform: item.platform || '',
        poster_url: item.poster_url || '',
        notes: item.notes || ''
      });
    } else {
      setFormData({
        title: '',
        type: 'Bollywood',
        status: 'plan_to_watch',
        genre: '',
        release_year: new Date().getFullYear(),
        rating: 8,
        watched_date: '',
        platform: '',
        poster_url: '',
        notes: ''
      });
    }
  }, [item, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTitle = formData.title.trim();
    if (!cleanTitle || duplicateMatch) return;

    setIsSubmitting(true);
    try {
      await onSave({
        ...formData,
        title: cleanTitle,
        release_year: formData.release_year ? parseInt(formData.release_year, 10) : null,
        rating: parseFloat(formData.rating),
        watched_date: formData.watched_date || null
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStars = (score) => {
    const stars5 = (score || 0) / 2;
    const fullStars = Math.floor(stars5);
    const halfStar = stars5 - fullStars >= 0.5 ? 1 : 0;
    const emptyStars = Math.max(0, 5 - fullStars - halfStar);
    return '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      <div
        className="modal-window item-modal-window"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-text">
            <h3>{item ? 'Edit Watchlist Item' : 'Add Title to Watchlist'}</h3>
            <span className="modal-header-sub">
              {item ? 'Update cinema metadata & rating' : 'Add to your personal cinema universe'}
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-shell">
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="inputTitle">
                  Title <span className="required">*</span>
                </label>
                <input
                  id="inputTitle"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Interstellar, Severance, Arcane"
                  className={duplicateMatch ? 'input-duplicate-error' : ''}
                  autoFocus
                />
                {duplicateMatch && (
                  <div className="duplicate-warning-banner" role="alert">
                    <span className="duplicate-warning-icon">⚠️</span>
                    <div className="duplicate-warning-text">
                      <strong>Duplicate title:</strong> "{duplicateMatch.title}" already exists in your collection ({duplicateMatch.category || duplicateMatch.type} • {duplicateMatch.status === 'completed' ? 'Watched' : duplicateMatch.status === 'watching' ? 'Watching' : 'Plan to Watch'}). Titles must be unique.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-row two-col">
              <div className="form-group">
                <label htmlFor="inputType">Category</label>
                <select
                  id="inputType"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="Bollywood">Bollywood</option>
                  <option value="Hollywood">Hollywood</option>
                  <option value="Web series">Web series</option>
                  <option value="Anime">Anime</option>
                  <option value="South">South</option>
                  <option value="To Watch">To Watch</option>
                  <option value="Old Collection">Old Collection</option>
                  <option value="Uploaded Movies">Uploaded Movies</option>
                  <option value="Uploaded Web series">Uploaded Web series</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="inputStatus">Watch Status</label>
                <select
                  id="inputStatus"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="plan_to_watch">Plan to Watch</option>
                  <option value="completed">Watched</option>
                  <option value="watching">Currently Watching</option>
                  <option value="dropped">Dropped</option>
                </select>
              </div>
            </div>

            <div className="form-row two-col">
              <div className="form-group">
                <label htmlFor="inputYear">Release Year</label>
                <input
                  id="inputYear"
                  type="number"
                  min="1900"
                  max="2099"
                  value={formData.release_year}
                  onChange={(e) => setFormData({ ...formData, release_year: e.target.value })}
                  placeholder="2026"
                />
              </div>

              <div className="form-group">
                <label htmlFor="inputWatchedDate">Watched Date</label>
                <FacebookDatePicker
                  id="inputWatchedDate"
                  value={formData.watched_date}
                  onChange={(val) => setFormData({ ...formData, watched_date: val })}
                  placeholder="dd-mm-yyyy"
                />
              </div>
            </div>

            <div className="form-row two-col">
              <div className="form-group">
                <label htmlFor="inputGenre">Genre</label>
                <input
                  id="inputGenre"
                  type="text"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  placeholder="Sci-Fi, Drama, Mystery"
                />
              </div>

              <div className="form-group">
                <label htmlFor="inputPlatform">Platform / Service</label>
                <input
                  id="inputPlatform"
                  type="text"
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  placeholder="Netflix, HBO, Cinema"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <div className="rating-slider-header">
                  <label htmlFor="inputRating">Rating</label>
                  <div className="rating-visual-pill">
                    <span className="rating-score-val">{formData.rating}</span>
                    <span className="rating-score-denom">/ 10</span>
                    <span className="rating-star-glyphs">{getStars(formData.rating)}</span>
                  </div>
                </div>
                <div className="rating-slider-wrap">
                  <input
                    id="inputRating"
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={formData.rating}
                    onChange={(e) =>
                      setFormData({ ...formData, rating: parseFloat(e.target.value) })
                    }
                    className="luxury-range-input"
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="inputPoster">Poster / Image URL</label>
                <input
                  id="inputPoster"
                  type="url"
                  value={formData.poster_url}
                  onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                  placeholder="https://image.tmdb.org/... or leave empty for auto backdrop"
                />
                <span className="field-hint">Optional: paste an image URL or leave empty for auto backdrop.</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="inputNotes">Notes & Personal Review</label>
                <textarea
                  id="inputNotes"
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Thoughts, review, or why you want to watch this..."
                />
              </div>
            </div>
          </div>

          {/* Sticky Persistent Footer - Always visible and tappable */}
          <div className="modal-footer sticky-modal-footer">
            <button type="button" className="btn btn-secondary btn-modal-action btn-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className={`btn btn-primary btn-modal-action btn-modal-submit ${duplicateMatch ? 'btn-disabled-duplicate' : ''}`}
              disabled={isSubmitting || Boolean(duplicateMatch)}
              title={duplicateMatch ? 'Cannot save duplicate title' : ''}
            >
              {isSubmitting
                ? 'Saving...'
                : duplicateMatch
                ? 'Duplicate Title'
                : item
                ? 'Update Title'
                : 'Save Title'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
