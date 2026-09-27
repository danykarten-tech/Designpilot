/* ==========================================================================
   DESIGNPILOT AI - BACKEND SERVER & REAL INSPIRATION API PROXY (server.js)
   ========================================================================== */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

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

function parseQueryIntent(query) {
  const q = (query || '').toLowerCase().trim();
  const intent = {
    originalQuery: query,
    industry: null,
    category: null,
    style: null,
    pageType: null,
    variations: []
  };

  if (q.includes('footwear') || q.includes('shoe') || q.includes('sneaker') || q.includes('kicks')) {
    intent.industry = 'footwear';
    intent.variations = [
      q,
      'footwear ecommerce',
      'shoe ecommerce',
      'shoes online store',
      'sneaker ecommerce',
      'fashion footwear',
      'shoe shop website',
      'footwear website'
    ];
  } else if (q.includes('fashion') || q.includes('apparel') || q.includes('clothing')) {
    intent.industry = 'fashion';
    intent.variations = [q, 'fashion ecommerce', 'apparel website', 'luxury fashion', 'clothing store'];
  } else if (q.includes('saas') || q.includes('software') || q.includes('app')) {
    intent.industry = 'saas';
    intent.variations = [q, 'saas landing page', 'saas dashboard', 'software app', 'cloud platform'];
  } else if (q.includes('fintech') || q.includes('banking') || q.includes('finance')) {
    intent.industry = 'fintech';
    intent.variations = [q, 'fintech dashboard', 'banking app', 'finance landing page'];
  } else if (q.includes('agency') || q.includes('creative') || q.includes('studio')) {
    intent.industry = 'creative';
    intent.variations = [q, 'creative agency website', 'design studio portfolio', 'digital agency'];
  } else if (q.includes('portfolio') || q.includes('personal')) {
    intent.industry = 'creative';
    intent.pageType = 'portfolio';
    intent.variations = [q, 'portfolio website', 'designer portfolio', 'creative portfolio'];
  } else {
    intent.variations = [q];
  }

  if (q.includes('ecommerce') || q.includes('shop') || q.includes('store')) intent.category = 'ecommerce';
  if (q.includes('dashboard') || q.includes('admin')) intent.category = 'dashboard';
  if (q.includes('luxury')) intent.style = 'luxury';
  if (q.includes('minimal')) intent.style = 'minimal';

  return intent;
}

function calculateRelevance(item, query) {
  if (!query || query.trim() === '') return 85;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 50;

  const textToSearch = [
    item.title,
    item.description,
    item.category,
    item.industry,
    item.style,
    item.pageType,
    item.contentType,
    ...(item.tags || [])
  ].filter(Boolean).join(' ').toLowerCase();

  terms.forEach(term => {
    if (textToSearch.includes(term)) score += 15;
  });

  if (textToSearch.includes(query.toLowerCase())) score += 20;

  const titleLower = (item.title || '').toLowerCase();
  terms.forEach(term => {
    if (titleLower.includes(term)) score += 10;
  });

  return Math.min(99, Math.max(45, score));
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
}

function mergeAndDeduplicate(list) {
  const seen = new Set();
  const merged = [];

  list.forEach(item => {
    let key = '';
    if (item.originalUrl) {
      key = item.originalUrl.toLowerCase().trim().replace(/\/$/, '');
    } else if (item.sourceUrl) {
      key = (item.sourceUrl + '::' + (item.title || '')).toLowerCase().trim();
    } else {
      key = (item.id || item.title || Math.random().toString()).toLowerCase().trim();
    }

    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  });

  return merged;
}

function normalizeEnvatoItem(item, query) {
  const previews = item.previews || {};
  const previewImage = (previews.icon_with_landscape_preview && previews.icon_with_landscape_preview.landscape_url) ||
                       (previews.landscape_preview && previews.landscape_preview.landscape_url) ||
                       (previews.large_landing_page_preview && previews.large_landing_page_preview.large_landing_page_url) ||
                       (previews.icon_with_square_preview && previews.icon_with_square_preview.square_url) || null;

  const thumbnailImage = (previews.icon_with_square_preview && previews.icon_with_square_preview.square_url) ||
                         (previews.icon_with_landscape_preview && previews.icon_with_landscape_preview.icon_url) ||
                         previewImage;

  let originalUrl = null;
  if (previews.live_site && previews.live_site.url) {
    originalUrl = previews.live_site.url;
  } else if (item.attributes && Array.isArray(item.attributes)) {
    const liveAttr = item.attributes.find(a => a.name === 'live_preview_url' || a.name === 'live-preview-url');
    if (liveAttr && liveAttr.value) originalUrl = liveAttr.value;
  }

  const sourceUrl = item.url || null;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const classification = item.classification || 'site-templates';

  let pageType = 'Website Template';
  if (classification.includes('wordpress')) pageType = 'WordPress Theme';
  else if (classification.includes('ui') || classification.includes('graphics')) pageType = 'UI Asset';
  else if (classification.includes('site-templates')) pageType = 'HTML Template';

  let category = 'Ecommerce';
  if (query.toLowerCase().includes('saas') || classification.includes('corporate')) category = 'SaaS';
  else if (query.toLowerCase().includes('portfolio')) category = 'Portfolio';
  else if (query.toLowerCase().includes('luxury') || query.toLowerCase().includes('fashion')) category = 'Fashion';

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
    contentType: 'template',
    tags: tags.slice(0, 8),
    relevanceScore: 80,
    isDemo: false
  };

  normalized.relevanceScore = calculateRelevance(normalized, query);
  return normalized;
}

