const https = require('https');
const url = require('url');

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

module.exports = async function handler(req, res) {
  function sendJson(statusCode, data) {
    if (typeof res.status === 'function') {
      return res.status(statusCode).json(data);
    }
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(data));
  }

  try {
    let query = '';
    let filters = {};
    let useDemo = false;

    if (req.method === 'GET') {
      const parsedUrl = url.parse(req.url, true);
      query = parsedUrl.query.query || (req.query && req.query.query) || '';
      useDemo = parsedUrl.query.useDemo === 'true' || (req.query && req.query.useDemo === 'true');
    } else {
      let body = req.body || {};
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      }
      query = body.query || '';
      filters = body.filters || {};
      useDemo = body.useDemo;
    }

    const isDemoMode = process.env.USE_DEMO_INSPIRATION === 'true' || useDemo === true;
    if (isDemoMode) {
      return sendJson(200, {
        status: 'demo_mode',
        isLiveConfigured: false,
        useDemo: true,
        message: 'Demo mode active via USE_DEMO_INSPIRATION=true switch',
        query,
        filters
      });
    }

    const token = (process.env.ENVATO_API_TOKEN || '').trim();
    if (!token) {
      return sendJson(200, {
        status: 'unconfigured',
        isLiveConfigured: false,
        error: 'Live inspiration search is not configured.',
        message: 'ENVATO_API_TOKEN environment variable is missing. Set token in Vercel project environment settings.',
        query,
        filters,
        results: []
      });
    }

    const apiUrl = `https://api.envato.com/v1/discovery/search/search/item?site=themeforest.net&term=${encodeURIComponent(query || 'footwear ecommerce')}`;
    const parsedUrl = url.parse(apiUrl);

    const apiResult = await new Promise((resolve) => {
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
          if (apiRes.statusCode === 401 || apiRes.statusCode === 403) {
            return resolve({
              status: 'unconfigured',
              error: 'Live inspiration search is not configured.',
              message: 'Invalid or unauthorized Envato API token.',
              results: []
            });
          }
          if (apiRes.statusCode === 429) {
            return resolve({
              status: 'rate_limited',
              error: 'Search limit reached. Please try again shortly.',
              results: []
            });
          }
          if (apiRes.statusCode !== 200) {
            return resolve({
              status: 'error',
              error: 'Inspiration source temporarily unavailable.',
              message: `Envato API returned HTTP status ${apiRes.statusCode}`,
              results: []
            });
          }
          try {
            const json = JSON.parse(data);
            const rawItems = json.matches || json.items || [];
            let results = rawItems.map(item => normalizeEnvatoItem(item, query));
            results.sort((a, b) => b.relevanceScore - a.relevanceScore);
            return resolve({
              status: 'success',
              isLiveConfigured: true,
              provider: 'Envato',
              results: results
            });
          } catch (e) {
            return resolve({
              status: 'error',
              error: 'Inspiration source temporarily unavailable.',
              results: []
            });
          }
        });
      });
      apiReq.on('error', err => resolve({ status: 'error', error: err.message, results: [] }));
      apiReq.end();
    });

    return sendJson(200, apiResult);

  } catch (err) {
    return sendJson(200, {
      status: 'error',
      error: 'Inspiration source temporarily unavailable.',
      message: err.message,
      results: []
    });
  }
};
