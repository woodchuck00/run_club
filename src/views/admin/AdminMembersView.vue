<script>
import { api } from '../../lib/api';
import { formatShortDate } from '../../lib/dates';
import { initials } from '../../lib/format';
import AlertMessage from '../../components/AlertMessage.vue';
import BaseModal from '../../components/BaseModal.vue';

export default {
  name: 'AdminMembersView',
  components: { AlertMessage, BaseModal },
  data() {
    return {
      members: [],
      loading: true,
      error: '',
      actionError: '',
      filter: 'active',
      addForm: {
        displayName: '',
        email: '',
      },
      addSubmitting: false,
      editing: null,
      editForm: {
        displayName: '',
        email: '',
        status: 'active',
      },
      editError: '',
      editSubmitting: false,
      busyId: null,
    };
  },
  computed: {
    activeCount() {
      return this.members.filter((member) => member.status === 'active').length;
    },
    archivedCount() {
      return this.members.filter((member) => member.status === 'archived').length;
    },
    filteredMembers() {
      if (this.filter === 'all') {
        return this.members;
      }

      return this.members.filter((member) => member.status === this.filter);
    },
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
        const data = await api('/members?status=all');
        this.members = data.members;
      } catch (error) {
        this.error = error.message;
      } finally {
        if (!silent) {
          this.loading = false;
        }
      }
    },
    async addMember() {
      if (this.addSubmitting) {
        return;
      }

      this.addSubmitting = true;
      this.actionError = '';

      try {
        await api('/members', {
          method: 'POST',
          body: {
            displayName: this.addForm.displayName,
            email: this.addForm.email,
          },
        });
        this.addForm.displayName = '';
        this.addForm.email = '';
        await this.load(true);
      } catch (error) {
        this.actionError = error.message;
      } finally {
        this.addSubmitting = false;
      }
    },
    openEdit(member) {
      this.editing = member;
      this.editForm = {
        displayName: member.display_name,
        email: member.email || '',
        status: member.status,
      };
      this.editError = '';
    },
    closeEdit() {
      this.editing = null;
      this.editError = '';
    },
    async saveEdit() {
      if (!this.editing || this.editSubmitting) {
        return;
      }

      this.editSubmitting = true;
      this.editError = '';

      try {
        await api(`/members/${this.editing.id}`, {
          method: 'PATCH',
          body: {
            displayName: this.editForm.displayName,
            email: this.editForm.email,
            status: this.editForm.status,
          },
        });
        this.editing = null;
        await this.load(true);
      } catch (error) {
        this.editError = error.message;
      } finally {
        this.editSubmitting = false;
      }
    },
    async setStatus(member, status) {
      if (this.busyId) {
        return;
      }

      if (status === 'archived') {
        const confirmed = window.confirm(
          `Archive ${member.display_name}? Their attendance history will be kept.`,
        );

        if (!confirmed) {
          return;
        }
      }

      this.busyId = member.id;
      this.actionError = '';

      try {
        await api(`/members/${member.id}`, {
          method: 'PATCH',
          body: { status },
        });
        await this.load(true);
      } catch (error) {
        this.actionError = error.message;
      } finally {
        this.busyId = null;
      }
    },
    async toggleRole(member) {
      if (this.busyId) {
        return;
      }

      const role = member.role === 'admin' ? 'member' : 'admin';

      if (role === 'member') {
        const confirmed = window.confirm(
          `Remove admin access from ${member.display_name}?`,
        );

        if (!confirmed) {
          return;
        }
      }

      this.busyId = member.id;
      this.actionError = '';

      try {
        await api(`/members/${member.id}`, {
          method: 'PATCH',
          body: { role },
        });
        await this.load(true);
      } catch (error) {
        this.actionError = error.message;
      } finally {
        this.busyId = null;
      }
    },
    formatShortDate,
    initials,
  },
};
</script>

