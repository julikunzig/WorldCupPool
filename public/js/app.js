/**
 * Aplicación principal - Inicialización y navegación
 */

// ═══════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupNavigation();
});

function initApp() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  if (token && user) {
    api.setToken(token);
    showApp();
  } else {
    showAuth();
  }
  
  hideLoader();
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVEGACIÓN
// ═══════════════════════════════════════════════════════════════════════════

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      navigateTo(view);
    });
  });
}

function navigateTo(viewName) {
  // Actualizar nav activo
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
  
  // Actualizar vista activa
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(`${viewName}-view`).classList.add('active');
  
  // Cargar contenido de la vista
  switch(viewName) {
    case 'predictions':
      loadPredictions();
      break;
    case 'groups':
      loadGroups();
      break;
    case 'leaderboard':
      loadLeaderboard();
      break;
    case 'profile':
      loadProfile();
      break;
    case 'admin':
      loadAdmin();
      break;
    case 'policies':
      // Vista estática, no necesita carga
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES UI
// ═══════════════════════════════════════════════════════════════════════════

function showLoader() {
  document.getElementById('loader').style.display = 'flex';
}

function hideLoader() {
  document.getElementById('loader').style.display = 'none';
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div style="flex: 1;">${message}</div>
  `;
  
  container.appendChild(toast);
  
  // Auto-remover después de 4 segundos
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(400px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ═══════════════════════════════════════════════════════════════════════════
// MANEJO DE ERRORES GLOBAL
// ═══════════════════════════════════════════════════════════════════════════

window.addEventListener('unhandledrejection', (event) => {
  console.error('Error no manejado:', event.reason);
  
  // Si es error 401, redirigir a login
  if (event.reason?.message?.includes('401') || event.reason?.message?.includes('autenticado')) {
    api.setToken(null);
    localStorage.removeItem('user');
    showAuth();
    showToast('Sesión expirada. Por favor inicia sesión nuevamente.', 'error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SERVICE WORKER (PWA - opcional)
// ═══════════════════════════════════════════════════════════════════════════

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Descomentar para habilitar PWA
    // navigator.serviceWorker.register('/sw.js')
    //   .then(reg => console.log('Service Worker registrado'))
    //   .catch(err => console.log('Error al registrar SW:', err));
  });
}
