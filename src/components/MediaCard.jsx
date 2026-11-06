import React, { memo, useState, useRef, useEffect } from 'react';
import {
  Star,
  MoreHorizontal,
  Bookmark,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Check
} from 'lucide-react';

/**
 * Format ISO / date string to clean display string (e.g. "28 Oct 2026")
 */
function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Procedural gradient background cache for titles missing poster artwork
 */
const gradientCache = new Map();
function getCachedGradient(title = '', category = '') {
  const key = `${title}:${category}`;
  if (gradientCache.has(key)) return gradientCache.get(key);

  const colors = [
    ['#311042', '#12072B'],
    ['#1A1C4B', '#0D0826'],
    ['#4A1228', '#1F071A'],
    ['#13382C', '#081C15'],
    ['#3B220B', '#1C0E04'],
    ['#261B40', '#0D0924'],
    ['#1E293B', '#0F172A']
  ];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const pair = colors[Math.abs(hash) % colors.length];
  const gradient = `linear-gradient(135deg, ${pair[0]} 0%, ${pair[1]} 100%)`;
  gradientCache.set(key, gradient);
  return gradient;
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
      // Dropdown menu is ~180px tall. Flip upwards if not enough room below
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

  // 4-Dimensional Metadata
  const contentType = item.content_type || item.type || 'Movie';
  const origin = item.origin || 'Bollywood';
  const isUploaded = (item.availability || '').toLowerCase() === 'uploaded';

  // Subtitle metadata line (Matching Image 2: "2023 · Movie · Bollywood")
  const metaParts = [];
  if (item.release_year) metaParts.push(item.release_year);
  metaParts.push(contentType);
  metaParts.push(origin);
  const metaLine = metaParts.join(' · ');

  // Status Badge Label
  const statusLabel =
    item.status === 'completed'
      ? 'Watched'
      : item.status === 'watching'
      ? 'Watching'
      : item.status === 'dropped'
      ? 'Dropped'
      : 'To Watch';

  // Formatted watched/watching date
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

        {/* Middle: Rich Content Info with 4 Dimensions */}
        <div className="list-content-body">
          <div className="list-title-row">
            <h3 className="list-movie-title" title={item.title}>
              {item.title}
            </h3>
          </div>

          <p className="list-meta-subtitle">{metaLine}</p>

          <div className="list-dimension-badges">
            {isUploaded && (
              <span className="dimension-badge badge-uploaded">Uploaded</span>
            )}
            <span className={`dimension-badge badge-status status-${item.status || 'plan_to_watch'}`}>
              {statusLabel}
            </span>
            {watchedDateStr && (
              <span className="list-date-chip">
                <Calendar size={11} className="list-cal-icon" aria-hidden="true" />
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
                      if (onEdit) onEdit(item);
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
                      if (onStatusChange) onStatusChange(item.id, next);
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
                      if (onDelete) onDelete(item.id, item.title);
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
  // 2. GRID POSTER VIEW RENDERING (Matching Image 2)
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
          <span className="poster-category-pill" title={contentType}>
            {contentType.toUpperCase()}
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

      {/* Card Info Section (Matching Image 2) */}
      <div className="poster-card-body">
        {/* Title */}
        <div className="poster-title-row">
          <h3 className="poster-movie-title" title={item.title}>
            {item.title}
          </h3>
        </div>

        {/* Subtitle Meta (e.g. "2023 · Movie · Bollywood") */}
        <p className="poster-meta-subtitle">{metaLine}</p>

        {/* Dimension Badges (Uploaded & Status Badges) */}
        <div className="card-dimension-badges">
          {isUploaded && (
            <span className="dimension-badge badge-uploaded">Uploaded</span>
          )}
          <span className={`dimension-badge badge-status status-${item.status || 'plan_to_watch'}`}>
            {statusLabel}
          </span>
        </div>

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
                className={`poster-dropdown-menu ${openUpward ? 'menu-open-up' : ''}`}
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
                    if (onEdit) onEdit(item);
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
                    if (onStatusChange) onStatusChange(item.id, next);
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
                    if (onDelete) onDelete(item.id, item.title);
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
