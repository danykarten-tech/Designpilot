/* ==========================================================================
   DESIGNPILOT AI - BACKEND SERVER & REAL INSPIRATION API PROXY (server.js)
   ========================================================================== */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 1. Environment Configuration Loader (.env parser)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx).trim();
            const val = trimmed.substring(eqIdx + 1).trim();
            process.env[key] = val;
          }
        }
      });
    } catch (e) {
      console.warn('[Server] Could not read .env file:', e.message);
    }
  }
}

loadEnv();

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname);

// Content-Type Mapping for Static Files
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// -------------------------------------------------------------------------
// RELEVANCE RANKING ALGORITHM (calculateRelevance)
// -------------------------------------------------------------------------
function calculateRelevance(item, query) {
  if (!query) return 85;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 50;

  const textToSearch = [
    item.title,
    item.description,
    item.category,
    item.industry,
    item.style,
    item.pageType,
    ...(item.tags || [])
  ].filter(Boolean).join(' ').toLowerCase();

  let matchedCount = 0;
  terms.forEach(term => {
    if (textToSearch.includes(term)) {
      matchedCount++;
      score += 15;
    }
  });

  // Exact query match bonus
  if (textToSearch.includes(query.toLowerCase())) {
    score += 20;
  }

  // Title match bonus
  const titleLower = (item.title || '').toLowerCase();
  terms.forEach(term => {
    if (titleLower.includes(term)) {
      score += 10;
    }
  });

  return Math.min(99, Math.max(45, score));
}

// -------------------------------------------------------------------------
// ENVATO RESULT NORMALIZATION
// -------------------------------------------------------------------------
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
}

function normalizeEnvatoItem(item, query) {
  const previews = item.previews || {};
  
  // 1. Extract Preview & Thumbnail Images
  const previewImage = (previews.icon_with_landscape_preview && previews.icon_with_landscape_preview.landscape_url) ||
                       (previews.landscape_preview && previews.landscape_preview.landscape_url) ||
                       (previews.large_landing_page_preview && previews.large_landing_page_preview.large_landing_page_url) ||
                       (previews.icon_with_square_preview && previews.icon_with_square_preview.square_url) || null;

  const thumbnailImage = (previews.icon_with_square_preview && previews.icon_with_square_preview.square_url) ||
                         (previews.icon_with_landscape_preview && previews.icon_with_landscape_preview.icon_url) ||
                         previewImage;

  // 2. Extract Destination URLs (URL Rule)
  let originalUrl = null;
  if (previews.live_site && previews.live_site.url) {
    originalUrl = previews.live_site.url;
  } else if (item.attributes && Array.isArray(item.attributes)) {
    const liveAttr = item.attributes.find(a => a.name === 'live_preview_url' || a.name === 'live-preview-url');
    if (liveAttr && liveAttr.value) originalUrl = liveAttr.value;
  }

  const sourceUrl = item.url || null;

  // 3. Extract Tags & Category Metadata
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const classification = item.classification || 'site-templates';
  
  // Categorization & Page Type derived from classification
  let pageType = 'Website Template';
  if (classification.includes('wordpress')) pageType = 'WordPress Theme';
  else if (classification.includes('ui') || classification.includes('graphics')) pageType = 'UI Asset';
  else if (classification.includes('site-templates')) pageType = 'HTML Template';

  let category = 'Ecommerce';
  if (query.toLowerCase().includes('saas') || classification.includes('corporate')) category = 'SaaS';
  else if (query.toLowerCase().includes('portfolio')) category = 'Portfolio';
  else if (query.toLowerCase().includes('luxury') || query.toLowerCase().includes('fashion')) category = 'Fashion';
  else if (query.toLowerCase().includes('fintech') || query.toLowerCase().includes('dashboard')) category = 'Dashboard';

  const cleanDescription = stripHtml(item.description).substring(0, 160) + '...';

  const normalized = {
    id: `envato-${item.id}`,
    title: item.name || 'Envato Design Template',
    sourceName: 'Envato',
    sourceUrl: sourceUrl,
    originalUrl: originalUrl,
    previewImage: previewImage,
    thumbnailImage: thumbnailImage,
    description: cleanDescription,
    category: category,
    industry: query || 'Web Design',
    style: 'Modern',
    pageType: pageType,
    tags: tags.slice(0, 8),
    relevanceScore: 80,
    isDemo: false
  };

  normalized.relevanceScore = calculateRelevance(normalized, query);
  return normalized;
}

