<script>
import { mapStores } from 'pinia';
import { useAuthStore } from '../stores/auth';
import AlertMessage from '../components/AlertMessage.vue';

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default {
  name: 'CreateClubView',
  components: { AlertMessage },
  data() {
    return {
      name: '',
      slug: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      description: '',
      slugTouched: false,
      error: '',
      submitting: false,
    };
  },
  computed: {
    ...mapStores(useAuthStore),
  },
  watch: {
    name(value) {
      if (!this.slugTouched) {
        this.slug = slugify(value);
      }
    },
  },
  methods: {
    async submit() {
      if (this.submitting) {
        return;
      }

      this.error = '';
      this.submitting = true;

      try {
        const club = await this.authStore.createClub({
          name: this.name.trim(),
          slug: this.slug.trim(),
          timezone: this.timezone.trim(),
          description: this.description.trim(),
        });
        this.$router.replace({
          name: 'home',
          params: { clubSlug: club.slug },
        });
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
  <div class="page-shell page">
    <div class="auth-shell" style="margin-top: 0">
      <div class="auth-card">
        <h1 class="auth-title">Create a club</h1>
        <p class="auth-subtitle">
          You will become the first admin. You can invite runners with the club link.
        </p>

        <AlertMessage type="error" :message="error" />

        <form class="stack" @submit.prevent="submit">
          <div class="field">
            <label for="club-name">Club name</label>
            <input
              id="club-name"
              v-model="name"
              type="text"
              maxlength="80"
              required
              placeholder="Riverside Run Club"
            />
          </div>

          <div class="field">
            <label for="club-slug">Club URL</label>
            <div class="row" style="flex-wrap: nowrap">
              <span class="small muted">/c/</span>
              <input
                id="club-slug"
                v-model="slug"
                type="text"
                maxlength="60"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
                placeholder="riverside-run-club"
                @input="slugTouched = true"
              />
            </div>
            <span class="hint">Lowercase letters, numbers, and single hyphens.</span>
          </div>

          <div class="field">
            <label for="club-timezone">Timezone</label>
            <input
              id="club-timezone"
              v-model="timezone"
              type="text"
              maxlength="64"
              required
              placeholder="America/New_York"
            />
            <span class="hint">Used to decide which day a session falls on.</span>
          </div>

          <div class="field">
            <label for="club-description">Description (optional)</label>
            <textarea
              id="club-description"
              v-model="description"
              maxlength="280"
              rows="3"
              placeholder="Who your club is for and when you usually run."
            />
          </div>

          <button class="btn btn-block" type="submit" :disabled="submitting">
            <i class="fa-solid fa-circle-plus" aria-hidden="true" />
            {{ submitting ? 'Creating club…' : 'Create club' }}
          </button>
        </form>

        <p class="auth-switch">
          <RouterLink :to="{ name: 'clubs' }">
            <i class="fa-solid fa-arrow-left" aria-hidden="true" />
            Back to all clubs
          </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
