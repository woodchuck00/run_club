<script>
import { api } from '../lib/api';
import { socialMeta } from '../lib/social';
import AlertMessage from '../components/AlertMessage.vue';

export default {
  name: 'PublicProfileView',
  components: { AlertMessage },
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
    capitalize(value) {
      return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
    },
    socialMeta,
    async loadProfile() {
      this.loading = true;
      try {
        const res = await api(`/user/${this.userId}`);
        this.user = res.user;
        if (this.user) {
          if (typeof this.user.social_links === 'string') {
            try { this.user.social_links = JSON.parse(this.user.social_links || '[]'); } catch { this.user.social_links = []; }
          }
          if (typeof this.user.interests === 'string') {
            try { this.user.interests = JSON.parse(this.user.interests || '[]'); } catch { this.user.interests = []; }
          }
          if (typeof this.user.music === 'string') {
            try { this.user.music = JSON.parse(this.user.music || '[]'); } catch { this.user.music = []; }
          }
        }
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
  <div class="page-shell page">
    <div class="page-header">
      <h1>Public Profile</h1>
    </div>

    <article class="card">
      <div v-if="loading" class="loading">Loading...</div>
      <AlertMessage v-else-if="error" type="error" :message="error" />
      <div v-else-if="user" class="stack">
        <div class="row" style="align-items: center">
          <img v-if="signedAvatarUrl" :src="signedAvatarUrl" alt="Avatar" class="avatar avatar-lg" />
          <img v-else-if="user.avatar_url" :src="user.avatar_url" alt="Avatar" class="avatar avatar-lg" />
          <span v-else class="avatar avatar-lg" aria-hidden="true">{{ user.display_name?.charAt(0) || user.name?.charAt(0) || '?' }}</span>
          <div class="stack-sm">
            <h2 style="margin: 0">{{ user.display_name || user.name }}</h2>
          </div>
        </div>
        <div v-if="user.bio" class="stack-sm">
          <div class="stat-label">Bio</div>
          <p style="white-space: pre-wrap">{{ user.bio }}</p>
        </div>
        <div v-if="user.age || user.sex || user.marital_status" class="stack-sm">
          <div class="stat-label">Details</div>
          <div v-if="user.age" class="small icon-text">
            <i class="fa-solid fa-cake-candles" aria-hidden="true" />
            <span>Age: {{ user.age }}</span>
          </div>
          <div v-if="user.sex" class="small icon-text">
            <i class="fa-solid fa-venus-mars" aria-hidden="true" />
            <span>Sex: {{ capitalize(user.sex) }}</span>
          </div>
          <div v-if="user.marital_status" class="small icon-text">
            <i class="fa-solid fa-ring" aria-hidden="true" />
            <span>Marital status: {{ capitalize(user.marital_status) }}</span>
          </div>
        </div>
        <div v-if="user.interests && user.interests.length" class="stack-sm">
          <div class="stat-label">Interests</div>
          <div class="row flex-wrap" style="gap: 0.5rem">
            <span v-for="(interest, idx) in user.interests" :key="idx" class="badge badge-accent">{{ interest }}</span>
          </div>
        </div>
        <div v-if="user.music && user.music.length" class="stack-sm">
          <div class="stat-label">Music</div>
          <div class="row flex-wrap" style="gap: 0.5rem">
            <span v-for="(track, idx) in user.music" :key="idx" class="badge badge-accent">{{ track }}</span>
          </div>
        </div>
        <div v-if="user.social_links && user.social_links.length" class="stack-sm">
          <div class="stat-label">Social links</div>
          <div class="stack-sm">
            <a
              v-for="link in user.social_links"
              :key="link.platform"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="social-link"
            >
              <i :class="socialMeta(link.platform).icon" aria-hidden="true" />
              <span>{{ socialMeta(link.platform).label }}</span>
              <i class="fa-solid fa-arrow-up-right-from-square social-link-external" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>
