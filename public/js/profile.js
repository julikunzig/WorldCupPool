/**
 * Vista de perfil de usuario
 */

async function loadProfile() {
  try {
    showLoader();
    
    const [profileRes, positionRes] = await Promise.all([
      api.getProfile(),
      api.getMyPosition()
    ]);
    
    renderProfile(profileRes.data, positionRes.data);
  } catch (error) {
    showToast('Error al cargar perfil: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

function renderProfile(user, position) {
  const container = document.getElementById('profile-content');
  
  container.innerHTML = `
    <div style="background: var(--surface); padding: var(--spacing-lg); border-radius: var(--radius-lg); border: 1px solid var(--border);">
      <h3 style="margin-bottom: var(--spacing-lg);">Información Personal</h3>
      
      <div style="display: grid; gap: var(--spacing-md);">
        <div>
          <label style="font-size: var(--font-size-sm); color: var(--text-secondary);">Nombre</label>
          <p style="font-weight: 500; margin-top: var(--spacing-xs);">${user.nombre}</p>
        </div>
        
        <div>
          <label style="font-size: var(--font-size-sm); color: var(--text-secondary);">Usuario</label>
          <p style="font-weight: 500; margin-top: var(--spacing-xs);">@${user.username}</p>
        </div>
        
        <div>
          <label style="font-size: var(--font-size-sm); color: var(--text-secondary);">Email</label>
          <p style="font-weight: 500; margin-top: var(--spacing-xs);">${user.email}</p>
        </div>
        
        ${user.telefono ? `
          <div>
            <label style="font-size: var(--font-size-sm); color: var(--text-secondary);">Teléfono</label>
            <p style="font-weight: 500; margin-top: var(--spacing-xs);">${user.telefono}</p>
          </div>
        ` : ''}
        
        <div>
          <label style="font-size: var(--font-size-sm); color: var(--text-secondary);">Rol</label>
          <p style="font-weight: 500; margin-top: var(--spacing-xs);">
            ${user.role === 'admin' ? '👑 Administrador' : '👤 Usuario'}
          </p>
        </div>
      </div>
    </div>
    
    ${position ? `
      <div style="background: var(--surface); padding: var(--spacing-lg); border-radius: var(--radius-lg); border: 1px solid var(--border); margin-top: var(--spacing-lg);">
        <h3 style="margin-bottom: var(--spacing-lg);">Mis Estadísticas</h3>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-md);">
          <div style="text-align: center; padding: var(--spacing-md); background: var(--background); border-radius: var(--radius-md);">
            <div style="font-size: var(--font-size-xl); font-weight: 700; color: var(--primary);">
              ${position.position}°
            </div>
            <div style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-top: var(--spacing-xs);">
              Posición
            </div>
          </div>
          
          <div style="text-align: center; padding: var(--spacing-md); background: var(--background); border-radius: var(--radius-md);">
            <div style="font-size: var(--font-size-xl); font-weight: 700; color: var(--success);">
              ${position.total_points}
            </div>
            <div style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-top: var(--spacing-xs);">
              Puntos
            </div>
          </div>
          
          <div style="text-align: center; padding: var(--spacing-md); background: var(--background); border-radius: var(--radius-md);">
            <div style="font-size: var(--font-size-xl); font-weight: 700;">
              ${position.matches_predicted}
            </div>
            <div style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-top: var(--spacing-xs);">
              Partidos
            </div>
          </div>
          
          <div style="text-align: center; padding: var(--spacing-md); background: var(--background); border-radius: var(--radius-md);">
            <div style="font-size: var(--font-size-xl); font-weight: 700;">
              ${position.correct_winners}
            </div>
            <div style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-top: var(--spacing-xs);">
              Ganadores
            </div>
          </div>
        </div>
      </div>
    ` : ''}
    
    <div style="margin-top: var(--spacing-lg);">
      <button class="btn btn-outline btn-block" onclick="showChangePasswordForm()">
        Cambiar Contraseña
      </button>
    </div>
    
    <div id="change-password-form" style="display: none; margin-top: var(--spacing-lg); background: var(--surface); padding: var(--spacing-lg); border-radius: var(--radius-lg); border: 1px solid var(--border);">
      <h3 style="margin-bottom: var(--spacing-md);">Cambiar Contraseña</h3>
      <form onsubmit="handleChangePassword(event)">
        <div class="form-group">
          <label>Contraseña actual</label>
          <input type="password" id="old-password" required>
        </div>
        <div class="form-group">
          <label>Nueva contraseña</label>
          <input type="password" id="new-password" required 
                 pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$">
          <small>8+ caracteres, mayúscula, minúscula, número y carácter especial</small>
        </div>
        <div style="display: flex; gap: var(--spacing-sm);">
          <button type="submit" class="btn btn-primary">Cambiar</button>
          <button type="button" class="btn btn-outline" onclick="hideChangePasswordForm()">Cancelar</button>
        </div>
      </form>
    </div>
  `;
}

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
