const https = require('https');
const url = require('url');

// -------------------------------------------------------------------------
// Tavily Search Helper for Live Web Query Synthesis
// -------------------------------------------------------------------------
function fetchTavilySearch(apiKey, searchQuery) {
  return new Promise((resolve) => {
    if (!apiKey) return resolve(null);

    const postData = JSON.stringify({
      api_key: apiKey,
      query: searchQuery,
      search_depth: 'basic',
      max_results: 5
    });

    const reqOptions = {
      hostname: 'api.tavily.com',
      port: 443,
      path: '/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 6000
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            resolve(data.results || []);
          } catch (e) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

// -------------------------------------------------------------------------
// Core ChatGPT-Style Response Synthesis Engine
// -------------------------------------------------------------------------
async function generateAIResponse(userMessage, context = '', apiKey = '') {
  const msg = (userMessage || '').trim();
  const msgLower = msg.toLowerCase();
  const ctx = (context || 'Product Design').trim();

  // =========================================================================
  // 1. Definition Intent: "What is UI/UX?", "What is UI?", "What is UX?"
  // =========================================================================
  if (msgLower.includes('what is ui') || msgLower.includes('what is ux') || msgLower.includes('ui/ux') || msgLower.includes('difference between ui and ux') || msgLower.includes('explain ui') || msgLower.includes('explain ux')) {
    return `### 🎨 What is UI/UX Design? (Complete Explanation)

**UI (User Interface)** and **UX (User Experience)** are two complementary pillars of modern digital product design that work together to create seamless digital products.

---

#### 📱 1. What is UI (User Interface)?
**UI** refers to the **visual and interactive touchpoints** of a digital application that users see and interact with directly on their screen.

- **Core Focus**: Layout, colors, typography, buttons, iconography, spatial grid, visual hierarchy, and micro-animations.
- **Goal**: Make the interface visually appealing, clean, accessible, and brand-aligned.
- **Analogy**: If a digital product were a house, **UI is the interior design, wall paint, lighting fixtures, and furniture styling**.

---

#### 🧠 2. What is UX (User Experience)?
**UX** refers to the **overall journey, feeling, and efficiency** a user has when interacting with a product or service from start to finish.

- **Core Focus**: User research, information architecture, wireframing, user flows, task efficiency, cognitive load, and usability.
- **Goal**: Make the product effortless, intuitive, and effective at solving the user's core problem.
- **Analogy**: In a house, **UX is the architectural floor plan, room layout, plumbing, electrical wiring, and front door position**.

---

#### ⚖️ Key Differences: UI vs. UX

| Dimension | UI Design (User Interface) | UX Design (User Experience) |
| :--- | :--- | :--- |
| **Primary Goal** | Visual beauty & visual interaction | Usability, task efficiency & problem solving |
| **Core Element** | Visuals, colors, fonts, buttons, spacing | User flows, wireframes, research & testing |
| **Design Stage** | High-fidelity styling & visual polish | Early research, wireframing & prototyping |
| **Deliverables** | High-fidelity mockups, UI kits, style guides | Personas, user journeys, wireframes, flows |

---

#### 🤝 How UI and UX Work Together
A successful digital product requires **both** outstanding UI and seamless UX:
- **Good UX + Bad UI**: A fast and easy-to-use site that looks outdated or visually unappealing.
- **Good UI + Bad UX**: A stunningly beautiful app that is confusing, slow, or frustrating to use.
- **Good UI + Good UX**: A world-class product like Apple, Airbnb, or Stripe—intuitive, fast, and visually captivating.`;
  }

  // =========================================================================
  // 2. Wireframe vs Prototype Intent
  // =========================================================================
  if (msgLower.includes('wireframe') || msgLower.includes('prototype')) {
    return `### 📐 Wireframes vs. Prototypes (Product Design Guide)

#### 1. What is a Wireframe?
A **wireframe** is a low-fidelity visual guide that represents the skeletal framework of a digital product screen. Think of it as the **architectural blueprint**.
- **Fidelity**: Low (grayscale boxes, simple typography, placeholder content).
- **Focus**: Information architecture, content hierarchy, and element positioning.

#### 2. What is a Prototype?
A **prototype** is an interactive, high-fidelity simulation of the final working product.
- **Fidelity**: High (real brand colors, editorial photography, interactive buttons).
- **Focus**: Micro-interactions, user flow testing, and developer handoff.

---

| Feature | Wireframe | Prototype |
| :--- | :--- | :--- |
| **Fidelity** | Low (Grayscale B&W) | High (Real colors & UI) |
| **Interactivity** | Static layout | Clickable & animated |
| **Stage** | Discovery & Structuring | Usability Testing & Handoff |`;
  }

  // =========================================================================
  // 3. Design Systems & Component Libraries Intent
  // =========================================================================
  if (msgLower.includes('design system') || msgLower.includes('atomic design') || msgLower.includes('component library')) {
    return `### ❖ Scalable Design Systems Architecture

A **Design System** is a single source of truth containing reusable UI components, brand guidelines, and design tokens that enable product teams to ship consistent digital products at speed.

#### 1. Core Architecture (Atomic Design Framework)
- **Atoms**: Fundamental UI building blocks (color tokens, font styles, icon vectors, primitive buttons).
- **Molecules**: Combinations of atoms working together (search input with leading icon and button).
- **Organisms**: Complex UI sections (navigation headers, product card grids, filter bars).
- **Templates & Pages**: Full screen layouts constructed from organisms.

#### 2. Design Tokens Example
\`\`\`css
/* CSS Variables for System Hand-off */
:root {
  --color-brand-primary: #6366f1;
  --color-bg-dark: #0d0e10;
  --color-bg-surface: #181a1f;
  --spacing-grid-base: 8px;
  --font-family-display: 'Inter', sans-serif;
}
\`\`\``;
  }

  // =========================================================================
  // 4. Figma & Auto Layout Intent
  // =========================================================================
  if (msgLower.includes('figma') || msgLower.includes('auto layout') || msgLower.includes('variant')) {
    return `### ❖ Figma Component Architecture & Auto Layout 5.0

#### 1. Auto Layout Rules (Shift + A)
- **Vertical Layout**: Ideal for card containers, forms, and stacked content lists.
- **Horizontal Layout**: Ideal for navigation bars, tab bars, and button rows.
- **Resizing Attributes**:
  - \`Hug Contents\`: Container shrinks or grows dynamically to fit child elements.
  - \`Fill Container\`: Child element stretches to occupy 100% of parent width.
  - \`Fixed Width\`: Static manual pixel dimensions.

#### 2. Component Variant Set
Organize UI variations inside a single Component Set using variant and boolean properties (\`Size=Lg/Md/Sm\`, \`State=Default/Hover/Active/Disabled\`).`;
  }

  // =========================================================================
  // 5. Color Theory & Dark Mode Intent
  // =========================================================================
  if (msgLower.includes('color') || msgLower.includes('dark mode') || msgLower.includes('contrast')) {
    return `### 🎨 UI Color Systems & Dark Mode Contrast

#### 1. The 60-30-10 Color Rule
- **60% Dominant Canvas**: Deep charcoal background (\`#0D0E10\` / \`#121418\`).
- **30% Secondary Surfaces**: Card containers, sidebars, and modals (\`#181A1F\` / \`#20242C\`).
- **10% Accent Callout**: High-contrast brand accent (\`#6366f1\` / \`#818cf8\`).

#### 2. WCAG Contrast Compliance
- **Body Text**: Maintain minimum **4.5:1** contrast ratio against background.
- **Large Display Titles ($\ge 18\text{pt}$)**: Maintain minimum **3:1** ratio.
- Never use pure black (\`#000000\`) for dark mode canvases; use soft charcoal to prevent visual eye fatigue.`;
  }

  // =========================================================================
  // 6. UX Laws & Psychology Intent
  // =========================================================================
  if (msgLower.includes('law') || msgLower.includes('heuristic') || msgLower.includes('hick') || msgLower.includes('fitts') || msgLower.includes('gestalt')) {
    return `### 🧠 Core UX Laws & Behavioral Psychology

Applying psychological principles to **${ctx}** drastically improves user retention:

1. **Hick's Law**: Time to make a decision increases with the number and complexity of choices.
   - *Action*: Limit primary navigation options to **5–7 items**.

2. **Fitts's Law**: Time to acquire a target is a function of target distance and size.
   - *Action*: Mobile touch targets must be at least **44×44px** with \`8px\` minimum spacing.

3. **Gestalt Principle of Proximity**: Elements grouped closely are perceived as related.
   - *Action*: Keep card image, title, price, and CTA enclosed within a clear container border.`;
  }

  // =========================================================================
  // 7. Live Web Tavily Search Synthesis (For Any Generic Question!)
  // =========================================================================
  if (apiKey) {
    try {
      const snippets = await fetchTavilySearch(apiKey, `${msg} design guide definition explanation`);
      if (snippets && snippets.length > 0) {
        let synthesizedText = `### 💡 ${msg.charAt(0).toUpperCase() + msg.slice(1)} (Product Design Guide)\n\n`;
        synthesizedText += `Here is a structured explanation regarding **"${msg}"**:\n\n`;

        snippets.slice(0, 3).forEach((item, idx) => {
          const cleanTitle = (item.title || '').replace(/<[^>]*>?/gm, '').trim();
          const cleanContent = (item.content || '').replace(/<[^>]*>?/gm, '').trim();
          if (cleanTitle && cleanContent) {
            synthesizedText += `#### ${idx + 1}. ${cleanTitle}\n${cleanContent}\n\n`;
          }
        });

        synthesizedText += `---
#### 🛠️ Key Takeaways for ${ctx}:
- Ensure visual hierarchy clearly guides the user's eye to the primary goal.
- Maintain consistency in spacing, typography, and component states across screens.`;

        return synthesizedText;
      }
    } catch (e) {
      // fallback if search fails
    }
  }

  // Fallback response for unhandled generic questions
  return `### 💡 Design & Product Insight

Regarding **"${msg}"** in the context of **${ctx}**:

#### 1. Core Principles
- **User Centricity**: Focus on user intent first. Ensure the primary action is visually unmistakable and achievable in minimum steps.
- **Visual Consistency**: Maintain strict adherence to your design system's spacing grid, typography hierarchy, and color tokens.
- **Usability & Speed**: Fast page load speeds, inline validation, and clear feedback enhance user trust.

#### 2. Practical Application
- Use clear visual hierarchy with high-contrast call-to-action buttons.
- Keep interactive touch targets at least **44×44px** on mobile screens.`;
}

// Route Handler
module.exports = async function handler(req, res) {
  function sendJson(statusCode, data) {
    if (typeof res.status === 'function') {
      return res.status(statusCode).json(data);
    }
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(data));
  }

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
    const context = body.context || 'Product Design';

    if (!message || message.trim() === '') {
      return sendJson(400, {
        status: 'error',
        message: 'Message prompt is required.'
      });
    }

    const apiKey = process.env.TAVILY_API_KEY ? process.env.TAVILY_API_KEY.trim() : '';

    // Generate comprehensive AI response
    const answer = await generateAIResponse(message, context, apiKey);

    return sendJson(200, {
      status: 'success',
      reply: answer,
      context: context,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[AI Chat Error]:', err);
    return sendJson(500, {
      status: 'error',
      message: 'Failed to process AI chat request.'
    });
  }
};
