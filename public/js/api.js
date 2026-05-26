/**
 * API Client - Maneja todas las peticiones HTTP al backend
 */

const API_BASE_URL = window.location.origin + '/api';

class APIClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      ...options,
      headers: this.getHeaders(),
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Error en la petición');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async changePassword(oldPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  async setFirstPassword(newPassword, confirmPassword) {
    return this.request('/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ newPassword, confirmPassword }),
    });
  }

  async getGroupsWithTeams() {
    return this.request('/matches/groups');
  }

  // ─── Matches ───────────────────────────────────────────────────────────────

  async getMatches() {
    return this.request('/matches');
  }

  async getMatchesAdmin() {
    return this.request('/matches/admin/all');
  }

  async getKnockoutPhases() {
    return this.request('/matches/knockout/phases');
  }

  async getMatchesByStage(stage) {
    return this.request(`/matches/knockout/${stage}`);
  }

  async createKnockoutMatch(matchData) {
    return this.request('/matches/knockout', {
      method: 'POST',
      body: JSON.stringify(matchData),
    });
  }

  async publishKnockoutPhase(stage) {
    return this.request(`/matches/knockout/${stage}/publish`, {
      method: 'POST',
    });
  }

  async getMatchById(id) {
    return this.request(`/matches/${id}`);
  }

  async updateRealScore(matchId, homeGoals, awayGoals) {
    return this.request(`/matches/${matchId}/score`, {
      method: 'PUT',
      body: JSON.stringify({ home_goals: homeGoals, away_goals: awayGoals }),
    });
  }

  async getMatchPredictions(matchId) {
    return this.request(`/matches/${matchId}/predictions`);
  }

  // ─── Predictions ───────────────────────────────────────────────────────────

  async getMyPredictions() {
    return this.request('/predictions/my');
  }

  async createPrediction(matchId, homeGoals, awayGoals) {
    return this.request('/predictions', {
      method: 'POST',
      body: JSON.stringify({
        match_id: matchId,
        home_goals: homeGoals,
        away_goals: awayGoals,
      }),
    });
  }

  async updatePrediction(predictionId, homeGoals, awayGoals) {
    return this.request(`/predictions/${predictionId}`, {
      method: 'PUT',
      body: JSON.stringify({
        home_goals: homeGoals,
        away_goals: awayGoals,
      }),
    });
  }

  async getLeaderboard() {
    return this.request('/predictions/leaderboard');
  }

  async getMyPosition() {
    return this.request('/predictions/leaderboard/me');
  }

  async getFullReport() {
    return this.request('/predictions/report');
  }

  async getUserPredictions(userId) {
    return this.request(`/predictions/user/${userId}`);
  }

  // ─── Users (Admin) ─────────────────────────────────────────────────────────

  async getUsers(limit = 50, offset = 0) {
    return this.request(`/users?limit=${limit}&offset=${offset}`);
  }

  async getUserById(id) {
    return this.request(`/users/${id}`);
  }

  async deactivateUser(id) {
    return this.request(`/users/${id}/deactivate`, {
      method: 'PUT',
    });
  }

  async createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async resetUserPassword(id, password) {
    return this.request(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async getSettings() {
    return this.request('/settings');
  }

  async updateSetting(key, value) {
    return this.request(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }
}

// Instancia global
const api = new APIClient();
