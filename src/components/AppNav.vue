<script>
import { mapStores } from 'pinia';
import { useAuthStore } from '../stores/auth';
import { initials } from '../lib/format';

export default {
  name: 'AppNav',
  computed: {
    ...mapStores(useAuthStore),
    initial() {
      return initials(this.authStore.displayName) || 'RC';
    },
    brandRoute() {
      return this.authStore.activeClub
        ? this.authStore.clubRoute('home')
        : { name: 'clubs' };
    },
  },
  methods: {
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
        <span class="brand-mark">{{ initials(authStore.clubName) || 'RC' }}</span>
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
        <RouterLink class="nav-link" :to="{ name: 'clubs' }">All clubs</RouterLink>
        <RouterLink class="nav-link" :to="{ name: 'account' }">Account</RouterLink>
      </nav>

      <div v-if="authStore.isAuthenticated" class="nav-user">
        <span class="avatar" aria-hidden="true">{{ initial }}</span>
        <span class="small muted">{{ authStore.displayName }}</span>
        <button class="btn btn-secondary btn-sm" type="button" @click="logout">Log out</button>
      </div>

      <div v-else class="nav-links">
        <RouterLink class="nav-link" :to="{ name: 'clubs' }">Browse clubs</RouterLink>
        <RouterLink class="nav-link" :to="{ name: 'login' }">Log in</RouterLink>
        <RouterLink class="btn btn-sm" :to="{ name: 'register' }">Create account</RouterLink>
      </div>
    </div>
  </header>
</template>
