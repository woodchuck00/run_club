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
    document.addEventListener('click', this.onClickOutside);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onClickOutside);
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
    onClickOutside(e) {
      if (this.$refs.avatarDropdown && !this.$refs.avatarDropdown.contains(e.target)) {
        this.dropdownOpen = false;
      }
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
          <RouterLink class="nav-link" :to="authStore.clubRoute('home')">
            <i class="fa-solid fa-house fa-fw" aria-hidden="true" />
            Dashboard
          </RouterLink>
          <RouterLink class="nav-link" :to="authStore.clubRoute('sessions')">
            <i class="fa-solid fa-calendar-days fa-fw" aria-hidden="true" />
            Sessions
          </RouterLink>
          <RouterLink class="nav-link" :to="authStore.clubRoute('stats')">
            <i class="fa-solid fa-chart-simple fa-fw" aria-hidden="true" />
            Stats
          </RouterLink>
          <template v-if="authStore.isAdmin">
            <RouterLink class="nav-link" :to="authStore.clubRoute('admin-sessions')">
              <i class="fa-solid fa-calendar-plus fa-fw" aria-hidden="true" />
              Admin sessions
            </RouterLink>
            <RouterLink class="nav-link" :to="authStore.clubRoute('admin-members')">
              <i class="fa-solid fa-users fa-fw" aria-hidden="true" />
              Roster
            </RouterLink>
            <RouterLink class="nav-link" :to="authStore.clubRoute('admin-club')">
              <i class="fa-solid fa-gear fa-fw" aria-hidden="true" />
              Club settings
            </RouterLink>
          </template>
        </template>

      </nav>

      <div v-if="authStore.isAuthenticated" class="nav-user">
        <div class="avatar-dropdown">
          <button ref="avatarDropdown" type="button" class="avatar-btn" aria-label="Menu"
            @click="dropdownOpen = !dropdownOpen">
            <img v-if="avatarUrl" class="avatar" :src="avatarUrl" alt="Avatar" aria-hidden="true" />
            <span v-else class="avatar" aria-hidden="true">{{ initial }}</span>
            <i class="fa-solid fa-chevron-down dropdown-arrow" :class="{ 'dropdown-open': dropdownOpen }"
              aria-hidden="true"></i>
          </button>
          <div v-if="dropdownOpen" class="dropdown-menu" @click="dropdownOpen = false">
            <RouterLink class="dropdown-item" :to="{ name: 'public-profile', params: { id: authStore.user?.id } }">
              <i class="fa-solid fa-user fa-fw" aria-hidden="true" />
              Profile
            </RouterLink>
            <RouterLink class="dropdown-item" :to="{ name: 'clubs' }">
              <i class="fa-solid fa-layer-group fa-fw" aria-hidden="true" />
              All clubs
            </RouterLink>
            <RouterLink class="dropdown-item" :to="{ name: 'account' }">
              <i class="fa-solid fa-user-gear fa-fw" aria-hidden="true" />
              Account
            </RouterLink>
            <button class="dropdown-item" type="button" @click.stop="logout">
              <i class="fa-solid fa-right-from-bracket fa-fw" aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
        <span class="small muted">{{ authStore.displayName }}</span>
      </div>

      <div v-else class="nav-links">
        <RouterLink class="nav-link" :to="{ name: 'clubs' }">
          <i class="fa-solid fa-compass fa-fw" aria-hidden="true" />
          Browse clubs
        </RouterLink>
        <RouterLink class="nav-link" :to="{ name: 'login' }">
          <i class="fa-solid fa-right-to-bracket fa-fw" aria-hidden="true" />
          Log in
        </RouterLink>
        <RouterLink class="btn btn-sm" :to="{ name: 'register' }">
          <i class="fa-solid fa-user-plus" aria-hidden="true" />
          Create account
        </RouterLink>
      </div>
    </div>
  </header>
</template>
