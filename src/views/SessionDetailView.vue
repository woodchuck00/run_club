<script>
import { mapStores } from 'pinia';
import { useAuthStore } from '../stores/auth';
import { api } from '../lib/api';
import { formatSessionDate } from '../lib/dates';
import { initials } from '../lib/format';
import AlertMessage from '../components/AlertMessage.vue';
import CheckInCard from '../components/CheckInCard.vue';

export default {
  name: 'SessionDetailView',
  components: { AlertMessage, CheckInCard },
  data() {
    return {
      session: null,
      attendance: [],
      loading: true,
      error: '',
      busy: false,
    };
  },
  computed: {
    ...mapStores(useAuthStore),
    checkedIn() {
      return Boolean(this.session?.my_attendance_id);
    },
    canCheckIn() {
      return Boolean(this.session?.can_check_in);
    },
    canUndo() {
      return Boolean(this.session?.can_undo_check_in);
    },
    title() {
      return this.session?.title || 'Run club session';
    },
    formattedDate() {
      return this.session ? formatSessionDate(this.session.session_date) : '';
    },
  },
  watch: {
    '$route.params.id': 'load',
    '$route.params.clubSlug': 'load',
  },
  mounted() {
    this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      this.error = '';

      try {
        const data = await api(`/sessions/${this.$route.params.id}`);
        this.session = data.session;
        this.attendance = data.attendance;
      } catch (error) {
        this.error = error.message;
        this.session = null;
      } finally {
        this.loading = false;
      }
    },
    async checkIn() {
      if (!this.session || this.busy) {
        return;
      }

      this.busy = true;
      this.error = '';

      try {
        await api(`/sessions/${this.session.id}/checkin`, { method: 'POST' });
        await this.load();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busy = false;
      }
    },
    async undoCheckIn() {
      if (!this.session || this.busy) {
        return;
      }

      this.busy = true;
      this.error = '';

      try {
        await api(`/sessions/${this.session.id}/checkin`, { method: 'DELETE' });
        await this.load();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busy = false;
      }
    },
    initials,
  },
};
</script>

<template>
  <div class="page-shell page">
    <div class="row" style="margin-bottom: 1rem">
      <RouterLink class="small icon-text" :to="authStore.clubRoute('sessions')">
        <i class="fa-solid fa-arrow-left" aria-hidden="true" />
        <span>Back to sessions</span>
      </RouterLink>
    </div>

    <AlertMessage type="error" :message="error" />

    <div v-if="loading" class="loading">
      <span class="spinner" aria-hidden="true" />
      <span>Loading session…</span>
    </div>

    <template v-else-if="session">
      <div class="page-header">
        <div>
          <div class="row" style="margin-bottom: 0.5rem">
            <span v-if="session.is_today" class="badge badge-primary">Today</span>
            <span v-if="session.my_attendance_id" class="badge badge-accent">
              You attended
            </span>
            <span
              v-if="session.status === 'cancelled'"
              class="badge badge-danger"
            >Cancelled</span>
            <span class="small muted">{{ formattedDate }}</span>
          </div>
          <h1>{{ title }}</h1>
          <p>
            {{ session.headcount }} checked in
            <span v-if="session.guest_count">
              · {{ session.member_count }} members, {{ session.guest_count }} guests
            </span>
          </p>
        </div>
        <div class="row">
          <RouterLink
            v-if="authStore.isAdmin"
            class="btn btn-secondary"
            :to="authStore.clubRoute('admin-session', { id: session.id })"
          >
            <i class="fa-solid fa-user-check" aria-hidden="true" />
            Manage attendance
          </RouterLink>
        </div>
      </div>

      <div class="stack">
        <CheckInCard
          v-if="session.is_today"
          :session="session"
          :can-check-in="canCheckIn"
          :checked-in="checkedIn"
          :can-undo="canUndo"
          :busy="busy"
          @checkin="checkIn"
          @undo="undoCheckIn"
        />

        <AlertMessage
          v-if="session.status === 'cancelled'"
          type="info"
          message="This session was cancelled. Attendance history is kept for reference."
        />

        <article v-else-if="!session.is_today" class="card">
          <div class="row-between">
            <div class="stack-sm">
              <span class="badge">Session summary</span>
              <h3>{{ session.headcount }} attendees</h3>
              <p class="muted">
                {{ session.member_count }} members
                <span v-if="session.guest_count"> and {{ session.guest_count }} guests</span>
              </p>
            </div>
            <RouterLink class="btn btn-secondary" :to="authStore.clubRoute('stats')">
              <i class="fa-solid fa-chart-simple" aria-hidden="true" />
              View stats
            </RouterLink>
          </div>
        </article>

        <article class="card">
          <div class="section-title">
            <h2>Attendance</h2>
            <span class="small muted">{{ attendance.length }} total</span>
          </div>

          <div v-if="attendance.length" class="list">
            <div
              v-for="record in attendance"
              :key="record.id"
              class="list-row"
            >
              <div class="row">
                <span
                  class="avatar"
                  :class="{ 'avatar-muted': record.guest_name }"
                  aria-hidden="true"
                >
                  {{ initials(record.display_name || record.guest_name) }}
                </span>
                <div class="stack-sm">
                  <strong>{{ record.display_name || record.guest_name }}</strong>
                  <div class="row">
                    <span v-if="record.guest_name" class="badge badge-accent">Guest</span>
                    <span v-if="record.member_status === 'archived'" class="badge">Archived</span>
                    <span class="small muted">
                      {{ record.source === 'self' ? 'Self check-in' : 'Added by admin' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <h3>Nobody checked in yet</h3>
            <p>Attendance will appear here as people arrive.</p>
          </div>
        </article>
      </div>
    </template>

    <div v-else class="empty-state">
      <h3>Session not found</h3>
      <p style="margin-bottom: 1rem">It may have been deleted.</p>
      <RouterLink class="btn btn-secondary" :to="authStore.clubRoute('sessions')">
        <i class="fa-solid fa-arrow-left" aria-hidden="true" />
        Back to sessions
      </RouterLink>
    </div>
  </div>
</template>
