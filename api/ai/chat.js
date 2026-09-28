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

// Helper to clean raw web scraped text from noise
function cleanWebText(text) {
  if (!text) return '';
  let clean = text.replace(/<[^>]*>?/gm, ''); // Remove raw HTML tags
  clean = clean.replace(/Image \d+:[^\.\n]*/gi, ''); // Remove Image captions like "Image 3: ..."
  clean = clean.replace(/\[\.\.\.\]/g, ''); // Remove [...]
  clean = clean.replace(/Click here[^\.\n]*/gi, '');
  clean = clean.replace(/Subscribe to[^\.\n]*/gi, '');
  clean = clean.replace(/Cookie Policy[^\.\n]*/gi, '');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

// -------------------------------------------------------------------------
// Core ChatGPT-Style Response Synthesis Engine
// -------------------------------------------------------------------------
async function generateAIResponse(userMessage, context = '', apiKey = '') {
  const msg = (userMessage || '').trim();
  const msgLower = msg.toLowerCase();
  const ctx = (context || 'Product Design').trim();

  // =========================================================================
  // 1. Landing Page + UX Mistakes Intent (Combined or specific)
  // =========================================================================
  if (
    (msgLower.includes('landing page') || msgLower.includes('landingpage')) &&
    (msgLower.includes('mistake') || msgLower.includes('error') || msgLower.includes('5') || msgLower.includes('pitfall'))
  ) {
    return `### 🚀 Top 5 Landing Page UI/UX Mistakes (and How to Fix Them)

A landing page has one primary goal: **converting visitors into customers or leads**. Avoiding these 5 critical UX mistakes will significantly boost your conversion rate.

---

#### ❌ Mistake 1: Vague Headline Above the Fold
- **The Issue**: Using confusing jargon or abstract slogans (e.g., *"Synergize your potential"*) instead of clearly stating what your product does.
- **The Solution**: Write a clear, benefit-driven H1 headline that answers *"What problem do you solve?"* in under 5 seconds.
- **Example**: *"Build Beautiful Websites in Minutes without Code"* vs. *"Empowering Your Web Experience"*.

---

#### ❌ Mistake 2: Missing or Competing Call-to-Actions (CTAs)
- **The Issue**: Having multiple primary buttons of equal visual weight (e.g., "Sign Up", "Contact Sales", "Read Blog" all in bright red).
- **The Solution**: Maintain **1 high-contrast primary CTA button** above the fold. Make secondary actions outline buttons or text links.

---

#### ❌ Mistake 3: Lack of Social Proof Above the Fold
- **The Issue**: Forgetting to display trust indicators early on, causing visitors to feel hesitant or suspicious.
- **The Solution**: Include customer logos, star ratings, user counts (*"Trusted by 10,000+ designers"*), or short quote badges right under your hero CTA.

---

#### ❌ Mistake 4: Slow Load Speed & Unoptimized Media
- **The Issue**: Using uncompressed $5\text{MB}+$ hero images or heavy video backgrounds that take over 3 seconds to render.
- **The Solution**: Compress all images to WebP/AVIF format, lazy-load images below the fold, and maintain load times under **1.5 seconds**.

---

#### ❌ Mistake 5: Poor Mobile Ergonomics & Broken Layouts
- **The Issue**: Stacking multi-column desktop layouts poorly, making text tiny or buttons hard to tap on mobile devices.
- **The Solution**: Use a single-column layout on mobile screens with touch-friendly targets of at least **44×44px**.

---

#### 📊 Summary & Conversion Impact Matrix

| Landing Page Mistake | UX Impact | Conversion Fix |
| :--- | :--- | :--- |
| **1. Unclear Headline** | 60%+ Immediate Bounce | Clear 5-second Value Proposition |
| **2. Competing CTAs** | Decision Paralysis | 1 Primary High-Contrast CTA |
| **3. No Social Proof** | Low User Trust | Logos & Rating Badges in Hero |
| **4. Slow Page Load** | -40% Conversion Loss | Compress WebP Images (< 1.5s load) |
| **5. Small Mobile Buttons** | High Mobile Drop-off | Touch Targets $\ge 44\times 44\text{px}$ |

---

#### 💡 Recommended Hero Section HTML Structure

\`\`\`html
<header class="hero-container">
  <span class="badge">✨ #1 Design Inspiration Tool</span>
  <h1>Discover & Build World-Class Web Interfaces</h1>
  <p>Search thousands of real theme templates, live demos, and UI kits.</p>
  <div class="cta-group">
    <button class="btn-primary">Start Exploring</button>
    <button class="btn-secondary">Watch Demo</button>
  </div>
  <div class="trust-logos">
    <span>Trusted by teams at Airbnb, Stripe, and Vercel</span>
  </div>
</header>
\`\`\``;
  }

  // =========================================================================
  // 2. Generic "5 UI/UX Mistakes" or "UX Mistakes" Intent
  // =========================================================================
  if (
    msgLower.includes('mistake') ||
    msgLower.includes('mistakes') ||
    msgLower.includes('uiux mistake') ||
    msgLower.includes('ux mistake') ||
    msgLower.includes('bad ux') ||
    msgLower.includes('pitfall')
  ) {
    return `### 🚨 Top 5 UI/UX Design Mistakes (and How to Fix Them)

Building exceptional digital products requires eliminating usability friction. Here are the **top 5 UI/UX design mistakes** that hurt user experience and retention:

---

#### ❌ Mistake 1: Poor Visual Hierarchy & Cluttered Layouts
- **The Problem**: Treating all page elements with equal visual importance, creating cognitive overload.
- **The Fix**: Establish a clear typographic scale (Title 36px+, H2 24px, Body 16px) and use generous spacing (8px grid system) to guide the reader's eye.

---

#### ❌ Mistake 2: Unclear or Hidden Call-to-Actions (CTAs)
- **The Problem**: Using low-contrast buttons or hiding critical actions inside deep nested menus.
- **The Fix**: Use high-contrast accent colors for primary CTAs and place them prominently in the visual reading path (F-shape / Z-shape pattern).

---

#### ❌ Mistake 3: Low Text Contrast & Unreadable Fonts
- **The Problem**: Using light gray body text (\`#AAAAAA\`) on white canvas or tiny font sizes ($< 14\text{px}$).
- **The Fix**: Maintain WCAG AA compliance with a minimum **4.5:1 contrast ratio** for body text and a minimum $16\text{px}$ base font size.

---

#### ❌ Mistake 4: Overwhelming Form Fields & Lack of Validation
- **The Problem**: Asking users for too much unnecessary information upfront and showing error messages only after form submission.
- **The Fix**: Reduce input fields to the bare minimum and provide instant inline validation as the user types.

---

#### ❌ Mistake 5: Ignoring Mobile Ergonomics
- **The Problem**: Designing for desktop first and shrinking the layout down to mobile, resulting in tiny touch targets.
- **The Fix**: Ensure all interactive buttons have a minimum touch footprint of **44×44px** and keep key controls within easy thumb reach.

---

#### 📊 UI/UX Mistakes Quick Reference Table

| UI/UX Mistake | Consequence | Professional Fix |
| :--- | :--- | :--- |
| **1. Visual Clutter** | High Cognitive Load | Use 8px Spacing Grid & Clear Hierarchy |
| **2. Weak CTAs** | Low Conversion Rate | High-contrast Accent Buttons |
| **3. Low Contrast** | Accessibility Failure | WCAG 4.5:1 Minimum Contrast |
| **4. Long Forms** | High Form Abandonment | Inline Validation & Minimal Inputs |
| **5. Tiny Buttons** | High Tapping Errors | Touch Footprint $\ge 44\times 44\text{px}$ |`;
  }

  // =========================================================================
  // 3. General Landing Page Intent
  // =========================================================================
  if (msgLower.includes('landing page') || msgLower.includes('landingpage') || msgLower.includes('hero section')) {
    return `### 🚀 Landing Page UX & Conversion Best Practices

A high-converting landing page delivers a clear value proposition and guides visitors toward a single target action.

---

#### 🏗️ 1. Essential Landing Page Sections
1. **Hero Section**: H1 Value Headline, Subheadline, Primary CTA, Product Screenshot/Preview, and Trust Logos.
2. **Problem & Solution**: 3 Feature Cards highlighting user pain points and direct benefits.
3. **Social Proof**: Customer testimonials, star rating badges, and case study callouts.
4. **Interactive Demo / Pricing**: Clear plan breakdown with the recommended tier highlighted.
5. **Final CTA Footer Banner**: Re-states the core offer with a prominent action button.

---

#### ⚖️ High vs. Low Converting Landing Pages

| Feature | Low Converting Page | High Converting Page |
| :--- | :--- | :--- |
| **Headline** | Generic marketing slogan | Clear benefit-driven problem statement |
| **CTA** | Hidden or multiple competing buttons | 1 High-contrast primary CTA |
| **Social Proof** | None or hidden on separate page | Client logos & quotes in Hero section |
| **Mobile Layout** | Shrunk desktop layout | Touch-optimized single column layout |
| **Load Speed** | $> 3.5$ seconds | $< 1.5$ seconds (Optimized WebP) |`;
  }

  // =========================================================================
  // 4. Definition Intent: "What is UI/UX?", "What is UI?", "What is UX?"
  // =========================================================================
  if (
    msgLower.includes('what is ui') ||
    msgLower.includes('what is ux') ||
    msgLower.includes('ui/ux') ||
    msgLower.includes('difference between ui and ux') ||
    msgLower.includes('explain ui') ||
    msgLower.includes('explain ux')
  ) {
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
  // 5. Wireframe vs Prototype Intent
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
  // 6. Design Systems & Component Libraries Intent
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
  // 7. E-Commerce Intent
  // =========================================================================
  if (msgLower.includes('ecommerce') || msgLower.includes('e-commerce') || msgLower.includes('checkout') || msgLower.includes('shopping cart')) {
    return `### 🛒 E-Commerce UX & Checkout Optimization Guide

#### 1. Essential Product Page UX
- **High-Res Media**: Multi-angle gallery with zoomable details and lifestyle photography.
- **Sticky Add-to-Cart**: Persistent button visible on long mobile scrolling paths.
- **Upfront Pricing**: Clear display of shipping costs and taxes early in the flow.

#### 2. Checkout Conversion Matrix

| Friction Point | UX Solution | Impact |
| :--- | :--- | :--- |
| **Forced Account Creation** | Guest Checkout Option | +35% Conversions |
| **Unclear Shipping Fee** | Shipping Calculator in Cart | -40% Cart Abandonment |
| **Complex Form Fields** | Auto-fill & Address Lookup | +20% Checkout Speed |`;
  }

  // =========================================================================
  // 8. Figma & Auto Layout Intent
  // =========================================================================
  if (msgLower.includes('figma') || msgLower.includes('auto layout') || msgLower.includes('variant')) {
    return `### ❖ Figma Component Architecture & Auto Layout

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
  // 9. Color Theory & Dark Mode Intent
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
  // 10. Live Web Tavily Search Synthesis (Cleaned & Formatted!)
  // =========================================================================
  if (apiKey) {
    try {
      const snippets = await fetchTavilySearch(apiKey, `${msg} design guide definition explanation best practices`);
      if (snippets && snippets.length > 0) {
        let synthesizedText = `### 💡 ${msg.charAt(0).toUpperCase() + msg.slice(1)} (Product Design Guide)\n\n`;
        synthesizedText += `Here is a structured overview regarding **"${msg}"**:\n\n`;

        let validCount = 0;
        snippets.forEach((item) => {
          if (validCount >= 3) return;
          const cleanTitle = cleanWebText(item.title || '');
          const cleanContent = cleanWebText(item.content || '');
          if (cleanTitle && cleanContent && cleanContent.length > 40) {
            validCount++;
            synthesizedText += `#### ${validCount}. ${cleanTitle}\n${cleanContent}\n\n`;
          }
        });

        if (validCount > 0) {
          synthesizedText += `---\n#### 🛠️ Key UX Takeaways for ${ctx}:\n`;
          synthesizedText += `- Ensure visual hierarchy clearly guides the user's eye to the primary goal.\n`;
          synthesizedText += `- Maintain consistency in spacing grid, typography, and interactive button states.`;
          return synthesizedText;
        }
      }
    } catch (e) {
      // fallback if search fails
    }
  }

  // Fallback response for unhandled generic questions
  return `### 💡 Product Design & UX Guide

Regarding **"${msg}"** in the context of **${ctx}**:

#### 1. Key Principles
- **Clear User Intent**: Keep the primary action unmistakable and achievable in minimum steps.
- **Visual Hierarchy**: Use contrast, size, and spacing to guide the user's visual journey.
- **Performance & Usability**: Fast page load speeds, inline validation, and clear feedback enhance user trust.

#### 2. Recommended Action Items
- Use high-contrast call-to-action buttons.
- Keep interactive touch targets at least **44×44px** on mobile screens.
- Test layouts with real user data to identify friction early.`;
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
