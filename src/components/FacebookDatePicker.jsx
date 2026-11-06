import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, X } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function FacebookDatePicker({ value, onChange, placeholder = 'dd-mm-yyyy', id = 'facebook-datepicker' }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0, placement: 'bottom' });

  // Parse initial date or default to current date
  const parsedDate = value ? new Date(value + (value.length === 10 ? 'T00:00:00' : '')) : null;
  const initialYear = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getFullYear() : new Date().getFullYear();
  const initialMonth = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getMonth() : new Date().getMonth();

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const [showMonthSelect, setShowMonthSelect] = useState(false);

  // Sync view year/month when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + (value.length === 10 ? 'T00:00:00' : ''));
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Recalculate fixed portal coordinates with auto-flip and viewport collision clamping
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 250;
    const popoverHeight = 286;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let placement = 'bottom';
    let top = rect.bottom + 6;

    // Auto-flip if not enough room below but enough room above
    if (spaceBelow < popoverHeight && spaceAbove > popoverHeight) {
      placement = 'top';
      top = rect.top - popoverHeight - 6;
    } else if (spaceBelow < popoverHeight && spaceAbove <= popoverHeight) {
      if (spaceAbove > spaceBelow) {
        placement = 'top';
        top = Math.max(10, rect.top - popoverHeight - 6);
      } else {
        top = Math.min(rect.bottom + 6, window.innerHeight - popoverHeight - 10);
      }
    }

    // Align with the right edge of input, clamped to viewport boundaries
    let left = rect.right - popoverWidth;
    const minPadding = 10;
    if (left < minPadding) {
      left = minPadding;
    }
    if (left + popoverWidth > window.innerWidth - minPadding) {
      left = window.innerWidth - popoverWidth - minPadding;
    }

    setPopoverCoords({ top, left, placement });
  };

  // Position updates and outside-click dismiss listeners
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target)
      ) {
        setIsOpen(false);
        setShowMonthSelect(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Navigate to previous month
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  // Navigate to next month
  const handleNextMonth = (e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Select a specific date
  const handleSelectDate = (year, month, day) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${year}-${mm}-${dd}`);
    setIsOpen(false);
    setShowMonthSelect(false);
  };

  // Handle Today action
  const handleToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    setViewYear(y);
    setViewMonth(m);
    handleSelectDate(y, m, d);
  };

  // Handle Clear action
  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
    setShowMonthSelect(false);
  };

  // Generate calendar days
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  // Selected date components
  let selectedY = null, selectedM = null, selectedD = null;
  if (value) {
    const parts = value.split('-');
    if (parts.length === 3) {
      selectedY = parseInt(parts[0], 10);
      selectedM = parseInt(parts[1], 10) - 1;
      selectedD = parseInt(parts[2], 10);
    }
  }

  // Display text in the input
  const getDisplayText = () => {
    if (!value) return '';
    try {
      const [y, m, d] = value.split('-');
      if (y && m && d) {
        return `${d}/${m}/${y}`;
      }
      return value;
    } catch {
      return value;
    }
  };

  // Year options for quick select (1960 to 2035)
  const years = [];
  for (let y = 1960; y <= 2035; y++) {
    years.push(y);
  }

  return (
    <div className="fb-datepicker-wrapper">
      {/* Trigger Input Display */}
      <div
        ref={triggerRef}
        className={`fb-datepicker-input ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
        role="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={value ? 'fb-datepicker-val' : 'fb-datepicker-placeholder'}>
          {value ? getDisplayText() : placeholder}
        </span>
        <div className="fb-datepicker-icons">
          {value && (
            <button
              type="button"
              className="fb-datepicker-clear-icon"
              onClick={(e) => {
                e.stopPropagation();
                handleClear(e);
              }}
              title="Clear date"
              aria-label="Clear date"
            >
              <X size={13} />
            </button>
          )}
          <CalendarIcon size={16} className="fb-datepicker-cal-icon" />
        </div>
      </div>

      {/* Facebook Datepicker Popover - Portaled to document.body to prevent ANY modal/overflow clipping */}
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            className={`fb-datepicker-popover fb-portal-popover placement-${popoverCoords.placement}`}
            style={{
              position: 'fixed',
              top: `${popoverCoords.top}px`,
              left: `${popoverCoords.left}px`,
              zIndex: 999999,
            }}
            role="dialog"
            aria-label="Date Picker"
            onClick={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="fb-datepicker-header">
              <button
                type="button"
                className="fb-datepicker-month-title"
                onClick={() => setShowMonthSelect(!showMonthSelect)}
                title="Switch Month/Year"
              >
                <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
                <span className="fb-dropdown-arrow">▾</span>
              </button>

              <div className="fb-datepicker-nav-buttons">
                <button
                  type="button"
                  className="fb-datepicker-nav-btn"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                  aria-label="Previous Month"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="fb-datepicker-nav-btn"
                  onClick={handleNextMonth}
                  title="Next Month"
                  aria-label="Next Month"
                >
                  ↓
                </button>
              </div>
            </div>

            {/* Quick Month & Year Dropdown Selector */}
            {showMonthSelect ? (
              <div className="fb-month-year-dropdown-panel">
                <div className="fb-dropdown-cols">
                  <div className="fb-dropdown-col">
                    <div className="fb-col-label">Month</div>
                    <div className="fb-col-scroll">
                      {MONTH_NAMES.map((name, idx) => (
                        <button
                          key={name}
                          type="button"
                          className={`fb-dropdown-opt ${idx === viewMonth ? 'selected' : ''}`}
                          onClick={() => {
                            setViewMonth(idx);
                            setShowMonthSelect(false);
                          }}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="fb-dropdown-col">
                    <div className="fb-col-label">Year</div>
                    <div className="fb-col-scroll">
                      {years.map((y) => (
                        <button
                          key={y}
                          type="button"
                          className={`fb-dropdown-opt ${y === viewYear ? 'selected' : ''}`}
                          onClick={() => {
                            setViewYear(y);
                            setShowMonthSelect(false);
                          }}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Day of Week Row */}
                <div className="fb-datepicker-weekdays">
                  {WEEK_DAYS.map((wd) => (
                    <div key={wd} className="fb-datepicker-weekday">
                      {wd}
                    </div>
                  ))}
                </div>

                {/* Day Grid */}
                <div className="fb-datepicker-grid">
                  {/* 1. Trailing days of previous month */}
                  {Array.from({ length: startDayOfWeek }).map((_, i) => {
                    const dayNum = prevMonthDays - startDayOfWeek + 1 + i;
                    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
                    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
                    return (
                      <button
                        key={`prev-${i}`}
                        type="button"
                        className="fb-datepicker-day out-of-month"
                        onClick={() => handleSelectDate(prevYear, prevMonth, dayNum)}
                      >
                        {dayNum}
                      </button>
                    );
                  })}

                  {/* 2. Days of current month */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const isSelected =
                      selectedY === viewYear &&
                      selectedM === viewMonth &&
                      selectedD === dayNum;

                    return (
                      <button
                        key={`cur-${dayNum}`}
                        type="button"
                        className={`fb-datepicker-day in-month ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectDate(viewYear, viewMonth, dayNum)}
                      >
                        {dayNum}
                      </button>
                    );
                  })}

                  {/* 3. Leading days of next month */}
                  {(() => {
                    const totalSlots = startDayOfWeek + daysInMonth;
                    const targetSlots = totalSlots > 35 ? 42 : 35;
                    const nextDaysCount = targetSlots - totalSlots;
                    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
                    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

                    return Array.from({ length: nextDaysCount }).map((_, i) => {
                      const dayNum = i + 1;
                      return (
                        <button
                          key={`next-${dayNum}`}
                          type="button"
                          className="fb-datepicker-day out-of-month"
                          onClick={() => handleSelectDate(nextYear, nextMonth, dayNum)}
                        >
                          {dayNum}
                        </button>
                      );
                    });
                  })()}
                </div>

                {/* Footer */}
                <div className="fb-datepicker-footer">
                  <button
                    type="button"
                    className="fb-datepicker-action-btn fb-clear-btn"
                    onClick={handleClear}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="fb-datepicker-action-btn fb-today-btn"
                    onClick={handleToday}
                  >
                    Today
                  </button>
                </div>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
