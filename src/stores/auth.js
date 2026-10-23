import { defineStore } from 'pinia';
import { api } from '../lib/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    clubName: 'Run Club',
    timezone: 'UTC',
    ready: false,
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    isAdmin: (state) => state.user?.role === 'admin',
    displayName: (state) => state.user?.member_name || state.user?.name || '',
    memberActive: (state) => state.user?.member_status === 'active',
  },
  actions: {
    async bootstrap() {
      if (this.ready) {
        return;
      }

      this.loading = true;

      try {
        const config = await api('/config');
        this.clubName = config.clubName;
        this.timezone = config.timezone;
      } catch {
        this.clubName = 'Run Club';
        this.timezone = 'UTC';
      }

      try {
        const data = await api('/auth/me');
        this.user = data.user;
      } catch {
        this.user = null;
      } finally {
        this.ready = true;
        this.loading = false;
      }
    },
    async login(email, password) {
      this.loading = true;

      try {
        const data = await api('/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        this.user = data.user;
        return data.user;
      } finally {
        this.loading = false;
      }
    },
    async register(name, email, password) {
      this.loading = true;

      try {
        const data = await api('/auth/register', {
          method: 'POST',
          body: { name, email, password },
        });
        this.user = data.user;
        return data.user;
      } finally {
        this.loading = false;
      }
    },
    async logout() {
      try {
        await api('/auth/logout', { method: 'POST' });
      } finally {
        this.user = null;
      }
    },
    async changePassword(currentPassword, newPassword) {
      await api('/auth/password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
    },
    async refreshMe() {
      const data = await api('/auth/me');
      this.user = data.user;
    },
  },
});
