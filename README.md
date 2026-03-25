# 🐔 The Coop Counter — Egg Tracker

A fun, family-friendly dashboard to track your backyard chicken egg production.

## Features

- **Daily egg logging** with +/- stepper or type-in
- **Stats at a glance** — annual total, weekly/monthly averages, best day
- **Egg basket** that visually fills up as your count grows
- **Egg stack chart** — stacked eggs per month
- **Chicken of the Week** — rotating spotlight with positive affirmations
- **Milestone badges** — earn badges at 10, 50, 100, 250, 500, 1K+ eggs
- **Flock management** — add/remove your chickens by name
- **Weather & season** — enter your zip code to see local temp and season
- **Dark mode** by default (toggle available)

## Deploy to Railway (Recommended — Free)

### Step 1: Push to GitHub

1. Go to [github.com/new](https://github.com/new) and create a new repo called `coop-counter` (or whatever you want)
2. Make it **Public** or **Private** — either works
3. Don't add a README or .gitignore (this project already has both)
4. After creating the repo, GitHub will show you commands. Run these in the project folder:

```bash
git remote add origin https://github.com/YOUR_USERNAME/coop-counter.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign in with your GitHub account
2. Click **"New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Select your `coop-counter` repo
5. Railway will auto-detect it as a Node.js app. Click **Deploy**
6. Once deployed, go to **Settings → Networking → Generate Domain** to get your public URL

That's it. Railway runs `npm install`, `npm run build`, and `npm start` automatically.

### Step 3: Initialize the Database

After the first deploy, open Railway's terminal (click on your service → **Shell**) and run:

```bash
npx drizzle-kit push
```

This creates the SQLite database tables. You only need to do this once.

### Done!

Your app is now live at your Railway URL. Share it with anyone — they can open it in any browser.

**Note:** Railway's free tier gives you 500 hours/month of execution time and $5 of resources, which is plenty for a personal app like this.

## Local Development

```bash
npm install
npx drizzle-kit push
npm run dev
```

App runs at **http://localhost:5000**

## Tech Stack

- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + SQLite (via Drizzle ORM)
- **Weather**: Open-Meteo API (free, no key needed)
- **Built with**: [Perplexity Computer](https://www.perplexity.ai/computer)
