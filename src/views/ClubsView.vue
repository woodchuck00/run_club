<script>
import { mapStores } from 'pinia';
import { useAuthStore } from '../stores/auth';
import AlertMessage from '../components/AlertMessage.vue';

export default {
  name: 'ClubsView',
  components: { AlertMessage },
  data() {
    return {
      loading: true,
      error: '',
    };
  },
  computed: {
    ...mapStores(useAuthStore),
    missingClub() {
      return typeof this.$route.query.missing === 'string'
        ? this.$route.query.missing
        : '';
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      this.error = '';

      try {
        await this.authStore.loadClubs();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    clubRoute(club) {
      return club.joined
        ? { name: 'home', params: { clubSlug: club.slug } }
        : { name: 'club-join', params: { clubSlug: club.slug } };
    },
  },
};
</script>

<template>
  <div class="container page">
    <div class="page-header">
      <div>
        <h1>Run clubs</h1>
        <p>Find a club, join the roster, and start checking in.</p>
      </div>
      <div class="row">
        <RouterLink
          v-if="authStore.isAuthenticated"
          class="btn"
          :to="{ name: 'club-new' }"
        >
          <i class="fa-solid fa-circle-plus" aria-hidden="true" />
          Create a club
        </RouterLink>
        <RouterLink v-else class="btn" :to="{ name: 'register' }">
          <i class="fa-solid fa-user-plus" aria-hidden="true" />
          Create an account
        </RouterLink>
      </div>
    </div>

    <AlertMessage
      v-if="missingClub"
      type="error"
      :message="`No club was found at /c/${missingClub}.`"
    />
    <AlertMessage type="error" :message="error" />

    <div v-if="loading" class="loading">
      <span class="spinner" aria-hidden="true" />
      <span>Loading clubs…</span>
    </div>

    <div v-else-if="authStore.clubs.length" class="grid grid-3">
      <article
        v-for="club in authStore.clubs"
        :key="club.id"
        class="card stack"
      >
        <div class="stack-sm">
          <div class="row-between">
            <h2>{{ club.name }}</h2>
            <span v-if="club.joined" class="badge badge-primary">
              {{ club.role }}
            </span>
          </div>
          <p class="muted">
            {{ club.description || 'A run club tracking sessions and attendance.' }}
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
        </div>

        <div class="row-between">
          <span class="small muted">{{ club.timezone }}</span>
          <RouterLink class="btn btn-secondary btn-sm" :to="clubRoute(club)">
            <i
              :class="club.joined ? 'fa-solid fa-arrow-right' : 'fa-solid fa-right-to-bracket'"
              aria-hidden="true"
            />
            {{ club.joined ? 'Open club' : 'Join club' }}
          </RouterLink>
        </div>
      </article>
    </div>

    <div v-else class="empty-state">
      <h3>No clubs yet</h3>
      <p style="margin-bottom: 1rem">Create the first club to get started.</p>
      <RouterLink
        v-if="authStore.isAuthenticated"
        class="btn"
        :to="{ name: 'club-new' }"
      >
        <i class="fa-solid fa-circle-plus" aria-hidden="true" />
        Create a club
      </RouterLink>
      <RouterLink v-else class="btn" :to="{ name: 'register' }">
        <i class="fa-solid fa-user-plus" aria-hidden="true" />
        Create an account
      </RouterLink>
    </div>
  </div>
</template>
