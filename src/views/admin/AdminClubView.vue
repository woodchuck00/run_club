<script>
import QRCode from 'qrcode';
import { mapStores } from 'pinia';
import { useAuthStore } from '../../stores/auth';
import AlertMessage from '../../components/AlertMessage.vue';
import SearchableSelect from '../../components/SearchableSelect.vue';
import { signB2Url } from '../../lib/b2';

const TIMEZONE_OPTIONS = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
  'Australia/Melbourne',
];

export default {
  name: 'AdminClubView',
  components: { AlertMessage, SearchableSelect },
  data() {
    return {
      name: '',
      timezone: '',
      timezoneOptions: TIMEZONE_OPTIONS,
      description: '',
      imageUrl: '',
      clubImageFile: null,
      clubImagePreview: '',
      socialLinks: [],
      mapImageUrl: '',
      mapImageFile: null,
      mapImagePreview: '',
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
          this.clubImageFile = null;
          this.mapImageFile = null;
          this.setClubImagePreview('');
          this.setMapImagePreview('');
          this.refreshImagePreviews();
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
  beforeUnmount() {
    this.releasePreview('clubImagePreview');
    this.releasePreview('mapImagePreview');
  },
  methods: {
    releasePreview(key) {
      const value = this[key];
      if (typeof value === 'string' && value.startsWith('blob:')) {
        URL.revokeObjectURL(value);
      }
    },
    setClubImagePreview(url) {
      this.releasePreview('clubImagePreview');
      this.clubImagePreview = url || '';
    },
    setMapImagePreview(url) {
      this.releasePreview('mapImagePreview');
      this.mapImagePreview = url || '';
    },
    async refreshImagePreviews() {
      const imageSource = this.imageUrl;
      const mapSource = this.mapImageUrl;

      const [clubImageUrl, mapImageUrl] = await Promise.all([
        signB2Url(imageSource),
        signB2Url(mapSource),
      ]);

      if (!this.clubImageFile && this.imageUrl === imageSource) {
        this.setClubImagePreview(clubImageUrl);
      }

      if (!this.mapImageFile && this.mapImageUrl === mapSource) {
        this.setMapImagePreview(mapImageUrl);
      }
    },
    validateImageFile(file, label) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.error = `${label} must be a JPEG, PNG, GIF, or WebP image`;
        return false;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.error = `${label} must be at most 5MB`;
        return false;
      }

      this.error = '';
      return true;
    },
    onClubImageChange(event) {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file || !this.validateImageFile(file, 'Club image')) {
        return;
      }

      this.clubImageFile = file;
      this.setClubImagePreview(URL.createObjectURL(file));
      this.success = '';
    },
    removeClubImage() {
      this.clubImageFile = null;
      this.imageUrl = '';
      this.setClubImagePreview('');
      this.success = '';
    },
    onMapImageChange(event) {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file || !this.validateImageFile(file, 'Map image')) {
        return;
      }

      this.mapImageFile = file;
      this.setMapImagePreview(URL.createObjectURL(file));
      this.success = '';
    },
    removeMapImage() {
      this.mapImageFile = null;
      this.mapImageUrl = '';
      this.setMapImagePreview('');
      this.success = '';
    },
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
        const formData = new FormData();
        formData.append('name', this.name.trim());
        formData.append('timezone', this.timezone.trim());
        formData.append('description', this.description.trim());
        formData.append('imageUrl', this.imageUrl || '');
        formData.append('mapImageUrl', this.mapImageUrl || '');
        formData.append('waiver', this.waiver || '');
        formData.append('zipCode', this.zipCode || '');
        formData.append(
          'socialLinks',
          JSON.stringify(Array.isArray(this.socialLinks) ? this.socialLinks : []),
        );

        if (this.clubImageFile) {
          formData.append('image', this.clubImageFile);
        }
        if (this.mapImageFile) {
          formData.append('mapImage', this.mapImageFile);
        }

        await this.authStore.updateClub(formData);
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
            <SearchableSelect
              id="club-timezone"
              v-model="timezone"
              :options="timezoneOptions"
              placeholder="Search timezones…"
              required
            />
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
            <label for="club-image-input">Club image</label>
            <div class="row" style="align-items: flex-start; gap: 1rem">
              <img
                v-if="clubImagePreview"
                :src="clubImagePreview"
                alt="Club image preview"
                style="width: 160px; height: 100px; object-fit: cover; border-radius: 12px"
              />
              <div class="stack-sm">
                <label class="btn btn-secondary btn-sm" for="club-image-input">
                  <i class="fa-solid fa-image" aria-hidden="true" />
                  Choose image
                </label>
                <input
                  id="club-image-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  style="display: none"
                  @change="onClubImageChange"
                />
                <button
                  v-if="clubImagePreview"
                  class="btn btn-sm btn-danger"
                  type="button"
                  @click="removeClubImage"
                >
                  <i class="fa-solid fa-trash" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </div>
            <span class="hint">Max size: 5MB. Allowed: JPG, PNG, GIF, WebP.</span>
          </div>

          <div class="field">
            <label for="club-map-image-input">Map image</label>
            <div class="row" style="align-items: flex-start; gap: 1rem">
              <img
                v-if="mapImagePreview"
                :src="mapImagePreview"
                alt="Map image preview"
                style="width: 160px; height: 100px; object-fit: cover; border-radius: 12px"
              />
              <div class="stack-sm">
                <label class="btn btn-secondary btn-sm" for="club-map-image-input">
                  <i class="fa-solid fa-map" aria-hidden="true" />
                  Choose image
                </label>
                <input
                  id="club-map-image-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  style="display: none"
                  @change="onMapImageChange"
                />
                <button
                  v-if="mapImagePreview"
                  class="btn btn-sm btn-danger"
                  type="button"
                  @click="removeMapImage"
                >
                  <i class="fa-solid fa-trash" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </div>
            <span class="hint">Max size: 5MB. Allowed: JPG, PNG, GIF, WebP.</span>
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
