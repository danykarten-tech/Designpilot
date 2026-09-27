/* ==========================================================================
   DESIGNPILOT AI - FIGMA PAGE MODULE (js/figma.js)
   ========================================================================== */

window.initFigmaPage = function(state) {
  const grid = document.getElementById('figma-components-grid');
  if (!grid || !window.DESIGNPILOT_DATA) return;

  const components = window.DESIGNPILOT_DATA.FIGMA_COMPONENTS;

  grid.innerHTML = components.map(c => `
    <div class="figma-comp-card">
      <div class="figma-comp-preview">
        <i class="fa-brands fa-figma" style="font-size: 28px; color: var(--primary-color);"></i>
      </div>
      <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 4px;">${c.name}</h4>
      <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Category: ${c.category}</div>
      <div style="font-size: 11px; color: var(--text-subtle); margin-bottom: 16px;">Variants: ${c.variants}</div>
      <button class="btn-original-link btn-use-figma" style="margin-top: auto;">
        Use in Figma
      </button>
    </div>
  `).join('');

  grid.querySelectorAll('.btn-use-figma').forEach(btn => {
    btn.addEventListener('click', () => {
      alert('DesignPilot Figma Integration (Phase 1 Demo):\n\nComponent ready! Open the DesignPilot Plugin in Figma to insert editable vectors into your current document.');
    });
  });
};
