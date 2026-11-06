-- =============================================================
-- Watched Collection - Neon Serverless PostgreSQL Schema
-- Project: watched-collection
-- =============================================================

-- 1. Create the titles table
CREATE TABLE IF NOT EXISTS titles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Movie', -- 'Movie', 'TV Show', 'Anime', 'Documentary'
  status VARCHAR(50) NOT NULL DEFAULT 'plan_to_watch', -- 'plan_to_watch', 'watching', 'completed', 'dropped'
  genre VARCHAR(100),
  release_year INTEGER,
  rating NUMERIC(3, 1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 10),
  watched_date DATE, -- Date when the item was watched or started
  platform VARCHAR(100),
  poster_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Safe Column Addition (if table already created)
ALTER TABLE titles ADD COLUMN IF NOT EXISTS watched_date DATE;

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_titles_category ON titles(category);
CREATE INDEX IF NOT EXISTS idx_titles_status ON titles(status);
CREATE INDEX IF NOT EXISTS idx_titles_release_year ON titles(release_year);
CREATE INDEX IF NOT EXISTS idx_titles_watched_date ON titles(watched_date);

-- 4. Verification Query:
-- Run this in the Neon SQL Editor to verify your setup:
-- SELECT category, count(*) FROM titles GROUP BY category;
