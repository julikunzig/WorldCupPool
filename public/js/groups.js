/**
 * Vista de Grupos del Mundial 2026
 */

async function loadGroups() {
  try {
    showLoader();
    const res = await api.getGroupsWithTeams();
    renderGroups(res.data);
  } catch (error) {
    showToast('Error al cargar grupos: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

function renderGroups(groups) {
  const container = document.getElementById('groups-content');

  if (!groups || groups.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);">No hay grupos disponibles.</p>';
    return;
  }

  container.innerHTML = `
    <div class="groups-grid">
      ${groups.map(group => `
        <div class="group-card">
          <div class="group-header">Grupo ${group.name}</div>
          <div class="group-teams">
            ${group.teams.map(team => `
              <div class="group-team">
                <span class="group-team-flag">${team.flag}</span>
                <span class="group-team-name">${team.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
