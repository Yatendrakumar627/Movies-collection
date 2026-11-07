import React, { useState, useEffect } from 'react';
import FacebookDatePicker from './FacebookDatePicker';

const CONTENT_TYPES = [
  { value: 'Movie', label: 'Movies' },
  { value: 'Web Series', label: 'Web Series' },
  { value: 'Documentary', label: 'Documentary' }
];

const ORIGINS = [
  { value: 'Bollywood', label: 'Bollywood' },
  { value: 'Hollywood', label: 'Hollywood' },
  { value: 'Anime', label: 'Anime' },
  { value: 'South Indian', label: 'South Indian' },
  { value: 'Korean', label: 'Korean' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Other', label: 'Other' }
];

const AVAILABILITY_OPTIONS = [
  { value: 'Uploaded', label: 'Uploaded' },
  { value: 'Not Uploaded', label: 'Not Uploaded' }
];

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'watching', label: 'Watching' },
  { value: 'plan_to_watch', label: 'To Watch' },
  { value: 'dropped', label: 'Dropped' }
];

export default function ItemModal({
  isOpen,
  onClose,
  onSave,
  item,
  existingItems = [],
  defaultCategory = 'Bollywood'
}) {
  const [formData, setFormData] = useState({
    title: '',
    content_type: 'Movie',
    origin: 'Bollywood',
    availability: 'Not Uploaded',
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

  // Synchronous and debounced asynchronous duplicate check (by Title + Content Type)
  useEffect(() => {
    const cleanTitle = (formData.title || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const currentType = (formData.content_type || 'Movie').trim().toLowerCase();

    if (!cleanTitle || cleanTitle.length < 2) {
      setDuplicateMatch(null);
      return;
    }

    const currentId = item?.id;

    // 1. Instant Synchronous Check against loaded items (excluding self by string-safe ID comparison)
    const localMatch = existingItems.find((ex) => {
      if (currentId != null && String(ex.id) === String(currentId)) return false;
      const exTitle = (ex.title || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const exType = (ex.content_type || ex.type || 'Movie').trim().toLowerCase();
      return exTitle === cleanTitle && exType === currentType;
    });

    if (localMatch) {
      setDuplicateMatch(localMatch);
      return;
    }

    // 2. Debounced asynchronous check against server
    let isCancelled = false;
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          title: cleanTitle,
          content_type: formData.content_type
        });
        if (currentId != null) params.append('excludeId', currentId);

        const res = await fetch(`/api/items/check-duplicate?${params.toString()}`);
        if (res.ok && !isCancelled) {
          const data = await res.json();
          if (data.isDuplicate && data.match) {
            if (currentId != null && String(data.match.id) === String(currentId)) {
              setDuplicateMatch(null);
            } else {
              setDuplicateMatch(data.match);
            }
          } else {
            setDuplicateMatch(null);
          }
        }
      } catch (err) {
        // Silently ignore network check errors
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [formData.title, formData.content_type, item, existingItems]);

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || '',
        content_type: item.content_type || item.type || 'Movie',
        origin: item.origin || 'Bollywood',
        availability: item.availability || 'Not Uploaded',
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
      // Inferred defaults from current active view
      let initialType = 'Movie';
      let initialOrigin = 'Bollywood';
      let initialAvailability = 'Not Uploaded';

      if (defaultCategory === 'Web series' || defaultCategory === 'Uploaded Web series') {
        initialType = 'Web Series';
      } else if (defaultCategory === 'Anime') {
        initialType = 'Web Series';
        initialOrigin = 'Anime';
      } else if (defaultCategory === 'Hollywood') {
        initialOrigin = 'Hollywood';
      } else if (defaultCategory === 'South') {
        initialOrigin = 'South Indian';
      }

      if (defaultCategory === 'Uploaded Movies' || defaultCategory === 'Uploaded Web series') {
        initialAvailability = 'Uploaded';
      }

      setFormData({
        title: '',
        content_type: initialType,
        origin: initialOrigin,
        availability: initialAvailability,
        status: defaultCategory === 'To Watch' ? 'plan_to_watch' : 'completed',
        genre: '',
        release_year: new Date().getFullYear(),
        rating: 8,
        watched_date: '',
        platform: '',
        poster_url: '',
        notes: ''
      });
    }
  }, [item, isOpen, defaultCategory]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTitle = formData.title.trim();
    if (!cleanTitle || duplicateMatch) return;

    setIsSubmitting(true);
    try {
      let computedCategory = formData.origin;
      if (formData.origin === 'Anime') {
        computedCategory = 'Anime';
      } else if (formData.content_type === 'Web Series' && formData.origin !== 'Anime') {
        computedCategory = 'Web series';
      } else if (formData.origin === 'South Indian') {
        computedCategory = 'South';
      } else if (formData.origin === 'Bollywood') {
        computedCategory = 'Bollywood';
      } else if (formData.origin === 'Hollywood') {
        computedCategory = 'Hollywood';
      } else {
        computedCategory = formData.content_type || 'Movie';
      }

      let cleanPoster = (formData.poster_url || '').trim();
      if (cleanPoster && !/^https?:\/\//i.test(cleanPoster) && !cleanPoster.startsWith('/')) {
        cleanPoster = 'https://' + cleanPoster;
      }

      const payload = {
        ...formData,
        title: cleanTitle,
        poster_url: cleanPoster,
        category: computedCategory,
        type: formData.content_type,
        release_year: formData.release_year ? parseInt(formData.release_year, 10) : null,
        rating: isNaN(parseFloat(formData.rating)) ? 0.0 : parseFloat(formData.rating),
        watched_date: formData.watched_date && formData.watched_date.trim() ? formData.watched_date.trim() : null
      };
      await onSave(payload);
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
              {item ? 'Update cinema metadata, category & rating' : 'Add a title to your personal cinema watchlist'}
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-shell">
          <div className="modal-body">
            {/* Title Input */}
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
                  placeholder="e.g. 12th Fail, Interstellar, Legend of Hanuman"
                  className={duplicateMatch ? 'input-duplicate-error' : ''}
                  autoFocus
                />
                {duplicateMatch && (
                  <div className="duplicate-warning-banner" role="alert">
                    <span className="duplicate-warning-icon">⚠️</span>
                    <div className="duplicate-warning-text">
                      <strong>Duplicate {duplicateMatch.content_type || 'title'}:</strong> "{duplicateMatch.title}" already exists as a {duplicateMatch.content_type || 'Movie'} ({duplicateMatch.origin || 'Bollywood'} • {duplicateMatch.status === 'completed' ? 'Watched' : duplicateMatch.status === 'watching' ? 'Watching' : 'Plan to Watch'}). Titles must be unique within the same content type.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Content Categories & Metadata Panel */}
            <div className="four-dimensions-panel">
              {/* Content Type */}
              <div className="dimension-row">
                <div className="dimension-header">
                  <span className="dimension-title">Content Type</span>
                  <span className="dimension-question">What kind of content is this?</span>
                </div>
                <div className="dimension-pill-group">
                  {CONTENT_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      type="button"
                      className={`dimension-pill-btn ${formData.content_type === ct.value ? 'active-pill blue' : ''}`}
                      onClick={() => setFormData((prev) => ({ ...prev, content_type: ct.value }))}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Industry / Origin */}
              <div className="dimension-row">
                <div className="dimension-header">
                  <span className="dimension-title">Industry / Origin</span>
                  <span className="dimension-question">Where does the content originate?</span>
                </div>
                <div className="dimension-pill-group">
                  {ORIGINS.map((og) => (
                    <button
                      key={og.value}
                      type="button"
                      className={`dimension-pill-btn ${formData.origin === og.value ? 'active-pill purple' : ''}`}
                      onClick={() => setFormData((prev) => ({ ...prev, origin: og.value }))}
                    >
                      {og.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Library Availability */}
              <div className="dimension-row">
                <div className="dimension-header">
                  <span className="dimension-title">Library Availability</span>
                  <span className="dimension-question">Is the content available in your uploaded library?</span>
                </div>
                <div className="dimension-pill-group">
                  {AVAILABILITY_OPTIONS.map((av) => (
                    <button
                      key={av.value}
                      type="button"
                      className={`dimension-pill-btn ${formData.availability === av.value ? (av.value === 'Uploaded' ? 'active-pill green' : 'active-pill orange') : ''}`}
                      onClick={() => setFormData((prev) => ({ ...prev, availability: av.value }))}
                    >
                      {av.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Watch Status */}
              <div className="dimension-row">
                <div className="dimension-header">
                  <span className="dimension-title">Watch Status</span>
                  <span className="dimension-question">What is your personal viewing progress?</span>
                </div>
                <div className="dimension-pill-group">
                  {STATUS_OPTIONS.map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      className={`dimension-pill-btn ${formData.status === st.value ? (st.value === 'completed' ? 'active-pill green' : st.value === 'watching' ? 'active-pill blue' : st.value === 'plan_to_watch' ? 'active-pill orange' : 'active-pill red') : ''}`}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          status: st.value
                        }));
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Release Year & Watched Date */}
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
                <label htmlFor="inputWatchedDate">Watched Date (Optional)</label>
                <FacebookDatePicker
                  id="inputWatchedDate"
                  value={formData.watched_date}
                  onChange={(val) => setFormData({ ...formData, watched_date: val })}
                  placeholder="dd-mm-yyyy"
                />
              </div>
            </div>

            {/* Genre & Platform */}
            <div className="form-row two-col">
              <div className="form-group">
                <label htmlFor="inputGenre">Genre</label>
                <input
                  id="inputGenre"
                  type="text"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  placeholder="Drama, Biopic, Sci-Fi"
                />
              </div>

              <div className="form-group">
                <label htmlFor="inputPlatform">Platform / Service</label>
                <input
                  id="inputPlatform"
                  type="text"
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  placeholder="Disney+ Hotstar, Netflix, Cinema"
                />
              </div>
            </div>

            {/* Rating */}
            <div className="form-row">
              <div className="form-group full-width">
                <div className="rating-slider-header">
                  <label htmlFor="inputRating">Rating</label>
                  <div className="rating-visual-pill">
                    <span className="rating-visual-score">
                      ★ {Number(formData.rating).toFixed(1)}
                    </span>
                    <span className="rating-visual-stars">
                      {getStars(Number(formData.rating))}
                    </span>
                  </div>
                </div>
                <div className="rating-slider-row">
                  <span className="rating-min-label">0</span>
                  <input
                    id="inputRating"
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="rating-range-slider"
                  />
                  <span className="rating-max-label">10</span>
                </div>
              </div>
            </div>

            {/* Poster URL */}
            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="inputPoster">Poster Image URL (Optional)</label>
                <input
                  id="inputPoster"
                  type="text"
                  inputMode="url"
                  value={formData.poster_url}
                  onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                />
              </div>
            </div>

            {/* Notes */}
            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="inputNotes">Personal Notes / Review</label>
                <textarea
                  id="inputNotes"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Inspiring journey, incredible performance, memorable soundtrack..."
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-ghost btn-modal-action"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn btn-primary btn-modal-action btn-modal-submit ${duplicateMatch ? 'btn-disabled-duplicate' : ''}`}
              disabled={isSubmitting || Boolean(duplicateMatch)}
              title={duplicateMatch ? `Cannot save: "${formData.title}" already exists as a ${formData.content_type}` : ''}
            >
              {isSubmitting
                ? 'Saving...'
                : duplicateMatch
                ? `Duplicate ${formData.content_type}`
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
