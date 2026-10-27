<script>
import { mapStores } from 'pinia';
import { useAuthStore } from '../stores/auth';
import { initials } from '../lib/format';
import { api } from '../lib/api';
import { socialMeta } from '../lib/social';
import AlertMessage from '../components/AlertMessage.vue';
import AvatarCropper from '../components/AvatarCropper.vue';

export default {
  name: 'AccountView',
  components: { AlertMessage, AvatarCropper },
  data() {
    return {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      error: '',
      success: '',
      submitting: false,
      clubsLoading: true,
      clubsError: '',
      profileBio: '',
      profileSocialLinks: '',
      profileEmail: '',
      profileFacebook: '',
      profileInstagram: '',
      profileTwitter: '',
      profileLinkedIn: '',
      profileDisplayName: '',
      profileAvatarUrl: '',
      profileAvatarFile: null,
      avatarCropOpen: false,
      avatarCropSrc: '',
      profileBirthdate: '',
      profileSex: '',
      profileMaritalStatus: '',
      profileBirthdatePublic: false,
      profileSexPublic: false,
      profileMaritalStatusPublic: false,
      sexOptions: [
        { value: 'female', label: 'Female' },
        { value: 'male', label: 'Male' },
        { value: 'prefer not to say', label: 'Prefer not to say' },
      ],
      maritalStatusOptions: [
        { value: 'single', label: 'Single' },
        { value: 'married', label: 'Married' },
        { value: 'partnered', label: 'Partnered' },
        { value: 'divorced', label: 'Divorced' },
        { value: 'widowed', label: 'Widowed' },
        { value: 'prefer not to say', label: 'Prefer not to say' },
      ],
      signedAvatarUrl: '',
      profileSubmitting: false,
      profileError: '',
      profileSuccess: '',
    };
  },
  computed: {
    ...mapStores(useAuthStore),
    initial() {
      return initials(this.authStore.displayName);
    },
    user() {
      return this.authStore.user;
    },
    avatarSrc() {
      if (this.profileAvatarFile) {
        return URL.createObjectURL(this.profileAvatarFile);
      }
      console.log(this.authStore, this.authStore.user)
      return this.signedAvatarUrl || '';
    },
    maxBirthdate() {
      return new Date().toISOString().slice(0, 10);
    },
    currentAge() {
      if (!this.profileBirthdate) {
        return null;
      }

      const [year, month, day] = this.profileBirthdate.split('-').map(Number);

      if (!year || !month || !day) {
        return null;
      }

      const today = new Date();
      const todayMonth = today.getUTCMonth() + 1;
      let age = today.getUTCFullYear() - year;
      const hasHadBirthday = todayMonth > month
        || (todayMonth === month && today.getUTCDate() >= day);

      if (!hasHadBirthday) {
        age -= 1;
      }

      return age >= 0 ? age : null;
    },
  },
  mounted() {
    this.loadClubs();
    this.loadProfile();
  },
  beforeUnmount() {
    this.releaseCropSrc();
  },
  methods: {
    async loadClubs() {
      this.clubsLoading = true;
      this.clubsError = '';

      try {
        await this.authStore.loadClubs();
      } catch (error) {
        this.clubsError = error.message;
      } finally {
        this.clubsLoading = false;
      }
    },
    async loadProfile() {
      if (this.authStore.user) {
        this.profileBio = this.authStore.user.bio || '';
        this.profileSocialLinks = this.authStore.user.socialLinks ? JSON.stringify(this.authStore.user.socialLinks, null, 2) : '';
        this.profileDisplayName = this.authStore.user.displayName || this.authStore.user.name || '';
        this.profileEmail = this.authStore.user.email || '';
        this.profileAvatarUrl = this.authStore.user.avatarUrl || '';
        this.profileBirthdate = this.authStore.user.birthdate
          ? String(this.authStore.user.birthdate).slice(0, 10)
          : '';
        this.profileSex = this.authStore.user.sex || '';
        this.profileMaritalStatus = this.authStore.user.maritalStatus || '';
        this.profileBirthdatePublic = Boolean(this.authStore.user.birthdatePublic);
        this.profileSexPublic = Boolean(this.authStore.user.sexPublic);
        this.profileMaritalStatusPublic = Boolean(this.authStore.user.maritalStatusPublic);
        const rawSocial = typeof this.authStore.user?.socialLinks === 'string'
          ? JSON.parse(this.authStore.user.socialLinks || '[]')
          : (this.authStore.user?.socialLinks || []);
        if (Array.isArray(rawSocial)) {
          rawSocial.forEach(link => {
            if (link.platform === 'facebook') this.profileFacebook = link.url || '';
            if (link.platform === 'instagram') this.profileInstagram = link.url || '';
            if (link.platform === 'twitter') this.profileTwitter = link.url || '';
            if (link.platform === 'linkedin') this.profileLinkedIn = link.url || '';
          });
        }

        if (this.authStore.user?.avatarUrl) {
          const url = new URL(this.authStore.user.avatarUrl);
          const parts = url.pathname.split('/');
          const key = parts.slice(parts.indexOf('run-club00') + 1).join('/');
          try {
            const res = await api(`/auth/me?key=${encodeURIComponent(key)}`, { clubSlug: null });
            this.signedAvatarUrl = res.url || '';
          } catch {
            this.signedAvatarUrl = '';
          }
        }
      }
    },
    socialMeta,
    onAvatarChange(event) {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file) {
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.profileError = 'Avatar must be a JPEG, PNG, GIF, or WebP image';
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.profileError = 'Avatar must be at most 5MB';
        return;
      }

      this.releaseCropSrc();
      this.avatarCropSrc = URL.createObjectURL(file);
      this.avatarCropOpen = true;
      this.profileError = '';
      this.profileSuccess = '';
    },
    releaseCropSrc() {
      if (this.avatarCropSrc) {
        URL.revokeObjectURL(this.avatarCropSrc);
        this.avatarCropSrc = '';
      }
    },
    cancelAvatarCrop() {
      this.avatarCropOpen = false;
      this.releaseCropSrc();
    },
    onAvatarCropped(file) {
      this.profileAvatarFile = file;
      this.avatarCropOpen = false;
      this.releaseCropSrc();
      this.profileError = '';
      this.profileSuccess = '';
    },
    async saveProfile() {
      if (this.profileSubmitting) {
        return;
      }

      this.profileError = '';
      this.profileSuccess = '';

      this.profileSubmitting = true;

      try {
        const socialLinks = [];
        if (this.profileFacebook) socialLinks.push({ platform: 'facebook', url: this.profileFacebook });
        if (this.profileInstagram) socialLinks.push({ platform: 'instagram', url: this.profileInstagram });
        if (this.profileTwitter) socialLinks.push({ platform: 'twitter', url: this.profileTwitter });
        if (this.profileLinkedIn) socialLinks.push({ platform: 'linkedin', url: this.profileLinkedIn });

        const formData = new FormData();
        formData.append('bio', this.profileBio || '');
        formData.append('displayName', this.profileDisplayName || '');
        formData.append('email', this.profileEmail || '');
        formData.append('birthdate', this.profileBirthdate || '');
        formData.append('sex', this.profileSex || '');
        formData.append('maritalStatus', this.profileMaritalStatus || '');
        formData.append('birthdatePublic', String(Boolean(this.profileBirthdatePublic)));
        formData.append('sexPublic', String(Boolean(this.profileSexPublic)));
        formData.append('maritalStatusPublic', String(Boolean(this.profileMaritalStatusPublic)));
        if (socialLinks.length) {
          formData.append('socialLinks', JSON.stringify(socialLinks));
        }
        if (this.profileAvatarFile) {
          formData.append('avatar', this.profileAvatarFile);
        }

        await api('/auth/profile', {
          method: 'POST',
          body: formData,
        });

        await this.authStore.refreshMe();
        this.profileSuccess = 'Profile updated successfully!';
        this.profileAvatarFile = null;
        document.getElementById('avatar-input').value = '';
        this.loadProfile();
      } catch (error) {
        if (error.message.includes('JSON')) {
          this.profileError = 'Invalid JSON format in social links';
        } else {
          this.profileError = error.message;
        }
      } finally {
        this.profileSubmitting = false;
      }
    },
    async submit() {
      if (this.submitting) {
        return;
      }

      this.error = '';
      this.success = '';

      if (this.newPassword !== this.confirmPassword) {
        this.error = 'New passwords do not match';
        return;
      }

      this.submitting = true;

      try {
        await this.authStore.changePassword(
          this.currentPassword,
          this.newPassword,
        );
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.success = 'Password updated. Other sessions have been signed out.';
      } catch (error) {
        this.error = error.message;
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>

<template>
  <div class="container page">
    <div class="page-header">
      <div>
        <h1>Account</h1>
        <p>Your profile, clubs, and password.</p>
      </div>
    </div>

    <div class="grid grid-2">
      <article class="card">
        <div class="section-title">
        <div>
          <h2>Your clubs</h2>
          <p class="small muted">Every club you belong to with this account.</p>
        </div>
        <RouterLink class="btn btn-secondary btn-sm" :to="{ name: 'clubs' }">
          <i class="fa-solid fa-compass" aria-hidden="true" />
          Browse clubs
        </RouterLink>
      </div>

      <AlertMessage type="error" :message="clubsError" />

      <div v-if="clubsLoading" class="loading">
        <span class="spinner" aria-hidden="true" />
        <span>Loading clubs…</span>
      </div>

      <div v-else-if="authStore.myClubs?.length" class="list">
        <div
          v-for="club in authStore.myClubs"
          :key="club.id"
          class="list-item"
        >
          <div class="stack-sm">
            <strong>{{ club.name }}</strong>
            <span class="small muted">
              {{ club.active_members }} active members · {{ club.timezone }}
            </span>
          </div>
          <div class="row">
            <span
              class="badge"
              :class="club.role === 'admin' ? 'badge-accent' : ''"
            >
              {{ club.role }}
            </span>
            <RouterLink
              class="btn btn-secondary btn-sm"
              :to="{ name: 'home', params: { clubSlug: club.slug } }"
            >
              <i class="fa-solid fa-arrow-right" aria-hidden="true" />
              Open
            </RouterLink>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <h3>No clubs joined</h3>
        <p style="margin-bottom: 1rem">Join a club or create your own.</p>
        <RouterLink class="btn" :to="{ name: 'clubs' }">
          <i class="fa-solid fa-compass" aria-hidden="true" />
          Browse clubs
        </RouterLink>
      </div>

      </article>

      <article class="card">
        <h2 style="margin-bottom: 1rem">Update profile</h2>
        <span class="badge">Runner account</span>

        <AlertMessage type="error" :message="profileError" />
        <AlertMessage type="success" :message="profileSuccess" />

        <form class="stack" @submit.prevent="saveProfile">
          <div class="field">
            <label for="avatar-input">Avatar</label>
            <div class="avatar-upload">
              <div class="avatar-preview">
                <img
                  v-if="avatarSrc"
                  :src="avatarSrc"
                  alt="Avatar preview"
                  class="avatar avatar-lg"
                />
                <span v-else class="avatar avatar-lg" aria-hidden="true">{{ initial }}</span>
              </div>
              <div class="avatar-upload-actions">
                <label class="btn btn-secondary btn-sm" for="avatar-input">
                  <i class="fa-solid fa-camera" aria-hidden="true" />
                  Choose file
                </label>
                <input
                  id="avatar-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  style="display: none"
                  @change="onAvatarChange"
                />
                <button
                  v-if="profileAvatarFile || user?.avatarUrl"
                  type="button"
                  class="btn btn-sm btn-danger"
                  @click="profileAvatarFile = null; profileAvatarUrl = ''"
                >
                  <i class="fa-solid fa-trash" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </div>
            <div class="field-note">
              Max size: 5MB. Allowed: JPG, PNG, GIF, WebP. You'll crop it to a square before saving.
            </div>
          </div>

          <div class="field">
            <label for="profile-email">Email</label>
            <input id="profile-email" v-model="profileEmail" type="email" required />
          </div>

          <div class="field">
            <label for="display-name">Display name</label>
            <input id="display-name" v-model="profileDisplayName" type="text" />
          </div>

          <div class="form-grid">
            <div class="field">
              <label for="profile-birthdate">Birthdate</label>
              <input
                id="profile-birthdate"
                v-model="profileBirthdate"
                type="date"
                :max="maxBirthdate"
              />
              <div v-if="currentAge !== null" class="field-note">
                Current age: {{ currentAge }}
              </div>
              <label class="row small muted">
                <input v-model="profileBirthdatePublic" type="checkbox" />
                Show age on public profile
              </label>
            </div>

            <div class="field">
              <label for="profile-sex">Sex</label>
              <select id="profile-sex" v-model="profileSex">
                <option value="">Not specified</option>
                <option
                  v-for="option in sexOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <label class="row small muted">
                <input v-model="profileSexPublic" type="checkbox" />
                Show on public profile
              </label>
            </div>

            <div class="field">
              <label for="profile-marital-status">Marital status</label>
              <select id="profile-marital-status" v-model="profileMaritalStatus">
                <option value="">Not specified</option>
                <option
                  v-for="option in maritalStatusOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <label class="row small muted">
                <input v-model="profileMaritalStatusPublic" type="checkbox" />
                Show on public profile
              </label>
            </div>
          </div>

          <div class="field">
            <label for="profile-bio">Bio</label>
            <textarea id="profile-bio" v-model="profileBio" rows="3" />
          </div>

          <div class="field">
            <label>Social links</label>
            <div class="stack-sm">
              <div class="social-link-field">
                <i :class="socialMeta('facebook').icon" aria-hidden="true" />
                <input v-model="profileFacebook" placeholder="Facebook URL" aria-label="Facebook URL" />
              </div>
              <div class="social-link-field">
                <i :class="socialMeta('instagram').icon" aria-hidden="true" />
                <input v-model="profileInstagram" placeholder="Instagram URL" aria-label="Instagram URL" />
              </div>
              <div class="social-link-field">
                <i :class="socialMeta('twitter').icon" aria-hidden="true" />
                <input v-model="profileTwitter" placeholder="X (Twitter) URL" aria-label="X (Twitter) URL" />
              </div>
              <div class="social-link-field">
                <i :class="socialMeta('linkedin').icon" aria-hidden="true" />
                <input v-model="profileLinkedIn" placeholder="LinkedIn URL" aria-label="LinkedIn URL" />
              </div>
            </div>
          </div>

          <button class="btn" type="submit" :disabled="profileSubmitting">
            <i class="fa-solid fa-floppy-disk" aria-hidden="true" />
            {{ profileSubmitting ? 'Saving...' : 'Save profile' }}
          </button>
        </form>

        <AvatarCropper
          :open="avatarCropOpen"
          :src="avatarCropSrc"
          @close="cancelAvatarCrop"
          @cropped="onAvatarCropped"
        />
      </article>
    </div>

    <section style="margin-top: 1.5rem">
      <article class="card">
        <h2 style="margin-bottom: 1rem">Change password</h2>

        <AlertMessage type="error" :message="error" />
        <AlertMessage type="success" :message="success" />

        <form class="stack" @submit.prevent="submit">
          <div class="field">
            <label for="current-password">Current password</label>
            <input
              id="current-password"
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>

          <div class="field">
            <label for="new-password">New password</label>
            <input
              id="new-password"
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
            />
          </div>

          <div class="field">
            <label for="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              minlength="8"
              required
            />
          </div>

          <button class="btn" type="submit" :disabled="submitting">
            <i class="fa-solid fa-key" aria-hidden="true" />
            {{ submitting ? 'Updating…' : 'Update password' }}
          </button>
        </form>
      </article>
    </section>
  </div>
</template>

