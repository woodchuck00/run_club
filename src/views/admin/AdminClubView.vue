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
      imageUrl: '',
      socialLinks: [],
      mapImageUrl: '',
      waiver: '',
      zipCode: '',
      newSocialUrl: '',
      newSocialPlatform: 'instagram',
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
          this.imageUrl = club.imageUrl || club.image_url || '';
          this.mapImageUrl = club.mapImageUrl || club.map_image_url || '';
          this.waiver = club.waiver || '';
          this.zipCode = club.zipCode || club.zip_code || '';
          const sl = club.socialLinks || club.social_links || [];
          if (Array.isArray(sl)) {
            this.socialLinks = sl;
          } else if (typeof sl === 'string') {
            try { this.socialLinks = JSON.parse(sl) || []; } catch { this.socialLinks = []; }
          } else {
            this.socialLinks = [];
          }
          this.generateQr();
        }
      },
    },
    joinUrl: 'generateQr',
  },
  methods: {
    addClubSocial() {
      if (!Array.isArray(this.socialLinks)) { this.socialLinks = []; }
      if (!this.newSocialUrl) { return; }
      this.socialLinks.push({ platform: 'link', url: this.newSocialUrl });
      this.newSocialUrl = '';
    },
    onClubSocialInput(idx, e) {
      if (!Array.isArray(this.socialLinks)) { this.socialLinks = []; }
      this.socialLinks.splice(idx, 1, { ...this.socialLinks[idx], url: e.target.value });
    },
    removeClubSocial(idx) {
      if (!Array.isArray(this.socialLinks)) { this.socialLinks = []; }
      this.socialLinks.splice(idx, 1);
    },
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
        const payload = {
          name: this.name.trim(),
          timezone: this.timezone.trim(),
          description: this.description.trim(),
          imageUrl: this.imageUrl || null,
          mapImageUrl: this.mapImageUrl || null,
          waiver: this.waiver || null,
          zipCode: this.zipCode || null,
          socialLinks: Array.isArray(this.socialLinks) ? this.socialLinks : [],
        };
        await this.authStore.updateClub(payload);
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
  <div class="page-shell page">
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

    <div v-if="club" class="auto-grid grid-2">
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
            <select id="club-timezone" v-model="timezone" required>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/Denver">America/Denver</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="America/Phoenix">America/Phoenix</option>
              <option value="America/Anchorage">America/Anchorage</option>
              <option value="Pacific/Honolulu">Pacific/Honolulu</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="Europe/Berlin">Europe/Berlin</option>
              <option value="Europe/Madrid">Europe/Madrid</option>
              <option value="Europe/Rome">Europe/Rome</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
              <option value="Asia/Shanghai">Asia/Shanghai</option>
              <option value="Asia/Kolkata">Asia/Kolkata</option>
              <option value="Australia/Sydney">Australia/Sydney</option>
              <option value="Australia/Melbourne">Australia/Melbourne</option>
            </select>
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
            <label for="club-image-url">Club image URL</label>
            <input id="club-image-url" v-model="imageUrl" type="text" />
          </div>

          <div class="field">
            <label for="club-map-image-url">Map image URL</label>
            <input id="club-map-image-url" v-model="mapImageUrl" type="text" />
          </div>

          <div class="field">
            <label for="club-zip">Zip code</label>
            <input id="club-zip" v-model="zipCode" type="text" />
          </div>

          <div class="field">
            <label for="club-waiver">Waiver</label>
            <textarea id="club-waiver" v-model="waiver" rows="4" />
          </div>

          <div class="field">
            <label>Social media links</label>
            <div class="row" style="gap: 0.5rem">
              <input v-model="newSocialUrl" type="text" placeholder="https://..." style="flex: 1" />
              <button class="btn btn-secondary btn-sm" type="button" @click="addClubSocial">Add</button>
            </div>
            <div v-if="socialLinks && socialLinks.length" class="stack-sm" style="margin-top: 0.5rem">
              <div v-for="(link, idx) in socialLinks" :key="idx" class="row" style="align-items: center; gap: 0.5rem">
                <input :value="link.url" @input="onClubSocialInput(idx, $event)" type="text" style="flex: 1" />
                <button class="btn btn-ghost btn-sm" type="button" @click="removeClubSocial(idx)">X</button>
              </div>
            </div>
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
