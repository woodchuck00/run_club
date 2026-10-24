<script>
import { mapStores } from 'pinia';
import { useAuthStore } from '../stores/auth';
import { initials } from '../lib/format';
import { api } from '../lib/api';

export default {
  name: 'AppNav',
  data() {
    return {
      signedAvatarUrl: '',
      dropdownOpen: false,
    };
  },
  mounted() {
    this.loadAvatar();
    this.$watch('authStore.user', () => this.loadAvatar(), { deep: true, immediate: true });
  },
  computed: {
    ...mapStores(useAuthStore),
    avatarUrl() {
      return this.signedAvatarUrl || '';
    },
    initial() {
      return initials(this.authStore.displayName) || 'RC';
    },
    clubInitial() {
      return initials(this.authStore.clubName) || 'RC';
    },
    brandRoute() {
      return this.authStore.activeClub
        ? this.authStore.clubRoute('home')
        : { name: 'clubs' };
    },
  },
  methods: {
    async loadAvatar() {
      if (this.authStore.user?.avatarUrl) {
        const url = new URL(this.authStore.user.avatarUrl);
        const parts = url.pathname.split('/');
        const key = parts.slice(parts.indexOf('run-club00') + 1).join('/');
        try {
          const res = await api(`/auth/me?key=${encodeURIComponent(key)}`);
          this.signedAvatarUrl = res.url || '';
        } catch {
          this.signedAvatarUrl = '';
        }
      }
    },
    async logout() {
      await this.authStore.logout();
      this.$router.push({ name: 'login' });
    },
  },
};
</script>

<template>
  <header class="nav">
    <div class="container nav-inner">
      <RouterLink class="brand" :to="brandRoute">
        <span class="brand-mark">{{ clubInitial }}</span>
        <span>{{ authStore.clubName }}</span>
      </RouterLink>

      <nav v-if="authStore.isAuthenticated" class="nav-links" aria-label="Main navigation">
        <template v-if="authStore.activeClub">
          <RouterLink class="nav-link" :to="authStore.clubRoute('home')">Dashboard</RouterLink>
          <RouterLink class="nav-link" :to="authStore.clubRoute('sessions')">Sessions</RouterLink>
          <RouterLink class="nav-link" :to="authStore.clubRoute('stats')">Stats</RouterLink>
          <template v-if="authStore.isAdmin">
            <RouterLink class="nav-link" :to="authStore.clubRoute('admin-sessions')">
              Admin sessions
            </RouterLink>
            <RouterLink class="nav-link" :to="authStore.clubRoute('admin-members')">
              Roster
            </RouterLink>
            <RouterLink class="nav-link" :to="authStore.clubRoute('admin-club')">
              Club settings
            </RouterLink>
          </template>
        </template>

      </nav>

      <div v-if="authStore.isAuthenticated" class="nav-user">
        <div class="avatar-dropdown">
          <button type="button" class="avatar-btn" aria-label="Menu" @click="dropdownOpen = !dropdownOpen">
            <img v-if="avatarUrl" class="avatar" :src="avatarUrl" alt="Avatar" aria-hidden="true" />
            <span v-else class="avatar" aria-hidden="true">{{ initial }}</span>
            <i class="fa-solid fa-chevron-down dropdown-arrow" :class="{ 'dropdown-open': dropdownOpen }" aria-hidden="true"></i>
          </button>
          <div v-if="dropdownOpen" class="dropdown-menu">
            <RouterLink class="dropdown-item" :to="{ name: 'public-profile', params: { id: authStore.user?.id } }">Profile</RouterLink>
            <RouterLink class="dropdown-item" :to="{ name: 'clubs' }">All clubs</RouterLink>
            <RouterLink class="dropdown-item" :to="{ name: 'account' }">Account</RouterLink>
            <button class="dropdown-item" type="button" @click="logout">Log out</button>
          </div>
        </div>
        <span class="small muted">{{ authStore.displayName }}</span>
      </div>

      <div v-else class="nav-links">
        <RouterLink class="nav-link" :to="{ name: 'clubs' }">Browse clubs</RouterLink>
        <RouterLink class="nav-link" :to="{ name: 'login' }">Log in</RouterLink>
        <RouterLink class="btn btn-sm" :to="{ name: 'register' }">Create account</RouterLink>
      </div>
    </div>
  </header>
</template>
