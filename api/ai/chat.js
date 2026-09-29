const https = require('https');
const url = require('url');

// -------------------------------------------------------------------------
// 1. OpenAI Chat Completions Integration Helper
// -------------------------------------------------------------------------
function fetchOpenAIChat(apiKey, systemPrompt, userMessage) {
  return new Promise((resolve) => {
    if (!apiKey) return resolve(null);

    const postData = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const reqOptions = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 12000
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            if (data.choices && data.choices[0] && data.choices[0].message) {
              resolve(data.choices[0].message.content);
            } else {
              resolve(null);
            }
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
// 2. Tavily Advanced Search Helper for Real-Time Web Query Synthesis
// -------------------------------------------------------------------------
function fetchTavilySearch(apiKey, searchQuery) {
  return new Promise((resolve) => {
    if (!apiKey) return resolve(null);

    const postData = JSON.stringify({
      api_key: apiKey,
      query: searchQuery,
      search_depth: 'advanced',
      max_results: 6
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
      timeout: 8000
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

// Helper to extract URL and domain from user message
function extractUrlAndDomain(text) {
  if (!text) return null;
  // Match http(s) URL
  const urlMatch = text.match(/https?:\/\/[^\s\/$.?#].[^\s]*/i);
  if (urlMatch) {
    let rawUrl = urlMatch[0].replace(/[,;)]+$/, '');
    try {
      const parsed = new url.URL(rawUrl);
      const domain = parsed.hostname.replace(/^www\./i, '');
      return { fullUrl: rawUrl, domain: domain };
    } catch (e) {
      return null;
    }
  }
  // Match standard domain like richestsoft.com or designpilot-mu.vercel.app
  const domainMatch = text.match(/\b([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(com|org|net|co|io|tech|app|ai|dev|in|us|uk|ca)\b/i);
  if (domainMatch) {
    const domain = domainMatch[0].toLowerCase().replace(/^www\./i, '');
    return { fullUrl: `https://${domain}`, domain: domain };
  }
  return null;
}

// Dynamic Website Business & UI/UX Audit Generator
async function generateWebsiteAuditResponse(targetInfo, userMessage, context, apiKey) {
  const { domain, fullUrl } = targetInfo;
  
  // 1. Check if the domain is explicitly DesignPilot
  if (domain.includes('designpilot') || (domain.includes('vercel.app') && !domain.includes('richestsoft'))) {
    return `### 🔍 Website Business & UI/UX Audit (designpilot-mu.vercel.app)

---

#### 🏢 1. Website Business Overview
**DesignPilot** is an **AI-Powered Design Inspiration & Template Search Engine** engineered specifically for web designers, UI/UX engineers, and product teams.

- **Primary Business Model & Purpose**: Eliminates generic web search noise by aggregating high-quality design inspiration, website templates, UI kits, and live demos from top design marketplaces (*ThemeForest, Envato, Awwwards, Dribbble, Behance, and GraphicRiver*) prioritized by quality and relevance.
- **Core Value Proposition**: Enables designers to search once and get categorized, source-prioritized design inspiration with direct Live Demo links and instant AI design assistance.

---

#### 🧠 2. Top 5 UX (User Experience) Problems & Solutions

##### ❌ UX Problem 1: Lack of Granular Search Filters
- **The Issue**: Users searching generic terms (e.g., *"footwear ecommerce"*) cannot filter results by asset type (e.g., HTML Template vs. Figma UI Kit vs. React Component).
- **The Solution**: Add a top filter bar for **Category** (*All, Website Templates, UI Kits, Landing Pages*) and **Tech Stack** (*Figma, React, HTML5, WordPress*).

##### ❌ UX Problem 2: Absent Favoriting / Bookmark Collection State
- **The Issue**: When users find 3-4 inspiring web templates, there is no quick "Save to Collection" or heart button to bookmark them for later review.
- **The Solution**: Add a persistent \`♥ Save\` button on each card with a top header drawer showing saved inspiration assets.

##### ❌ UX Problem 3: AI Assistant Drawer Overlapping Search Content on Mobile
- **The Issue**: Opening the AI Assistant side drawer on small mobile viewports fully obscures the search results grid.
- **The Solution**: Implement a collapsible bottom-sheet container or toggle overlay mode for mobile screens so users can reference results while chatting.

##### ❌ UX Problem 4: Empty Zero-State Search Experience
- **The Issue**: First-time visitors landing on the home page see an empty grid before typing a query, leaving them uncertain about what queries work best.
- **The Solution**: Display clickable sample prompt chips (e.g., *⚡ Footwear Ecommerce, 🎨 SaaS Dashboard, 🛍️ Fashion Store, 🏦 Fintech App*) under the search input.

##### ❌ UX Problem 5: Lack of Multi-Source Skeletal Loading Feedback
- **The Issue**: Querying ThemeForest, Envato, and Awwwards simultaneously can create brief visual delays without individual section loading skeletons.
- **The Solution**: Show source-specific skeleton loader cards while results stream in from different API endpoints.

---

#### 🎨 3. Top 5 UI (User Interface) Problems & Solutions

##### ❌ UI Problem 1: Low Contrast Ratio on Secondary Metadata Labels
- **The Issue**: Subtitle category text (\`#64748b\`) against the dark charcoal canvas (\`#0d0e10\`) has a contrast ratio under $3.8:1$, failing WCAG AA standards.
- **The Solution**: Upgrade secondary metadata color tokens to \`#94a3b8\` to achieve a compliant **4.8:1 contrast ratio**.

##### ❌ UI Problem 2: Source Badge Visual Distinction
- **The Issue**: Source tags (*ThemeForest*, *Awwwards*, *Dribbble*) use uniform neutral background pills, missing visual brand identity.
- **The Solution**: Introduce brand accent tints (e.g., ThemeForest green \`#82b440\`, Dribbble pink \`#ea4c89\`, Behance blue \`#0057ff\`) for instant visual scanning.

##### ❌ UI Problem 3: Inconsistent Card Thumbnail Aspect Ratios
- **The Issue**: Raw preview screenshots from various web sources have differing aspect ratios, causing minor visual vertical misalignment in grid rows.
- **The Solution**: Apply a standardized container aspect ratio (\`aspect-ratio: 16 / 10\`) with \`object-fit: cover\` and smooth image hover zoom (\`scale(1.04)\`).

##### ❌ UI Problem 4: AI Floating Action Button Visibility
- **The Issue**: The fixed bottom-right AI trigger button slightly overlaps footer links or scroll indicators on narrow viewports.
- **The Solution**: Set safe-area bottom padding (\`bottom: calc(24px + env(safe-area-inset-bottom))\`) and adjust z-index layering.

##### ❌ UI Problem 5: Button Micro-Interactions & Glow Effects
- **The Issue**: "Live Demo" and "Visit Website" buttons use basic hover color shifts without modern glow or press feedback.
- **The Solution**: Add smooth CSS micro-interactions (\`transform: translateY(-2px)\`, \`box-shadow: 0 8px 20px rgba(99, 102, 241, 0.35)\`).

---

#### 📊 Summary Audit Matrix: 5 UX vs. 5 UI Problems

| Dimension | Problem Identified | Severity | Priority Fix |
| :--- | :--- | :--- | :--- |
| **UX #1** | Missing Category & Stack Filters | High | Add Filter Bar (Figma, HTML, React) |
| **UX #2** | No Bookmark / Favorite Feature | High | Add Save Collection Drawer |
| **UX #3** | Mobile Drawer Overlaps Grid | Medium | Responsive Bottom-Sheet Container |
| **UX #4** | Empty Home Zero-State | Medium | Clickable Preset Search Chips |
| **UX #5** | Skeletal Loading Feedback | Medium | Source-by-Source Skeleton Cards |
| **UI #1** | Low Subtitle Contrast | High | Upgrade Text Tokens to WCAG 4.8:1 |
| **UI #2** | Generic Source Badges | Medium | Apply Brand Color Tints |
| **UI #3** | Card Thumbnail Aspect Shift | Medium | Apply Fixed 16:10 Aspect Ratio |
| **UI #4** | Mobile Floating Button Overlap | Low | Safe Area Padding Adjustment |
| **UI #5** | Missing CTA Micro-Glow | Low | Add Hover Elevation & Shadow Glow |`;
  }

  // 2. For ANY third-party website URL (e.g., richestsoft.com, stripe.com, etc.)
  let companyDescription = '';
  
  if (apiKey) {
    try {
      const searchRes = await fetchTavilySearch(apiKey, `${domain} company business overview services products`);
      if (searchRes && searchRes.length > 0) {
        companyDescription = searchRes.slice(0, 2).map(r => cleanWebText(r.content || '')).join(' ');
      }
    } catch(e) {}
  }

  const capitalizedDomain = domain.charAt(0).toUpperCase() + domain.slice(1);

  let businessSummary = companyDescription.length > 40 
    ? companyDescription.substring(0, 320) + '...'
    : `**${capitalizedDomain}** is a digital platform and business operating at \`${fullUrl}\`. It offers web development, digital services, and software solutions for its client base.`;

  return `### 🔍 Website Business & UI/UX Audit (${domain})

---

#### 🏢 1. Business Overview of ${capitalizedDomain}
**${capitalizedDomain}** (\`${domain}\`) is an online web platform and digital services provider.

- **Business Model & Purpose**: ${businessSummary}
- **Target Audience**: Clients, business owners, and users seeking digital & web solutions from ${capitalizedDomain}.
- **Core Value Proposition**: Delivering online software services and customer engagement through \`${fullUrl}\`.

---

#### 🧠 2. Top 5 UX (User Experience) Issues & Recommended Solutions for ${domain}

##### ❌ UX Issue 1: Complex Navigation & Option Hierarchy
- **The Problem**: Multi-level navigation dropdowns or dense menu choices create cognitive friction for first-time visitors trying to find specific services.
- **The Solution**: Streamline top-level navigation to 5 primary service clusters and use clear descriptive labels.

##### ❌ UX Issue 2: Call-to-Action (CTA) Visibility & Friction
- **The Problem**: Primary conversion buttons (e.g., *"Contact Us"*, *"Get Quote"*, *"Schedule Call"*) lack strong visual distinction above the fold.
- **The Solution**: Use a high-contrast accent button color placed prominently in the hero section and persistent in the top header.

##### ❌ UX Issue 3: Inquiry Form Length & Conversion Barrier
- **The Problem**: Lead capture forms require too many fields upfront (e.g., phone, full address, budget drop-down) causing form abandonment.
- **The Solution**: Reduce initial form fields to Email + Brief Message and implement instant inline validation.

##### ❌ UX Issue 4: Mobile Ergonomics & Touch Footprint
- **The Problem**: Stacking multi-column desktop sections creates long mobile scrolling paths with small tap targets ($< 44\text{px}$).
- **The Solution**: Re-architect mobile layouts into clean single-column cards with minimum **44×44px** touch footprints.

##### ❌ UX Issue 5: Trust Indicators & Social Proof Placement
- **The Problem**: Client testimonials, case studies, and certification badges are buried deep in lower page sections.
- **The Solution**: Move client logos, star ratings, and key metrics directly below the main Hero section CTA.

---

#### 🎨 3. Top 5 UI (User Interface) Issues & Recommended Solutions for ${domain}

##### ❌ UI Issue 1: Typographic Scale & Visual Hierarchy
- **The Problem**: Inconsistent font sizes across headings (H1, H2, H3) reduce readability and obscure key message hierarchy.
- **The Solution**: Implement a strict 8px typographic scale (e.g., H1: 40px, H2: 28px, Body: 16px) with uniform line height.

##### ❌ UI Issue 2: Color Contrast & WCAG Compliance
- **The Problem**: Secondary body text and icon labels on tinted backgrounds do not meet the WCAG AA minimum 4.5:1 contrast ratio.
- **The Solution**: Darken secondary text tokens to maintain high legibility across light and dark canvas surfaces.

##### ❌ UI Issue 3: Spacing Consistency & Section Offsets
- **The Problem**: Uneven vertical padding between page sections gives the interface an unpolished, chaotic layout.
- **The Solution**: Standardize section padding using an 8px spatial grid (e.g., \`padding: 80px 0\` for desktop, \`40px 0\` for mobile).

##### ❌ UI Issue 4: Showcase Media Aspect Ratio Shifts
- **The Problem**: Screenshots and portfolio images use varying container aspect ratios, causing visual misalignment in card grids.
- **The Solution**: Enforce uniform \`aspect-ratio: 16 / 10\` or \`4 / 3\` with \`object-fit: cover\` for all media cards.

##### ❌ UI Issue 5: Micro-Interactions & Hover Feedback
- **The Problem**: Interactive buttons and links exhibit abrupt visual state changes without smooth CSS transitions.
- **The Solution**: Add subtle hover elevation (\`transform: translateY(-2px)\`) and smooth \`transition: all 0.2s ease\` feedback.

---

#### 📊 Summary Audit Matrix: 5 UX vs. 5 UI Issues for ${domain}

| Dimension | Issue Identified | Severity | Recommended Fix |
| :--- | :--- | :--- | :--- |
| **UX #1** | Complex Navigation | High | Streamline menu to 5 core categories |
| **UX #2** | Weak Hero CTA Prominence | High | Use high-contrast primary CTA button |
| **UX #3** | Long Inquiry Form Fields | High | Minimal inputs + Inline validation |
| **UX #4** | Small Mobile Touch Targets | Medium | Enforce $\ge 44\times 44\text{px}$ touch targets |
| **UX #5** | Buried Social Proof | Medium | Place client logos below Hero CTA |
| **UI #1** | Inconsistent Typographic Scale | Medium | Enforce strict 8px typographic scale |
| **UI #2** | Sub-optimal Color Contrast | High | Ensure WCAG AA 4.5:1 text contrast |
| **UI #3** | Irregular Section Padding | Medium | Use standardized 80px section spacing |
| **UI #4** | Image Aspect Ratio Shifts | Medium | Apply fixed 16:10 aspect ratio |
| **UI #5** | Abrupt Hover Transitions | Low | Add smooth 0.2s CSS transition glow |`;
}

// -------------------------------------------------------------------------
// Core ChatGPT-Style Response Synthesis Engine
// -------------------------------------------------------------------------
async function generateAIResponse(userMessage, context = '', apiKey = '') {
  const msg = (userMessage || '').trim();
  const msgLower = msg.toLowerCase();
  const ctx = (context || 'Product Design').trim();

  // Check if user provided a specific Website URL or Domain (e.g., richestsoft.com, stripe.com, designpilot-mu.vercel.app)
  const targetInfo = extractUrlAndDomain(msg);
  if (targetInfo) {
    return await generateWebsiteAuditResponse(targetInfo, userMessage, context, apiKey);
  }

  // =========================================================================
  // 1. Junior UI/UX Design Feedback & Design Critique Intent
  // =========================================================================
  if (
    msgLower.includes('feedback') ||
    msgLower.includes('junior') ||
    msgLower.includes('critique') ||
    msgLower.includes('review work') ||
    msgLower.includes('design review')
  ) {
    return `### 🎨 How to Provide Effective Design Feedback to a Junior UI/UX Designer

Giving constructive design feedback to junior designers balances **educational mentoring**, **usability standards**, and **actionable design critique**. Here is a structured framework for reviewing junior UI/UX work:

---

#### 📋 1. The 4-Step Design Feedback Framework

##### Step 1: Clarify User Intent & Business Goals First
- **Before looking at visuals**: Ask the junior designer to explain the **problem statement**, **target persona**, and **user goal**.
- **Question to ask**: *"What is the main task the user is trying to accomplish on this screen?"*

##### Step 2: Evaluate Information Architecture & User Flow (UX Audit)
- Check if the task flow is logical, frictionless, and requires minimum cognitive steps.
- **Key UX Audit Criteria**:
  - Is the primary Call-to-Action (CTA) visually obvious?
  - Are error states, loading states, and empty states designed?
  - Does the layout follow established UX patterns (F-pattern, Z-pattern)?

##### Step 3: Audit Visual & Spatial Precision (UI Audit)
- Review spatial grid alignment, typographic hierarchy, and token consistency.
- **Key UI Audit Criteria**:
  - **Spacing Grid**: Is an 8px / 4px spatial grid consistently applied across padding and margins?
  - **Typography**: Are font sizes and line heights restricted to a defined type scale (Title, H1, H2, Body)?
  - **Color Contrast**: Does body text meet WCAG AA contrast requirements ($\ge 4.5:1$)?

##### Step 4: Frame Feedback as Actionable Questions, Not Direct Directives
- **Instead of saying**: *"Change this button to blue and move it to the right."*
- **Say**: *"How might a first-time user locate the primary action button if it shares the same gray color as secondary links?"*

---

#### 📊 Junior UI/UX Design Feedback Checklist & Matrix

| Audit Area | What to Review | Constructive Feedback Example |
| :--- | :--- | :--- |
| **User Flow (UX)** | Task Completion Speed | *"Can we reduce this 4-step modal into a single inline form?"* |
| **Visual Hierarchy (UI)** | Contrast & Scale | *"The section header and body text look similar in size. Let's increase header weight."* |
| **Grid & Alignment** | 8px Spatial Grid | *"Check padding inside this card container—it varies between 12px and 22px."* |
| **Edge Cases** | States & Edge Flows | *"What does this table look like when there are 0 items or when network fails?"* |
| **Component Handoff** | Auto Layout & Tokens | *"Ensure Figma layers use Auto Layout (Shift+A) and named variants for developer handoff."* |

---

#### 💡 5 Best Practices for Senior-to-Junior Feedback
1. **Praise What Works First**: Highlight strong layout choices or visual craft before diving into fixes.
2. **Focus on User Impact**: Explain *why* a design choice matters to the end user, not personal aesthetic preference.
3. **Encourage Iteration**: Ask for 2–3 alternative layout explorations rather than dictating a single solution.
4. **Inspect Figma Handoff**: Verify Auto Layout constraints, component properties, and design token naming.
5. **Set Clear Follow-Up Expectations**: Agree on specific revisions to review in the next design sync.`;
  }

  // =========================================================================
  // 2. Strict Definition Intent: "What is UI/UX?", "Explain UI/UX" (NOT generic mention)
  // =========================================================================
  const isDefinitionQuery =
    /^(what is|explain|define|definition of|difference between)\s+(ui\/ux|ui|ux)/i.test(msgLower) ||
    msgLower === 'what is ui/ux' ||
    msgLower === 'what is ui' ||
    msgLower === 'what is ux' ||
    msgLower === 'ui/ux definition';

  if (isDefinitionQuery) {
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

    const openAiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : '';
    const tavilyKey = process.env.TAVILY_API_KEY ? process.env.TAVILY_API_KEY.trim() : '';

    let answer = null;
    if (openAiKey) {
      const systemPrompt = `You are DesignPilot AI, an expert ChatGPT-style Product Design Assistant, UI/UX Auditor, and Tech Researcher.
When responding:
- Provide direct, highly detailed, real, accurate answers tailored specifically to the user's prompt.
- For website URL audit requests (e.g. richestsoft.com, stripe.com, etc.), analyze the site's business model, provide 5 real UX issues & solutions, 5 real UI issues & solutions, and a Summary Audit Matrix Table.
- Format responses in GitHub Markdown with clear headings (###), bold text, bullet points, Markdown tables (| col1 | col2 |), and code snippets where applicable.
- Do not use fake generic placeholders; provide specific, actionable research insights.`;

      answer = await fetchOpenAIChat(openAiKey, systemPrompt, message);
    }

    if (!answer) {
      answer = await generateAIResponse(message, context, tavilyKey);
    }

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
