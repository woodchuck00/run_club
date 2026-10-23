<script>
import { mapStores } from 'pinia';
import { useAuthStore } from '../stores/auth';
import AlertMessage from '../components/AlertMessage.vue';

export default {
  name: 'LoginView',
  components: { AlertMessage },
  data() {
    return {
      email: '',
      password: '',
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
      this.submitting = true;

      try {
        await this.authStore.login(this.email.trim(), this.password);
        const redirect = typeof this.$route.query.redirect === 'string'
          ? this.$route.query.redirect
          : '/';
        const safeRedirect = redirect.startsWith('/') && !redirect.startsWith('//')
          ? redirect
          : '/';
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

      <h1 class="auth-title">Welcome back</h1>
      <p class="auth-subtitle">Log in to check in and see who has been running.</p>

      <AlertMessage type="error" :message="error" />

      <form class="stack" @submit.prevent="submit">
        <div class="field">
          <label for="login-email">Email</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="you@example.com"
          />
        </div>

        <div class="field">
          <label for="login-password">Password</label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="Your password"
          />
        </div>

        <button class="btn btn-block" type="submit" :disabled="submitting">
          {{ submitting ? 'Logging in…' : 'Log in' }}
        </button>
      </form>

      <p class="auth-switch">
        New to the club?
        <RouterLink :to="{ name: 'register' }">Create an account</RouterLink>
      </p>
    </div>
  </div>
</template>
