/**
 * Vista de perfil de usuario
 * - Ver y editar información personal (nombre, teléfono)
 * - Cambiar contraseña
 * - Ver mis predicciones con resultados y puntos
 */

async function loadProfile() {
  try {
    showLoader();

    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user.role === 'admin';

    // Admin no tiene posición en la tabla
    const requests = [api.getProfile()];
    if (!isAdmin) requests.push(api.getMyPosition());

    const results = await Promise.all(requests);
    const profileData = results[0].data;
    const positionData = isAdmin ? null : results[1].data;

    renderProfile(profileData, positionData);
  } catch (error) {
    showToast('Error al cargar perfil: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

function renderProfile(user, position) {
  const container = document.getElementById('profile-content');
  const isAdmin = user.role === 'admin';

  container.innerHTML = `

    <!-- ── Información Personal ─────────────────────────────────── -->
    <div style="background:var(--surface); padding:var(--spacing-lg); border-radius:var(--radius-lg); border:1px solid var(--border); margin-bottom:var(--spacing-lg);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--spacing-lg);">
        <h3 style="margin:0;">Información Personal</h3>
        <button class="btn btn-outline btn-sm" onclick="showEditProfileForm()">✏️ Editar</button>
      </div>

      <div id="profile-info" style="display:grid; gap:var(--spacing-md);">
        <div>
          <label style="font-size:var(--font-size-sm); color:var(--text-secondary);">Nombre</label>
          <p style="font-weight:500; margin-top:var(--spacing-xs);">${user.nombre}</p>
        </div>
        <div>
          <label style="font-size:var(--font-size-sm); color:var(--text-secondary);">Email</label>
          <p style="font-weight:500; margin-top:var(--spacing-xs);">${user.email}</p>
        </div>
        <div>
          <label style="font-size:var(--font-size-sm); color:var(--text-secondary);">Teléfono</label>
          <p style="font-weight:500; margin-top:var(--spacing-xs);">${user.telefono || '—'}</p>
        </div>
        <div>
          <label style="font-size:var(--font-size-sm); color:var(--text-secondary);">Rol</label>
          <p style="font-weight:500; margin-top:var(--spacing-xs);">
            ${isAdmin ? '👑 Administrador' : '👤 Usuario'}
          </p>
        </div>
      </div>

      <!-- Formulario de edición (oculto) -->
      <div id="edit-profile-form" style="display:none;">
        <form onsubmit="handleUpdateProfile(event)">
          <div class="form-group">
            <label>Nombre completo</label>
            <input type="text" id="profile-nombre" value="${user.nombre}" required minlength="2">
          </div>
          <div class="form-group">
            <label>Teléfono (opcional)</label>
            <input type="tel" id="profile-telefono" value="${user.telefono || ''}">
          </div>
          <div style="display:flex; gap:var(--spacing-sm);">
            <button type="submit" class="btn btn-primary btn-sm">Guardar</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="hideEditProfileForm()">Cancelar</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ── Estadísticas (solo usuarios) ───────────────────────────── -->
    ${!isAdmin && position ? `
      <div style="background:var(--surface); padding:var(--spacing-lg); border-radius:var(--radius-lg); border:1px solid var(--border); margin-bottom:var(--spacing-lg);">
        <h3 style="margin-bottom:var(--spacing-lg);">Mis Estadísticas</h3>
        <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:var(--spacing-md);">
          <div style="text-align:center; padding:var(--spacing-md); background:var(--background); border-radius:var(--radius-md);">
            <div style="font-size:var(--font-size-xl); font-weight:700; color:var(--primary);">${position.position}°</div>
            <div style="font-size:var(--font-size-sm); color:var(--text-secondary); margin-top:var(--spacing-xs);">Posición</div>
          </div>
          <div style="text-align:center; padding:var(--spacing-md); background:var(--background); border-radius:var(--radius-md);">
            <div style="font-size:var(--font-size-xl); font-weight:700; color:var(--success);">${position.total_points}</div>
            <div style="font-size:var(--font-size-sm); color:var(--text-secondary); margin-top:var(--spacing-xs);">Puntos</div>
          </div>
          <div style="text-align:center; padding:var(--spacing-md); background:var(--background); border-radius:var(--radius-md);">
            <div style="font-size:var(--font-size-xl); font-weight:700;">${position.matches_predicted}</div>
            <div style="font-size:var(--font-size-sm); color:var(--text-secondary); margin-top:var(--spacing-xs);">Predicciones</div>
          </div>
          <div style="text-align:center; padding:var(--spacing-md); background:var(--background); border-radius:var(--radius-md);">
            <div style="font-size:var(--font-size-xl); font-weight:700;">${position.correct_winners}</div>
            <div style="font-size:var(--font-size-sm); color:var(--text-secondary); margin-top:var(--spacing-xs);">Ganadores</div>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- ── Mis Predicciones (solo usuarios) ───────────────────────── -->
    ${!isAdmin ? `
      <div style="background:var(--surface); padding:var(--spacing-lg); border-radius:var(--radius-lg); border:1px solid var(--border); margin-bottom:var(--spacing-lg);">
        <h3 style="margin-bottom:var(--spacing-md);">Mis Predicciones</h3>
        <div id="profile-predictions-content">
          <p style="color:var(--text-secondary);">Cargando...</p>
        </div>
      </div>
    ` : ''}

    <!-- ── Cambiar Contraseña ──────────────────────────────────────── -->
    <div style="background:var(--surface); padding:var(--spacing-lg); border-radius:var(--radius-lg); border:1px solid var(--border);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--spacing-md);">
        <h3 style="margin:0;">Contraseña</h3>
        <button class="btn btn-outline btn-sm" onclick="showChangePasswordForm()">🔑 Cambiar</button>
      </div>
      <p style="color:var(--text-secondary); font-size:var(--font-size-sm);">
        Por seguridad, usa una contraseña de al menos 6 caracteres.
      </p>

      <div id="change-password-form" style="display:none; margin-top:var(--spacing-md);">
        <form onsubmit="handleChangePassword(event)">
          <div class="form-group">
            <label>Contraseña actual</label>
            <div class="password-input-wrapper">
              <input type="password" id="old-password" required>
              <button type="button" class="password-toggle" onclick="togglePasswordVisibility('old-password', this)">
                <span class="eye-icon">👁️</span>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Nueva contraseña</label>
            <div class="password-input-wrapper">
              <input type="password" id="new-password" required minlength="6">
              <button type="button" class="password-toggle" onclick="togglePasswordVisibility('new-password', this)">
                <span class="eye-icon">👁️</span>
              </button>
            </div>
            <small>Mínimo 6 caracteres</small>
          </div>
          <div style="display:flex; gap:var(--spacing-sm);">
            <button type="submit" class="btn btn-primary btn-sm">Cambiar</button>
            <button type="button" class="btn btn-outline btn-sm" onclick="hideChangePasswordForm()">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Cargar predicciones del usuario (solo si no es admin)
  if (!isAdmin) {
    loadProfilePredictions();
  }
}

// ── Editar perfil ─────────────────────────────────────────────────────────────

function showEditProfileForm() {
  document.getElementById('profile-info').style.display = 'none';
  document.getElementById('edit-profile-form').style.display = 'block';
}

function hideEditProfileForm() {
  document.getElementById('profile-info').style.display = 'grid';
  document.getElementById('edit-profile-form').style.display = 'none';
}

async function handleUpdateProfile(event) {
  event.preventDefault();
  const nombre   = document.getElementById('profile-nombre').value;
  const telefono = document.getElementById('profile-telefono').value;

  try {
    showLoader();
    const res = await api.updateProfile({ nombre, telefono });

    // Actualizar nombre en localStorage y header
    const user = JSON.parse(localStorage.getItem('user'));
    user.nombre = res.data.nombre;
    localStorage.setItem('user', JSON.stringify(user));
    document.getElementById('user-name').textContent = user.nombre;

    showToast('Perfil actualizado exitosamente', 'success');
    loadProfile();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

// ── Mis predicciones ──────────────────────────────────────────────────────────

async function loadProfilePredictions() {
  const container = document.getElementById('profile-predictions-content');
  if (!container) return;

  try {
    const res = await api.getMyPredictions();
    const predictions = res.data.predictions;

    if (predictions.length === 0) {
      container.innerHTML = '<p style="color:var(--text-secondary);">Aún no has ingresado predicciones.</p>';
      return;
    }

    const thStyle = 'padding:8px 10px; text-align:left; font-weight:600; border-bottom:2px solid var(--border); font-size:var(--font-size-xs);';
    const tdStyle = 'padding:8px 10px; font-size:var(--font-size-sm);';

    container.innerHTML = `
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="background:var(--background);">
              <th style="${thStyle}">Partido</th>
              <th style="${thStyle} text-align:center;">Tu pred.</th>
              <th style="${thStyle} text-align:center;">Real</th>
              <th style="${thStyle} text-align:center;">Pts</th>
            </tr>
          </thead>
          <tbody>
            ${predictions.map(p => `
              <tr style="border-bottom:1px solid var(--border);">
                <td style="${tdStyle}">
                  ${p.home_team_flag} ${p.home_team_name} vs ${p.away_team_flag} ${p.away_team_name}
                </td>
                <td style="${tdStyle} text-align:center; font-weight:600;">${p.home_goals} - ${p.away_goals}</td>
                <td style="${tdStyle} text-align:center; color:${p.is_finished ? 'var(--text-primary)' : 'var(--text-secondary)'};">
                  ${p.is_finished ? `${p.real_home_goals} - ${p.real_away_goals}` : '—'}
                </td>
                <td style="${tdStyle} text-align:center; font-weight:700; color:${p.total_points > 0 ? 'var(--success)' : 'var(--text-secondary)'};">
                  ${p.is_finished ? p.total_points : '—'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);">Error al cargar predicciones: ${err.message}</p>`;
  }
}

// ── Cambiar contraseña ────────────────────────────────────────────────────────

function showChangePasswordForm() {
  document.getElementById('change-password-form').style.display = 'block';
}

function hideChangePasswordForm() {
  document.getElementById('change-password-form').style.display = 'none';
  document.getElementById('old-password').value = '';
  document.getElementById('new-password').value = '';
}

async function handleChangePassword(event) {
  event.preventDefault();
  const oldPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;

  try {
    showLoader();
    await api.changePassword(oldPassword, newPassword);
    showToast('Contraseña cambiada exitosamente', 'success');
    hideChangePasswordForm();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const eye   = btn.querySelector('.eye-icon');
  if (input.type === 'password') {
    input.type = 'text';
    eye.textContent = '🙈';
  } else {
    input.type = 'password';
    eye.textContent = '👁️';
  }
}
