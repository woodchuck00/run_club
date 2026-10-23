<script>
import { mapStores } from 'pinia';
import { useAuthStore } from '../stores/auth';
import { api } from '../lib/api';
import AlertMessage from '../components/AlertMessage.vue';
import SessionListItem from '../components/SessionListItem.vue';

export default {
  name: 'SessionsView',
  components: { AlertMessage, SessionListItem },
  data() {
    return {
      sessions: [],
      loading: true,
      error: '',
      filter: 'all',
    };
  },
  computed: {
    ...mapStores(useAuthStore),
    attendedCount() {
      return this.completedSessions.filter((session) => session.my_attendance_id).length;
    },
    completedSessions() {
      return this.sessions.filter(
        (session) => !session.is_future && session.status === 'scheduled',
      );
    },
    completedCount() {
      return this.completedSessions.length;
    },
    filteredSessions() {
      if (this.filter === 'attended') {
        return this.completedSessions.filter((session) => session.my_attendance_id);
      }

      return this.sessions;
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
        const data = await api('/sessions?limit=200');
        this.sessions = data.sessions;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<template>
  <div class="container page">
    <div class="page-header">
      <div>
        <h1>Sessions</h1>
        <p>
          Every run, newest first.
          <template v-if="completedCount">
            You have attended {{ attendedCount }} of {{ completedCount }} sessions held so far.
          </template>
        </p>
      </div>
      <RouterLink
        v-if="authStore.isAdmin"
        class="btn btn-secondary"
        :to="authStore.clubRoute('admin-sessions')"
      >
        Manage sessions
      </RouterLink>
    </div>

    <AlertMessage type="error" :message="error" />

    <div v-if="loading" class="loading">
      <span class="spinner" aria-hidden="true" />
      <span>Loading sessions…</span>
    </div>

    <div v-else-if="sessions.length" class="stack">
      <div class="row-between">
        <div class="tabs" role="tablist" aria-label="Session filters">
          <button
            class="tab"
            :class="{ active: filter === 'all' }"
            type="button"
            role="tab"
            :aria-selected="filter === 'all'"
            @click="filter = 'all'"
          >
            All sessions
          </button>
          <button
            class="tab"
            :class="{ active: filter === 'attended' }"
            type="button"
            role="tab"
            :aria-selected="filter === 'attended'"
            @click="filter = 'attended'"
          >
            My attendance ({{ attendedCount }})
          </button>
        </div>
        <span class="small muted">{{ filteredSessions.length }} shown</span>
      </div>

      <div v-if="filteredSessions.length" class="list">
        <SessionListItem
          v-for="session in filteredSessions"
          :key="session.id"
          :session="session"
        />
      </div>

      <div v-else class="empty-state">
        <h3>No attended sessions yet</h3>
        <p>Check in on the day of a session and it will appear here.</p>
      </div>
    </div>

    <div v-else class="empty-state">
      <h3>No sessions yet</h3>
      <p>
        <template v-if="authStore.isAdmin">
          Create the first session to start tracking attendance.
        </template>
        <template v-else>
          Check back once a session has been scheduled.
        </template>
      </p>
    </div>
  </div>
</template>
