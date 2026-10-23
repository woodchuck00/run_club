<script>
import { mapStores } from 'pinia';
import { useAuthStore } from '../stores/auth';
import AlertMessage from '../components/AlertMessage.vue';

export default {
  name: 'RegisterView',
  components: { AlertMessage },
  data() {
    return {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      error: '',
      submitting: false,
    };
  },
  computed: {
    ...mapStores(useAuthStore),
  },
  methods: {
    async submit() {
      if (this.submitting) {
        return;
      }

      this.error = '';

      if (this.password !== this.confirmPassword) {
        this.error = 'Passwords do not match';
        return;
      }

      this.submitting = true;

      try {
        await this.authStore.register(
          this.name.trim(),
          this.email.trim(),
          this.password,
        );
        const redirect = typeof this.$route.query.redirect === 'string'
          ? this.$route.query.redirect
          : '/clubs';
        const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//')
          ? redirect
          : '/clubs';
        this.$router.replace(safeRedirect);
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
  <div class="auth-shell">
    <div class="auth-card">
      <div class="auth-brand">
        <span class="brand-mark">{{ authStore.clubName.slice(0, 2).toUpperCase() }}</span>
        <span class="brand">{{ authStore.clubName }}</span>
      </div>

      <h1 class="auth-title">Create your account</h1>
      <p class="auth-subtitle">
        Then join a club, check in on run days, and track your attendance.
      </p>

      <AlertMessage type="error" :message="error" />

      <form class="stack" @submit.prevent="submit">
        <div class="field">
          <label for="register-name">Full name</label>
          <input
            id="register-name"
            v-model="name"
            type="text"
            autocomplete="name"
            required
            maxlength="80"
            placeholder="Alex Runner"
          />
        </div>

        <div class="field">
          <label for="register-email">Email</label>
          <input
            id="register-email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="you@example.com"
          />
        </div>

        <div class="field">
          <label for="register-password">Password</label>
          <input
            id="register-password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
            placeholder="At least 8 characters"
          />
        </div>

        <div class="field">
          <label for="register-confirm">Confirm password</label>
          <input
            id="register-confirm"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
            placeholder="Repeat your password"
          />
        </div>

        <button class="btn btn-block" type="submit" :disabled="submitting">
          {{ submitting ? 'Creating account…' : 'Create account' }}
        </button>
      </form>

      <p class="auth-switch">
        Already have an account?
        <RouterLink :to="{ name: 'login', query: $route.query }">Log in</RouterLink>
      </p>
    </div>
  </div>
</template>
