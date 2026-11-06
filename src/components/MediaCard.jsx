import React, { useState, useEffect, useRef, memo } from 'react';
import { Star, Bookmark, Check, MoreHorizontal, Edit, Trash2, Calendar, Eye, Film } from 'lucide-react';

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
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    }
    return raw;
  } catch {
    return dateStr;
  }
}

// O(1) Memory Cache for Procedural Gradients
const gradientCache = new Map();

function getCachedGradient(title = '', cat = '') {
  const key = `${cat}_${title}`;
  if (gradientCache.has(key)) return gradientCache.get(key);

  let grad;
  if (String(cat).toLowerCase() === 'anime') {
    grad = 'linear-gradient(145deg, #4A0E4E 0%, #1E1B4B 60%, #172554 100%)';
  } else {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 45) % 360;
    grad = `linear-gradient(145deg, hsl(${hue1}, 65%, 22%) 0%, hsl(${hue2}, 55%, 10%) 100%)`;
  }

  gradientCache.set(key, grad);
  return grad;
}

function MediaCard({
  item,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenDetail,
  isSelected = false,
  onToggleSelect,
  viewMode = 'grid'
}) {
  const [imgError, setImgError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const menuAnchorRef = useRef(null);

  const handleToggleMenu = (e) => {
    e.stopPropagation();
    if (!showMenu && menuAnchorRef.current) {
      const rect = menuAnchorRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Dropdown menu is ~180px tall. Flip upwards if not enough room below and room above
      if (spaceBelow < 190 && rect.top > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
    setShowMenu((prev) => !prev);
  };

  // Outside click dismiss for dropdown menu
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuAnchorRef.current && !menuAnchorRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu]);

  // Compute 5-star count and 10-scale score
  const numRating = Number(item.rating) || 0;
  const starCount = Math.round(numRating / 2);
  const displayScore = numRating > 0 ? numRating.toFixed(1) : '-';

  // Format category badge text (e.g. "TO WATCH", "BOLLYWOOD")
  const categoryBadge = (item.status === 'plan_to_watch'
    ? 'TO WATCH'
    : (item.category || item.type || 'BOLLYWOOD')
  ).toUpperCase();

  // Subtitle metadata line (e.g. "Bollywood • Watched" or "Hollywood • Plan to Watch")
  const metaLine = `${item.category || 'Cinema'} • ${item.status === 'completed' ? 'Watched' : item.status === 'watching' ? 'Watching' : 'Plan to Watch'}`;

  // Formatted watched/watching date (e.g. "28 Oct 2026")
  const watchedDateStr = item.watched_date ? formatDisplayDate(item.watched_date) : '';

  const hasRealPoster = item.poster_url && !imgError;

  // ==============================================================
  // 1. LIST VIEW RENDERING
  // ==============================================================
  if (viewMode === 'list') {
    return (
      <article
        className={`cinema-poster-card card-list-view ${isSelected ? 'card-selected' : ''} ${showMenu ? 'card-menu-open' : ''}`}
        onClick={() => onOpenDetail && onOpenDetail(item)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onOpenDetail) onOpenDetail(item);
          }
        }}
        aria-label={`View details for ${item.title}`}
      >
        {/* Left: Multi-select Checkbox */}
        <button
          type="button"
          className={`list-row-checkbox-btn ${isSelected ? 'checked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleSelect) onToggleSelect(item.id);
          }}
          title={isSelected ? 'Deselect title' : 'Select title'}
          aria-label={isSelected ? `Deselect ${item.title}` : `Select ${item.title}`}
        >
          {isSelected ? <Check size={13} strokeWidth={3} /> : null}
        </button>

        {/* Thumbnail Poster */}
        <div
          className="list-poster-thumb"
          style={!hasRealPoster ? { background: getCachedGradient(item.title, item.category) } : undefined}
        >
          {hasRealPoster ? (
            <img
              src={item.poster_url}
              alt={item.title}
              className="list-thumb-img"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="list-thumb-fallback">
              <span className="list-thumb-initial">{(item.title || '🎬').slice(0, 1).toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Middle: Rich Content Info */}
        <div className="list-content-body">
          <div className="list-title-row">
            <h3 className="list-movie-title" title={item.title}>
              {item.title}
            </h3>
            {item.release_year && (
              <span className="list-year-tag">{item.release_year}</span>
            )}
            <span className="list-category-tag" title={item.category || item.type || 'Cinema'}>
              {item.category || item.type || 'Cinema'}
            </span>
            <span className={`list-status-tag status-${item.status}`}>
              {item.status === 'completed' ? 'Watched' : item.status === 'watching' ? 'Watching' : 'Plan to Watch'}
            </span>
          </div>

          <div className="list-meta-subrow">
            {watchedDateStr && (
              <span className="list-date-chip">
                <Calendar size={12} className="list-cal-icon" aria-hidden="true" />
                <span>{watchedDateStr}</span>
              </span>
            )}
            {item.genre && (
              <span className="list-genre-text">• {item.genre}</span>
            )}
            {item.platform && (
              <span className="list-platform-text">• {item.platform}</span>
            )}
          </div>
        </div>

        {/* Right: Rating & Actions */}
        <div className="list-actions-right">
          <div className="list-rating-box">
            <Star size={13} fill="#F59E0B" strokeWidth={0} className="star-gold" />
            <span className="rating-score-bold">{displayScore}</span>
            {starCount > 0 && <span className="rating-star-count">({starCount})</span>}
          </div>

          <div className="list-action-btns-group">
            {/* Quick Bookmark Toggle */}
            <button
              type="button"
              className={`list-bookmark-btn ${item.status === 'plan_to_watch' ? 'bookmarked' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                const nextStatus = item.status === 'plan_to_watch' ? 'completed' : 'plan_to_watch';
                if (onStatusChange) onStatusChange(item.id, nextStatus);
              }}
              title={item.status === 'plan_to_watch' ? 'In Plan to Watch' : 'Bookmark to Plan to Watch'}
              aria-label="Bookmark"
            >
              <Bookmark size={15} fill={item.status === 'plan_to_watch' ? '#A855F7' : 'none'} />
            </button>

            {/* 3-Dots Menu Anchor */}
            <div className="poster-menu-anchor" ref={menuAnchorRef}>
              <button
                type="button"
                className="poster-menu-trigger"
                onClick={handleToggleMenu}
                title="More actions"
                aria-label="More actions"
              >
                <MoreHorizontal size={17} />
              </button>

              {/* Quick Context Popup Menu */}
              {showMenu && (
                <div
                  className={`poster-dropdown-menu list-dropdown-menu ${openUpward ? 'menu-open-up' : ''}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="dropdown-menu-item"
                    onClick={() => {
                      setShowMenu(false);
                      if (onOpenDetail) onOpenDetail(item);
                    }}
                  >
                    <Eye size={13} />
                    <span>View Details</span>
                  </button>
                  <button
                    type="button"
                    className="dropdown-menu-item"
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(item);
                    }}
                  >
                    <Edit size={13} />
                    <span>Edit Details</span>
                  </button>
                  <button
                    type="button"
                    className="dropdown-menu-item"
                    onClick={() => {
                      setShowMenu(false);
                      const next = item.status === 'completed' ? 'plan_to_watch' : 'completed';
                      onStatusChange(item.id, next);
                    }}
                  >
                    <Check size={13} />
                    <span>Mark as {item.status === 'completed' ? 'Plan to Watch' : 'Watched'}</span>
                  </button>
                  <button
                    type="button"
                    className="dropdown-menu-item delete-item"
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(item.id, item.title);
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Delete Title</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  // ==============================================================
  // 2. GRID POSTER VIEW RENDERING
  // ==============================================================
  return (
    <article
      className={`cinema-poster-card ${isSelected ? 'card-selected' : ''} ${showMenu ? 'card-menu-open' : ''}`}
      onClick={() => onOpenDetail && onOpenDetail(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onOpenDetail) onOpenDetail(item);
        }
      }}
      aria-label={`View details for ${item.title}`}
    >
      {/* Poster Image / Dynamic Cinema Backdrop */}
      <div
        className="poster-art-wrapper"
        style={!hasRealPoster ? { background: getCachedGradient(item.title, item.category) } : undefined}
      >
        {hasRealPoster ? (
          <img
            src={item.poster_url}
            alt={item.title}
            className="poster-img"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="procedural-poster-content">
            <span className="procedural-poster-title">{item.title}</span>
            <div className="procedural-film-reel" aria-hidden="true"></div>
          </div>
        )}

        {/* Cinematic gradient fade overlay from image to card body */}
        <div className="poster-gradient-fade" aria-hidden="true"></div>

        {/* Top Floating Badges */}
        <div className="poster-top-bar">
          <span className="poster-category-pill" title={categoryBadge}>
            {categoryBadge}
          </span>

          <div className="poster-top-actions">
            {/* Multi-select Checkbox */}
            <button
              type="button"
              className={`poster-checkbox-btn ${isSelected ? 'checked' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleSelect) onToggleSelect(item.id);
              }}
              title={isSelected ? 'Deselect title' : 'Select title'}
              aria-label={isSelected ? `Deselect ${item.title}` : `Select ${item.title}`}
            >
              {isSelected ? <Check size={12} strokeWidth={3} /> : null}
            </button>

            {/* Quick Bookmark / Status Toggle */}
            <button
              type="button"
              className={`poster-bookmark-btn ${item.status === 'plan_to_watch' ? 'bookmarked' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                const nextStatus = item.status === 'plan_to_watch' ? 'completed' : 'plan_to_watch';
                if (onStatusChange) onStatusChange(item.id, nextStatus);
              }}
              title={item.status === 'plan_to_watch' ? 'Bookmarked in Plan to Watch' : 'Bookmark to Plan to Watch'}
              aria-label="Bookmark"
            >
              <Bookmark size={14} fill={item.status === 'plan_to_watch' ? '#A855F7' : 'none'} />
            </button>
          </div>
        </div>
      </div>

      {/* Card Info Section */}
      <div className="poster-card-body">
        {/* Title & Release Year Row */}
        <div className="poster-title-row">
          <h3 className="poster-movie-title" title={item.title}>
            {item.title}
          </h3>
          {item.release_year && (
            <span className="poster-year-badge">{item.release_year}</span>
          )}
        </div>

        {/* Subtitle Meta */}
        <p className="poster-meta-subtitle">{metaLine}</p>

        {/* Watching Date Badge (Shown when content has a watched/watching date) */}
        {watchedDateStr && (
          <div className="poster-watched-date-row" title={`Watched on ${watchedDateStr}`}>
            <Calendar size={11} className="poster-date-cal-icon" aria-hidden="true" />
            <span className="poster-date-val">{watchedDateStr}</span>
          </div>
        )}

        {/* Bottom Rating & Actions Row */}
        <div className="poster-bottom-row">
          <div className="poster-rating-display">
            <Star size={13} fill="#F59E0B" strokeWidth={0} className="star-gold" />
            <span className="rating-score-bold">{displayScore}</span>
            {starCount > 0 && <span className="rating-star-count">({starCount})</span>}
          </div>

          <div className="poster-menu-anchor" ref={menuAnchorRef}>
            <button
              type="button"
              className="poster-menu-trigger"
              onClick={handleToggleMenu}
              title="More actions"
              aria-label="More actions"
            >
              <MoreHorizontal size={15} />
            </button>

            {/* Quick Context Popup Menu */}
            {showMenu && (
              <div
                className="poster-dropdown-menu"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="dropdown-menu-item"
                  onClick={() => {
                    setShowMenu(false);
                    if (onOpenDetail) onOpenDetail(item);
                  }}
                >
                  <Eye size={13} />
                  <span>View Details</span>
                </button>
                <button
                  type="button"
                  className="dropdown-menu-item"
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(item);
                  }}
                >
                  <Edit size={13} />
                  <span>Edit Details</span>
                </button>
                <button
                  type="button"
                  className="dropdown-menu-item"
                  onClick={() => {
                    setShowMenu(false);
                    const next = item.status === 'completed' ? 'plan_to_watch' : 'completed';
                    onStatusChange(item.id, next);
                  }}
                >
                  <Check size={13} />
                  <span>Mark as {item.status === 'completed' ? 'Plan to Watch' : 'Watched'}</span>
                </button>
                <button
                  type="button"
                  className="dropdown-menu-item delete-item"
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(item.id, item.title);
                  }}
                >
                  <Trash2 size={13} />
                  <span>Delete Title</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(MediaCard);