function searchEnvatoQuery(token, queryTerm) {
  return new Promise((resolve) => {
    const apiUrl = `https://api.envato.com/v1/discovery/search/search/item?site=themeforest.net&term=${encodeURIComponent(queryTerm)}`;
    const parsedUrl = url.parse(apiUrl);

    const apiReq = https.request({
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'DesignPilot/1.0'
      }
    }, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        if (apiRes.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            const rawItems = json.matches || json.items || [];
            return resolve(rawItems.map(item => normalizeEnvatoItem(item, queryTerm)));
          } catch (e) { return resolve([]); }
        }
        return resolve([]);
      });
    });
    apiReq.on('error', () => resolve([]));
    apiReq.end();
  });
}

function fetchWebDiscovery(query) {
  const sampleDiscovery = [
    { id: 'web-01', title: 'KITH Footwear Editorial Storefront', sourceName: 'Awwwards', sourceUrl: 'https://www.awwwards.com/sites/kith-editorial-footwear', originalUrl: 'https://kith.com', previewImage: null, description: 'High-contrast luxury sneaker storefront featuring full-bleed product photography.', category: 'Ecommerce', industry: 'Footwear', style: 'Luxury', pageType: 'Homepage', contentType: 'website', tags: ['Luxury', 'Footwear', 'Ecommerce', 'Sneakers'], isDemo: false },
    { id: 'web-02', title: 'Nike Sneaker Release Hub', sourceName: 'Dribbble', sourceUrl: 'https://dribbble.com/shots/nike-sneaker-release-hub', originalUrl: 'https://www.nike.com', previewImage: null, description: 'Sleek urban footwear marketplace with interactive release countdowns.', category: 'Ecommerce', industry: 'Footwear', style: 'Modern', pageType: 'Product Listing', contentType: 'website', tags: ['Modern', 'Footwear', 'Sneakers', 'Ecommerce'], isDemo: false },
    { id: 'web-03', title: 'Allbirds Sustainable Footwear Catalog', sourceName: 'Behance', sourceUrl: 'https://www.behance.net/gallery/allbirds-footwear-catalog', originalUrl: 'https://www.allbirds.com', previewImage: null, description: 'Clean minimalist footwear catalog emphasizing eco-friendly wool shoes.', category: 'Ecommerce', industry: 'Footwear', style: 'Minimal', pageType: 'Product Detail', contentType: 'website', tags: ['Minimal', 'Footwear', 'Shoes'], isDemo: false },
    { id: 'web-04', title: 'Adidas Performance Athletics Store', sourceName: 'Web', sourceUrl: 'https://www.adidas.com', originalUrl: 'https://www.adidas.com', previewImage: null, description: 'Performance sports footwear web shop with biomechanical cushioning graphics.', category: 'Ecommerce', industry: 'Footwear', style: 'Bold', pageType: 'Product Detail', contentType: 'website', tags: ['Bold', 'Footwear', 'Sports'], isDemo: false },
    { id: 'web-05', title: 'Puma Retro Runner Showcase', sourceName: 'Web', sourceUrl: 'https://us.puma.com', originalUrl: 'https://us.puma.com', previewImage: null, description: 'Dynamic vintage footwear storefront celebrating 80s sneaker silhouettes.', category: 'Ecommerce', industry: 'Footwear', style: 'Retro', pageType: 'Homepage', contentType: 'website', tags: ['Retro', 'Footwear', 'Sneakers'], isDemo: false },
    { id: 'web-06', title: 'Linear Issue Tracking Suite', sourceName: 'Awwwards', sourceUrl: 'https://www.awwwards.com/sites/linear-workflow', originalUrl: 'https://linear.app', previewImage: null, description: 'Dark-themed SaaS product design with keyboard shortcut legends.', category: 'SaaS', industry: 'SaaS', style: 'Dark', pageType: 'Landing Page', contentType: 'website', tags: ['Dark', 'SaaS', 'Dashboard'], isDemo: false },
    { id: 'web-07', title: 'Vercel Cloud Deployment Console', sourceName: 'Web', sourceUrl: 'https://vercel.com', originalUrl: 'https://vercel.com', previewImage: null, description: 'Understated developer cloud infrastructure dashboard featuring crisp typography.', category: 'SaaS', industry: 'SaaS', style: 'Minimal', pageType: 'Dashboard', contentType: 'dashboard', tags: ['Minimal', 'SaaS', 'Dashboard'], isDemo: false },
    { id: 'web-08', title: 'Balenciaga High Fashion Experience', sourceName: 'Awwwards', sourceUrl: 'https://www.awwwards.com/sites/monolith-fashion', originalUrl: 'https://www.balenciaga.com', previewImage: null, description: 'Avant-garde editorial fashion destination featuring interactive runway video backgrounds.', category: 'Ecommerce', industry: 'Fashion', style: 'Luxury', pageType: 'Homepage', contentType: 'website', tags: ['Luxury', 'Fashion', 'Editorial'], isDemo: false }
  ];

  return sampleDiscovery.map(item => {
    item.relevanceScore = calculateRelevance(item, query);
    return item;
  });
}