<template>
  <div class="container page">
    <div class="page-header">
      <div>
        <h1>Roster</h1>
        <p>Manage members, accounts, and admin access.</p>
      </div>
      <RouterLink
        class="btn btn-secondary"
        :to="{ name: 'admin-sessions', params: { clubSlug: $route.params.clubSlug } }"
      >
        <i class="fa-solid fa-calendar-days" aria-hidden="true" />
        Manage sessions
      </RouterLink>
    </div>

    <AlertMessage type="error" :message="error" />
    <AlertMessage type="error" :message="actionError" />

    <article class="card" style="margin-bottom: 1rem">
      <div class="section-title">
        <div>
          <h2>Add a roster member</h2>
          <p class="small muted">
            Add people before they register. Accounts link automatically by email.
          </p>
        </div>
      </div>

      <form class="form-grid" @submit.prevent="addMember">
        <div class="field">
          <label for="member-name">Name</label>
          <input
            id="member-name"
            v-model="addForm.displayName"
            type="text"
            maxlength="80"
            required
            placeholder="Alex Runner"
          />
        </div>

        <div class="field">
          <label for="member-email">Email (optional)</label>
          <input
            id="member-email"
            v-model="addForm.email"
            type="email"
            placeholder="alex@example.com"
          />
        </div>

        <div class="field" style="align-self: end">
          <button class="btn" type="submit" :disabled="addSubmitting">
            <i class="fa-solid fa-user-plus" aria-hidden="true" />
            {{ addSubmitting ? 'Adding…' : 'Add member' }}
          </button>
        </div>
      </form>
    </article>

    <div class="row-between" style="margin-bottom: 0.85rem">
      <div class="tabs" role="tablist" aria-label="Roster filters">
        <button
          class="tab"
          :class="{ active: filter === 'active' }"
          type="button"
          role="tab"
          :aria-selected="filter === 'active'"
          @click="filter = 'active'"
        >
          <i class="fa-solid fa-user-check" aria-hidden="true" />
          Active ({{ activeCount }})
        </button>
        <button
          class="tab"
          :class="{ active: filter === 'archived' }"
          type="button"
          role="tab"
          :aria-selected="filter === 'archived'"
          @click="filter = 'archived'"
        >
          <i class="fa-solid fa-box-archive" aria-hidden="true" />
          Archived ({{ archivedCount }})
        </button>
        <button
          class="tab"
          :class="{ active: filter === 'all' }"
          type="button"
          role="tab"
          :aria-selected="filter === 'all'"
          @click="filter = 'all'"
        >
          <i class="fa-solid fa-users" aria-hidden="true" />
          All ({{ members.length }})
        </button>
      </div>
      <span class="small muted">{{ filteredMembers.length }} shown</span>
    </div>

    <div v-if="loading" class="loading">
      <span class="spinner" aria-hidden="true" />
      <span>Loading roster…</span>
    </div>

    <div v-else-if="filteredMembers.length" class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Member</th>
            <th scope="col">Status</th>
            <th scope="col">Attendance</th>
            <th scope="col">Last run</th>
            <th scope="col">Account</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in filteredMembers" :key="member.id">
            <td>
              <div class="row">
                <span class="avatar" aria-hidden="true">
                  {{ initials(member.display_name) }}
                </span>
                <div class="stack-sm">
                  <strong>{{ member.display_name }}</strong>
                  <span v-if="member.email" class="small muted">{{ member.email }}</span>
                </div>
              </div>
            </td>
            <td>
              <span
                class="badge"
                :class="member.status === 'active' ? 'badge-primary' : 'badge-warning'"
              >
                {{ member.status }}
              </span>
            </td>
            <td>{{ member.attended_count }}</td>
            <td>
              <span v-if="member.last_attended">
                {{ formatShortDate(member.last_attended) }}
              </span>
              <span v-else class="muted small">Never</span>
            </td>
            <td>
              <template v-if="member.user_id">
                <span
                  class="badge"
                  :class="member.role === 'admin' ? 'badge-accent' : ''"
                >
                  {{ member.role }}
                </span>
              </template>
              <span v-else class="muted small">No account</span>
            </td>
            <td>
              <div class="row">
                <button
                  class="btn btn-secondary btn-sm"
                  type="button"
                  @click="openEdit(member)"
                >
                  <i class="fa-solid fa-pen" aria-hidden="true" />
                  Edit
                </button>
                <button
                  class="btn btn-secondary btn-sm"
                  type="button"
                  :disabled="busyId === member.id"
                  @click="setStatus(member, member.status === 'active' ? 'archived' : 'active')"
                >
                  <i
                    :class="member.status === 'active' ? 'fa-solid fa-box-archive' : 'fa-solid fa-rotate-left'"
                    aria-hidden="true"
                  />
                  {{ member.status === 'active' ? 'Archive' : 'Reactivate' }}
                </button>
                <button
                  v-if="member.user_id"
                  class="btn btn-ghost btn-sm"
                  type="button"
                  :disabled="busyId === member.id"
                  @click="toggleRole(member)"
                >
                  <i
                    :class="member.role === 'admin' ? 'fa-solid fa-user-minus' : 'fa-solid fa-user-shield'"
                    aria-hidden="true"
                  />
                  {{ member.role === 'admin' ? 'Remove admin' : 'Make admin' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="empty-state">
      <h3>No members in this view</h3>
      <p v-if="filter === 'archived'">Archived members will appear here.</p>
      <p v-else>Add your first roster member above.</p>
    </div>

    <BaseModal :open="Boolean(editing)" title="Edit member" @close="closeEdit">
      <AlertMessage type="error" :message="editError" />

      <form id="edit-member-form" class="stack" @submit.prevent="saveEdit">
        <div class="field">
          <label for="edit-name">Name</label>
          <input
            id="edit-name"
            v-model="editForm.displayName"
            type="text"
            maxlength="80"
            required
          />
        </div>

        <div class="field">
          <label for="edit-email">Email</label>
          <input id="edit-email" v-model="editForm.email" type="email" />
        </div>

        <div class="field">
          <label for="edit-status">Status</label>
          <select id="edit-status" v-model="editForm.status">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </form>

      <template #footer>
        <button class="btn btn-secondary" type="button" @click="closeEdit">
          <i class="fa-solid fa-xmark" aria-hidden="true" />
          Cancel
        </button>
        <button
          class="btn"
          type="submit"
          form="edit-member-form"
          :disabled="editSubmitting"
        >
          <i class="fa-solid fa-floppy-disk" aria-hidden="true" />
          {{ editSubmitting ? 'Saving…' : 'Save changes' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>
