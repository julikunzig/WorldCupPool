/**
 * @module routes/matchRoutes
 */

const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/matches  (partidos publicados)
router.get('/', authenticate, matchController.getAllMatches);

// GET /api/matches/admin/all  (todos, sin filtro - admin)
router.get('/admin/all', authenticate, requireAdmin, matchController.getAllMatchesAdmin);

// GET /api/matches/groups  (grupos con equipos)
router.get('/groups', authenticate, matchController.getGroupsWithTeams);

// GET /api/matches/knockout/phases  (estado de fases eliminatorias - admin)
router.get('/knockout/phases', authenticate, requireAdmin, matchController.getKnockoutPhases);

// GET /api/matches/knockout/published  (fases publicadas - todos los usuarios)
router.get('/knockout/published', authenticate, matchController.getPublishedPhases);

// POST /api/matches/knockout  (crear partido eliminatorio - admin)
router.post('/knockout', authenticate, requireAdmin, matchController.createKnockoutMatch);

// POST /api/matches/knockout/:stage/publish  (publicar fase - admin)
router.post('/knockout/:stage/publish', authenticate, requireAdmin, matchController.publishKnockoutPhase);

// PUT /api/matches/knockout/:stage/deadline  (actualizar deadline de fase - admin)
router.put('/knockout/:stage/deadline', authenticate, requireAdmin, matchController.updatePhaseDeadline);

// PUT /api/matches/knockout/:matchId/edit  (editar partido eliminatorio - admin)
router.put('/knockout/:matchId/edit', authenticate, requireAdmin, matchController.editKnockoutMatch);

// GET /api/matches/knockout/:stage  (partidos de una fase)
router.get('/knockout/:stage', authenticate, matchController.getMatchesByStage);

// GET /api/matches/group/:groupId
router.get('/group/:groupId', authenticate, matchController.getMatchesByGroup);

// GET /api/matches/:id
router.get('/:id', authenticate, matchController.getMatchById);

// PUT /api/matches/:id/score  (admin)
router.put('/:id/score', authenticate, requireAdmin, matchController.updateRealScore);

// GET /api/matches/:id/predictions  (admin)
router.get('/:id/predictions', authenticate, requireAdmin, matchController.getMatchPredictions);

module.exports = router;
