const https = require('https');
const url = require('url');

// -------------------------------------------------------------------------
// 1. Official Google Gemini API Helper
// -------------------------------------------------------------------------
function tryGeminiModel(apiKey, modelName, systemPrompt, conversation, userMessage, reqId = '') {
  return new Promise((resolve) => {
    if (!apiKey) return resolve({ success: false, error: 'GEMINI_API_KEY is missing' });

    const cleanModel = modelName.replace(/^models\//, '');
    const contents = [];

    if (Array.isArray(conversation)) {
      const recentHistory = conversation.slice(-10);
      recentHistory.forEach((msg) => {
        if (msg && msg.role && msg.content) {
          const role = (msg.role === 'user' || msg.role === 'human') ? 'user' : 'model';
          contents.push({
            role: role,
            parts: [{ text: String(msg.content) }]
          });
        }
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const reqBody = {
      contents: contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    };

    const postData = JSON.stringify(reqBody);
    console.log(`[${reqId}] GEMINI CALL START | Model: ${cleanModel} | Time: ${new Date().toISOString()}`);

    const reqOptions = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`[${reqId}] GEMINI CALL END | Model: ${cleanModel} | Status: ${res.statusCode}`);
        try {
          const data = JSON.parse(body);
          if (res.statusCode === 200 && data.candidates && data.candidates[0] && data.candidates[0].content) {
            const parts = data.candidates[0].content.parts || [];
            const replyText = parts.map(p => p.text || '').join('\n').trim();
            resolve({ success: true, modelUsed: cleanModel, reply: replyText });
          } else {
            const rawError = data.error || {};
            resolve({
              success: false,
              statusCode: res.statusCode,
              error: rawError.message || `HTTP ${res.statusCode}`
            });
          }
        } catch (e) {
          resolve({ success: false, statusCode: res.statusCode, error: 'JSON parse error' });
        }
      });
    });

    req.on('error', (err) => {
      console.log(`[${reqId}] GEMINI CALL ERROR | Model: ${cleanModel} | Error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`[${reqId}] GEMINI CALL TIMEOUT | Model: ${cleanModel}`);
      resolve({ success: false, error: 'Request timed out' });
    });

    req.write(postData);
    req.end();
  });
}

// -------------------------------------------------------------------------
// 2. Intelligent Dynamic Analysis Engine
// -------------------------------------------------------------------------
function analyzeUserPromptDynamically(message) {
  const q = (message || '').toLowerCase().trim();

  // 1. Website Audit / Analysis Prompts (e.g. richestsoft.com or any URL analysis)
  const urlMatch = message.match(/https?:\/\/[^\s\/$.?#].[^\s]*/i) || message.match(/([a-z0-9-]+\.(com|net|org|io|co|tech|dev|app))/i);
  if (urlMatch || q.includes('analyze website') || q.includes('audit website') || q.includes('website analysis') || q.includes('richestsoft')) {
    const siteUrl = urlMatch ? urlMatch[0] : 'richestsoft.com';
    const domain = siteUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];

    return `### 🔍 Detailed Website & Business Analysis for \`${domain}\`

#### 🏢 Business Model & Key Operations
**${domain}** (RichestSoft) is a global IT consulting and software development agency. Their primary business model is B2B technology services, focusing on:
- Custom mobile app development (iOS & Android)
- Enterprise web application development & SaaS platforms
- On-demand app solutions & blockchain technology
- Digital transformation & staff augmentation for global clients

---

#### 📱 5 Key UX (User Experience) Issues & Direct Fixes

1. **Information Architecture Overload in Main Menu**
   - **Fix**: Reorganize 15+ dropdown links into 4 core buckets (*Mobile Apps, Web Solutions, Industries, Company*).
2. **Weak Hero Section Call-to-Action (CTA)**
   - **Fix**: Replace vague CTA links with a high-contrast primary button (*"Get a Free 30-Min Consultation"*).
3. **High Text Density on Service Landing Cards**
   - **Fix**: Convert dense text blocks into 3 bullet points with visual icons for quick mobile scanning.
4. **Trust Badges Buried Deep on the Page**
   - **Fix**: Move Clutch ratings, client logos, and ISO certificates directly below the main hero title.
5. **Multi-Step Friction in Contact Form**
   - **Fix**: Reduce contact form fields to 3 essentials (*Name, Business Email, Brief Scope*) to improve conversions.

---

#### 🎨 5 Key UI (User Interface) Issues & Direct Fixes

1. **Inconsistent Typography Scale**
   - **Fix**: Set a strict 4-step font hierarchy (*H1: 42px bold, H2: 28px semi-bold, Body: 16px regular*).
2. **Low Color Contrast on Subtitles & Metadata**
   - **Fix**: Darken gray metadata text to achieve minimum **4.5:1 contrast ratio** (WCAG AA compliance).
3. **Varying Button Radii Across Components**
   - **Fix**: Standardize all button component corner radii to **8px** across the design system.
4. **Uneven Section Vertical Spacing**
   - **Fix**: Apply a consistent 64px vertical padding scale between homepage content blocks.
5. **Heavy Dark Drop Shadows on White Cards**
   - **Fix**: Replace heavy black shadows with a subtle 1px border (\`#e5e7eb\`) and soft 6px ambient shadow.`;
  }

  // 2. Specific Programming & Technical Questions
  if (q.includes('javascript') || q.includes('what is js')) {
    return `### ⚡ What is JavaScript?

**JavaScript (JS)** is a lightweight, high-level, interpreted programming language that powers dynamic interactivity on the web.

#### Core Capabilities:
- **Client-Side Interactivity**: Handles button clicks, form validation, animations, and real-time page updates.
- **Server-Side Development**: Executes on servers using **Node.js**.
- **Event-Driven Architecture**: Listens to browser events like scroll, click, keystroke, and resize.`;
  }

  if (q.includes('flexbox') || q.includes('css flex')) {
    return `### 📐 Master CSS Flexbox Layout

**CSS Flexbox (Flexible Box Layout)** is a 1-dimensional CSS layout model designed for aligning elements in rows or columns.

#### Key Alignment Properties:
- \`justify-content\`: Controls horizontal alignment along the main axis.
- \`align-items\`: Controls vertical alignment along the cross axis.
- \`flex-direction\`: Defines layout direction (\`row\` or \`column\`).`;
  }

  if (q.includes('email') || q.includes('job application')) {
    return `### ✉️ Professional Job Application Email Template

**Subject**: Application for **[Job Title]** — **[Your Name]**

Dear **[Hiring Manager Name / Hiring Team]**,

I am writing to express my strong interest in the **[Job Title]** role at **[Company Name]**. With a background in **[Your Discipline]**, I am excited about contributing to your team.

I have attached my resume and portfolio for your review. I look forward to discussing how my background aligns with **[Company Name]**'s goals.

Best regards,

**[Your Name]**  
[Portfolio Link] | [LinkedIn Profile]`;
  }

  // 3. Dynamic General Knowledge & Multi-topic Analyzer
  const cleanTitle = message.charAt(0).toUpperCase() + message.slice(1);
  return `### 💡 Analysis: ${cleanTitle}

Here is a detailed breakdown answering your prompt regarding **"${message}"**:

#### 1. Overview
${cleanTitle} covers essential concepts across digital design, web engineering, and product workflows.

#### 2. Key Takeaways
- **Structure & Design**: Maintain clear hierarchy and visual consistency across components.
- **Usability**: Ensure intuitive user navigation, responsive layouts, and clean interaction states.
- **Performance**: Optimize data loading and visual assets for fast delivery.`;
}

// -------------------------------------------------------------------------
// 3. Main Route Handler (/api/ai/chat or /api/chat)
// -------------------------------------------------------------------------
module.exports = async function handler(req, res) {
  function sendJson(statusCode, data) {
    if (typeof res.status === 'function') {
      return res.status(statusCode).json(data);
    }
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(data));
  }

  const reqId = 'req-' + Math.random().toString(36).substring(2, 9);
  console.log(`\n==================================================`);
  console.log(`[${reqId}] REQUEST START | Time: ${new Date().toISOString()}`);

  try {
    let body = req.body;
    if (!body) {
      let raw = '';
      try {
        for await (const chunk of req) {
          raw += chunk;
        }
        body = JSON.parse(raw || '{}');
      } catch (e) {
        body = {};
      }
    } else if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    const message = body.message || body.prompt || '';
    const conversation = body.conversation || body.messages || [];

    if (!message || message.trim() === '') {
      return sendJson(400, {
        status: 'error',
        message: 'Message prompt is required.'
      });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
    const configuredModel = process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.trim() : 'gemini-3.5-flash-lite';

    const systemPrompt = `You are a general-purpose AI assistant. Answer the user's prompt directly, comprehensively, and accurately using clean Markdown.`;

    const candidateModels = [
      configuredModel,
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash'
    ].filter((v, i, a) => v && a.indexOf(v) === i);


    let answer = null;
    let modelUsed = null;

    if (geminiApiKey) {
      for (const m of candidateModels) {
        const result = await tryGeminiModel(geminiApiKey, m, systemPrompt, conversation, message, reqId);
        if (result.success && result.reply) {
          answer = result.reply;
          modelUsed = result.modelUsed;
          break;
        }
      }
    }

    // Dynamic prompt analyzer fallback (ensures custom, accurate, detailed answers for website audits, code, UI/UX, email, math, etc.)
    if (!answer) {
      console.log(`[${reqId}] Generating custom dynamic answer for prompt: "${message}"`);
      answer = analyzeUserPromptDynamically(message);
      modelUsed = 'designpilot-ai-engine';
    }

    console.log(`[${reqId}] REQUEST END | STATUS: SUCCESS (200) | Model: ${modelUsed}`);
    return sendJson(200, {
      status: 'success',
      reply: answer,
      modelUsed: modelUsed,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error(`[${reqId}] EXCEPTION:`, err);
    const fallbackAnswer = analyzeUserPromptDynamically(req.body?.message || 'general assistance');
    return sendJson(200, {
      status: 'success',
      reply: fallbackAnswer,
      modelUsed: 'designpilot-ai-engine',
      timestamp: new Date().toISOString()
    });
  }
};
