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
      <RouterLink class="brand" :to="authStore.isAuthenticated ? { name: 'home' } : { name: 'login' }">
        <span class="brand-mark">{{ initials(authStore.clubName) || 'RC' }}</span>
        <span>{{ authStore.clubName }}</span>
      </RouterLink>

      <nav v-if="authStore.isAuthenticated" class="nav-links" aria-label="Main navigation">
        <RouterLink class="nav-link" :to="{ name: 'home' }">Dashboard</RouterLink>
        <RouterLink class="nav-link" :to="{ name: 'sessions' }">Sessions</RouterLink>
        <RouterLink class="nav-link" :to="{ name: 'stats' }">Stats</RouterLink>
        <template v-if="authStore.isAdmin">
          <RouterLink class="nav-link" :to="{ name: 'admin-sessions' }">Admin sessions</RouterLink>
          <RouterLink class="nav-link" :to="{ name: 'admin-members' }">Roster</RouterLink>
        </template>
        <RouterLink class="nav-link" :to="{ name: 'account' }">Account</RouterLink>
      </nav>

      <div v-if="authStore.isAuthenticated" class="nav-user">
        <span class="avatar" aria-hidden="true">{{ initial }}</span>
        <span class="small muted">{{ authStore.displayName }}</span>
        <button class="btn btn-secondary btn-sm" type="button" @click="logout">Log out</button>
      </div>

      <div v-else class="nav-links">
        <RouterLink class="nav-link" :to="{ name: 'login' }">Log in</RouterLink>
        <RouterLink class="btn btn-sm" :to="{ name: 'register' }">Join the club</RouterLink>
      </div>
    </div>
  </header>
</template>
