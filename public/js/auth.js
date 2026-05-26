/**
 * Manejo de autenticación (solo login)
 */

const authScreen   = document.getElementById('auth-screen');
const appScreen    = document.getElementById('app-screen');
const loginForm    = document.getElementById('login-form');
const loginError   = document.getElementById('login-error');

// Toggle visibilidad de contraseña (login y modal)
document.querySelectorAll('.password-toggle').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    const eye   = btn.querySelector('.eye-icon');
    if (input.type === 'password') {
      input.type = 'text';
      eye.textContent = '🙈';
    } else {
      input.type = 'password';
      eye.textContent = '👁️';
    }
  });
});

// ── Login ─────────────────────────────────────────────────────────────────────

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    showLoader();
    const response = await api.login(email, password);

    api.setToken(response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));

    // Si es primer login, mostrar modal de cambio de contraseña
    if (response.data.user.must_change_password) {
      authScreen.style.display = 'none';
      showForcePasswordModal();
    } else {
      showToast('¡Bienvenido!', 'success');
      showApp();
    }
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.add('show');
  } finally {
    hideLoader();
  }
});

// ── Modal: cambio de contraseña obligatorio ───────────────────────────────────

function showForcePasswordModal() {
  document.getElementById('force-password-modal').style.display = 'flex';
}

function hideForcePasswordModal() {
  document.getElementById('force-password-modal').style.display = 'none';
}

document.getElementById('force-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const newPassword     = document.getElementById('force-new-password').value;
  const confirmPassword = document.getElementById('force-confirm-password').value;
  const errorEl         = document.getElementById('force-password-error');

  if (newPassword !== confirmPassword) {
    errorEl.textContent = 'Las contraseñas no coinciden';
    errorEl.classList.add('show');
    return;
  }
  if (newPassword.length < 6) {
    errorEl.textContent = 'La contraseña debe tener al menos 6 caracteres';
    errorEl.classList.add('show');
    return;
  }

  errorEl.classList.remove('show');

  try {
    showLoader();
    await api.setFirstPassword(newPassword, confirmPassword);

    // Actualizar usuario en localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    user.must_change_password = false;
    localStorage.setItem('user', JSON.stringify(user));

    hideForcePasswordModal();
    showToast('¡Contraseña establecida! Bienvenido.', 'success');
    showApp();
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.classList.add('show');
  } finally {
    hideLoader();
  }
});

// ── Logout ────────────────────────────────────────────────────────────────────

document.getElementById('logout-btn').addEventListener('click', () => {
  api.setToken(null);
  localStorage.removeItem('user');
  showAuth();
  showToast('Sesión cerrada', 'info');
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function showAuth() {
  authScreen.style.display = 'block';
  appScreen.style.display  = 'none';
  loginForm.reset();
  loginError.classList.remove('show');
}

function showApp() {
  authScreen.style.display = 'none';
  appScreen.style.display  = 'block';

  const user = JSON.parse(localStorage.getItem('user'));
  document.getElementById('user-name').textContent = user.nombre;

  if (user.role === 'admin') {
    document.getElementById('admin-nav-item').style.display = 'flex';
  }

  loadPredictions();
}
