/**
 * Vista de Pronósticos Especiales
 * - Goleador del mundial (texto libre)
 * - Equipo campeón
 * - Equipo subcampeón
 * - Equipo tercer lugar
 */

async function loadSpecial() {
  const container = document.getElementById('special-content');
  container.innerHTML = '<p style="color:var(--text-secondary);">Cargando...</p>';

  try {
    const [specialRes, teamsRes, resultsRes, settingsRes] = await Promise.all([
      api.getMySpecial(),
      api.getGroupsWithTeams(),
      api.getSpecialResults(),
      api.getSettings(),
    ]);

    const myData   = specialRes.data;
    const teams    = teamsRes.data.flatMap(g => g.teams).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    const results  = resultsRes.data;
    const deadline = settingsRes.data.prediction_deadline;
    const canEdit  = new Date() < new Date(deadline);

    renderSpecial(container, myData, teams, results, canEdit, deadline);
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);">Error: ${err.message}</p>`;
  }
}

function renderSpecial(container, myData, teams, results, canEdit, deadline) {
  const teamOptions = teams.map(t =>
    `<option value="${t.id}" ${myData?.champion === t.id || myData?.runner_up === t.id || myData?.third_place === t.id ? '' : ''}>${t.flag} ${t.name}</option>`
  ).join('');

  const makeSelect = (id, selectedId) => `
    <select id="${id}" ${!canEdit ? 'disabled' : ''} style="width:100%; padding:10px; border:1px solid var(--border); border-radius:var(--radius-md); font-size:var(--font-size-md);">
      <option value="">Seleccionar equipo...</option>
      ${teams.map(t => `<option value="${t.id}" ${t.id === selectedId ? 'selected' : ''}>${t.flag} ${t.name}</option>`).join('')}
    </select>
  `;

  const hasResults = results && (results.champion || results.runner_up || results.third_place);
  const deadlineDate = new Date(deadline);

  container.innerHTML = `
    <div style="background:var(--surface); padding:var(--spacing-lg); border-radius:var(--radius-lg); border:1px solid var(--border); margin-bottom:var(--spacing-lg);">

      ${canEdit ? `
        <div class="deadline-info" style="margin-bottom:var(--spacing-lg);">
          ⏰ Puedes editar hasta el ${deadlineDate.toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}
        </div>
      ` : `
        <div class="deadline-info expired" style="margin-bottom:var(--spacing-lg);">
          🔒 La fecha límite para ingresar pronósticos especiales ha pasado. Solo puedes consultar.
        </div>
      `}

      <p style="color:var(--text-secondary); font-size:var(--font-size-sm); margin-bottom:var(--spacing-lg);">
        Ingresa tus pronósticos especiales del torneo. Estos se evalúan al final del mundial.
      </p>

      <form onsubmit="handleSaveSpecial(event)">
        <div class="form-group">
          <label>⚽ Goleador del Mundial</label>
          <input type="text" id="special-goleador" value="${myData?.goleador || ''}"
            placeholder="Nombre del jugador" style="font-size:var(--font-size-md);"
            ${!canEdit ? 'disabled' : ''}>
          <small>Escribe el nombre del jugador que crees será el goleador</small>
        </div>

        <div class="form-group">
          <label>🏆 Equipo Campeón (+3 puntos)</label>
          ${makeSelect('special-champion', myData?.champion)}
        </div>

        <div class="form-group">
          <label>🥈 Equipo Subcampeón (+2 puntos)</label>
          ${makeSelect('special-runner-up', myData?.runner_up)}
        </div>

        <div class="form-group">
          <label>🥉 Equipo Tercer Lugar (+2 puntos)</label>
          ${makeSelect('special-third', myData?.third_place)}
        </div>

        ${canEdit ? `
          <button type="submit" class="btn btn-primary btn-block" style="font-size:var(--font-size-lg); padding:14px;">
            💾 Guardar Pronósticos
          </button>
        ` : ''}
      </form>
    </div>

    <!-- Puntos obtenidos (si ya hay resultados) -->
    ${hasResults && myData ? `
      <div style="background:var(--surface); padding:var(--spacing-lg); border-radius:var(--radius-lg); border:1px solid var(--border);">
        <h3 style="margin-bottom:var(--spacing-md);">📊 Resultados</h3>
        <div style="display:grid; gap:var(--spacing-md);">
          <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--spacing-sm) 0; border-bottom:1px solid var(--border);">
            <span>🏆 Campeón: <strong>${results.champion_flag} ${results.champion_name}</strong></span>
            <span style="font-weight:700; color:${myData.points_champion > 0 ? 'var(--success)' : 'var(--text-secondary)'};">
              ${myData.points_champion > 0 ? `+${myData.points_champion} pts ✓` : '0 pts'}
            </span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--spacing-sm) 0; border-bottom:1px solid var(--border);">
            <span>🥈 Subcampeón: <strong>${results.runner_up_flag} ${results.runner_up_name}</strong></span>
            <span style="font-weight:700; color:${myData.points_runner_up > 0 ? 'var(--success)' : 'var(--text-secondary)'};">
              ${myData.points_runner_up > 0 ? `+${myData.points_runner_up} pts ✓` : '0 pts'}
            </span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--spacing-sm) 0;">
            <span>🥉 Tercer lugar: <strong>${results.third_place_flag} ${results.third_place_name}</strong></span>
            <span style="font-weight:700; color:${myData.points_third > 0 ? 'var(--success)' : 'var(--text-secondary)'};">
              ${myData.points_third > 0 ? `+${myData.points_third} pts ✓` : '0 pts'}
            </span>
          </div>
          <div style="padding:var(--spacing-md); background:var(--background); border-radius:var(--radius-md); text-align:center;">
            <strong style="font-size:var(--font-size-lg);">Total bonus: ${myData.total_bonus} puntos</strong>
          </div>
        </div>
      </div>
    ` : ''}
  `;
}

async function handleSaveSpecial(event) {
  event.preventDefault();

  const data = {
    goleador:    document.getElementById('special-goleador').value.trim(),
    champion:    parseInt(document.getElementById('special-champion').value) || null,
    runner_up:   parseInt(document.getElementById('special-runner-up').value) || null,
    third_place: parseInt(document.getElementById('special-third').value) || null,
  };

  try {
    showLoader();
    await api.saveMySpecial(data);
    showToast('Pronósticos especiales guardados', 'success');
    loadSpecial();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoader();
  }
}
