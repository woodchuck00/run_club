<script>
import { mapStores } from 'pinia';
import { useAuthStore } from '../stores/auth';
import AlertMessage from '../components/AlertMessage.vue';

export default {
  name: 'JoinClubView',
  components: { AlertMessage },
  data() {
    return {
      error: '',
      joining: false,
    };
  },
  computed: {
    ...mapStores(useAuthStore),
    club() {
      return this.authStore.activeClub;
    },
  },
  methods: {
    async join() {
      if (!this.club || this.joining) {
        return;
      }

      this.error = '';
      this.joining = true;

      try {
        await this.authStore.joinClub(this.club.slug);
        this.$router.replace({
          name: 'home',
          params: { clubSlug: this.club.slug },
        });
      } catch (error) {
        this.error = error.message;
      } finally {
        this.joining = false;
      }
    },
  },
};
</script>

<template>
  <div class="container page">
    <div class="auth-shell" style="margin-top: 0">
      <div v-if="club" class="auth-card stack">
        <div class="stack-sm">
          <span class="badge">Club invite</span>
          <h1 class="auth-title">{{ club.name }}</h1>
          <p class="auth-subtitle" style="margin-bottom: 0">
            {{ club.description || 'Join the roster to check in and track your attendance.' }}
          </p>
        </div>

        <div class="row small muted">
          <span class="icon-text">
            <i class="fa-solid fa-users" aria-hidden="true" />
            <span>{{ club.active_members }} active members</span>
          </span>
          <span>·</span>
          <span class="icon-text">
            <i class="fa-solid fa-calendar-days" aria-hidden="true" />
            <span>{{ club.sessions_count }} sessions</span>
          </span>
          <span>·</span>
          <span>{{ club.timezone }}</span>
        </div>

        <AlertMessage type="error" :message="error" />

        <button class="btn btn-block" type="button" :disabled="joining" @click="join">
          <i class="fa-solid fa-right-to-bracket" aria-hidden="true" />
          {{ joining ? 'Joining…' : `Join ${club.name}` }}
        </button>

        <p class="auth-switch" style="margin-top: 0">
          <RouterLink :to="{ name: 'clubs' }">
            <i class="fa-solid fa-compass" aria-hidden="true" />
            Browse other clubs
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
