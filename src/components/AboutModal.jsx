import React from 'react';
import { Film, Calendar, Star, Filter, BarChart2 } from 'lucide-react';

export default function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

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
        className="modal-window about-modal-window"
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="about-header-title">
            <h3>About Watched</h3>
            <span className="about-header-tagline">Cinema & Series Journal</span>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="modal-body about-content">
          <p className="about-intro">
            <strong>Watched</strong> is your personal cinema and series journal — a refined, distraction-free space to log what you've seen, track what you're currently bingeing, and curate what to experience next.
          </p>

          <div className="about-features-grid">
            <div className="about-feature-card">
              <div className="feature-icon purple">
                <Film size={18} />
              </div>
              <div className="feature-text">
                <strong>Curate Any Media</strong>
                <p>Track movies, TV series, anime, and documentaries in a high-density, poster-first layout.</p>
              </div>
            </div>

            <div className="about-feature-card">
              <div className="feature-icon blue">
                <Calendar size={18} />
              </div>
              <div className="feature-text">
                <strong>Watch Dates & Timeline</strong>
                <p>Record the exact date you watched or completed every title to build your lifetime cinema journal.</p>
              </div>
            </div>

            <div className="about-feature-card">
              <div className="feature-icon amber">
                <Star size={18} />
              </div>
              <div className="feature-text">
                <strong>Ratings & Personal Notes</strong>
                <p>Rate stories on a 10-point scale with half-star precision and write down memorable thoughts.</p>
              </div>
            </div>

            <div className="about-feature-card">
              <div className="feature-icon rose">
                <Filter size={18} />
              </div>
              <div className="feature-text">
                <strong>Instant Filtering & Search</strong>
                <p>Find titles instantly by keyword, genre, status (Watching, Plan to Watch, Completed), or platform.</p>
              </div>
            </div>

            <div className="about-feature-card">
              <div className="feature-icon green">
                <BarChart2 size={18} />
              </div>
              <div className="feature-text">
                <strong>Live Collection Stats</strong>
                <p>Monitor your watching progress, completed tally, and average rating in real-time summary cards.</p>
              </div>
            </div>
          </div>

          <div className="about-footer-info">
            <p>Designed with a luxury dark aesthetic for film lovers, binge-watchers, and anime enthusiasts.</p>
          </div>
        </div>

        <div className="modal-footer sticky-modal-footer">
          <button className="btn btn-primary btn-modal-action" onClick={onClose} style={{ width: '100%' }}>
            Back to Watchlist
          </button>
        </div>
      </div>
    </div>
  );
}