// -------------------------------------------------------------------------
// SERVER-TO-SERVER ENVATO API SEARCH
// -------------------------------------------------------------------------
function searchEnvatoApi(query) {
  return new Promise((resolve) => {
    const token = (process.env.ENVATO_API_TOKEN || '').trim();
    if (!token) {
      return resolve({
        status: 'unconfigured',
        error: 'Live inspiration search is not configured.',
        message: 'ENVATO_API_TOKEN environment variable is missing. Please configure ENVATO_API_TOKEN in .env file.',
        results: []
      });
    }

    const apiUrl = `https://api.envato.com/v1/discovery/search/search/item?site=themeforest.net&term=${encodeURIComponent(query)}`;
    const parsedUrl = url.parse(apiUrl);

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'DesignPilot/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 401 || res.statusCode === 403) {
          return resolve({
            status: 'unconfigured',
            error: 'Live inspiration search is not configured.',
            message: 'Invalid or unauthorized Envato API token.',
            results: []
          });
        }

        if (res.statusCode === 429) {
          return resolve({
            status: 'rate_limited',
            error: 'Search limit reached. Please try again shortly.',
            results: []
          });
        }

        if (res.statusCode !== 200) {
          return resolve({
            status: 'error',
            error: 'Inspiration source temporarily unavailable.',
            message: `Envato API returned HTTP status ${res.statusCode}`,
            results: []
          });
        }

        try {
          const json = JSON.parse(data);
          const rawItems = json.matches || json.items || [];
          
          let results = rawItems.map(item => normalizeEnvatoItem(item, query));
          // Rank by calculated relevance score descending
          results.sort((a, b) => b.relevanceScore - a.relevanceScore);

          return resolve({
            status: 'success',
            isLiveConfigured: true,
            provider: 'Envato',
            results: results
          });
        } catch (err) {
          return resolve({
            status: 'error',
            error: 'Inspiration source temporarily unavailable.',
            message: 'Failed to parse provider response payload',
            results: []
          });
        }
      });
    });

    req.on('error', (err) => {
      return resolve({
        status: 'error',
        error: 'Inspiration source temporarily unavailable.',
        message: err.message,
        results: []
      });
    });

    req.end();
  });
}

// -------------------------------------------------------------------------
// SERVER ENDPOINT HANDLER (/api/inspiration/search)
// -------------------------------------------------------------------------
async function handleApiSearch(req, res) {
  let body = '';
  
  const finish = async (query, filters, useDemoFlag) => {
    const isDemoMode = process.env.USE_DEMO_INSPIRATION === 'true' || useDemoFlag === true;

    if (isDemoMode) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'demo_mode',
        isLiveConfigured: false,
        useDemo: true,
        message: 'Demo mode active via USE_DEMO_INSPIRATION=true switch',
        query,
        filters
      }));
    }

    const envatoToken = (process.env.ENVATO_API_TOKEN || '').trim();
    if (!envatoToken) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'unconfigured',
        isLiveConfigured: false,
        error: 'Live inspiration search is not configured.',
        message: 'ENVATO_API_TOKEN environment variable is missing. Set token in .env file to enable live search.',
        query,
        filters,
        results: []
      }));
    }

    // Call live Envato API
    const apiResult = await searchEnvatoApi(query || 'footwear ecommerce');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(apiResult));
  };

  if (req.method === 'GET') {
    const parsed = url.parse(req.url, true);
    const query = parsed.query.query || '';
    const useDemo = parsed.query.useDemo === 'true';
    return finish(query, parsed.query, useDemo);
  }

  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    let payload = {};
    try {
      payload = JSON.parse(body || '{}');
    } catch (e) {}

    const query = payload.query || '';
    const filters = payload.filters || {};
    const useDemo = payload.useDemo;

    return finish(query, filters, useDemo);
  });
}

// -------------------------------------------------------------------------
// HTTP SERVER CREATION
// -------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;

  // Handle API Endpoint (GET or POST)
  if (pathname === '/api/inspiration/search' && (req.method === 'POST' || req.method === 'GET')) {
    return handleApiSearch(req, res);
  }

  // Handle Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(500);
        res.end('Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`DesignPilot Server running at http://localhost:${PORT}`);
    console.log(`API Search Endpoint: http://localhost:${PORT}/api/inspiration/search`);
    console.log(`ENVATO_API_TOKEN status: ${process.env.ENVATO_API_TOKEN ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
    console.log(`USE_DEMO_INSPIRATION switch: ${process.env.USE_DEMO_INSPIRATION || 'false'}`);
    console.log(`==================================================`);
  });
}

module.exports = server;
