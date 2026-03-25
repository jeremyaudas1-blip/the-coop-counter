# 🐔 The Coop Counter — Egg Tracker

A fun, family-friendly dashboard to track your backyard chicken egg production.

## Features

- **Daily egg logging** with +/- stepper or type-in
- **Stats at a glance** — annual total, weekly/monthly averages, best day
- **Egg basket** that visually fills up as your count grows
- **Egg stack chart** — stacked eggs per month instead of boring bars
- **Chicken of the Week** — rotating spotlight with positive affirmations
- **Milestone badges** — earn badges at 10, 50, 100, 250, 500, 1K+ eggs
- **Flock management** — add/remove your chickens by name
- **Weather & season** — enter your zip code to see local temp and season
- **Dark mode** by default (toggle available)

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Create the database
npx drizzle-kit push

# 3. Start the app
npm run dev
```

The app will be running at **http://localhost:5000**

### Production Build

```bash
# Build for production
npm run build

# Start production server
NODE_ENV=production node dist/index.cjs
```

## Hosting Options

### Raspberry Pi (great for a coop project!)

1. Install Node.js on your Pi: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`
2. Copy this folder to your Pi
3. Run the Quick Start steps above
4. Access from any device on your home network at `http://<pi-ip>:5000`

### Railway / Render / Fly.io (free cloud hosting)

1. Push this folder to a GitHub repo
2. Connect it to Railway, Render, or Fly.io
3. Set the start command to: `npm run build && NODE_ENV=production node dist/index.cjs`
4. The `data.db` SQLite file stores all your data

## Tech Stack

- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + SQLite (via Drizzle ORM)
- **Weather**: Open-Meteo API (free, no key needed)
- **Built with**: [Perplexity Computer](https://www.perplexity.ai/computer)
