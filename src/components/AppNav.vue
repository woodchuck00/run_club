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
      mobileOpen: false,
      theme: 'light',
    };
  },
  watch: {
    '$route.fullPath'() {
      this.dropdownOpen = false;
      this.mobileOpen = false;
    },
  },
  mounted() {
    this.theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    this.loadAvatar();
    this.$watch('authStore.user', () => this.loadAvatar(), { deep: true, immediate: true });
    document.addEventListener('click', this.onClickOutside);
    document.addEventListener('keydown', this.onKeydown);
    window.addEventListener('resize', this.onResize);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.onClickOutside);
    document.removeEventListener('keydown', this.onKeydown);
    window.removeEventListener('resize', this.onResize);
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
    toggleDropdown() {
      this.dropdownOpen = !this.dropdownOpen;
      if (this.dropdownOpen) {
        this.mobileOpen = false;
      }
    },
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = this.theme;

      try {
        localStorage.setItem('run-club-theme', this.theme);
      } catch {
        // Theme still applies for this page view if storage is unavailable.
      }
    },
    toggleMobile() {
      this.mobileOpen = !this.mobileOpen;
      if (this.mobileOpen) {
        this.dropdownOpen = false;
      }
    },
    onKeydown(event) {
      if (event.key === 'Escape') {
        this.dropdownOpen = false;
        this.mobileOpen = false;
      }
    },
    onResize() {
      if (window.matchMedia('(min-width: 80rem)').matches) {
        this.mobileOpen = false;
      }
    },
    onClickOutside(e) {
      if (this.$refs.avatarDropdown && !this.$refs.avatarDropdown.contains(e.target)) {
        this.dropdownOpen = false;
      }

      const mobileNav = this.$refs.mobileNav;
      const mobileToggle = this.$refs.mobileToggle;

      if (
        this.mobileOpen
        && mobileNav
        && !mobileNav.contains(e.target)
        && mobileToggle
        && !mobileToggle.contains(e.target)
      ) {
        this.mobileOpen = false;
      }
    },
  },
};
</script>

<template>
  <header class="nav">
    <div class="page-shell nav-inner">
      <RouterLink class="brand min-w-0" :to="brandRoute">
        <span class="brand-mark">{{ clubInitial }}</span>
        <span class="truncate">{{ authStore.clubName }}</span>
      </RouterLink>

      <nav
        v-if="authStore.isAuthenticated"
        class="nav-links hidden flex-1 justify-center xl:flex"
        aria-label="Main navigation"
      >
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

      <div class="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          class="icon-button theme-toggle"
          :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          :aria-pressed="theme === 'dark'"
          @click="toggleTheme"
        >
          <i
            :class="theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'"
            aria-hidden="true"
          />
        </button>

        <div v-if="authStore.isAuthenticated" ref="avatarDropdown" class="avatar-dropdown">
          <button
            type="button"
            class="avatar-btn"
            aria-label="Account menu"
            :aria-expanded="dropdownOpen"
            @click="toggleDropdown"
          >
            <img v-if="avatarUrl" class="avatar" :src="avatarUrl" alt="Avatar" aria-hidden="true" />
            <span v-else class="avatar" aria-hidden="true">{{ initial }}</span>
            <i
              class="fa-solid fa-chevron-down dropdown-arrow hidden! md:flex!"
              :class="{ 'dropdown-open': dropdownOpen }"
              aria-hidden="true"
            />
          </button>
          <div v-if="dropdownOpen" class="dropdown-menu" @click="dropdownOpen = false">
            <div class="dropdown-heading">
              <span class="small muted">Signed in as</span>
              <span class="truncate">{{ authStore.displayName }}</span>
            </div>
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

        <div v-if="!authStore.isAuthenticated" class="hidden items-center gap-2 xl:flex">
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

        <button
          ref="mobileToggle"
          type="button"
          class="icon-button md:hidden"
          aria-controls="mobile-nav"
          :aria-expanded="mobileOpen"
          :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
          @click="toggleMobile"
        >
          <i :class="mobileOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div
      v-if="mobileOpen"
      id="mobile-nav"
      ref="mobileNav"
      class="page-shell mobile-menu xl:hidden"
    >
      <nav class="flex flex-col gap-1" aria-label="Mobile navigation">
        <template v-if="authStore.isAuthenticated">
          <template v-if="authStore.activeClub">
            <RouterLink class="nav-link w-full" :to="authStore.clubRoute('home')">
              <i class="fa-solid fa-house fa-fw" aria-hidden="true" />
              Dashboard
            </RouterLink>
            <RouterLink class="nav-link w-full" :to="authStore.clubRoute('sessions')">
              <i class="fa-solid fa-calendar-days fa-fw" aria-hidden="true" />
              Sessions
            </RouterLink>
            <RouterLink class="nav-link w-full" :to="authStore.clubRoute('stats')">
              <i class="fa-solid fa-chart-simple fa-fw" aria-hidden="true" />
              Stats
            </RouterLink>

            <template v-if="authStore.isAdmin">
              <div class="small muted px-3 pt-2">Admin</div>
              <RouterLink class="nav-link w-full" :to="authStore.clubRoute('admin-sessions')">
                <i class="fa-solid fa-calendar-plus fa-fw" aria-hidden="true" />
                Admin sessions
              </RouterLink>
              <RouterLink class="nav-link w-full" :to="authStore.clubRoute('admin-members')">
                <i class="fa-solid fa-users fa-fw" aria-hidden="true" />
                Roster
              </RouterLink>
              <RouterLink class="nav-link w-full" :to="authStore.clubRoute('admin-club')">
                <i class="fa-solid fa-gear fa-fw" aria-hidden="true" />
                Club settings
              </RouterLink>
            </template>
          </template>
          <RouterLink v-else class="nav-link w-full" :to="{ name: 'clubs' }">
            <i class="fa-solid fa-compass fa-fw" aria-hidden="true" />
            Browse clubs
          </RouterLink>

          <div class="mobile-menu-divider" aria-hidden="true" />

          <div class="small muted px-3 truncate">{{ authStore.displayName || 'Account' }}</div>
          <RouterLink
            class="nav-link w-full"
            :to="{ name: 'public-profile', params: { id: authStore.user?.id } }"
          >
            <i class="fa-solid fa-user fa-fw" aria-hidden="true" />
            Profile
          </RouterLink>
          <RouterLink class="nav-link w-full" :to="{ name: 'clubs' }">
            <i class="fa-solid fa-layer-group fa-fw" aria-hidden="true" />
            All clubs
          </RouterLink>
          <RouterLink class="nav-link w-full" :to="{ name: 'account' }">
            <i class="fa-solid fa-user-gear fa-fw" aria-hidden="true" />
            Account
          </RouterLink>
          <button class="nav-link w-full justify-start" type="button" @click="logout">
            <i class="fa-solid fa-right-from-bracket fa-fw" aria-hidden="true" />
            Log out
          </button>
        </template>

        <template v-else>
          <RouterLink class="nav-link w-full" :to="{ name: 'clubs' }">
            <i class="fa-solid fa-compass fa-fw" aria-hidden="true" />
            Browse clubs
          </RouterLink>
          <RouterLink class="nav-link w-full" :to="{ name: 'login' }">
            <i class="fa-solid fa-right-to-bracket fa-fw" aria-hidden="true" />
            Log in
          </RouterLink>
          <RouterLink class="btn btn-sm w-full" :to="{ name: 'register' }">
            <i class="fa-solid fa-user-plus" aria-hidden="true" />
            Create account
          </RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>
