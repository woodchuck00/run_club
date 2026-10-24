<script>
import { api } from '../lib/api';

export default {
  name: 'PublicProfileView',
  data() {
    return {
      user: null,
      loading: true,
      error: '',
      signedAvatarUrl: '',
    };
  },
  computed: {
    userId() {
      return this.$route.params.id;
    },
  },
  async mounted() {
    await this.loadProfile();
  },
  methods: {
    async loadProfile() {
      this.loading = true;
      try {
        const res = await api(`/user/${this.userId}`);
        this.user = res.user;
        if (this.user?.avatar_url) {
          await this.loadSignedAvatar();
        }
      } catch (e) {
        this.error = e.message || 'Failed to load profile';
      } finally {
        this.loading = false;
      }
    },
    async loadSignedAvatar() {
      if (!this.user?.avatar_url) return;
      try {
        const url = new URL(this.user.avatar_url);
        const parts = url.pathname.split('/');
        const key = parts.slice(parts.indexOf('run-club00') + 1).join('/');
        const res = await api(`/auth/me?key=${encodeURIComponent(key)}`);
        this.signedAvatarUrl = res.url || '';
      } catch {
        this.signedAvatarUrl = '';
      }
    },
  },
};
</script>

<template>
  <div class="container page">
    <div class="page-header">
      <h1>Public Profile</h1>
    </div>

    <article class="card">
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="error" class="alert alert-error">{{ error }}</div>
      <div v-else-if="user" class="stack">
        <div class="row">
          <img v-if="signedAvatarUrl" :src="signedAvatarUrl" alt="Avatar" class="avatar avatar-lg" />
          <img v-else-if="user.avatar_url" :src="user.avatar_url" alt="Avatar" class="avatar avatar-lg" />
          <span v-else class="avatar avatar-lg" aria-hidden="true">{{ user.display_name?.charAt(0) || user.name?.charAt(0) || '?' }}</span>
          <div class="stack-sm">
            <h2>{{ user.display_name || user.name }}</h2>
          </div>
        </div>
        <div v-if="user.bio" class="stack-sm">
          <div class="stat-label">Bio</div>
          <p>{{ user.bio }}</p>
        </div>
        <div v-if="user.social_links && user.social_links.length" class="stack-sm">
          <div class="stat-label">Social links</div>
          <div class="stack-sm">
            <a v-for="link in user.social_links" :key="link.platform" :href="link.url" target="_blank" rel="noopener noreferrer" class="muted">
              {{ link.platform }}
            </a>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>
