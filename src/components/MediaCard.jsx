import React, { useState, memo } from 'react';
import { Star, Bookmark, Check, MoreHorizontal, Edit, Trash2 } from 'lucide-react';

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
  isSelected = false,
  onToggleSelect,
  viewMode = 'grid'
}) {
  const [imgError, setImgError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

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

  const hasRealPoster = item.poster_url && !imgError;

  return (
    <article className={`cinema-poster-card ${isSelected ? 'card-selected' : ''} ${viewMode === 'list' ? 'card-list-view' : ''}`}>
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

        {/* Bottom Rating & Actions Row */}
        <div className="poster-bottom-row">
          <div className="poster-rating-display">
            <Star size={13} fill="#F59E0B" strokeWidth={0} className="star-gold" />
            <span className="rating-score-bold">{displayScore}</span>
            {starCount > 0 && <span className="rating-star-count">({starCount})</span>}
          </div>

          <div className="poster-menu-anchor">
            <button
              type="button"
              className="poster-menu-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
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
