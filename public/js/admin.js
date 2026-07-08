/**
 * Vista de administración (solo admin)
 */

let adminMatches = [];
let adminUsers = [];
let adminActiveTab = 'users';

async function loadAdmin() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user.role !== 'admin') {
    showToast('No tienes permisos de administrador', 'error');
    return;
  }

  try {
    showLoader();
    const [matchesRes, usersRes] = await Promise.all([
      api.getMatchesAdmin(),
      api.getUsers()
    ]);
    adminMatches = matchesRes.data;
    adminUsers = usersRes.data.users;
    renderAdminShell();
    switchAdminTab(adminActiveTab);
  } catch (error) {
    showToast('Error al cargar panel admin: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

// ── Shell con tabs ────────────────────────────────────────────────────────────

function renderAdminShell() {
  const container = document.getElementById('admin-content');
  container.innerHTML = `
    <div class="admin-tabs">
      <button class="admin-tab" data-tab="users"     onclick="switchAdminTab('users')">👥 Usuarios</button>
      <button class="admin-tab" data-tab="knockout"  onclick="switchAdminTab('knockout')">🏆 Eliminatorias</button>
      <button class="admin-tab" data-tab="scores"    onclick="switchAdminTab('scores')">⚽ Resultados</button>
      <button class="admin-tab" data-tab="special"   onclick="switchAdminTab('special')">🎯 Especiales</button>
      <button class="admin-tab" data-tab="report"    onclick="switchAdminTab('report')">📊 Reporte</button>
      <button class="admin-tab" data-tab="config"    onclick="switchAdminTab('config')">⚙️ Config</button>
    </div>
    <div id="admin-tab-content"></div>
  `;
}

function switchAdminTab(tab) {
  adminActiveTab = tab;
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  if      (tab === 'users')    renderUsersTab();
  else if (tab === 'knockout') renderKnockoutTab();
  else if (tab === 'scores')   renderScoresTab();
  else if (tab === 'special')  renderAdminSpecialTab();
  else if (tab === 'report')   renderReportTab();
  else                         renderConfigTab();
}

// ── Tab: Usuarios ─────────────────────────────────────────────────────────────

function renderUsersTab() {
  const content = document.getElementById('admin-tab-content');
  content.innerHTML = `

    <!-- Crear usuario -->
    <div style="margin-bottom: var(--spacing-xl);">
      <h3 style="margin-bottom: var(--spacing-md);">Crear Usuario</h3>
      <div style="background: var(--surface); padding: var(--spacing-lg); border-radius: var(--radius-lg); border: 1px solid var(--border);">
        <form onsubmit="handleCreateUser(event)">
          <div class="form-group">
            <label>Nombre completo</label>
            <input type="text" id="new-user-nombre" required minlength="2" placeholder="Ej: Juan Pérez">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="new-user-email" required placeholder="Ej: juan@email.com">
          </div>
          <div class="form-group">
            <label>Teléfono (opcional)</label>
            <input type="tel" id="new-user-telefono" placeholder="Ej: +56912345678">
          </div>
          <div class="form-group">
            <label>Contraseña</label>
            <div class="password-input-wrapper">
              <input type="password" id="new-user-password" required minlength="6" placeholder="Mínimo 6 caracteres">
              <button type="button" class="password-toggle" onclick="togglePasswordVisibility('new-user-password', this)">
                <span class="eye-icon">👁️</span>
              </button>
            </div>
            <small>El usuario podrá cambiarla desde su perfil</small>
          </div>
          <button type="submit" class="btn btn-primary">Crear Usuario</button>
        </form>
      </div>
    </div>

    <!-- Lista de usuarios -->
    <div>
      <h3 style="margin-bottom: var(--spacing-md);">Usuarios Registrados (${adminUsers.filter(u => u.role !== 'admin').length})</h3>
      <div style="display: grid; gap: var(--spacing-md);">
        ${adminUsers.filter(u => u.role !== 'admin').map(u => `
          <div style="background: var(--surface); padding: var(--spacing-md); border-radius: var(--radius-lg); border: 1px solid var(--border);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-md);">
              <div>
                <div style="font-weight: 600;">${u.nombre}</div>
                <div style="font-size: var(--font-size-sm); color: var(--text-secondary);">${u.email}</div>
                ${u.telefono ? `<div style="font-size: var(--font-size-sm); color: var(--text-secondary);">${u.telefono}</div>` : ''}
              </div>
              <span style="font-size: var(--font-size-xs); color: ${u.is_active ? 'var(--success)' : 'var(--danger)'}; font-weight: 500;">
                ${u.is_active ? '✓ Activo' : '✗ Inactivo'}
              </span>
            </div>
            <div style="display: flex; gap: var(--spacing-sm); flex-wrap: wrap;">
              <button class="btn btn-outline btn-sm" onclick="showEditUserForm(${u.id}, '${u.nombre.replace(/'/g, "\\'")}', '${u.email}', '${u.telefono || ''}')">
                ✏️ Editar
              </button>
              <button class="btn btn-outline btn-sm" onclick="showResetPasswordForm(${u.id}, '${u.nombre.replace(/'/g, "\\'")}')">
                🔑 Reset contraseña
              </button>
              ${u.is_active ? `
                <button class="btn btn-danger btn-sm" onclick="handleDeactivateUser(${u.id}, '${u.nombre.replace(/'/g, "\\'")}')">
                  🚫 Desactivar
                </button>
              ` : ''}
            </div>
            <!-- Formulario editar (oculto) -->
            <div id="edit-form-${u.id}" style="display:none; margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--border);">
              <form onsubmit="handleUpdateUser(event, ${u.id})">
                <div class="form-group">
                  <label>Nombre</label>
                  <input type="text" id="edit-nombre-${u.id}" required minlength="2">
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" id="edit-email-${u.id}" required>
                </div>
                <div class="form-group">
                  <label>Teléfono (opcional)</label>
                  <input type="tel" id="edit-telefono-${u.id}">
                </div>
                <div style="display: flex; gap: var(--spacing-sm);">
                  <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
                  <button type="button" class="btn btn-outline btn-sm" onclick="hideEditUserForm(${u.id})">Cancelar</button>
                </div>
              </form>
            </div>
            <!-- Formulario reset password (oculto) -->
            <div id="reset-form-${u.id}" style="display:none; margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--border);">
              <form onsubmit="handleResetPassword(event, ${u.id})">
                <div class="form-group">
                  <label>Nueva contraseña</label>
                  <div class="password-input-wrapper">
                    <input type="password" id="reset-password-${u.id}" required minlength="6" placeholder="Mínimo 6 caracteres">
                    <button type="button" class="password-toggle" onclick="togglePasswordVisibility('reset-password-${u.id}', this)">
                      <span class="eye-icon">👁️</span>
                    </button>
                  </div>
                </div>
                <div style="display: flex; gap: var(--spacing-sm);">
                  <button type="submit" class="btn btn-primary btn-sm">Resetear</button>
                  <button type="button" class="btn btn-outline btn-sm" onclick="hideResetPasswordForm(${u.id})">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const eye = btn.querySelector('.eye-icon');
  if (input.type === 'password') {
    input.type = 'text';
    eye.textContent = '🙈';
  } else {
    input.type = 'password';
    eye.textContent = '👁️';
  }
}

