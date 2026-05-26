/**
 * Vista de tabla de posiciones
 */

async function loadLeaderboard() {
  try {
    showLoader();
    
    const response = await api.getLeaderboard();
    const leaderboard = response.data;
    
    renderLeaderboard(leaderboard);
  } catch (error) {
    showToast('Error al cargar tabla: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

function renderLeaderboard(leaderboard) {
  const container = document.getElementById('leaderboard-content');
  const currentUser = JSON.parse(localStorage.getItem('user'));
  
  if (leaderboard.length === 0) {
    container.innerHTML = '<p>No hay datos disponibles.</p>';
    return;
  }
  
  container.innerHTML = `
    <div class="leaderboard-table">
      <div class="leaderboard-row header">
        <div>Pos</div>
        <div>Usuario</div>
        <div style="text-align: right;">Puntos</div>
      </div>
      ${leaderboard.map(row => `
        <div class="leaderboard-row ${row.id === currentUser.id ? 'me' : ''}">
          <div class="position ${row.position <= 3 ? 'top-3' : ''}">
            ${row.position === 1 ? '🥇' : row.position === 2 ? '🥈' : row.position === 3 ? '🥉' : row.position}
          </div>
          <div class="user-info">
            <div class="user-info-name">
              ${row.nombre} ${row.id === currentUser.id ? '(Tú)' : ''}
            </div>
            <div class="user-info-stats">
              ${row.matches_predicted} partidos | 
              ${row.correct_winners} ganadores | 
              ${row.correct_scores} exactos
            </div>
          </div>
          <div class="points">${row.total_points}</div>
        </div>
      `).join('')}
    </div>
  `;
}
