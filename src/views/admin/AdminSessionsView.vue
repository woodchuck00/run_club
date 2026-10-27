<script>
import { mapStores } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../lib/api';
import { formatSessionDate, todayInputValue } from '../../lib/dates';
import AlertMessage from '../../components/AlertMessage.vue';

export default {
  name: 'AdminSessionsView',
  components: { AlertMessage },
  data() {
    return {
      sessions: [],
      loading: true,
      error: '',
      actionError: '',
      submitting: false,
      busyId: null,
      form: {
        sessionDate: '',
        title: '',
      },
    };
  },
  computed: {
    ...mapStores(useAuthStore),
  },
  created() {
    this.form.sessionDate = todayInputValue(new Date(), this.authStore.timezone);
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
    async createSession() {
      if (this.submitting) {
        return;
      }

      this.submitting = true;
      this.actionError = '';

      try {
        const data = await api('/sessions', {
          method: 'POST',
          body: {
            sessionDate: this.form.sessionDate,
            title: this.form.title,
          },
        });
        this.$router.push(
          this.authStore.clubRoute('admin-session', { id: data.session.id }),
        );
      } catch (error) {
        this.actionError = error.message;
      } finally {
        this.submitting = false;
      }
    },
    async toggleStatus(session) {
      if (this.busyId) {
        return;
      }

      this.busyId = session.id;
      this.actionError = '';

      try {
        await api(`/sessions/${session.id}`, {
          method: 'PATCH',
          body: {
            status: session.status === 'cancelled' ? 'scheduled' : 'cancelled',
          },
        });
        await this.load();
      } catch (error) {
        this.actionError = error.message;
      } finally {
        this.busyId = null;
      }
    },
    async removeSession(session) {
      const date = formatSessionDate(session.session_date);
      const confirmed = window.confirm(
        `Delete the session on ${date}? Attendance for this session will also be deleted.`,
      );

      if (!confirmed || this.busyId) {
        return;
      }

      this.busyId = session.id;
      this.actionError = '';

      try {
        await api(`/sessions/${session.id}`, { method: 'DELETE' });
        await this.load();
      } catch (error) {
        this.actionError = error.message;
      } finally {
        this.busyId = null;
      }
    },
    formatSessionDate,
  },
};
</script>

<template>
  <div class="page-shell page">
    <div class="page-header">
      <div>
        <h1>Admin sessions</h1>
        <p>Schedule runs and manage attendance.</p>
      </div>
      <div class="row">
        <RouterLink class="btn btn-secondary" :to="authStore.clubRoute('sessions')">
          <i class="fa-solid fa-list" aria-hidden="true" />
          View public list
        </RouterLink>
        <RouterLink class="btn btn-secondary" :to="authStore.clubRoute('admin-members')">
          <i class="fa-solid fa-users" aria-hidden="true" />
          Manage roster
        </RouterLink>
      </div>
    </div>

    <AlertMessage type="error" :message="error" />
    <AlertMessage type="error" :message="actionError" />

    <article class="card" style="margin-bottom: 1rem">
      <div class="section-title">
        <div>
          <h2>New session</h2>
          <p class="small muted">One session per date. Members can check in on the day.</p>
        </div>
      </div>

      <form class="form-grid" @submit.prevent="createSession">
        <div class="field">
          <label for="session-date">Date</label>
          <input id="session-date" v-model="form.sessionDate" type="date" required />
        </div>

        <div class="field">
          <label for="session-title">Title (optional)</label>
          <input
            id="session-title"
            v-model="form.title"
            type="text"
            maxlength="120"
            placeholder="Tuesday 5K"
          />
        </div>

        <div class="field" style="align-self: end">
          <button class="btn" type="submit" :disabled="submitting">
            <i class="fa-solid fa-calendar-plus" aria-hidden="true" />
            {{ submitting ? 'Creating…' : 'Create session' }}
          </button>
        </div>
      </form>
    </article>

    <div v-if="loading" class="loading">
      <span class="spinner" aria-hidden="true" />
      <span>Loading sessions…</span>
    </div>

    <div v-else-if="sessions.length" class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Session</th>
            <th scope="col">Status</th>
            <th scope="col">Attendance</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="session in sessions" :key="session.id">
            <td>
              <div class="stack-sm">
                <strong>{{ formatSessionDate(session.session_date) }}</strong>
                <span v-if="session.is_today" class="badge badge-primary">Today</span>
              </div>
            </td>
            <td>{{ session.title || 'Run club session' }}</td>
            <td>
              <span
                class="badge"
                :class="session.status === 'cancelled' ? 'badge-danger' : 'badge-primary'"
              >
                {{ session.status }}
              </span>
            </td>
            <td>{{ session.headcount || 0 }}</td>
            <td>
              <div class="row">
                <RouterLink
                  class="btn btn-secondary btn-sm"
                  :to="authStore.clubRoute('admin-session', { id: session.id })"
                >
                  <i class="fa-solid fa-user-check" aria-hidden="true" />
                  Manage
                </RouterLink>
                <button
                  class="btn btn-secondary btn-sm"
                  type="button"
                  :disabled="busyId === session.id"
                  @click="toggleStatus(session)"
                >
                  <i
                    :class="session.status === 'cancelled' ? 'fa-solid fa-rotate-left' : 'fa-solid fa-ban'"
                    aria-hidden="true"
                  />
                  {{ session.status === 'cancelled' ? 'Reactivate' : 'Cancel' }}
                </button>
                <button
                  class="btn btn-danger-soft btn-sm"
                  type="button"
                  :disabled="busyId === session.id"
                  @click="removeSession(session)"
                >
                  <i class="fa-solid fa-trash" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="empty-state">
      <h3>No sessions yet</h3>
      <p>Create your first session above.</p>
    </div>
  </div>
</template>