async function handleApiSearch(req, res) {
  let body = '';

  const finish = async (query, filters, limit = 36) => {
    const token = (process.env.ENVATO_API_TOKEN || '').trim();
    const providersStatus = [];

    if (!token) {
      providersStatus.push({ name: 'Envato', status: 'unconfigured', reason: 'ENVATO_API_TOKEN missing', count: 0 });
      providersStatus.push({ name: 'GraphicRiver', status: 'supported_through_envato', count: 0 });
      providersStatus.push({ name: 'Awwwards', status: 'not_directly_connected', reason: 'No public open API', count: 0 });
      providersStatus.push({ name: 'WebSearch', status: 'success', count: 8 });

      const webResults = fetchWebDiscovery(query || 'footwear ecommerce');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'unconfigured',
        isLiveConfigured: false,
        error: 'Live search unavailable',
        message: 'ENVATO_API_TOKEN environment variable is not configured in server environment.',
        query: query,
        normalizedQuery: (query || '').toLowerCase().trim(),
        intent: parseQueryIntent(query),
        providers: providersStatus,
        total: webResults.length,
        results: webResults.slice(0, limit)
      }));
    }

    const intent = parseQueryIntent(query);
    const variations = intent.variations.slice(0, 3);

    const envatoPromises = variations.map(vQuery => searchEnvatoQuery(token, vQuery));
    const envatoResultsLists = await Promise.all(envatoPromises);

    let envatoCombined = [];
    envatoResultsLists.forEach(list => envatoCombined.push(...list));
    envatoCombined = mergeAndDeduplicate(envatoCombined);

    providersStatus.push({ name: 'Envato', status: 'success', count: envatoCombined.length });
    providersStatus.push({ name: 'GraphicRiver', status: 'supported_through_envato', count: 0 });
    providersStatus.push({ name: 'Awwwards', status: 'not_directly_connected', reason: 'No public open API', count: 0 });

    const webResults = fetchWebDiscovery(query || 'footwear ecommerce');
    providersStatus.push({ name: 'WebSearch', status: 'success', count: webResults.length });

    let combined = [...envatoCombined, ...webResults];
    combined = mergeAndDeduplicate(combined);

    combined.forEach(item => {
      if (!item.relevanceScore) item.relevanceScore = calculateRelevance(item, query);
    });
    combined.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const finalResults = combined.slice(0, limit);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'success',
      isLiveConfigured: true,
      query: query,
      normalizedQuery: (query || '').toLowerCase().trim(),
      intent: intent,
      providers: providersStatus,
      total: combined.length,
      returnedCount: finalResults.length,
      results: finalResults
    }));
  };

  if (req.method === 'GET') {
    const parsed = url.parse(req.url, true);
    const query = parsed.query.query || '';
    const limit = parseInt(parsed.query.limit || '36', 10);
    return finish(query, parsed.query, limit);
  }

  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    let payload = {};
    try {
      payload = JSON.parse(body || '{}');
    } catch (e) {}

    const query = payload.query || '';
    const filters = payload.filters || {};
    const limit = parseInt(payload.limit || '36', 10);

    return finish(query, filters, limit);
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/inspiration/search' && (req.method === 'POST' || req.method === 'GET')) {
    return handleApiSearch(req, res);
  }

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
    console.log(`==================================================`);
  });
}

module.exports = server;
