<script>
import { api } from '../../lib/api';
import { formatSessionDate } from '../../lib/dates';
import { initials } from '../../lib/format';
import AlertMessage from '../../components/AlertMessage.vue';

export default {
  name: 'AdminSessionView',
  components: { AlertMessage },
  data() {
    return {
      session: null,
      attendance: [],
      members: [],
      loading: true,
      error: '',
      actionError: '',
      busyKey: null,
      guestName: '',
      search: '',
    };
  },
  computed: {
    attendingMemberIds() {
      return new Set(
        this.attendance
          .filter((record) => record.member_id)
          .map((record) => record.member_id),
      );
    },
    availableMembers() {
      const term = this.search.trim().toLowerCase();

      return this.members.filter((member) => {
        if (this.attendingMemberIds.has(member.id)) {
          return false;
        }

        return !term || member.display_name.toLowerCase().includes(term);
      });
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
    async load(silent = false) {
      if (!silent) {
        this.loading = true;
      }

      this.error = '';

      try {
        const [sessionData, memberData] = await Promise.all([
          api(`/sessions/${this.$route.params.id}`),
          api('/members?status=active'),
        ]);
        this.session = sessionData.session;
        this.attendance = sessionData.attendance;
        this.members = memberData.members;
      } catch (error) {
        this.error = error.message;
        this.session = null;
      } finally {
        if (!silent) {
          this.loading = false;
        }
      }
    },
    async addMember(member) {
      if (this.busyKey) {
        return;
      }

      this.busyKey = `member-${member.id}`;
      this.actionError = '';

      try {
        await api(`/sessions/${this.session.id}/attendance`, {
          method: 'POST',
          body: { memberId: member.id },
        });
        await this.load(true);
      } catch (error) {
        this.actionError = error.message;
      } finally {
        this.busyKey = null;
      }
    },
    async removeAttendance(record) {
      const name = record.display_name || record.guest_name;
      const confirmed = window.confirm(`Remove ${name} from this session?`);

      if (!confirmed || this.busyKey) {
        return;
      }

      this.busyKey = `attendance-${record.id}`;
      this.actionError = '';

      try {
        await api(`/attendance/${record.id}`, { method: 'DELETE' });
        await this.load(true);
      } catch (error) {
        this.actionError = error.message;
      } finally {
        this.busyKey = null;
      }
    },
    async addGuest() {
      const guestName = this.guestName.trim();

      if (!guestName || this.busyKey) {
        return;
      }

      this.busyKey = 'guest';
      this.actionError = '';

      try {
        await api(`/sessions/${this.session.id}/attendance`, {
          method: 'POST',
          body: { guestName },
        });
        this.guestName = '';
        await this.load(true);
      } catch (error) {
        this.actionError = error.message;
      } finally {
        this.busyKey = null;
      }
    },
    async toggleStatus() {
      if (!this.session || this.busyKey) {
        return;
      }

      this.busyKey = 'status';
      this.actionError = '';

      try {
        await api(`/sessions/${this.session.id}`, {
          method: 'PATCH',
          body: {
            status: this.session.status === 'cancelled' ? 'scheduled' : 'cancelled',
          },
        });
        await this.load(true);
      } catch (error) {
        this.actionError = error.message;
      } finally {
        this.busyKey = null;
      }
    },
    initials,
  },
};
</script>

<template>
  <div class="container page">
    <div class="row" style="margin-bottom: 1rem">
      <RouterLink
        class="small"
        :to="{ name: 'admin-sessions', params: { clubSlug: $route.params.clubSlug } }"
      >
        ← Back to admin sessions
      </RouterLink>
    </div>

    <AlertMessage type="error" :message="error" />
    <AlertMessage type="error" :message="actionError" />

    <div v-if="loading" class="loading">
      <span class="spinner" aria-hidden="true" />
      <span>Loading session…</span>
    </div>

    <template v-else-if="session">
      <div class="page-header">
        <div>
          <div class="row" style="margin-bottom: 0.5rem">
            <span
              class="badge"
              :class="session.status === 'cancelled' ? 'badge-danger' : 'badge-primary'"
            >
              {{ session.status }}
            </span>
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
            class="btn btn-secondary"
            :to="{
              name: 'session-detail',
              params: { clubSlug: $route.params.clubSlug, id: session.id },
            }"
          >
            View public page
          </RouterLink>
          <button
            class="btn btn-secondary"
            type="button"
            :disabled="busyKey === 'status'"
            @click="toggleStatus"
          >
            {{ session.status === 'cancelled' ? 'Reactivate session' : 'Cancel session' }}
          </button>
        </div>
      </div>

      <AlertMessage
        v-if="session.status === 'cancelled'"
        type="info"
        message="This session is cancelled. You can still adjust attendance records."
      />

      <div class="grid grid-2">
        <article class="card">
          <div class="section-title">
            <h2>Checked in</h2>
            <span class="small muted">{{ attendance.length }} total</span>
          </div>

          <div v-if="attendance.length" class="list">
            <div v-for="record in attendance" :key="record.id" class="list-item">
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
              <button
                class="btn btn-danger-soft btn-sm"
                type="button"
                :disabled="busyKey === `attendance-${record.id}`"
                @click="removeAttendance(record)"
              >
                Remove
              </button>
            </div>
          </div>

          <div v-else class="empty-state">
            <h3>No one checked in</h3>
            <p>Add members or guests from the panel on the right.</p>
          </div>
        </article>

        <div class="stack">
          <article class="card">
            <div class="section-title">
              <h2>Add members</h2>
              <span class="small muted">{{ availableMembers.length }} available</span>
            </div>

            <div class="field" style="margin-bottom: 0.75rem">
              <label class="sr-only" for="member-search">Search members</label>
              <input
                id="member-search"
                v-model="search"
                class="search"
                type="search"
                placeholder="Search the roster"
              />
            </div>

            <div v-if="availableMembers.length" class="list">
              <div
                v-for="member in availableMembers"
                :key="member.id"
                class="list-item"
              >
                <div class="row">
                  <span class="avatar" aria-hidden="true">
                    {{ initials(member.display_name) }}
                  </span>
                  <div class="stack-sm">
                    <strong>{{ member.display_name }}</strong>
                    <span class="small muted">
                      {{ member.attended_count }} sessions attended
                    </span>
                  </div>
                </div>
                <button
                  class="btn btn-sm"
                  type="button"
                  :disabled="busyKey === `member-${member.id}`"
                  @click="addMember(member)"
                >
                  Add
                </button>
              </div>
            </div>

            <div v-else class="empty-state">
              <p>
                <template v-if="search">No matching members.</template>
                <template v-else>Everyone on the roster is already checked in.</template>
              </p>
            </div>
          </article>

          <article class="card">
            <h2 style="margin-bottom: 0.75rem">Add a guest</h2>
            <form class="row" @submit.prevent="addGuest">
              <div class="field" style="flex: 1">
                <label class="sr-only" for="guest-name">Guest name</label>
                <input
                  id="guest-name"
                  v-model="guestName"
                  type="text"
                  maxlength="80"
                  placeholder="Guest name"
                />
              </div>
              <button class="btn" type="submit" :disabled="busyKey === 'guest'">
                {{ busyKey === 'guest' ? 'Adding…' : 'Add guest' }}
              </button>
            </form>
            <p class="hint" style="margin-top: 0.6rem">
              Guests are recorded for this session only.
            </p>
          </article>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <h3>Session not found</h3>
      <p style="margin-bottom: 1rem">It may have been deleted.</p>
      <RouterLink
        class="btn btn-secondary"
        :to="{ name: 'admin-sessions', params: { clubSlug: $route.params.clubSlug } }"
      >
        Back to admin sessions
      </RouterLink>
    </div>
  </div>
</template>
