<script>
import { mapStores } from 'pinia';
import { useAuthStore } from '../stores/auth';
import { api } from '../lib/api';
import { formatSessionDate } from '../lib/dates';
import AlertMessage from '../components/AlertMessage.vue';
import CheckInCard from '../components/CheckInCard.vue';
import SessionListItem from '../components/SessionListItem.vue';

export default {
  name: 'HomeView',
  components: { AlertMessage, CheckInCard, SessionListItem },
  data() {
    return {
      sessions: [],
      loading: true,
      error: '',
      busy: false,
    };
  },
  computed: {
    ...mapStores(useAuthStore),
    firstName() {
      return this.authStore.displayName.split(/\s+/)[0] || 'runner';
    },
    todaySession() {
      return this.sessions.find((session) => session.is_today) || null;
    },
    nextSession() {
      return this.sessions
        .filter((session) => session.is_future && session.status === 'scheduled')
        .sort((a, b) => a.session_date.localeCompare(b.session_date))[0] || null;
    },
    recentSessions() {
      return this.sessions
        .filter((session) => !session.is_future)
        .slice(0, 5);
    },
    checkedIn() {
      return Boolean(this.todaySession?.my_attendance_id);
    },
    canCheckIn() {
      return Boolean(
        this.todaySession &&
        this.todaySession.status === 'scheduled' &&
        this.authStore.memberActive &&
        !this.todaySession.my_attendance_id,
      );
    },
    canUndo() {
      return Boolean(
        this.todaySession &&
        this.todaySession.my_attendance_source === 'self',
      );
    },
    nextSessionDate() {
      return this.nextSession ? formatSessionDate(this.nextSession.session_date) : '';
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
        const data = await api('/sessions?limit=50');
        this.sessions = data.sessions;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    async checkIn() {
      if (!this.todaySession || this.busy) {
        return;
      }

      this.busy = true;
      this.error = '';

      try {
        await api(`/sessions/${this.todaySession.id}/checkin`, { method: 'POST' });
        await this.load();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busy = false;
      }
    },
    async undoCheckIn() {
      if (!this.todaySession || this.busy) {
        return;
      }

      this.busy = true;
      this.error = '';

      try {
        await api(`/sessions/${this.todaySession.id}/checkin`, { method: 'DELETE' });
        await this.load();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>

<template>
  <div class="container page">
    <div class="page-header">
      <div>
        <h1>Hi, {{ firstName }}</h1>
        <p>Here is where the club stands this week.</p>
      </div>
      <div class="row">
        <RouterLink
          v-if="authStore.isAdmin"
          class="btn btn-secondary"
          :to="authStore.clubRoute('admin-sessions')"
        >
          Schedule a session
        </RouterLink>
        <RouterLink class="btn btn-secondary" :to="authStore.clubRoute('sessions')">
          All sessions
        </RouterLink>
      </div>
    </div>

    <AlertMessage type="error" :message="error" />

    <div v-if="loading" class="loading">
      <span class="spinner" aria-hidden="true" />
      <span>Loading your club…</span>
    </div>

    <div v-else class="stack">
      <CheckInCard
        v-if="todaySession"
        :session="todaySession"
        :can-check-in="canCheckIn"
        :checked-in="checkedIn"
        :can-undo="canUndo"
        :busy="busy"
        @checkin="checkIn"
        @undo="undoCheckIn"
      />

      <article v-else class="card card-lg">
        <div class="row-between">
          <div class="stack-sm">
            <span class="badge">No session today</span>
            <h2>Nothing on the calendar for today</h2>
            <p class="muted">
              <template v-if="nextSession">
                The next run is {{ nextSessionDate }}.
              </template>
              <template v-else>
                No upcoming sessions are scheduled yet.
              </template>
            </p>
          </div>
          <RouterLink
            v-if="authStore.isAdmin"
            class="btn btn-secondary"
            :to="authStore.clubRoute('admin-sessions')"
          >
            Create a session
          </RouterLink>
          <RouterLink
            v-else-if="nextSession"
            class="btn btn-secondary"
            :to="authStore.clubRoute('session-detail', { id: nextSession.id })"
          >
            View next session
          </RouterLink>
        </div>
      </article>

      <article v-if="nextSession && todaySession" class="card">
        <div class="row-between">
          <div class="stack-sm">
            <span class="badge">Next session</span>
            <h3>{{ nextSession.title || 'Run club session' }}</h3>
            <p class="muted">{{ nextSessionDate }}</p>
          </div>
          <RouterLink
            class="btn btn-secondary"
            :to="authStore.clubRoute('session-detail', { id: nextSession.id })"
          >
            View
          </RouterLink>
        </div>
      </article>

      <section>
        <div class="section-title">
          <h2>Recent sessions</h2>
          <RouterLink class="small" :to="authStore.clubRoute('sessions')">View all</RouterLink>
        </div>

        <div v-if="recentSessions.length" class="list">
          <SessionListItem
            v-for="session in recentSessions"
            :key="session.id"
            :session="session"
          />
        </div>

        <div v-else class="empty-state">
          <h3>No sessions yet</h3>
          <p>
            <template v-if="authStore.isAdmin">
              Create the first session to start tracking attendance.
            </template>
            <template v-else>
              Check back once your club admin schedules a run.
            </template>
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
