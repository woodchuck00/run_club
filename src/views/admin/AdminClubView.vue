<script>
import QRCode from 'qrcode';
import { mapStores } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import AlertMessage from '../../components/AlertMessage.vue';

export default {
  name: 'AdminClubView',
  components: { AlertMessage },
  data() {
    return {
      name: '',
      timezone: '',
      description: '',
      error: '',
      success: '',
      saving: false,
      copied: false,
      qrDataUrl: '',
      qrError: '',
    };
  },
  computed: {
    ...mapStores(useAuthStore),
    club() {
      return this.authStore.activeClub;
    },
    joinUrl() {
      if (!this.club) {
        return '';
      }

      return `${window.location.origin}/c/${this.club.slug}/join`;
    },
  },
  watch: {
    club: {
      immediate: true,
      handler(club) {
        if (club) {
          this.name = club.name;
          this.timezone = club.timezone;
          this.description = club.description || '';
          this.generateQr();
        }
      },
    },
    joinUrl: 'generateQr',
  },
  methods: {
    async generateQr() {
      if (!this.joinUrl) {
        return;
      }

      try {
        this.qrDataUrl = await QRCode.toDataURL(this.joinUrl, {
          width: 280,
          margin: 1,
          color: {
            dark: '#15231c',
            light: '#ffffff',
          },
        });
        this.qrError = '';
      } catch {
        this.qrError = 'Could not generate a QR code.';
      }
    },
    async copyLink() {
      try {
        await navigator.clipboard.writeText(this.joinUrl);
        this.copied = true;
        window.setTimeout(() => {
          this.copied = false;
        }, 1800);
      } catch {
        this.error = 'Could not copy the link. Copy it manually instead.';
      }
    },
    async save() {
      if (this.saving) {
        return;
      }

      this.error = '';
      this.success = '';
      this.saving = true;

      try {
        await this.authStore.updateClub({
          name: this.name.trim(),
          timezone: this.timezone.trim(),
          description: this.description.trim(),
        });
        this.success = 'Club settings updated.';
      } catch (error) {
        this.error = error.message;
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<template>
  <div class="container page">
    <div class="page-header">
      <div>
        <h1>Club settings</h1>
        <p>Manage how your club appears and share the join link.</p>
      </div>
      <div class="row">
        <RouterLink class="btn btn-secondary" :to="authStore.clubRoute('admin-members')">
          <i class="fa-solid fa-users" aria-hidden="true" />
          Manage roster
        </RouterLink>
        <RouterLink class="btn btn-secondary" :to="authStore.clubRoute('admin-sessions')">
          <i class="fa-solid fa-calendar-days" aria-hidden="true" />
          Manage sessions
        </RouterLink>
      </div>
    </div>

    <div v-if="club" class="grid grid-2">
      <article class="card">
        <h2 style="margin-bottom: 1rem">Details</h2>

        <AlertMessage type="error" :message="error" />
        <AlertMessage type="success" :message="success" />

        <form class="stack" @submit.prevent="save">
          <div class="field">
            <label for="club-name">Club name</label>
            <input id="club-name" v-model="name" type="text" maxlength="80" required />
          </div>

          <div class="field">
            <label for="club-timezone">Timezone</label>
            <input
              id="club-timezone"
              v-model="timezone"
              type="text"
              maxlength="64"
              required
            />
            <span class="hint">Used to decide which day a session falls on.</span>
          </div>

          <div class="field">
            <label for="club-description">Description</label>
            <textarea
              id="club-description"
              v-model="description"
              maxlength="280"
              rows="4"
            />
          </div>

          <div class="field">
            <span class="field-label">Club URL</span>
            <p class="mono wrap">/c/{{ club.slug }}</p>
          </div>

          <button class="btn" type="submit" :disabled="saving">
            <i class="fa-solid fa-floppy-disk" aria-hidden="true" />
            {{ saving ? 'Saving…' : 'Save changes' }}
          </button>
        </form>
      </article>

      <article class="card stack">
        <div class="stack-sm">
          <h2>Join QR code</h2>
          <p class="muted">
            Share this with new runners. After signing in, they can join the club from this link.
          </p>
        </div>

        <div class="row" style="justify-content: center">
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            alt="QR code for the club join link"
            width="280"
            height="280"
            style="max-width: 100%; border-radius: 12px"
          />
          <div v-else class="empty-state" style="width: 100%">
            <p>{{ qrError || 'Generating QR code…' }}</p>
          </div>
        </div>

        <p class="small mono wrap">{{ joinUrl }}</p>

        <div class="row">
          <button class="btn btn-secondary" type="button" @click="copyLink">
            <i :class="copied ? 'fa-solid fa-check' : 'fa-solid fa-copy'" aria-hidden="true" />
            {{ copied ? 'Copied' : 'Copy join link' }}
          </button>
          <a class="btn btn-secondary" :href="joinUrl" target="_blank" rel="noreferrer">
            <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
            Open join page
          </a>
        </div>
      </article>
    </div>
  </div>
</template>
