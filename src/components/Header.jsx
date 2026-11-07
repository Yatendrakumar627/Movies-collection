import React, { useRef, useEffect, useState } from 'react';
import { Search, Bell, Moon, Sun, Plus, FileSpreadsheet } from 'lucide-react';

function BrandNeonEmblem() {
  return (
    <svg
      viewBox="0 0 128 128"
      className="brand-neon-emblem"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="badge-bg-glow" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#241430" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#120B1A" stopOpacity="0.98" />
          <stop offset="100%" stopColor="#07050B" stopOpacity="1" />
        </radialGradient>
        <radialGradient id="badge-ambient-cyan" cx="20%" cy="80%" r="50%">
          <stop offset="0%" stopColor="#2FA98C" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#2FA98C" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="badge-ambient-magenta" cx="70%" cy="30%" r="55%">
          <stop offset="0%" stopColor="#E8C87A" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#E8C87A" stopOpacity="0" />
        </radialGradient>
        <filter id="badge-neon-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="blur1" />
          <feGaussianBlur stdDeviation="2.5" result="blur2" />
          <feMerge>
            <feMergeNode in="blur1" />
            <feMergeNode in="blur2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="4" y="4" width="120" height="120" rx="30" fill="url(#badge-bg-glow)" stroke="#E8C87A" strokeOpacity="0.32" strokeWidth="1.5" />
      <rect x="4" y="4" width="120" height="120" rx="30" fill="url(#badge-ambient-cyan)" />
      <rect x="4" y="4" width="120" height="120" rx="30" fill="url(#badge-ambient-magenta)" />
      <g filter="url(#badge-neon-glow)">
        <polygon points="46,38 88,64 46,90" fill="none" stroke="#B58A3C" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        <polygon points="46,38 88,64 46,90" fill="none" stroke="#E8C87A" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <polygon points="46,38 88,64 46,90" fill="none" stroke="#FFF9EC" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export default function Header({
  search,
  onSearchChange,
  onOpenAdd,
  onOpenAbout,
  onExportExcel,
  userName = 'Yatendra',
  theme = 'dark',
  onToggleTheme
}) {
  const searchInputRef = useRef(null);
  const isDark = theme === 'dark';
  const [greeting, setGreeting] = useState('Good Evening');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    // Global keyboard shortcut: Ctrl+K or / focuses search
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchInputRef.current) searchInputRef.current.focus();
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (searchInputRef.current) searchInputRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="hero-cinema-header">
      {/* Background Cinematic Atmosphere */}
      <div className="hero-backdrop-graphic" aria-hidden="true">
        <div className="cinema-neon-bg-layer" style={{ backgroundImage: 'url(/cinema-neon-banner.jpg)' }}></div>
        <div className="cinema-glow-orb orb-purple"></div>
        <div className="cinema-glow-orb orb-amber"></div>
        <div className="cinema-clapper-art">
          <svg viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="clapper-svg">
            <defs>
              <linearGradient id="popcornGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E8C87A" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#B58A3C" stopOpacity="0.3" />
              </linearGradient>
              <linearGradient id="neonPlay" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F4E3B2" />
                <stop offset="100%" stopColor="#B58A3C" />
              </linearGradient>
            </defs>
            {/* Clapperboard representation */}
            <path d="M40 70 L210 30 L225 65 L55 105 Z" fill="#22162E" stroke="rgba(232,200,122,0.28)" strokeWidth="2" />
            <path d="M40 100 L210 60 L210 170 L40 170 Z" fill="#120C1A" stroke="rgba(232,200,122,0.22)" strokeWidth="2" />
            {/* Clapper stripes */}
            <path d="M60 65 L75 62 L65 83 L50 86 Z" fill="rgba(247,240,227,0.72)" />
            <path d="M100 56 L115 53 L105 74 L90 77 Z" fill="rgba(247,240,227,0.72)" />
            <path d="M140 47 L155 44 L145 65 L130 68 Z" fill="rgba(247,240,227,0.72)" />
            <path d="M180 38 L195 35 L185 56 L170 59 Z" fill="rgba(247,240,227,0.72)" />
            {/* Glowing Neon Play Emblem */}
            <polygon points="120,105 150,122 120,139" fill="url(#neonPlay)" filter="drop-shadow(0 0 12px rgba(232,200,122,0.85))" />
            {/* Cinema Popcorn box */}
            <path d="M210 85 L275 85 L265 170 L220 170 Z" fill="#5C1F32" stroke="rgba(232,200,122,0.35)" strokeWidth="2" />
            <path d="M222 85 L229 170 M242 85 L242 170 M256 85 L252 170" stroke="#D8C08A" strokeWidth="6" />
            <circle cx="225" cy="75" r="14" fill="#E8C87A" opacity="0.9" />
            <circle cx="245" cy="68" r="16" fill="#F4E3B2" opacity="0.95" />
            <circle cx="265" cy="74" r="15" fill="#D8C08A" opacity="0.9" />
            <circle cx="235" cy="60" r="13" fill="#FFF6D8" />
            <circle cx="255" cy="58" r="14" fill="#E8C87A" />
          </svg>
        </div>
      </div>

      <div className="hero-header-content">
        {/* Top Navigation Row: Greeting & Universal Top Bar */}
        <div className="hero-top-row">
          <div className="hero-greeting-block">
            <div className="hero-brand-badge">
              <span className="brand-badge-icon">
                <BrandNeonEmblem />
              </span>
              <span className="brand-badge-text">WATCHED CINEMA</span>
              <span className="brand-badge-tag">JOURNAL</span>
            </div>
            <h1 className="hero-greeting-title">
              {greeting},{' '}
              <span className="hero-name-gradient">{userName}</span>{' '}
              <span className="hero-wave" role="img" aria-label="wave">👋</span>
            </h1>
            <p className="hero-subtitle">
              Track what you watch, rate it, and build your personal cinema universe.
            </p>
          </div>

          {/* Top Right Actions & Quick Search */}
          <div className="hero-actions-block">
            {/* Global Search with Ctrl+K Badge */}
            <div className="hero-search-box">
              <Search className="hero-search-icon" size={17} />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search movies, series, actors, genres..."
                aria-label="Search titles"
              />
              {search ? (
                <button
                  type="button"
                  className="hero-search-clear"
                  onClick={() => onSearchChange('')}
                  title="Clear search"
                >
                  ✕
                </button>
              ) : (
                <kbd className="hero-search-shortcut" title="Press Ctrl+K or / to search">
                  Ctrl K
                </kbd>
              )}
            </div>

            {/* Notification Bell */}
            <button
              type="button"
              className="circle-glass-btn has-notification"
              title="Notifications"
              aria-label="View notifications"
              onClick={onOpenAbout}
            >
              <Bell size={17} />
              <span className="notification-dot" aria-hidden="true"></span>
            </button>

            {/* Theme / Dark Mode Button */}
            <button
              type="button"
              className={`circle-glass-btn theme-toggle-btn ${!isDark ? 'is-light' : ''}`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              onClick={onToggleTheme}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Moon size={17} />
              ) : (
                <Sun size={17} className="sun-icon-gold" />
              )}
            </button>

            {/* Export Excel Button */}
            <button
              type="button"
              className="btn btn-secondary btn-hero-export"
              onClick={onExportExcel}
              title="Export spreadsheet in original multi-column pattern"
            >
              <FileSpreadsheet size={16} />
              <span>Export</span>
            </button>

            {/* Add Title Button */}
            <button
              type="button"
              className="btn btn-primary btn-hero-add"
              onClick={onOpenAdd}
              title="Add a new title"
            >
              <Plus size={18} strokeWidth={2.5} />
              <span>Add Title</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
