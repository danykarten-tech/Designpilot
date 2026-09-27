# DesignPilot AI - Inspiration Workspace

DesignPilot AI is a modern creative workspace for UI/UX designers to search, explore, and analyze live web design inspiration from top providers (such as Envato Market) and curated design references.

## Features

- **Live Inspiration Search**: Query live design templates and website inspirations.
- **Normalized Data Pipeline**: Standardized cards displaying real title, preview thumbnail, source badge, category tags, and relevance score.
- **Smart Query & Typo Tolerance**: Handles fuzzy search queries and intent parsing (e.g., `footware` -> `footwear`).
- **Direct External Links**: Interactive `Visit Website ↗` and `View Source ↗` actions opening destinations safely in new tabs.
- **Dark Theme UI**: Charcoal dark aesthetic (`#0D0E10`) designed for UI/UX professionals.
- **AI Design Panel**: Collapsible side panel for analyzing design patterns and layout structures.

## Setup & Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/danykarten-tech/Designpilot.git
   cd Designpilot
   ```

2. Configure Environment Variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Add your `ENVATO_API_TOKEN` to `.env` for server-side live search.

3. Start the application server:
   ```bash
   node server.js
   ```
   Open `http://localhost:8080` in your browser.

## Deployment

Deployed on Vercel with serverless API route support.
