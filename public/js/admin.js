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

// ── Tab: Resultados ───────────────────────────────────────────────────────────

function renderScoresTab() {
  const content = document.getElementById('admin-tab-content');
  content.innerHTML = `
    <p style="color: var(--text-secondary); margin-bottom: var(--spacing-lg); font-size: var(--font-size-sm);">
      Ingresa los marcadores reales. Esto calculará automáticamente los puntos de todos los usuarios.
    </p>
    <div style="display: grid; gap: var(--spacing-md);">
      ${adminMatches.map(match => {
        const matchDate = new Date(match.match_date);
        return `
          <div style="background: var(--surface); padding: var(--spacing-md); border-radius: var(--radius-lg); border: 1px solid var(--border);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
              <div>
                <strong>Grupo ${match.group_name}</strong> - J${match.jornada}
                <div style="font-size: var(--font-size-xs); color: var(--text-secondary);">
                  ${matchDate.toLocaleDateString('es-ES')} ${matchDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              ${match.is_finished ? '<span style="color: var(--success); font-weight: 500;">✓ Finalizado</span>' : ''}
            </div>
            <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: var(--spacing-md); align-items: center; margin-bottom: var(--spacing-md);">
              <div style="text-align: center;">
                <div style="font-size: 24px;">${match.home_team_flag}</div>
                <div style="font-size: var(--font-size-sm); font-weight: 500;">${match.home_team_name}</div>
              </div>
              <div style="font-weight: 700; color: var(--text-secondary);">VS</div>
              <div style="text-align: center;">
                <div style="font-size: 24px;">${match.away_team_flag}</div>
                <div style="font-size: var(--font-size-sm); font-weight: 500;">${match.away_team_name}</div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr auto 1fr auto; gap: var(--spacing-sm); align-items: center;">
              <input type="number" min="0" max="20"
                value="${match.real_home_goals ?? ''}"
                id="admin-home-${match.id}"
                style="width:100%; padding:8px; text-align:center; font-size:var(--font-size-lg); font-weight:700; border:2px solid var(--border); border-radius:var(--radius-md);"
                ${match.is_finished ? 'disabled' : ''}>
              <span style="font-weight:700;">-</span>
              <input type="number" min="0" max="20"
                value="${match.real_away_goals ?? ''}"
                id="admin-away-${match.id}"
                style="width:100%; padding:8px; text-align:center; font-size:var(--font-size-lg); font-weight:700; border:2px solid var(--border); border-radius:var(--radius-md);"
                ${match.is_finished ? 'disabled' : ''}>
              <button class="btn btn-success btn-sm" onclick="saveRealScore(${match.id})" ${match.is_finished ? 'disabled' : ''}>
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
  if (!confirm('¿Confirmas que este es el resultado real? Esto calculará los puntos de todos los usuarios.')) return;

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

async function renderReportTab() {
  const content = document.getElementById('admin-tab-content');
  content.innerHTML = `<p style="color:var(--text-secondary);">Cargando reporte...</p>`;

  try {
    const res = await api.getFullReport();
    const rows = res.data;

    if (rows.length === 0) {
      content.innerHTML = `<p style="color:var(--text-secondary);">Ningún usuario ha ingresado predicciones aún.</p>`;
      return;
    }

    // Agrupar por usuario
    const byUser = {};
    rows.forEach(r => {
      if (!byUser[r.email]) byUser[r.email] = { nombre: r.usuario, email: r.email, preds: [] };
      byUser[r.email].preds.push(r);
    });

    const totalUsers = Object.keys(byUser).length;
    const totalPreds = rows.length;

    const thStyle = 'padding:8px 12px; text-align:left; font-weight:600; border-bottom:2px solid var(--border);';
    const tdStyle = 'padding:8px 12px;';

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--spacing-lg); flex-wrap:wrap; gap:var(--spacing-sm);">
        <div>
          <strong>${totalUsers}</strong> usuarios · <strong>${totalPreds}</strong> predicciones ingresadas
        </div>
        <button class="btn btn-primary btn-sm" onclick="exportReportCSV()">⬇️ Exportar CSV</button>
      </div>

      ${Object.values(byUser).map(u => `
        <div style="margin-bottom:var(--spacing-xl);">
          <h4 style="margin-bottom:var(--spacing-sm); padding:var(--spacing-sm) var(--spacing-md); background:var(--primary); color:white; border-radius:var(--radius-md);">
            ${u.nombre} <span style="font-weight:400; font-size:var(--font-size-sm);">(${u.email})</span>
          </h4>
          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:var(--font-size-sm);">
              <thead>
                <tr style="background:var(--background);">
                  <th style="${thStyle}">Grupo</th>
                  <th style="${thStyle}">J</th>
                  <th style="${thStyle}">Local</th>
                  <th style="${thStyle}">Visitante</th>
                  <th style="${thStyle}">Pred.</th>
                  <th style="${thStyle}">Real</th>
                  <th style="${thStyle}">Pts</th>
                </tr>
              </thead>
              <tbody>
                ${u.preds.map(p => `
                  <tr style="border-bottom:1px solid var(--border);">
                    <td style="${tdStyle}">${p.grupo}</td>
                    <td style="${tdStyle}; text-align:center;">${p.jornada}</td>
                    <td style="${tdStyle}">${p.local}</td>
                    <td style="${tdStyle}">${p.visitante}</td>
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

    window._reportData = rows;

  } catch (error) {
    content.innerHTML = `<p style="color:var(--danger);">Error al cargar reporte: ${error.message}</p>`;
  }
}

function exportReportCSV() {
  const rows = window._reportData;
  if (!rows || rows.length === 0) return;

  const headers = ['Usuario','Email','Grupo','Jornada','Local','Visitante','Pred Local','Pred Visitante','Real Local','Real Visitante','Pts Ganador','Pts Marcador','Total Puntos'];

  const csvRows = [
    headers.join(','),
    ...rows.map(r => [
      `"${r.usuario}"`,
      `"${r.email}"`,
      r.grupo,
      r.jornada,
      `"${r.local}"`,
      `"${r.visitante}"`,
      r.pred_local,
      r.pred_visitante,
      r.is_finished ? r.real_home_goals : '',
      r.is_finished ? r.real_away_goals : '',
      r.is_finished ? r.points_winner : '',
      r.is_finished ? r.points_score : '',
      r.is_finished ? r.total_points : '',
    ].join(','))
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `reporte_polla_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Tab: Configuración ────────────────────────────────────────────────────────

async function renderConfigTab() {
  const content = document.getElementById('admin-tab-content');
  content.innerHTML = `<p style="color:var(--text-secondary);">Cargando configuración...</p>`;

  try {
    const res = await api.getSettings();
    const deadline = res.data.prediction_deadline;

    // Convertir a formato datetime-local (YYYY-MM-DDTHH:MM)
    const deadlineLocal = deadline ? deadline.slice(0, 16) : '';

    content.innerHTML = `
      <div style="background:var(--surface); padding:var(--spacing-lg); border-radius:var(--radius-lg); border:1px solid var(--border); max-width:480px;">
        <h3 style="margin-bottom:var(--spacing-sm);">Fecha límite de predicciones</h3>
        <p style="color:var(--text-secondary); font-size:var(--font-size-sm); margin-bottom:var(--spacing-lg);">
          Los usuarios no podrán crear ni editar predicciones después de esta fecha y hora.
        </p>
        <form onsubmit="handleSaveDeadline(event)">
          <div class="form-group">
            <label>Fecha y hora límite</label>
            <input type="datetime-local" id="config-deadline" value="${deadlineLocal}" required
              style="font-size:var(--font-size-md);">
          </div>
          <div style="display:flex; align-items:center; gap:var(--spacing-md); flex-wrap:wrap;">
            <button type="submit" class="btn btn-primary">Guardar</button>
            <span id="config-current" style="font-size:var(--font-size-sm); color:var(--text-secondary);">
              Actual: <strong>${deadline ? new Date(deadline).toLocaleString('es-ES') : '—'}</strong>
            </span>
          </div>
        </form>
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
    showToast('Fecha límite actualizada exitosamente', 'success');
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
  const teamOptions = knockoutTeams
    .map(t => `<option value="${t.id}">${t.flag} ${t.name}</option>`)
    .join('');

  content.innerHTML = knockoutPhases.map(phase => {
    const label      = phase.label;
    const stage      = phase.stage;
    const total      = parseInt(phase.match_count);
    const created    = parseInt(phase.created_count);
    const finished   = parseInt(phase.finished_count);
    const published  = phase.published;
    const complete   = created >= total;

    return `
      <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); padding:var(--spacing-lg); margin-bottom:var(--spacing-lg);">

        <!-- Encabezado de fase -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--spacing-md); flex-wrap:wrap; gap:var(--spacing-sm);">
          <div>
            <h3 style="margin:0;">${label}</h3>
            <div style="font-size:var(--font-size-sm); color:var(--text-secondary); margin-top:4px;">
              ${created}/${total} partidos creados · ${finished} finalizados
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
              Crea los ${total} partidos para poder publicar
            </span>
          ` : ''}
        </div>

        <!-- Formulario para agregar partido (si no está completa) -->
        ${!complete ? `
          <div style="background:var(--background); padding:var(--spacing-md); border-radius:var(--radius-md); margin-bottom:var(--spacing-md);">
            <p style="font-size:var(--font-size-sm); font-weight:600; margin-bottom:var(--spacing-sm);">
              Agregar partido ${created + 1} de ${total}
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
          <div id="ko-matches-${stage}">
            <p style="font-size:var(--font-size-sm); font-weight:600; margin-bottom:var(--spacing-sm);">Partidos creados:</p>
            <div id="ko-list-${stage}">Cargando...</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // Cargar listas de partidos para fases con partidos creados
  knockoutPhases.forEach(phase => {
    if (parseInt(phase.created_count) > 0) {
      loadKnockoutMatchList(phase.stage);
    }
  });
}

async function loadKnockoutMatchList(stage) {
  try {
    const res = await api.getMatchesByStage(stage);
    const listEl = document.getElementById(`ko-list-${stage}`);
    if (!listEl) return;

    listEl.innerHTML = res.data.map(m => {
      const d = new Date(m.match_date);
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:var(--spacing-sm) 0; border-bottom:1px solid var(--border); font-size:var(--font-size-sm);">
          <div>
            <span>${m.home_team_flag} ${m.home_team_name}</span>
            <span style="margin:0 8px; color:var(--text-secondary);">vs</span>
            <span>${m.away_team_flag} ${m.away_team_name}</span>
          </div>
          <div style="color:var(--text-secondary); font-size:var(--font-size-xs);">
            ${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'})}
            ${m.is_finished ? ' · <span style="color:var(--success);">✓</span>' : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    const listEl = document.getElementById(`ko-list-${stage}`);
    if (listEl) listEl.innerHTML = `<p style="color:var(--danger);">Error: ${err.message}</p>`;
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
  if (!confirm(`¿Publicar la fase "${label}"? Los usuarios podrán ver y registrar predicciones para estos partidos.`)) return;

  try {
    showLoader();
    const res = await api.publishKnockoutPhase(stage);
    showToast(res.message, 'success');
    await renderKnockoutTab();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideLoader();
  }
}
