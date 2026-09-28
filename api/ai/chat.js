const https = require('https');
const url = require('url');

// Server-side AI response generator for DesignPilot AI Assistant
function generateAIResponse(userMessage, context = '', history = []) {
  const msg = (userMessage || '').trim();
  const msgLower = msg.toLowerCase();
  const ctx = (context || 'Product Design').trim();

  // 1. Comprehensive UX Heuristics & Laws
  if (msgLower.includes('law') || msgLower.includes('heuristic') || msgLower.includes("hick") || msgLower.includes("fitts") || msgLower.includes("miller") || msgLower.includes("gestalt")) {
    return `### 🧠 Core UX Laws & Behavioral Psychology

When designing interfaces for **${ctx}**, applying psychological UX principles dramatically improves user retention:

1. **Hick's Law (Decision Time)**: Time to make a decision increases with the number and complexity of choices.
   - *Action*: Limit primary navigation items to **5–7 options** and use single clear CTAs on hero sections.

2. **Fitts's Law (Target Size & Distance)**: Time to acquire a target is a function of the distance to and size of the target.
   - *Action*: Mobile touch targets must be at least **44×44px** with minimum **8px spacing** between clickable icons.

3. **Gestalt Principles (Proximity & Similarity)**: Elements close to each other or sharing visual traits are perceived as related.
   - *Action*: Group price, ratings, and call-to-action buttons inside a distinct visual card container.

4. **Jakob's Law (Familiarity)**: Users spend most of their time on other sites, preferring your site to work the same way.
   - *Action*: Place shopping carts top-right and brand logos top-left for intuitive muscle memory.`;
  }

  // 2. UX Research, Usability & Conversion Optimization
  if (msgLower.includes('ux') || msgLower.includes('usability') || msgLower.includes('user experience') || msgLower.includes('conversion') || msgLower.includes('checkout') || msgLower.includes('funnel') || msgLower.includes('onboarding')) {
    return `### ⚡ Master UX Strategy for ${ctx}

Here is a conversion-focused UX architecture tailored for modern product design:

#### 1. First 3 Seconds (Hero Experience)
- **Clear Value Proposition**: A prominent H1 (max 8 words) describing *what* it is and *why* it matters.
- **High-Contrast Primary CTA**: Use full accent color fill (e.g. \`#6366f1\`) paired with directional icon indicator (\`↗\` or \`→\`).

#### 2. Reducing Friction & Cognitive Load
- **Progressive Disclosure**: Show essential fields first, revealing secondary filters or options on demand.
- **Inline Validation**: Provide instant visual feedback (\`✓ Valid\` / \`⚠️ Required\`) directly beside input fields.

#### 3. Mobile-First Ergonomics
- **Thumb Zone Friendly**: Place high-frequency actions in the bottom 40% of mobile screens.
- **Sticky Purchase/Action Bar**: Ensure primary CTA remains fixed at the screen bottom on long scrolling pages.

\`\`\`css
/* Example Touch Target Optimization */
.primary-cta {
  min-height: 48px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 12px;
}
\`\`\``;
  }

  // 3. UI Design Systems, Colors, Dark Mode & Typography
  if (msgLower.includes('ui') || msgLower.includes('color') || msgLower.includes('dark mode') || msgLower.includes('typography') || msgLower.includes('font') || msgLower.includes('grid') || msgLower.includes('spacing') || msgLower.includes('theme')) {
    return `### 🎨 UI Design System & Visual Guidelines

To achieve a sleek, high-end visual aesthetic like DesignPilot:

#### 1. The 60-30-10 Color Hierarchy
- **60% Dominant Background**: Deep charcoal canvas (\`#0D0E10\` / \`#121418\`).
- **30% Secondary Surfaces**: Card & sidebar containers (\`#181A1F\` / \`#20242C\`).
- **10% Accent/Action**: Vibrant brand accent (\`#6366f1\` / \`#818cf8\`).

#### 2. Spacing Scale (8pt Grid System)
Use consistent multiples of 4 and 8 for all margins and paddings:
- \`4px\` (micro spacing), \`8px\` (compact gap), \`16px\` (standard element gap), \`24px\` (card padding), \`48px\` (section spacing).

#### 3. Typography Scale
- **H1 Display**: \`32px - 40px\` (Font-weight: 800)
- **H2 Section**: \`22px - 26px\` (Font-weight: 700)
- **H3 Card Title**: \`15px - 17px\` (Font-weight: 600)
- **Body Text**: \`14px\` (Line-height: 1.5)
- **Meta/Badges**: \`11px - 12px\` (Font-weight: 600, uppercase)

\`\`\`css
/* Design System CSS Tokens */
:root {
  --bg-dark: #0d0e10;
  --bg-surface: #181a1f;
  --primary-accent: #6366f1;
  --text-heading: #f8fafc;
  --text-secondary: #94a3b8;
}
\`\`\``;
  }

  // 4. Figma Workflows, Tokens & Auto-Layout
  if (msgLower.includes('figma') || msgLower.includes('auto layout') || msgLower.includes('component') || msgLower.includes('variant') || msgLower.includes('token') || msgLower.includes('plugin')) {
    return `### ❖ Figma Component Architecture & Workflow

Here is how to structure scalable Figma components for your team:

#### 1. Auto Layout 5.0 Best Practices
- **Direction**: Set parent containers to \`Vertical\` layout with \`Fill Container\` width.
- **Padding**: Apply \`24px\` horizontal and \`20px\` vertical inner padding for card components.
- **Gap between items**: Use \`12px\` gap for tight stacked metadata and \`20px\` for card rows.

#### 2. Component Variant Matrix
Organize UI elements into a single Component Set with boolean & variant properties:
- **State**: \`Default\` | \`Hover\` | \`Active\` | \`Disabled\`
- **Size**: \`Sm (36px)\` | \`Md (44px)\` | \`Lg (52px)\`
- **Icon Slots**: \`Show Leading Icon = True/False\`

#### 3. Design Hand-off Tip
Bind spacing and color properties to **Figma Variables** (Color & Dimension tokens) so developers can export CSS variables directly.`;
  }

  // 5. Accessibility (WCAG 2.1 AA/AAA)
  if (msgLower.includes('wcag') || msgLower.includes('accessib') || msgLower.includes('contrast') || msgLower.includes('screen reader') || msgLower.includes('aria')) {
    return `### ♿ WCAG 2.1 AA Accessibility Guidelines

Ensure your interface meets international compliance standards:

1. **Contrast Ratios**:
   - Normal Body Text: Minimum **4.5:1** contrast ratio against background.
   - Large Text ($\ge 18\text{pt}$ / bold $14\text{pt}$): Minimum **3:1** ratio.
   - UI Components & Icons: Minimum **3:1** ratio.

2. **Keyboard Navigation & Focus States**:
   - Never remove \`outline: none\` without providing a distinct focus ring (\`box-shadow: 0 0 0 2px #6366f1\`).
   - Allow full keyboard traversal using \`Tab\` and \`Shift+Tab\`.

3. **Screen Reader Optimization**:
   - Use semantic HTML tags (\`<main>\`, \`<nav>\`, \`<article>\`, \`<button>\`).
   - Add \`aria-label\` attributes to icon-only buttons.`;
  }

  // 6. E-Commerce & Landing Page Specific Advice
  if (msgLower.includes('ecommerce') || msgLower.includes('shop') || msgLower.includes('product') || msgLower.includes('store') || msgLower.includes('landing page') || msgLower.includes('saas') || msgLower.includes('dashboard')) {
    return `### 🚀 Product Design Strategy for ${ctx}

Here are the highest performing design patterns for **${ctx}**:

1. **High-Resolution Visual Media**:
   - Use high-quality preview thumbnails with \`aspect-ratio: 16/10\` and subtle hover zoom transitions (\`transform: scale(1.03)\`).

2. **Clear Direct Action Buttons**:
   - Provide explicit dual buttons: \`[View Item ↗]\` for full product details and \`[Live Demo ↗]\` for direct interactive preview.

3. **Trust & Social Proof**:
   - Incorporate relevance ratings (\`94% Match\`), category badges, and user reviews directly above the title.

4. **Responsive Grid Architecture**:
   - Use a **4-Column Grid** on Desktop ($\ge 1200\text{px}$), **2-Column** on Tablet, and **1-Column** on Mobile.`;
  }

  // 7. General Purpose Intelligent Response (ChatGPT Style)
  return `### 💡 Design & Product Insight

Regarding **"${msg}"** in the context of **${ctx}**:

#### Key Recommendations:
1. **User Centricity**: Focus on user intent first. Ensure the primary action is visually unmistakable and achievable in minimum steps.
2. **Visual Consistency**: Maintain strict adherence to your design system's spacing grid, typography hierarchy, and color tokens.
3. **Performance & Speed**: Fast page load speeds and smooth micro-animations enhance perceived performance and user delight.

#### Next Steps:
- Would you like specific CSS code snippets, Figma auto-layout settings, or WCAG color contrast specs for this requirement?`;
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
    const history = body.history || [];

    if (!message || message.trim() === '') {
      return sendJson(400, {
        status: 'error',
        message: 'Message prompt is required.'
      });
    }

    // Generate intelligent AI response
    const answer = generateAIResponse(message, context, history);

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
