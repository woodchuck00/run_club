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
  methods: {
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
        <p>Your profile and password.</p>
      </div>
    </div>

    <div class="grid grid-2">
      <article class="card">
        <div class="row">
          <span class="avatar avatar-lg" aria-hidden="true">{{ initial }}</span>
          <div class="stack-sm">
            <h2>{{ user.member_name || user.name }}</h2>
            <div class="row">
              <span class="badge badge-primary">
                {{ user.role === 'admin' ? 'Admin' : 'Member' }}
              </span>
              <span
                v-if="user.member_status === 'archived'"
                class="badge badge-warning"
              >Archived</span>
            </div>
          </div>
        </div>

        <hr class="divider" />

        <div class="stack-sm">
          <div>
            <div class="stat-label">Email</div>
            <p class="wrap">{{ user.email }}</p>
          </div>
          <div>
            <div class="stat-label">Roster name</div>
            <p>{{ user.member_name || 'Not linked to a roster member' }}</p>
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
  </div>
</template>
