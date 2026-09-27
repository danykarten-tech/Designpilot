/* ==========================================================================
   DESIGNPILOT AI - PROJECTS MODULE (js/projects.js)
   ========================================================================== */

window.initProjectsPage = function(state) {
  const grid = document.getElementById('projects-grid-container');
  if (!grid || !window.DESIGNPILOT_DATA) return;

  const projects = window.DESIGNPILOT_DATA.PROJECTS;

  grid.innerHTML = projects.map(p => `
    <div class="project-card">
      <div style="height: 140px; border-radius: var(--radius-md); overflow: hidden; margin-bottom: 16px;">
        <img src="${p.preview}" alt="${p.title}" style="width: 100%; height: 100%; object-fit: cover;">
      </div>
      <div class="project-card-header">
        <span class="project-title">${p.title}</span>
        <span class="home-hero-badge" style="margin: 0; padding: 2px 10px; font-size: 11px;">${p.status}</span>
      </div>
      <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">${p.description}</p>
      <div style="display: flex; gap: 16px; font-size: 12px; color: var(--text-subtle); padding-top: 14px; border-top: 1px solid var(--border-color);">
        <span><i class="fa-solid fa-bookmark"></i> ${p.references} References</span>
        <span><i class="fa-solid fa-cubes"></i> ${p.components} Components</span>
        <span><i class="fa-solid fa-message"></i> ${p.chats} Chats</span>
      </div>
    </div>
  `).join('');
};
