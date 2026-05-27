/**
 * Vista de predicciones con tabs por fase
 */

let allMatches = [];
let myPredictions = {};
let phaseDeadlines = {};
let globalDeadline = '';
let publishedPhases = [];
let activePhaseTab = 'group';

const PHASE_TABS = [
  { key: 'group',       label: 'Grupos' },
  { key: 'round_of_16', label: 'Dieciseisavos' },
  { key: 'round_of_8',  label: 'Octavos' },
  { key: 'quarterfinal',label: 'Cuartos' },
  { key: 'semifinal',   label: 'Semifinal' },
  { key: 'third_place', label: '3er/4to Puesto' },
  { key: 'final',       label: 'Final' },
];

async function loadPredictions() {
  try {
    showLoader();

    const [matchesRes, predictionsRes, phasesRes] = await Promise.all([
      api.getMatches(),
      api.getMyPredictions(),
      api.getPublishedPhases(),
    ]);

    allMatches     = matchesRes.data;
    globalDeadline = predictionsRes.data.deadline;
    phaseDeadlines = predictionsRes.data.phaseDeadlines || {};
    publishedPhases = phasesRes.data.map(p => p.stage);

    // Mapa de predicciones por match_id
    myPredictions = {};
    predictionsRes.data.predictions.forEach(pred => {
      myPredictions[pred.match_id] = pred;
    });

    renderPhaseTabs();
    renderDeadlineInfo();
  } catch (error) {
    showToast('Error al cargar predicciones: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}

// ── Tabs de fases ─────────────────────────────────────────────────────────────

function renderPhaseTabs() {
  const container = document.getElementById('predictions-content');

  // Determinar qué tabs mostrar (grupos siempre, eliminatorias solo si publicadas)
  const visibleTabs = PHASE_TABS.filter(t =>
    t.key === 'group' || publishedPhases.includes(t.key)
  );

  container.innerHTML = `
    <div class="phase-tabs" id="phase-tabs">
      ${visibleTabs.map(t => `
        <button class="phase-tab ${t.key === activePhaseTab ? 'active' : ''}"
                onclick="switchPhaseTab('${t.key}')">
          ${t.label}
        </button>
      `).join('')}
    </div>
    <div id="phase-content"></div>
  `;

  // Si el tab activo ya no está visible, ir a grupos
  if (!visibleTabs.find(t => t.key === activePhaseTab)) {
    activePhaseTab = 'group';
  }

  renderPhaseContent(activePhaseTab);
}

function switchPhaseTab(phase) {
  activePhaseTab = phase;
  document.querySelectorAll('.phase-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${phase}'`));
  });
  renderPhaseContent(phase);
}

function renderDeadlineInfo() {
  const deadlineInfo = document.getElementById('deadline-info');
  const deadline = getDeadlineForPhase(activePhaseTab);
  const canEdit   = new Date() < new Date(deadline);
  const d         = new Date(deadline);

  if (canEdit) {
    deadlineInfo.innerHTML = `⏰ Predicciones hasta el ${d.toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })}`;
    deadlineInfo.className = 'deadline-info';
  } else {
    deadlineInfo.innerHTML = `🔒 Fecha límite pasada. Solo consulta.`;
    deadlineInfo.className = 'deadline-info expired';
  }
}

function getDeadlineForPhase(phase) {
  if (phase === 'group') return globalDeadline;
  return phaseDeadlines[phase] || globalDeadline;
}

function canEditPhase(phase) {
  const deadline = getDeadlineForPhase(phase);
  return deadline ? new Date() < new Date(deadline) : false;
}

// ── Renderizar partidos de una fase ───────────────────────────────────────────

function renderPhaseContent(phase) {
  const container = document.getElementById('phase-content');
  if (!container) return;

  const phaseMatches = allMatches.filter(m => m.stage === phase);
  const canEdit = canEditPhase(phase);

  // Actualizar info de deadline
  renderDeadlineInfo();

  // Determinar columnas según la fase
  container.className = '';
  if (phase === 'group') {
    container.classList.add('cols-3');
  } else if (['round_of_16', 'round_of_8', 'quarterfinal'].includes(phase)) {
    container.classList.add('cols-2');
  } else {
    container.classList.add('cols-1');
  }

  if (phaseMatches.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:var(--spacing-xl); color:var(--text-secondary);">
        <p style="font-size:24px; margin-bottom:var(--spacing-sm);">⏳</p>
        <p>Los partidos de esta fase aún no han sido publicados.</p>
      </div>
    `;
    return;
  }

  const matchCards = phaseMatches.map(match => {
    const prediction = myPredictions[match.id];
    const matchDate  = new Date(match.match_date);
    const isPast     = new Date() > matchDate;
    const isDisabled = !canEdit || isPast;

    const phaseLabel = phase === 'group'
      ? `Grupo ${match.group_name} - Jornada ${match.jornada}`
      : PHASE_TABS.find(t => t.key === phase)?.label || phase;

    return `
      <div class="match-card" data-match-id="${match.id}">
        <div class="match-header">
          <div class="match-info"><strong>${phaseLabel}</strong></div>
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
            <input type="number" min="0" max="20"
              value="${prediction?.home_goals ?? ''}"
              data-type="home"
              inputmode="numeric"
              onkeypress="return event.charCode >= 48 && event.charCode <= 57"
              ${isDisabled ? 'disabled' : ''}>
          </div>
          <div class="vs">-</div>
          <div class="prediction-input">
            <input type="number" min="0" max="20"
              value="${prediction?.away_goals ?? ''}"
              data-type="away"
              inputmode="numeric"
              onkeypress="return event.charCode >= 48 && event.charCode <= 57"
              ${isDisabled ? 'disabled' : ''}>
          </div>
        </div>

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

  const saveButton = canEdit ? `
    <div style="padding:var(--spacing-lg) 0;">
      <button class="btn btn-primary btn-block" onclick="saveAllPredictions('${phase}')"
              style="font-size:var(--font-size-lg); padding:16px;">
        💾 Guardar Todo
      </button>
    </div>
  ` : '';

  container.innerHTML = matchCards + saveButton;
}

// ── Guardar predicciones de la fase activa ────────────────────────────────────

async function saveAllPredictions(phase) {
  const phaseMatches = allMatches.filter(m => m.stage === phase);
  const toSave = [];

  for (const match of phaseMatches) {
    const card = document.querySelector(`[data-match-id="${match.id}"]`);
    if (!card) continue;

    const homeInput = card.querySelector('[data-type="home"]');
    const awayInput = card.querySelector('[data-type="away"]');
    if (!homeInput || homeInput.disabled) continue;

    const homeGoals = homeInput.value.trim();
    const awayGoals = awayInput.value.trim();
    if (homeGoals === '' || awayGoals === '') continue;

    const home = parseInt(homeGoals);
    const away = parseInt(awayGoals);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) continue;

    toSave.push({ match, home, away });
  }

  if (toSave.length === 0) {
    showToast('No hay predicciones para guardar. Ingresa al menos un marcador.', 'error');
    return;
  }

  try {
    showLoader();
    let created = 0, updated = 0, errors = 0;

    for (const { match, home, away } of toSave) {
      try {
        const existing = myPredictions[match.id];
        if (existing) {
          await api.updatePrediction(existing.id, home, away);
          updated++;
        } else {
          await api.createPrediction(match.id, home, away);
          created++;
        }
      } catch {
        errors++;
      }
    }

    await loadPredictions();

    const msg = [];
    if (created > 0) msg.push(`${created} creadas`);
    if (updated > 0) msg.push(`${updated} actualizadas`);
    if (errors  > 0) msg.push(`${errors} con error`);
    showToast(`Predicciones guardadas: ${msg.join(', ')}`, errors > 0 ? 'error' : 'success');
  } catch (error) {
    showToast('Error al guardar: ' + error.message, 'error');
  } finally {
    hideLoader();
  }
}
