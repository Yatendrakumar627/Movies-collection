# 🎬 Watched - Media & Watchlist Collection (React + Vite + Neon DB)

A modern full-stack media tracker and personal watchlist application built with **React, Vite, Node.js**, and **Neon Serverless PostgreSQL**.

---

## ⚡ NEON DATABASE SETUP (Click-by-Click Guide)

Follow these exact steps to set up your Neon Serverless PostgreSQL database:

### 1. Sign Up on Neon
- Open your browser and go to [console.neon.tech](https://console.neon.tech).
- Sign up for a free account (no credit card required).

### 2. Create the Project
- Click **"Create Project"**.
- Name the project: **`watched-collection`**.
- **Region Selection (Nearest to Delhi, India):**
  - Choose **Asia Pacific (Singapore) `ap-southeast-1`** (or **Asia Pacific (Mumbai) `ap-south-1`** if listed in your Neon AWS region dropdown).
  - *Note: Singapore offers optimal low-latency routing (~40–60ms from North India).*
- Click **"Create project"**.

### 3. Initialize the Database Schema
- In your Neon project console, click **"SQL Editor"** from the left navigation bar.
- Open the [`schema.sql`](file:///c:/Users/pc/Desktop/Updated%20All%20Woking%20Projects/Deployed%20-%20Final/Watched/schema.sql) file from this repository.
- Copy the entire SQL content, paste it into the Neon SQL Editor, and click **"Run"** (or press `Ctrl + Enter` / `Cmd + Enter`).
- You will see a success notification confirming that the `titles` table and indexes were created.

### 4. Copy the Pooled Connection String
- Click on **"Dashboard"** (or **"Connect"** at the top right of the Neon console).
- Under the **Connection Details** modal:
  - Branch: Select **`main`** (or **`dev`** for local testing).
  - Database: **`neondb`**.
  - Role/User: Your default user.
  - **Connection type:** Ensure **"Pooled connection"** is toggled ON (the hostname will include `-pooler`, e.g., `ep-...-pooler.region.aws.neon.tech`).
- Click **"Copy"** to copy the connection string.
- *Security Rule: Never share or paste your connection string or database password into chat, public issues, or git repositories.*

### 5. Configure Local Environment
- Create a file named `.env` in the project root:
  ```env
  DATABASE_URL=postgresql://your_user:your_password@ep-something-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
  ADMIN_PASSWORD=your_secure_admin_password
  SESSION_SECRET=your_32_char_random_secret_string
  ```

### 6. Verify Database Setup
- Go back to the **SQL Editor** in Neon and run:
  ```sql
  SELECT category, count(*) FROM titles GROUP BY category;
  ```
- It should return 0 rows initially (or your imported rows after running the import script).

---

## 🌿 Neon Branching Workflow

Neon provides instant, zero-copy database branching. Use branching to isolate development and testing from production:

| Branch | Purpose | Environment | Connection String |
|---|---|---|---|
| **`main`** | Production | Vercel Production deployment | `main` Pooled connection string |
| **`dev`** | Development & Test | Local machine (`.env`) & Vercel Preview | `dev` Pooled connection string |

### How to Create the `dev` Branch in Neon:
1. In the Neon Console left sidebar, click **"Branches"**.
2. Click **"+ New Branch"**.
3. Set **Branch Name**: `dev`.
4. Set **Parent Branch**: `main`.
5. Click **"Create Branch"**.
6. Switch to the `dev` branch in the top branch selector, click **"Connect"**, and copy its pooled connection string.
7. Paste this string into your local `.env` file. Now any test imports, updates, or resets will not affect your production database.

---

## 🔑 Environment Variables & Vercel Deployment

### Required Environment Variables:
- **`DATABASE_URL`**: Pooled PostgreSQL connection string from Neon.
- **`ADMIN_PASSWORD`**: Strong password for admin tasks.
- **`SESSION_SECRET`**: Random secret key for session verification.

*See [`.env.example`](file:///c:/Users/pc/Desktop/Updated%20All%20Woking%20Projects/Deployed%20-%20Final/Watched/.env.example) for placeholder definitions. All `.env*` files are safely excluded in [`.gitignore`](file:///c:/Users/pc/Desktop/Updated%20All%20Woking%20Projects/Deployed%20-%20Final/Watched/.gitignore).*

### How to Set Variables in Vercel:
1. Push your repository to GitHub / GitLab.
2. In the [Vercel Dashboard](https://vercel.com), click **"Add New Project"** and import your repository.
3. In **Settings -> Environment Variables**:
   - Add `DATABASE_URL`:
     - Select **Production** environment: Paste your Neon **`main`** branch connection string.
     - Select **Preview** and **Development** environments: Paste your Neon **`dev`** branch connection string.
   - Add `ADMIN_PASSWORD` and `SESSION_SECRET`.
4. Click **Deploy**.

---

## 💻 Database Code Architecture

- **Shared Database Client (`/api/_db.js`)**:
  - Uses `neon()` from `@neondatabase/serverless` over WebSockets/HTTPS.
  - **100% Parameterized Queries**: Every user input is passed as parameters (`$1, $2, ...`) to eliminate SQL injection risks.
- **Scale-to-Zero Wake-Up Retry**:
  - Neon's free tier automatically suspends compute after 5 minutes of idle time and wakes upon the next query.
  - [`api/_db.js`](file:///c:/Users/pc/Desktop/Updated%20All%20Woking%20Projects/Deployed%20-%20Final/Watched/api/_db.js) wraps queries in an automatic retry handler (`withRetry`). If a cold-start timeout occurs, it waits ~900ms and retries once automatically.
  - The UI displays an interactive loading spinner so the user experiences zero errors during compute wake-up.
- **Health Endpoint (`/api/health`)**:
  - Runs `SELECT 1;` against the database.
  - Returns strictly `{ "ok": true }` (HTTP 200) or `{ "ok": false }` (HTTP 503).
  - Leaks zero internal database error messages or credentials.

---

## 📥 Data Import Script (`scripts/import.js`)

A CLI script to import titles from JSON into Neon:

```bash
# 1. Validate & simulate without writing to database (Dry Run)
npm run import -- --dry-run

# 2. Re-import on your dev branch (cleans and reloads titles)
npm run import -- --reset

# 3. Import specific file
node scripts/import.js --file ./data/sample-titles.json

# 4. Production Guard (Required if target URL is the main/production branch)
npm run import -- --confirm-prod
```

### Import Features:
- **Atomic Transaction**: All records are validated and committed inside a single transaction batch.
- **Category Summary**: Prints clean row counts grouped by category (*Movie, TV Show, Anime, Documentary*).
- **Skipped Rows Log**: Lists every invalid row (e.g. missing title, ratings outside 0–10) with the exact line number and reason.
- **Production Guard**: Prevents accidental overwrites on the `main` branch unless `--confirm-prod` is explicitly passed.

---

## 💾 Backups (`scripts/backup.js`)

Because Neon's Free Plan provides a 24-hour Point-In-Time Restore (PITR) window, run the backup command to create persistent local snapshots:

```bash
npm run backup
```

### How It Works:
- Queries the entire `titles` table.
- Exports two files to the [`backups/`](file:///c:/Users/pc/Desktop/Updated%20All%20Woking%20Projects/Deployed%20-%20Final/Watched/backups) folder:
  1. `titles_YYYY-MM-DD_HH-mm-ss.json` (Structured JSON)
  2. `titles_YYYY-MM-DD_HH-mm-ss.csv` (RFC 4180 compliant CSV)

### Recommended Frequency:
- **Before running schema updates or large batch imports**: Run `npm run backup` as a safety checkpoint.
- **Weekly / Monthly**: Run manually or schedule via a cron/task scheduler.

---

## 📊 Excel Spreadsheet Export (`scripts/export-excel.js`)

Exports your entire watchlist into a formatted `.xlsx` workbook that mirrors the multi-column categorized spreadsheet pattern:

```bash
# 1. Export via npm script
npm run export

# 2. Or export to a custom path:
node scripts/export-excel.js --out "my_export.xlsx"
```

### Export Features & Pattern:
- **Exact Layout Matching:**
  - **Row 1:** Merged Category headers with soft pastel blue fill (`#D0E0E3`), Lobster cursive font (`16pt`).
  - **Row 2:** Sub-headers: `Name`, `Year`, `Star`, `Watch Date` for each category.
  - **Row 3+:** All titles categorized side-by-side (`Bollywood`, `Hollywood`, `Web series`, `South`, `To Watch`, `Old Collection`, `Uploaded Movies`, `Uploaded Web series`).
  - **Separators:** Blank spacer columns between categories.
  - **Pinned Navigation:** Frozen top 2 header rows and auto-formatted dates and stars.
- **Web UI & API Integration:**
  - Click the **"Export Excel"** button in the header toolbar.
  - Or hit the REST endpoint: `GET /api/export/excel`.

---

## 📊 Neon Free-Plan Limits & Monitoring

| Resource | Free Tier Quota | What Happens If Exceeded? |
|---|---|---|
| **Storage Cap** | **0.5 GiB (500 MB)** per project | Database enters read-only mode until storage is freed or upgraded. |
| **Compute Hours** | **100 CU-hours / month** (~191 active hours) | Compute pauses until the monthly billing cycle resets. |
| **Autosuspend** | **5 minutes** | Compute scales to 0 when idle to conserve your monthly hours. Wakes automatically on next query. |
| **History Retention** | **24 hours** | Point-in-time branch restores are limited to the past 24 hours (use `npm run backup` for long-term retention). |

> **Note on Storage:** A collection of 10,000 titles with notes and poster URLs occupies less than **10 MB** (< 2% of the free quota). Your data is very small, so you will stay comfortably within free limits.

### Where to Monitor Usage:
1. Log in to [console.neon.tech](https://console.neon.tech).
2. Select your project **`watched-collection`**.
3. In the left menu, click **Project Settings** -> **Usage / Billing**.
4. You can see real-time gauges for **Data Storage**, **Written Data**, and **Compute Time**.

---

## 🚀 Local Development Quickstart (React + Vite + Neon DB)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
# Copy .env.example to .env and add your Neon connection string:
cp .env.example .env

# 3. Start development server (Launches both Vite React frontend & Express Neon API)
npm run dev

# 4. Open in browser
# Visit http://localhost:5173 for Vite development (with Hot Module Replacement)
# Or run 'npm run build' && 'npm start' to run the production build on http://localhost:3001
```
