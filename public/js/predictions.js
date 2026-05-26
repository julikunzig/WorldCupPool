/**
 * Vista de predicciones
 */

let allMatches = [];
let myPredictions = {};
let canEdit = true;

async function loadPredictions() {
  try {
    showLoader();
    
    // Limpiar datos previos
    allMatches = [];
    myPredictions = {};
    
    // Cargar partidos y predicciones en paralelo
    const [matchesRes, predictionsRes] = await Promise.all([
      api.getMatches(),
      api.getMyPredictions()
    ]);
    
    allMatches = matchesRes.data;
    canEdit = predictionsRes.data.canEdit;
    
    // Crear mapa de predicciones por match_id
    myPredictions = {};
    predictionsRes.data.predictions.forEach(pred => {
      myPredictions[pred.match_id] = pred;
    });
    
    renderPredictions();
    renderDeadlineInfo(predictionsRes.data.deadline, canEdit);
  } catch (error) {
    showToast('Error al cargar predicciones: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

function renderDeadlineInfo(deadline, canEdit) {
  const deadlineInfo = document.getElementById('deadline-info');
  const deadlineDate = new Date(deadline);
  
  if (canEdit) {
    deadlineInfo.innerHTML = `⏰ Puedes editar tus predicciones hasta el ${deadlineDate.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;
    deadlineInfo.className = 'deadline-info';
  } else {
    deadlineInfo.innerHTML = `🔒 La fecha límite para editar predicciones ha pasado. Solo puedes consultar.`;
    deadlineInfo.className = 'deadline-info expired';
  }
}

function renderPredictions() {
  const container = document.getElementById('predictions-content');
  
  if (allMatches.length === 0) {
    container.innerHTML = '<p>No hay partidos disponibles.</p>';
    return;
  }
  
  container.innerHTML = allMatches.map(match => {
    const prediction = myPredictions[match.id];
    const matchDate = new Date(match.match_date);
    const isPast = new Date() > matchDate;
    const isDisabled = !canEdit || isPast;
    
    return `
      <div class="match-card" data-match-id="${match.id}">
        <div class="match-header">
          <div class="match-info">
            <strong>Grupo ${match.group_name}</strong> - Jornada ${match.jornada}
          </div>
          <div class="match-date">
            ${matchDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            ${matchDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        
        <div class="match-teams">
          <div class="team">
            <div class="team-flag">${match.home_team_flag}</div>
            <div class="team-name">${match.home_team_name}</div>
          </div>
          <div class="vs">VS</div>
          <div class="team">
            <div class="team-flag">${match.away_team_flag}</div>
            <div class="team-name">${match.away_team_name}</div>
          </div>
        </div>
        
        <div class="prediction-inputs">
          <div class="prediction-input">
            <input 
              type="number" 
              min="0" 
              max="20" 
              value="${prediction?.home_goals ?? ''}"
              data-type="home"
              ${isDisabled ? 'disabled' : ''}
            >
          </div>
          <div class="vs">-</div>
          <div class="prediction-input">
            <input 
              type="number" 
              min="0" 
              max="20" 
              value="${prediction?.away_goals ?? ''}"
              data-type="away"
              ${isDisabled ? 'disabled' : ''}
            >
          </div>
        </div>
        
        ${!isDisabled ? `
          <div class="prediction-actions">
            <button class="btn btn-primary btn-block" onclick="savePrediction(${match.id})">
              ${prediction ? 'Actualizar' : 'Guardar'} Predicción
            </button>
          </div>
        ` : ''}
        
        ${match.is_finished && prediction ? `
          <div class="match-points ${prediction.total_points > 0 ? 'has-points' : ''}">
            Resultado real: ${match.real_home_goals} - ${match.real_away_goals} | 
            Puntos: ${prediction.total_points} 
            (${prediction.points_winner} ganador + ${prediction.points_score} marcador)
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

async function savePrediction(matchId) {
  const card = document.querySelector(`[data-match-id="${matchId}"]`);
  const homeInput = card.querySelector('[data-type="home"]');
  const awayInput = card.querySelector('[data-type="away"]');
  
  const homeGoals = parseInt(homeInput.value);
  const awayGoals = parseInt(awayInput.value);
  
  if (isNaN(homeGoals) || isNaN(awayGoals)) {
    showToast('Ingresa ambos marcadores', 'error');
    return;
  }
  
  if (homeGoals < 0 || awayGoals < 0) {
    showToast('Los goles no pueden ser negativos', 'error');
    return;
  }
  
  try {
    showLoader();
    
    const prediction = myPredictions[matchId];
    
    if (prediction) {
      await api.updatePrediction(prediction.id, homeGoals, awayGoals);
      showToast('Predicción actualizada', 'success');
    } else {
      await api.createPrediction(matchId, homeGoals, awayGoals);
      showToast('Predicción guardada', 'success');
    }
    
    // Recargar predicciones
    await loadPredictions();
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}
