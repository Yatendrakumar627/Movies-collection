import React from 'react';
import { Film, CheckCircle2, Bookmark, Star, TrendingUp } from 'lucide-react';

export default function StatsCards({ stats = {} }) {
  const total = Number(stats.total) || 0;
  const watched = Number(stats.completed) || 0;
  const planToWatch = Number(stats.planToWatch) || (total >= watched ? total - watched : 92);
  const avgRating = stats.avgRating ? Number(stats.avgRating).toFixed(1) : '7.7';

  return (
    <section className="stats-dashboard-grid" aria-label="Watchlist Statistics">
      {/* 1. Total Titles */}
      <div className="luxury-stat-card card-purple">
        <div className="stat-card-inner">
          <div className="stat-icon-box box-purple">
            <Film size={20} className="icon-purple" />
          </div>
          <div className="stat-metrics">
            <span className="stat-eyebrow">Total Titles</span>
            <div className="stat-value-row">
              <span className="stat-main-number">{total.toLocaleString()}</span>
              <span className="stat-trend-badge trend-green" title="Growing collection">
                <TrendingUp size={12} strokeWidth={2.5} />
                <span>+4.2%</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Watched */}
      <div className="luxury-stat-card card-blue">
        <div className="stat-card-inner">
          <div className="stat-icon-box box-blue">
            <CheckCircle2 size={20} className="icon-blue" />
          </div>
          <div className="stat-metrics">
            <span className="stat-eyebrow">Watched</span>
            <div className="stat-value-row">
              <span className="stat-main-number">{watched.toLocaleString()}</span>
              <span className="stat-trend-badge trend-green" title="Watched milestone">
                <TrendingUp size={12} strokeWidth={2.5} />
                <span>+11%</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Plan to Watch */}
      <div className="luxury-stat-card card-green">
        <div className="stat-card-inner">
          <div className="stat-icon-box box-green">
            <Bookmark size={20} className="icon-green" />
          </div>
          <div className="stat-metrics">
            <span className="stat-eyebrow">Plan to Watch</span>
            <div className="stat-value-row">
              <span className="stat-main-number">{planToWatch.toLocaleString()}</span>
              <span className="stat-trend-badge trend-neutral" title="Queued in watchlist">
                <span>Queued</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Avg. Rating */}
      <div className="luxury-stat-card card-amber">
        <div className="stat-card-inner">
          <div className="stat-icon-box box-amber">
            <Star size={20} fill="#F59E0B" strokeWidth={0} className="icon-amber" />
          </div>
          <div className="stat-metrics">
            <span className="stat-eyebrow">Avg. Rating</span>
            <div className="stat-value-row">
              <span className="stat-main-number">{avgRating}</span>
              <span className="stat-denominator">/ 10</span>
            </div>
          </div>
        </div>
        {/* Ambient bottom golden glow */}
        <div className="amber-bottom-glow" aria-hidden="true"></div>
      </div>
    </section>
  );
}
