<script>
import { mapStores } from 'pinia';
import { useAuthStore } from './stores/auth';
import AppNav from './components/AppNav.vue';

export default {
  name: 'App',
  components: { AppNav },
  computed: {
    ...mapStores(useAuthStore),
    year() {
      return new Date().getFullYear();
    },
  },
  mounted() {
    window.addEventListener('auth:unauthorized', this.handleUnauthorized);
  },
  beforeUnmount() {
    window.removeEventListener('auth:unauthorized', this.handleUnauthorized);
  },
  methods: {
    handleUnauthorized() {
      this.authStore.user = null;
      this.authStore.clubs = [];
      this.authStore.clearClub();

      if (this.$route.name !== 'login') {
        this.$router.push({
          name: 'login',
          query: { redirect: this.$route.fullPath },
        });
      }
    },
  },
};
</script>

<template>
  <AppNav />
  <main>
    <RouterView />
  </main>
  <footer class="app-footer">
    <div class="container row-between">
      <span>{{ authStore.clubName }}</span>
      <span>Attendance tracking · {{ year }}</span>
    </div>
  </footer>
</template>