function showEditUserForm(id, nombre, email, telefono) {
  // Ocultar otros formularios abiertos
  document.querySelectorAll('[id^="edit-form-"], [id^="reset-form-"]').forEach(el => el.style.display = 'none');
  document.getElementById(`edit-nombre-${id}`).value = nombre;
  document.getElementById(`edit-email-${id}`).value = email;
  document.getElementById(`edit-telefono-${id}`).value = telefono;
  document.getElementById(`edit-form-${id}`).style.display = 'block';
}

function hideEditUserForm(id) {
  document.getElementById(`edit-form-${id}`).style.display = 'none';
}

function showResetPasswordForm(id, nombre) {
  document.querySelectorAll('[id^="edit-form-"], [id^="reset-form-"]').forEach(el => el.style.display = 'none');
  document.getElementById(`reset-form-${id}`).style.display = 'block';
}

function hideResetPasswordForm(id) {
  document.getElementById(`reset-form-${id}`).style.display = 'none';
}

async function handleCreateUser(event) {
  event.preventDefault();
  const userData = {
    nombre: document.getElementById('new-user-nombre').value,
    email: document.getElementById('new-user-email').value,
    telefono: document.getElementById('new-user-telefono').value,
    password: document.getElementById('new-user-password').value,
  };
  try {
    showLoader();
    await api.createUser(userData);
    showToast(`Usuario ${userData.nombre} creado exitosamente`, 'success');
    await loadAdmin();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

async function handleUpdateUser(event, id) {
  event.preventDefault();
  const updates = {
    nombre: document.getElementById(`edit-nombre-${id}`).value,
    email: document.getElementById(`edit-email-${id}`).value,
    telefono: document.getElementById(`edit-telefono-${id}`).value,
  };
  try {
    showLoader();
    await api.updateUser(id, updates);
    showToast('Usuario actualizado exitosamente', 'success');
    await loadAdmin();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

async function handleResetPassword(event, id) {
  event.preventDefault();
  const password = document.getElementById(`reset-password-${id}`).value;
  try {
    showLoader();
    await api.resetUserPassword(id, password);
    showToast('Contraseña reseteada exitosamente', 'success');
    hideResetPasswordForm(id);
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

async function handleDeactivateUser(id, nombre) {
  if (!confirm(`¿Desactivar al usuario ${nombre}?`)) return;
  try {
    showLoader();
    await api.deactivateUser(id);
    showToast(`Usuario ${nombre} desactivado`, 'success');
    await loadAdmin();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

// ── Tab: Resultados (con sub-tabs por fase) ───────────────────────────────────

const SCORE_PHASES = [
  { key: 'group',        label: 'Grupos' },
  { key: 'round_of_16',  label: 'Dieciseisavos' },
  { key: 'round_of_8',   label: 'Octavos' },
  { key: 'quarterfinal', label: 'Cuartos' },
  { key: 'semifinal',    label: 'Semifinal' },
  { key: 'third_place',  label: '3er/4to Puesto' },
  { key: 'final',        label: 'Final' },
];

let activeScorePhase = 'group';

function renderScoresTab() {
  const content = document.getElementById('admin-tab-content');

  // Determinar qué fases tienen partidos
  const phasesWithMatches = SCORE_PHASES.filter(p =>
    adminMatches.some(m => m.stage === p.key)
  );

  if (phasesWithMatches.length === 0) {
    content.innerHTML = `<p style="color:var(--text-secondary);">No hay partidos disponibles.</p>`;
    return;
  }

  // Si el tab activo no tiene partidos, ir al primero disponible
  if (!phasesWithMatches.find(p => p.key === activeScorePhase)) {
    activeScorePhase = phasesWithMatches[0].key;
  }

  content.innerHTML = `
    <div class="phase-tabs" style="margin-bottom:var(--spacing-md);">
      ${phasesWithMatches.map(p => `
        <button class="phase-tab ${p.key === activeScorePhase ? 'active' : ''}"
                onclick="switchScorePhase('${p.key}')">
          ${p.label}
        </button>
      `).join('')}
    </div>
    <div id="score-phase-content"></div>
  `;

  renderScorePhaseContent(activeScorePhase);
}

function switchScorePhase(phase) {
  activeScorePhase = phase;
  document.querySelectorAll('#admin-tab-content .phase-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${phase}'`));
  });
  renderScorePhaseContent(phase);
}

function renderScorePhaseContent(phase) {
  const container = document.getElementById('score-phase-content');
  if (!container) return;

  const phaseMatches = adminMatches.filter(m => m.stage === phase);

  if (phaseMatches.length === 0) {
    container.innerHTML = `<p style="color:var(--text-secondary);">No hay partidos en esta fase.</p>`;
    return;
  }

  container.innerHTML = `
    <p style="color:var(--text-secondary); margin-bottom:var(--spacing-md); font-size:var(--font-size-sm);">
      Ingresa los marcadores reales. Esto calculará automáticamente los puntos de todos los usuarios.
    </p>
    <div style="display:grid; gap:var(--spacing-md);">
      ${phaseMatches.map(match => {
        const matchDate = new Date(match.match_date);
        const phaseLabel = phase === 'group'
          ? `Grupo ${match.group_name} - J${match.jornada}`
          : SCORE_PHASES.find(p => p.key === phase)?.label || phase;
        return `
          <div style="background:var(--surface); padding:var(--spacing-md); border-radius:var(--radius-lg); border:1px solid var(--border);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--spacing-md);">
              <div>
                <strong>${phaseLabel}</strong>
                <div style="font-size:var(--font-size-xs); color:var(--text-secondary);">
                  ${matchDate.toLocaleDateString('es-ES')} ${matchDate.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}
                </div>
              </div>
              ${match.is_finished ? '<span style="color:var(--success); font-weight:500;">✓ Finalizado</span>' : ''}
            </div>
            <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:var(--spacing-md); align-items:center; margin-bottom:var(--spacing-md);">
              <div style="text-align:center;">
                <div style="font-size:24px;">${match.home_team_flag}</div>
                <div style="font-size:var(--font-size-sm); font-weight:500;">${match.home_team_name}</div>
              </div>
              <div style="font-weight:700; color:var(--text-secondary);">VS</div>
              <div style="text-align:center;">
                <div style="font-size:24px;">${match.away_team_flag}</div>
                <div style="font-size:var(--font-size-sm); font-weight:500;">${match.away_team_name}</div>
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr auto 1fr auto; gap:var(--spacing-sm); align-items:center;">
              <input type="number" min="0" max="20"
                value="${match.real_home_goals ?? ''}"
                id="admin-home-${match.id}"
                inputmode="numeric"
                onkeypress="return event.charCode >= 48 && event.charCode <= 57"
                style="width:100%; padding:8px; text-align:center; font-size:var(--font-size-lg); font-weight:700; border:2px solid var(--border); border-radius:var(--radius-md);">
              <span style="font-weight:700;">-</span>
              <input type="number" min="0" max="20"
                value="${match.real_away_goals ?? ''}"
                id="admin-away-${match.id}"
                inputmode="numeric"
                onkeypress="return event.charCode >= 48 && event.charCode <= 57"
                style="width:100%; padding:8px; text-align:center; font-size:var(--font-size-lg); font-weight:700; border:2px solid var(--border); border-radius:var(--radius-md);">
              <button class="btn btn-success btn-sm" onclick="saveRealScore(${match.id})">
                Guardar
              </button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function saveRealScore(matchId) {
  const homeGoals = parseInt(document.getElementById(`admin-home-${matchId}`).value);
  const awayGoals = parseInt(document.getElementById(`admin-away-${matchId}`).value);

  if (isNaN(homeGoals) || isNaN(awayGoals)) {
    showToast('Ingresa ambos marcadores', 'error');
    return;
  }

  const match = adminMatches.find(m => m.id === matchId);
  const msg = match?.is_finished
    ? '¿Modificar el resultado ya registrado? Esto recalculará los puntos de todos los usuarios.'
    : '¿Confirmas que este es el resultado real? Esto calculará los puntos de todos los usuarios.';

  if (!confirm(msg)) return;

  try {
    showLoader();
    const response = await api.updateRealScore(matchId, homeGoals, awayGoals);
    showToast(response.message, 'success');
    await loadAdmin();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

// ── Tab: Reporte ──────────────────────────────────────────────────────────────

// ── Reporte: fases disponibles ────────────────────────────────────────────────

const REPORT_PHASES = [
  { key: 'summary',      label: '📊 General' },
  { key: 'group',        label: 'Fase de Grupos' },
  { key: 'round_of_16',  label: 'Dieciseisavos' },
  { key: 'round_of_8',   label: 'Octavos' },
  { key: 'quarterfinal', label: 'Cuartos' },
  { key: 'semifinal',    label: 'Semifinal' },
  { key: 'third_place',  label: '3er/4to Puesto' },
  { key: 'final',        label: 'Final' },
];

let activeReportPhase = 'summary';

async function renderReportTab() {
  const content = document.getElementById('admin-tab-content');
  content.innerHTML = `
    <div class="phase-tabs" style="display:flex; flex-wrap:wrap; gap:var(--spacing-xs); margin-bottom:var(--spacing-lg);">
      ${REPORT_PHASES.map(p => `
        <button class="phase-tab ${p.key === activeReportPhase ? 'active' : ''}"
                onclick="switchReportPhase('${p.key}')">
          ${p.label}
        </button>
      `).join('')}
    </div>
    <div id="report-body"><p style="color:var(--text-secondary);">Cargando reporte...</p></div>
  `;

  await loadReportBody();
}

function switchReportPhase(phase) {
  activeReportPhase = phase;
  document.querySelectorAll('#admin-tab-content .phase-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${phase}'`));
  });
  loadReportBody();
}

async function loadReportBody() {
  const body = document.getElementById('report-body');
  body.innerHTML = `<p style="color:var(--text-secondary);">Cargando reporte...</p>`;

  try {
    if (activeReportPhase === 'summary') {
      await renderReportSummary(body);
    } else {
      await renderReportByPhase(body, activeReportPhase);
    }
  } catch (err) {
    body.innerHTML = `<p style="color:var(--danger);">Error al cargar reporte: ${err.message}</p>`;
  }
}

// ── Reporte: Vista General (consolidado por usuario y fase) ───────────────────

async function renderReportSummary(body) {
  const res = await api.getReportSummary();
  const { stages, users } = res.data;

  if (!users || users.length === 0) {
    body.innerHTML = `<p style="color:var(--text-secondary);">Sin datos aún.</p>`;
    return;
  }

  const thStyle = 'padding:8px 10px; text-align:center; font-weight:600; border-bottom:2px solid var(--border); white-space:nowrap;';
  const tdStyle = 'padding:8px 10px; text-align:center;';

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--spacing-lg); flex-wrap:wrap; gap:var(--spacing-sm);">
      <div><strong>${users.length}</strong> participantes</div>
      <button class="btn btn-primary btn-sm" onclick="exportReportSummaryCSV()">⬇️ Exportar CSV</button>
    </div>

    <div style="overflow-x:auto; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:var(--spacing-md);">
      <table style="width:100%; border-collapse:collapse; font-size:var(--font-size-sm);">
        <thead>
          <tr style="background:var(--background);">
            <th style="${thStyle}; text-align:left;">#</th>
            <th style="${thStyle}; text-align:left;">Participante</th>
            ${stages.map(s => `<th style="${thStyle}">${s.label}</th>`).join('')}
            <th style="${thStyle}">Bonus</th>
            <th style="${thStyle}; background:var(--primary); color:white;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${users.map((u, i) => `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="${tdStyle}; text-align:left; font-weight:600;">${i + 1}</td>
              <td style="${tdStyle}; text-align:left;">
                <div style="font-weight:600;">${escapeHtml(u.nombre)}</div>
                <div style="font-size:var(--font-size-xs); color:var(--text-secondary);">${escapeHtml(u.email)}</div>
              </td>
              ${stages.map(s => {
                const cell = u.by_stage[s.stage];
                const pts = cell ? cell.points : 0;
                return `<td style="${tdStyle}; ${pts > 0 ? 'color:var(--success); font-weight:600;' : 'color:var(--text-secondary);'}">${pts}</td>`;
              }).join('')}
              <td style="${tdStyle}; color:${u.bonus_points > 0 ? 'var(--success)' : 'var(--text-secondary)'}; font-weight:600;">${u.bonus_points}</td>
              <td style="${tdStyle}; background:var(--background); font-weight:700; font-size:var(--font-size-md);">${u.total_points}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  window._reportSummary = { stages, users };
}

// ── Reporte: Vista por Fase (detalle de predicciones) ─────────────────────────

async function renderReportByPhase(body, stage) {
  const res = await api.getFullReport(stage);
  const rows = res.data;

  const phaseLabel = REPORT_PHASES.find(p => p.key === stage)?.label || stage;

  if (rows.length === 0) {
    body.innerHTML = `<p style="color:var(--text-secondary);">Sin predicciones para la fase <strong>${phaseLabel}</strong>.</p>`;
    return;
  }

  // Agrupar por usuario y calcular totales de la fase
  const byUser = {};
  rows.forEach(r => {
    if (!byUser[r.user_id]) {
      byUser[r.user_id] = {
        user_id: r.user_id,
        nombre:  r.usuario,
        email:   r.email,
        preds:   [],
        total:   0,
      };
    }
    byUser[r.user_id].preds.push(r);
    if (r.is_finished) byUser[r.user_id].total += (r.total_points || 0);
  });

  // Ordenar usuarios por puntaje de la fase desc
  const users = Object.values(byUser).sort((a, b) => b.total - a.total);

  const totalUsers = users.length;
  const totalPreds = rows.length;

  const thStyle = 'padding:8px 10px; text-align:left; font-weight:600; border-bottom:2px solid var(--border);';
  const tdStyle = 'padding:8px 10px;';

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--spacing-lg); flex-wrap:wrap; gap:var(--spacing-sm);">
      <div>
        <strong>${phaseLabel}</strong> ·
        <strong>${totalUsers}</strong> usuarios ·
        <strong>${totalPreds}</strong> predicciones
      </div>
      <button class="btn btn-primary btn-sm" onclick="exportReportPhaseCSV('${stage}')">⬇️ Exportar CSV</button>
    </div>

    ${users.map((u, idx) => `
      <div style="margin-bottom:var(--spacing-xl); background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--spacing-sm) var(--spacing-md); background:var(--primary); color:white;">
          <div>
            <strong>#${idx + 1} · ${escapeHtml(u.nombre)}</strong>
            <span style="font-weight:400; font-size:var(--font-size-sm); opacity:0.85;"> (${escapeHtml(u.email)})</span>
          </div>
          <div style="font-weight:700;">${u.total} pts</div>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:var(--font-size-sm);">
            <thead>
              <tr style="background:var(--background);">
                ${stage === 'group' ? `<th style="${thStyle}">Grupo</th><th style="${thStyle}">J</th>` : `<th style="${thStyle}">Fase</th>`}
                <th style="${thStyle}">Local</th>
                <th style="${thStyle}">Visitante</th>
                <th style="${thStyle}; text-align:center;">Pred.</th>
                <th style="${thStyle}; text-align:center;">Real</th>
                <th style="${thStyle}; text-align:center;">Pts</th>
              </tr>
            </thead>
            <tbody>
              ${u.preds.map(p => `
                <tr style="border-bottom:1px solid var(--border);">
                  ${stage === 'group'
                    ? `<td style="${tdStyle}">${escapeHtml(p.grupo || '')}</td><td style="${tdStyle}; text-align:center;">${p.jornada}</td>`
                    : `<td style="${tdStyle}">${escapeHtml(p.stage_label || '')}</td>`
                  }
                  <td style="${tdStyle}">${escapeHtml(p.local)}</td>
                  <td style="${tdStyle}">${escapeHtml(p.visitante)}</td>
                  <td style="${tdStyle}; text-align:center; font-weight:600;">${p.pred_local} - ${p.pred_visitante}</td>
                  <td style="${tdStyle}; text-align:center; color:${p.is_finished ? 'var(--text-primary)' : 'var(--text-secondary)'};">
                    ${p.is_finished ? `${p.real_home_goals} - ${p.real_away_goals}` : '—'}
                  </td>
                  <td style="${tdStyle}; text-align:center; font-weight:700; color:${p.total_points > 0 ? 'var(--success)' : 'var(--text-secondary)'};">
                    ${p.is_finished ? p.total_points : '—'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('')}
  `;

  window._reportData = window._reportData || {};
  window._reportData[stage] = rows;
}

// ── Reporte: helpers ──────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function csvCell(v) {
  if (v == null) return '';
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

function downloadCSV(filename, csvRows) {
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportReportPhaseCSV(stage) {
  const rows = (window._reportData || {})[stage];
  if (!rows || rows.length === 0) return;

  const isGroup = stage === 'group';
  const headers = isGroup
    ? ['Usuario','Email','Grupo','Jornada','Local','Visitante','Pred Local','Pred Visitante','Real Local','Real Visitante','Pts Ganador','Pts Marcador','Total Pts']
    : ['Usuario','Email','Fase','Local','Visitante','Pred Local','Pred Visitante','Real Local','Real Visitante','Pts Ganador','Pts Marcador','Total Pts'];

  const csvRows = [
    headers.join(','),
    ...rows.map(r => {
      const base = isGroup
        ? [csvCell(r.usuario), csvCell(r.email), csvCell(r.grupo), r.jornada, csvCell(r.local), csvCell(r.visitante)]
        : [csvCell(r.usuario), csvCell(r.email), csvCell(r.stage_label), csvCell(r.local), csvCell(r.visitante)];
      return [
        ...base,
        r.pred_local,
        r.pred_visitante,
        r.is_finished ? r.real_home_goals : '',
        r.is_finished ? r.real_away_goals : '',
        r.is_finished ? r.points_winner   : '',
        r.is_finished ? r.points_score    : '',
        r.is_finished ? r.total_points    : '',
      ].join(',');
    }),
  ];

  downloadCSV(`reporte_${stage}_${new Date().toISOString().slice(0,10)}.csv`, csvRows);
}

function exportReportSummaryCSV() {
  const data = window._reportSummary;
  if (!data) return;
  const { stages, users } = data;

  const headers = ['Posicion','Participante','Email', ...stages.map(s => s.label), 'Bonus','TOTAL'];
  const csvRows = [
    headers.join(','),
    ...users.map((u, i) => [
      i + 1,
      csvCell(u.nombre),
      csvCell(u.email),
      ...stages.map(s => (u.by_stage[s.stage]?.points ?? 0)),
      u.bonus_points,
      u.total_points,
    ].join(',')),
  ];

  downloadCSV(`reporte_general_${new Date().toISOString().slice(0,10)}.csv`, csvRows);
}

// ── Tab: Configuración ────────────────────────────────────────────────────────

async function renderConfigTab() {
  const content = document.getElementById('admin-tab-content');
  content.innerHTML = `<p style="color:var(--text-secondary);">Cargando configuración...</p>`;

  try {
    const [settingsRes, phasesRes] = await Promise.all([
      api.getSettings(),
      api.getKnockoutPhases(),
    ]);

    const deadline = settingsRes.data.prediction_deadline;
    const deadlineLocal = deadline ? deadline.slice(0, 16) : '';
    const phases = phasesRes.data;

    content.innerHTML = `

      <!-- Fecha límite global (grupos) -->
      <div style="background:var(--surface); padding:var(--spacing-lg); border-radius:var(--radius-lg); border:1px solid var(--border); margin-bottom:var(--spacing-lg);">
        <h3 style="margin-bottom:var(--spacing-sm);">⚽ Fecha límite — Fase de Grupos</h3>
        <p style="color:var(--text-secondary); font-size:var(--font-size-sm); margin-bottom:var(--spacing-md);">
          Los usuarios no podrán editar predicciones de grupos después de esta fecha.
        </p>
        <form onsubmit="handleSaveDeadline(event)">
          <div class="form-group">
            <label>Fecha y hora límite</label>
            <input type="datetime-local" id="config-deadline" value="${deadlineLocal}" required>
          </div>
          <div style="display:flex; align-items:center; gap:var(--spacing-md); flex-wrap:wrap;">
            <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
            <span style="font-size:var(--font-size-sm); color:var(--text-secondary);">
              Actual: <strong>${deadline ? new Date(deadline).toLocaleString('es-ES') : '—'}</strong>
            </span>
          </div>
        </form>
      </div>

      <!-- Fechas límite por fase eliminatoria -->
      <div style="background:var(--surface); padding:var(--spacing-lg); border-radius:var(--radius-lg); border:1px solid var(--border);">
        <h3 style="margin-bottom:var(--spacing-md);">🏆 Fechas límite — Fases Eliminatorias</h3>
        <p style="color:var(--text-secondary); font-size:var(--font-size-sm); margin-bottom:var(--spacing-lg);">
          Configura la fecha límite de predicciones para cada fase eliminatoria.
          También puedes ajustarla al momento de publicar cada fase.
        </p>
        <div style="display:grid; gap:var(--spacing-md);">
          ${phases.map(phase => {
            const dl = phase.prediction_deadline ? phase.prediction_deadline.slice(0,16) : '';
            return `
              <div style="padding:var(--spacing-md); background:var(--background); border-radius:var(--radius-md);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--spacing-sm); flex-wrap:wrap; gap:var(--spacing-sm);">
                  <div>
                    <strong>${phase.label}</strong>
                    ${phase.published
                      ? '<span style="font-size:var(--font-size-xs); color:var(--success); margin-left:8px;">✓ Publicada</span>'
                      : '<span style="font-size:var(--font-size-xs); color:var(--text-secondary); margin-left:8px;">No publicada</span>'
                    }
                  </div>
                </div>
                <form onsubmit="handleSavePhaseDeadline(event, '${phase.stage}')">
                  <div style="display:flex; gap:var(--spacing-sm); align-items:center; flex-wrap:wrap;">
                    <input type="datetime-local" id="phase-deadline-${phase.stage}"
                      value="${dl}"
                      style="flex:1; min-width:200px; padding:8px; border:1px solid var(--border); border-radius:var(--radius-md); font-size:var(--font-size-sm);">
                    <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
                  </div>
                  ${dl ? `<div style="font-size:var(--font-size-xs); color:var(--text-secondary); margin-top:4px;">
                    Actual: ${new Date(phase.prediction_deadline).toLocaleString('es-ES')}
                  </div>` : ''}
                </form>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    content.innerHTML = `<p style="color:var(--danger);">Error al cargar configuración: ${error.message}</p>`;
  }
}

async function handleSaveDeadline(event) {
  event.preventDefault();
  const value = document.getElementById('config-deadline').value;
  if (!value) return;
  try {
    showLoader();
    await api.updateSetting('prediction_deadline', value);
    showToast('Fecha límite de grupos actualizada', 'success');
    renderConfigTab();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

async function handleSavePhaseDeadline(event, stage) {
  event.preventDefault();
  const value = document.getElementById(`phase-deadline-${stage}`).value;
  if (!value) {
    showToast('Ingresa una fecha límite', 'error');
    return;
  }
  try {
    showLoader();
    // Publicar con el nuevo deadline (si ya está publicada, solo actualiza el deadline)
    await api.updateSetting(`phase_deadline_${stage}`, value);
    // También actualizar en knockout_phases via el endpoint de publicación
    await fetch(`/api/matches/knockout/${stage}/deadline`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.token}` },
      body: JSON.stringify({ prediction_deadline: value }),
    });
    showToast(`Fecha límite de ${STAGE_LABELS[stage]} actualizada`, 'success');
    renderConfigTab();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

// ── Tab: Eliminatorias ────────────────────────────────────────────────────────

const STAGE_LABELS = {
  round_of_16:  'Dieciseisavos de Final',
  round_of_8:   'Octavos de Final',
  quarterfinal: 'Cuartos de Final',
  semifinal:    'Semifinal',
  third_place:  'Tercer y Cuarto Puesto',
  final:        'Final',
};

const STAGE_COUNTS = {
  round_of_16: 16, round_of_8: 8, quarterfinal: 4, semifinal: 2, third_place: 1, final: 1,
};

let knockoutTeams = [];
let knockoutPhases = [];

async function renderKnockoutTab() {
  const content = document.getElementById('admin-tab-content');
  content.innerHTML = `<p style="color:var(--text-secondary);">Cargando...</p>`;

  try {
    const [teamsRes, phasesRes] = await Promise.all([
      api.getGroupsWithTeams(),
      api.getKnockoutPhases(),
    ]);

    // Aplanar equipos de todos los grupos
    knockoutTeams = teamsRes.data.flatMap(g => g.teams);
    knockoutPhases = phasesRes.data;

    renderKnockoutPhases(content);
  } catch (err) {
    content.innerHTML = `<p style="color:var(--danger);">Error: ${err.message}</p>`;
  }
}

function renderKnockoutPhases(content) {
  // Ordenar equipos alfabéticamente
  const sortedTeams = [...knockoutTeams].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const teamOptions = sortedTeams
    .map(t => `<option value="${t.id}">${t.flag} ${t.name}</option>`)
    .join('');

  content.innerHTML = knockoutPhases.map(phase => {
    const label     = phase.label;
    const stage     = phase.stage;
    const total     = parseInt(phase.match_count);
    const created   = parseInt(phase.created_count);
    const finished  = parseInt(phase.finished_count);
    const published = phase.published;
    const complete  = created >= total;
    const dl        = phase.prediction_deadline ? phase.prediction_deadline.slice(0,16) : '';

    return `
      <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:var(--spacing-lg); margin-bottom:var(--spacing-lg);">

        <!-- Encabezado -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:var(--spacing-md); flex-wrap:wrap; gap:var(--spacing-sm);">
          <div>
            <h3 style="margin:0;">${label}</h3>
            <div style="font-size:var(--font-size-sm); color:var(--text-secondary); margin-top:4px;">
              ${created}/${total} partidos · ${finished} finalizados
              ${published ? ' · <span style="color:var(--success); font-weight:600;">✓ Publicado</span>' : ''}
            </div>
          </div>
          ${!published && complete ? `
            <button class="btn btn-primary btn-sm" onclick="handlePublishPhase('${stage}')">
              📢 Publicar fase
            </button>
          ` : ''}
          ${!published && !complete ? `
            <span style="font-size:var(--font-size-xs); color:var(--warning);">
              Crea los ${total} partidos para publicar
            </span>
          ` : ''}
        </div>

        <!-- Fecha límite de predicciones (siempre visible) -->
        <div style="background:var(--background); padding:var(--spacing-md); border-radius:var(--radius-md); margin-bottom:var(--spacing-md);">
          <form onsubmit="handleSavePhaseDeadlineInline(event, '${stage}')">
            <div style="display:flex; align-items:center; gap:var(--spacing-sm); flex-wrap:wrap;">
              <label style="font-size:var(--font-size-sm); font-weight:500; white-space:nowrap;">
                📅 Fecha límite predicciones:
              </label>
              <input type="datetime-local" id="ko-deadline-${stage}"
                value="${dl}"
                style="flex:1; min-width:180px; padding:6px 8px; border:1px solid var(--border); border-radius:var(--radius-md); font-size:var(--font-size-sm);">
              <button type="submit" class="btn ${published ? 'btn-outline' : 'btn-primary'} btn-sm">
                ${published ? 'Guardar' : '💾 Guardar y activar'}
              </button>
            </div>
            ${!published && created > 0 ? `<div style="font-size:var(--font-size-xs); color:var(--warning); margin-top:4px;">
              Al guardar la fecha se publicará la fase y los usuarios podrán registrar sus predicciones.
            </div>` : ''}
            ${dl ? `<div style="font-size:var(--font-size-xs); color:var(--text-secondary); margin-top:4px;">
              Actual: ${new Date(phase.prediction_deadline).toLocaleString('es-ES')}
            </div>` : ''}
          </form>
        </div>

        <!-- Formulario agregar partido -->
        ${!complete ? `
          <div style="background:var(--background); padding:var(--spacing-md); border-radius:var(--radius-md); margin-bottom:var(--spacing-md);">
            <p style="font-size:var(--font-size-sm); font-weight:600; margin-bottom:var(--spacing-sm);">
              ➕ Agregar partido ${created + 1} de ${total}
            </p>
            <form onsubmit="handleCreateKnockoutMatch(event, '${stage}')">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--spacing-sm);">
                <div class="form-group" style="margin:0;">
                  <label style="font-size:var(--font-size-xs);">Equipo Local</label>
                  <select id="ko-home-${stage}" required style="width:100%; padding:8px; border:1px solid var(--border); border-radius:var(--radius-md); font-size:var(--font-size-sm);">
                    <option value="">Seleccionar...</option>
                    ${teamOptions}
                  </select>
                </div>
                <div class="form-group" style="margin:0;">
                  <label style="font-size:var(--font-size-xs);">Equipo Visitante</label>
                  <select id="ko-away-${stage}" required style="width:100%; padding:8px; border:1px solid var(--border); border-radius:var(--radius-md); font-size:var(--font-size-sm);">
                    <option value="">Seleccionar...</option>
                    ${teamOptions}
                  </select>
                </div>
              </div>
              <div class="form-group" style="margin-top:var(--spacing-sm);">
                <label style="font-size:var(--font-size-xs);">Fecha y hora del partido</label>
                <input type="datetime-local" id="ko-date-${stage}" required
                  style="width:100%; padding:8px; border:1px solid var(--border); border-radius:var(--radius-md); font-size:var(--font-size-sm);">
              </div>
              <button type="submit" class="btn btn-primary btn-sm" style="margin-top:var(--spacing-sm);">
                ➕ Agregar partido
              </button>
            </form>
          </div>
        ` : ''}

        <!-- Lista de partidos creados -->
        ${created > 0 ? `
          <div>
            <p style="font-size:var(--font-size-sm); font-weight:600; margin-bottom:var(--spacing-sm);">Partidos:</p>
            <div id="ko-list-${stage}">Cargando...</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  knockoutPhases.forEach(phase => {
    if (parseInt(phase.created_count) > 0) {
      loadKnockoutMatchList(phase.stage, teamOptions);
    }
  });
}

async function loadKnockoutMatchList(stage, teamOptions) {
  try {
    const res = await api.getMatchesByStage(stage);
    const listEl = document.getElementById(`ko-list-${stage}`);
    if (!listEl) return;

    // Si no se pasó teamOptions, construirlo
    if (!teamOptions) {
      const sortedTeams = [...knockoutTeams].sort((a, b) => a.name.localeCompare(b.name, 'es'));
      teamOptions = sortedTeams.map(t => `<option value="${t.id}">${t.flag} ${t.name}</option>`).join('');
    }

    listEl.innerHTML = res.data.map(m => {
      const d = new Date(m.match_date);
      return `
        <div style="padding:var(--spacing-sm) 0; border-bottom:1px solid var(--border);">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:var(--font-size-sm);">
            <div>
              <span>${m.home_team_flag} ${m.home_team_name}</span>
              <span style="margin:0 8px; color:var(--text-secondary);">vs</span>
              <span>${m.away_team_flag} ${m.away_team_name}</span>
            </div>
            <div style="display:flex; align-items:center; gap:var(--spacing-sm);">
              <span style="color:var(--text-secondary); font-size:var(--font-size-xs);">
                ${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}
                ${m.is_finished ? ' · <span style="color:var(--success);">✓</span>' : ''}
              </span>
              <button class="btn btn-outline btn-sm" style="font-size:10px; padding:2px 6px;"
                onclick="showEditMatchForm(${m.id}, '${stage}')">✏️</button>
            </div>
          </div>
          <!-- Formulario editar partido (oculto) -->
          <div id="edit-match-${m.id}" style="display:none; margin-top:var(--spacing-sm); padding:var(--spacing-sm); background:var(--background); border-radius:var(--radius-md);">
            <form onsubmit="handleEditKnockoutMatch(event, ${m.id}, '${stage}')">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--spacing-sm); margin-bottom:var(--spacing-sm);">
                <div>
                  <label style="font-size:var(--font-size-xs);">Local</label>
                  <select id="edit-match-home-${m.id}" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:var(--radius-md); font-size:var(--font-size-sm);">
                    ${teamOptions.replace(`value="${m.home_team_id}"`, `value="${m.home_team_id}" selected`)}
                  </select>
                </div>
                <div>
                  <label style="font-size:var(--font-size-xs);">Visitante</label>
                  <select id="edit-match-away-${m.id}" style="width:100%; padding:6px; border:1px solid var(--border); border-radius:var(--radius-md); font-size:var(--font-size-sm);">
                    ${teamOptions.replace(`value="${m.away_team_id}"`, `value="${m.away_team_id}" selected`)}
                  </select>
                </div>
              </div>
              <div style="margin-bottom:var(--spacing-sm);">
                <label style="font-size:var(--font-size-xs);">Fecha y hora</label>
                <input type="datetime-local" id="edit-match-date-${m.id}"
                  value="${m.match_date.slice(0,16)}"
                  style="width:100%; padding:6px; border:1px solid var(--border); border-radius:var(--radius-md); font-size:var(--font-size-sm);">
              </div>
              <div style="display:flex; gap:var(--spacing-sm);">
                <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
                <button type="button" class="btn btn-outline btn-sm" onclick="hideEditMatchForm(${m.id})">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    const listEl = document.getElementById(`ko-list-${stage}`);
    if (listEl) listEl.innerHTML = `<p style="color:var(--danger);">Error: ${err.message}</p>`;
  }
}

function showEditMatchForm(matchId, stage) {
  document.querySelectorAll('[id^="edit-match-"]').forEach(el => {
    if (!el.id.includes('home') && !el.id.includes('away') && !el.id.includes('date')) {
      el.style.display = 'none';
    }
  });
  document.getElementById(`edit-match-${matchId}`).style.display = 'block';
}

function hideEditMatchForm(matchId) {
  document.getElementById(`edit-match-${matchId}`).style.display = 'none';
}

async function handleEditKnockoutMatch(event, matchId, stage) {
  event.preventDefault();
  const homeId   = document.getElementById(`edit-match-home-${matchId}`).value;
  const awayId   = document.getElementById(`edit-match-away-${matchId}`).value;
  const matchDate = document.getElementById(`edit-match-date-${matchId}`).value;

  if (homeId === awayId) {
    showToast('Los equipos deben ser diferentes', 'error');
    return;
  }

  try {
    showLoader();
    await fetch(`/api/matches/knockout/${matchId}/edit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.token}` },
      body: JSON.stringify({ home_team_id: parseInt(homeId), away_team_id: parseInt(awayId), match_date: matchDate }),
    });
    showToast('Partido actualizado', 'success');
    await renderKnockoutTab();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function handleSavePhaseDeadlineInline(event, stage) {
  event.preventDefault();
  const value = document.getElementById(`ko-deadline-${stage}`).value;
  if (!value) {
    showToast('Ingresa una fecha límite', 'error');
    return;
  }
  try {
    showLoader();
    const res = await fetch(`/api/matches/knockout/${stage}/deadline`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${api.token}` },
      body: JSON.stringify({ prediction_deadline: value }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body?.error?.message || `HTTP ${res.status}`);
    }
    const label = STAGE_LABELS[stage] || stage;
    showToast(`${label}: ${body.message || 'Fecha límite actualizada'}`, 'success');
    await renderKnockoutTab();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function handleCreateKnockoutMatch(event, stage) {
  event.preventDefault();
  const homeId   = document.getElementById(`ko-home-${stage}`).value;
  const awayId   = document.getElementById(`ko-away-${stage}`).value;
  const matchDate = document.getElementById(`ko-date-${stage}`).value;

  if (homeId === awayId) {
    showToast('Los equipos deben ser diferentes', 'error');
    return;
  }

  try {
    showLoader();
    await api.createKnockoutMatch({
      stage,
      match_date: matchDate,
      home_team_id: parseInt(homeId),
      away_team_id: parseInt(awayId),
    });
    showToast('Partido creado exitosamente', 'success');
    await renderKnockoutTab();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoader();
  }
}

async function handlePublishPhase(stage) {
  const label = STAGE_LABELS[stage] || stage;
  const deadlineInput = document.getElementById(`ko-deadline-${stage}`);
  const deadline = deadlineInput ? deadlineInput.value : null;

  if (!deadline) {
    showToast('Debes ingresar una fecha límite de predicciones antes de publicar', 'error');
    return;
  }

  if (!confirm(`¿Publicar la fase "${label}"?\nFecha límite: ${new Date(deadline).toLocaleString('es-ES')}\nLos usuarios podrán registrar predicciones hasta esa fecha.`)) return;

  try {
    showLoader();
    const res = await api.publishKnockoutPhase(stage, deadline);
    showToast(res.message, 'success');
    await renderKnockoutTab();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoader();
  }
}

// ── Tab: Especiales (admin) ───────────────────────────────────────────────────

async function renderAdminSpecialTab() {
  const content = document.getElementById('admin-tab-content');
  content.innerHTML = '<p style="color:var(--text-secondary);">Cargando...</p>';

  try {
    const [teamsRes, resultsRes, allSpecialRes] = await Promise.all([
      api.getGroupsWithTeams(),
      api.getSpecialResults(),
      api.getAllSpecial(),
    ]);

    const teams   = teamsRes.data.flatMap(g => g.teams).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    const results = resultsRes.data;
    const allPred = allSpecialRes.data;

    const makeSelect = (id, selectedId) => `
      <select id="${id}" style="width:100%; padding:10px; border:1px solid var(--border); border-radius:var(--radius-md);">
        <option value="">Seleccionar equipo...</option>
        ${teams.map(t => `<option value="${t.id}" ${t.id === selectedId ? 'selected' : ''}>${t.flag} ${t.name}</option>`).join('')}
      </select>
    `;

    content.innerHTML = `
      <!-- Registrar resultados reales del torneo -->
      <div style="background:var(--surface); padding:var(--spacing-lg); border-radius:var(--radius-lg); border:1px solid var(--border); margin-bottom:var(--spacing-xl);">
        <h3 style="margin-bottom:var(--spacing-md);">Registrar Resultados del Torneo</h3>
        <p style="color:var(--text-secondary); font-size:var(--font-size-sm); margin-bottom:var(--spacing-lg);">
          Al guardar, el sistema calculará automáticamente los puntos bonus de todos los usuarios.
        </p>
        <form onsubmit="handleSaveAdminSpecialResults(event)">
          <div class="form-group">
            <label>⚽ Goleador del Mundial</label>
            <input type="text" id="admin-special-goleador" value="${results?.goleador || ''}"
              placeholder="Nombre del goleador">
          </div>
          <div class="form-group">
            <label>🏆 Equipo Campeón</label>
            ${makeSelect('admin-special-champion', results?.champion)}
          </div>
          <div class="form-group">
            <label>🥈 Equipo Subcampeón</label>
            ${makeSelect('admin-special-runner-up', results?.runner_up)}
          </div>
          <div class="form-group">
            <label>🥉 Equipo Tercer Lugar</label>
            ${makeSelect('admin-special-third', results?.third_place)}
          </div>
          <button type="submit" class="btn btn-primary">Guardar y Calcular Puntos</button>
        </form>
      </div>

      <!-- Pronósticos de todos los usuarios -->
      <div style="background:var(--surface); padding:var(--spacing-lg); border-radius:var(--radius-lg); border:1px solid var(--border);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--spacing-md); flex-wrap:wrap; gap:var(--spacing-sm);">
          <h3 style="margin:0;">Pronósticos de Participantes (${allPred.length})</h3>
          ${allPred.length > 0 ? `<button class="btn btn-primary btn-sm" onclick="exportSpecialCSV()">⬇️ Exportar CSV</button>` : ''}
        </div>
        ${allPred.length === 0 ? '<p style="color:var(--text-secondary);">Ningún usuario ha ingresado pronósticos especiales.</p>' : `
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:var(--font-size-sm);">
              <thead>
                <tr style="background:var(--background);">
                  <th style="padding:8px 12px; text-align:left; font-weight:600; border-bottom:2px solid var(--border);">Usuario</th>
                  <th style="padding:8px 12px; text-align:left; font-weight:600; border-bottom:2px solid var(--border);">Goleador</th>
                  <th style="padding:8px 12px; text-align:left; font-weight:600; border-bottom:2px solid var(--border);">Campeón</th>
                  <th style="padding:8px 12px; text-align:left; font-weight:600; border-bottom:2px solid var(--border);">Subcampeón</th>
                  <th style="padding:8px 12px; text-align:left; font-weight:600; border-bottom:2px solid var(--border);">3er Lugar</th>
                  <th style="padding:8px 12px; text-align:center; font-weight:600; border-bottom:2px solid var(--border);">Bonus</th>
                </tr>
              </thead>
              <tbody>
                ${allPred.map(p => `
                  <tr style="border-bottom:1px solid var(--border);">
                    <td style="padding:8px 12px;"><strong>${p.nombre}</strong></td>
                    <td style="padding:8px 12px;">${p.goleador || '—'}</td>
                    <td style="padding:8px 12px;">${p.champion_flag ? p.champion_flag + ' ' + p.champion_name : '—'}</td>
                    <td style="padding:8px 12px;">${p.runner_up_flag ? p.runner_up_flag + ' ' + p.runner_up_name : '—'}</td>
                    <td style="padding:8px 12px;">${p.third_place_flag ? p.third_place_flag + ' ' + p.third_place_name : '—'}</td>
                    <td style="padding:8px 12px; text-align:center; font-weight:700; color:${p.total_bonus > 0 ? 'var(--success)' : 'var(--text-secondary)'};">
                      ${p.total_bonus}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<p style="color:var(--danger);">Error: ${err.message}</p>`;
  }
}

async function handleSaveAdminSpecialResults(event) {
  event.preventDefault();

  const data = {
    goleador:    document.getElementById('admin-special-goleador').value.trim(),
    champion:    parseInt(document.getElementById('admin-special-champion').value) || null,
    runner_up:   parseInt(document.getElementById('admin-special-runner-up').value) || null,
    third_place: parseInt(document.getElementById('admin-special-third').value) || null,
  };

  if (!confirm('¿Guardar los resultados del torneo? Esto calculará los puntos bonus de todos los usuarios.')) return;

  try {
    showLoader();
    const res = await api.saveSpecialResults(data);
    showToast(res.message, 'success');
    await renderAdminSpecialTab();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoader();
  }
}

// ── Exportar CSV de pronósticos especiales ────────────────────────────────────

function exportSpecialCSV() {
  // Obtener datos del DOM (la tabla ya está renderizada)
  api.getAllSpecial().then(res => {
    const rows = res.data;
    if (!rows || rows.length === 0) return;

    const headers = ['Usuario', 'Email', 'Goleador', 'Campeón', 'Subcampeón', 'Tercer Lugar', 'Pts Campeón', 'Pts Subcampeón', 'Pts 3er Lugar', 'Total Bonus'];

    const csvRows = [
      headers.join(','),
      ...rows.map(r => [
        `"${r.nombre}"`,
        `"${r.email}"`,
        `"${r.goleador || ''}"`,
        `"${r.champion_name ? r.champion_flag + ' ' + r.champion_name : ''}"`,
        `"${r.runner_up_name ? r.runner_up_flag + ' ' + r.runner_up_name : ''}"`,
        `"${r.third_place_name ? r.third_place_flag + ' ' + r.third_place_name : ''}"`,
        r.points_champion,
        r.points_runner_up,
        r.points_third,
        r.total_bonus,
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `reporte_especiales_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }).catch(err => {
    showToast('Error al exportar: ' + err.message, 'error');
  });
}
