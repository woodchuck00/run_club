import { defineStore } from 'pinia';
import { api, setApiClubSlug } from '../lib/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    clubs: [],
    activeClub: null,
    membership: null,
    ready: false,
    loading: false,
    loadingClub: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    isAdmin: (state) => (
      state.membership?.role === 'admin' &&
      state.membership?.status === 'active'
    ),
    displayName: (state) => (
      state.membership?.display_name || state.user?.name || ''
    ),
    memberActive: (state) => state.membership?.status === 'active',
    timezone: (state) => state.activeClub?.timezone || 'UTC',
    clubName: (state) => state.activeClub?.name || 'Run Club',
    clubParams: (state) => ({
      clubSlug: state.activeClub?.slug || '',
    }),
    clubRoute: (state) => (name, params = {}) => ({
      name,
      params: {
        clubSlug: state.activeClub?.slug || '',
        ...params,
      },
    }),
    myClubs: (state) => state.clubs.filter((club) => club.joined),
  },
  actions: {
    setClub(club, membership) {
      this.activeClub = club || null;
      this.membership = membership || null;
      setApiClubSlug(club?.slug || null);
    },
    clearClub() {
      this.activeClub = null;
      this.membership = null;
      setApiClubSlug(null);
    },
    async bootstrap() {
      if (this.ready) {
        return;
      }

      this.loading = true;

      try {
        const data = await api('/auth/me', { clubSlug: null });
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
          clubSlug: null,
        });
        this.user = data.user;
        this.clubs = [];
        this.clearClub();
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
          clubSlug: null,
        });
        this.user = data.user;
        this.clubs = [];
        this.clearClub();
        return data.user;
      } finally {
        this.loading = false;
      }
    },
    async logout() {
      try {
        await api('/auth/logout', { method: 'POST', clubSlug: null });
      } finally {
        this.user = null;
        this.clubs = [];
        this.clearClub();
      }
    },
    async changePassword(currentPassword, newPassword) {
      await api('/auth/password', {
        method: 'POST',
        body: { currentPassword, newPassword },
        clubSlug: null,
      });
    },
    async refreshMe() {
      const data = await api('/auth/me', { clubSlug: null });
      this.user = data.user;
    },
    async loadClubs() {
      const data = await api('/clubs', { clubSlug: null });
      this.clubs = data.clubs;
      return data.clubs;
    },
    async loadClub(slug) {
      if (!slug) {
        this.clearClub();
        return false;
      }

      if (this.activeClub?.slug === slug) {
        return true;
      }

      this.loadingClub = true;

      try {
        const data = await api(`/clubs/${encodeURIComponent(slug)}`, {
          clubSlug: null,
        });
        this.setClub(data.club, data.membership);
        return true;
      } catch {
        this.clearClub();
        return false;
      } finally {
        this.loadingClub = false;
      }
    },
    async createClub(payload) {
      const data = await api('/clubs', {
        method: 'POST',
        body: payload,
        clubSlug: null,
      });

      this.clubs = [
        data.club,
        ...this.clubs.filter((club) => club.slug !== data.club.slug),
      ];

      return data.club;
    },
    async joinClub(slug) {
      const data = await api(`/clubs/${encodeURIComponent(slug)}/join`, {
        method: 'POST',
        clubSlug: null,
      });

      this.setClub(data.club, data.membership);
      this.clubs = this.clubs.map((club) => (
        club.slug === data.club.slug
          ? { ...club, joined: true, role: data.membership.role }
          : club
      ));

      return data.membership;
    },
    async updateClub(payload) {
      if (!this.activeClub) {
        return null;
      }

      const data = await api(`/clubs/${encodeURIComponent(this.activeClub.slug)}`, {
        method: 'PATCH',
        body: payload,
      });

      this.activeClub = { ...this.activeClub, ...data.club };
      this.clubs = this.clubs.map((club) => (
        club.slug === data.club.slug ? { ...club, ...data.club } : club
      ));

      return data.club;
    },
  },
});
