<script>
import { mapStores } from 'pinia';
import { useAuthStore } from '../stores/auth';
import { initials } from '../lib/format';
import AlertMessage from '../components/AlertMessage.vue';

export default {
  name: 'AccountView',
  components: { AlertMessage },
  data() {
    return {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      error: '',
      success: '',
      submitting: false,
      clubsLoading: true,
      clubsError: '',
    };
  },
  computed: {
    ...mapStores(useAuthStore),
    initial() {
      return initials(this.authStore.displayName);
    },
    user() {
      return this.authStore.user;
    },
  },
  mounted() {
    this.loadClubs();
  },
  methods: {
    async loadClubs() {
      this.clubsLoading = true;
      this.clubsError = '';

      try {
        await this.authStore.loadClubs();
      } catch (error) {
        this.clubsError = error.message;
      } finally {
        this.clubsLoading = false;
      }
    },
    async submit() {
      if (this.submitting) {
        return;
      }

      this.error = '';
      this.success = '';

      if (this.newPassword !== this.confirmPassword) {
        this.error = 'New passwords do not match';
        return;
      }

      this.submitting = true;

      try {
        await this.authStore.changePassword(
          this.currentPassword,
          this.newPassword,
        );
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.success = 'Password updated. Other sessions have been signed out.';
      } catch (error) {
        this.error = error.message;
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<template>
  <div class="container page">
    <div class="page-header">
      <div>
        <h1>Account</h1>
        <p>Your profile, clubs, and password.</p>
      </div>
    </div>

    <div class="grid grid-2">
      <article class="card">
        <div class="row">
          <span class="avatar avatar-lg" aria-hidden="true">{{ initial }}</span>
          <div class="stack-sm">
            <h2>{{ user.name }}</h2>
            <span class="badge">Runner account</span>
          </div>
        </div>

        <hr class="divider" />

        <div class="stack-sm">
          <div>
            <div class="stat-label">Email</div>
            <p class="wrap">{{ user.email }}</p>
          </div>
        </div>
      </article>

      <article class="card">
        <h2 style="margin-bottom: 1rem">Change password</h2>

        <AlertMessage type="error" :message="error" />
        <AlertMessage type="success" :message="success" />

        <form class="stack" @submit.prevent="submit">
          <div class="field">
            <label for="current-password">Current password</label>
            <input
              id="current-password"
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>

          <div class="field">
            <label for="new-password">New password</label>
            <input
              id="new-password"
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
            />
          </div>

          <div class="field">
            <label for="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
            />
          </div>

          <button class="btn" type="submit" :disabled="submitting">
            {{ submitting ? 'Updating…' : 'Update password' }}
          </button>
        </form>
      </article>
    </div>

    <section style="margin-top: 1.5rem">
      <div class="section-title">
        <div>
          <h2>Your clubs</h2>
          <p class="small muted">Every club you belong to with this account.</p>
        </div>
        <RouterLink class="btn btn-secondary btn-sm" :to="{ name: 'clubs' }">
          Browse clubs
        </RouterLink>
      </div>

      <AlertMessage type="error" :message="clubsError" />

      <div v-if="clubsLoading" class="loading">
        <span class="spinner" aria-hidden="true" />
        <span>Loading clubs…</span>
      </div>

      <div v-else-if="authStore.myClubs.length" class="list">
        <div
          v-for="club in authStore.myClubs"
          :key="club.id"
          class="list-item"
        >
          <div class="stack-sm">
            <strong>{{ club.name }}</strong>
            <span class="small muted">
              {{ club.active_members }} active members · {{ club.timezone }}
            </span>
          </div>
          <div class="row">
            <span
              class="badge"
              :class="club.role === 'admin' ? 'badge-accent' : ''"
            >
              {{ club.role }}
            </span>
            <RouterLink
              class="btn btn-secondary btn-sm"
              :to="{ name: 'home', params: { clubSlug: club.slug } }"
            >
              Open
            </RouterLink>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <h3>No clubs joined</h3>
        <p style="margin-bottom: 1rem">Join a club or create your own.</p>
        <RouterLink class="btn" :to="{ name: 'clubs' }">Browse clubs</RouterLink>
      </div>
    </section>
  </div>
</template>
