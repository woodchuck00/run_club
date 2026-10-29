<script>
import { mapStores } from 'pinia';
import { useAuthStore } from '../stores/auth';
import { api } from '../lib/api';
import { signB2Url } from '../lib/b2';
import { formatSessionDate } from '../lib/dates';
import { socialMeta } from '../lib/social';
import AlertMessage from '../components/AlertMessage.vue';
import CheckInCard from '../components/CheckInCard.vue';
import SessionListItem from '../components/SessionListItem.vue';

export default {
  name: 'ClubHomeView',
  components: { AlertMessage, CheckInCard, SessionListItem },
  data() {
    return {
      sessions: [],
      loading: true,
      error: '',
      busy: false,
      signedClubImageUrl: '',
      signedMapImageUrl: '',
      activeClubTab: 'map',
    };
  },
  computed: {
    ...mapStores(useAuthStore),
    club() {
      return this.authStore.activeClub;
    },
    zipCode() {
      return this.club?.zipCode || this.club?.zip_code || '';
    },
    waiver() {
      return this.club?.waiver || '';
    },
    socialLinks() {
      let links = this.club?.socialLinks ?? this.club?.social_links ?? [];

      if (typeof links === 'string') {
        try {
          links = JSON.parse(links);
        } catch {
          links = [];
        }
      }

      if (!Array.isArray(links)) {
        return [];
      }

      return links.filter((link) => link && typeof link.url === 'string' && link.url.trim());
    },
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
  watch: {
    club: {
      immediate: true,
      handler() {
        this.loadClubImages();
      },
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    async loadClubImages() {
      if (!this.club) {
        this.signedClubImageUrl = '';
        this.signedMapImageUrl = '';
        return;
      }

      const slug = this.club.slug;
      const imageUrl = this.club.imageUrl || this.club.image_url || '';
      const mapImageUrl = this.club.mapImageUrl || this.club.map_image_url || '';

      const [clubImage, mapImage] = await Promise.all([
        signB2Url(imageUrl),
        signB2Url(mapImageUrl),
      ]);

      if (this.club?.slug !== slug) {
        return;
      }

      this.signedClubImageUrl = clubImage;
      this.signedMapImageUrl = mapImage;

      if (!mapImage && this.waiver) {
        this.activeClubTab = 'waiver';
      }
    },
    socialMeta,
    socialLabel(link) {
      const platform = String(link.platform || '').trim().toLowerCase();

      if (platform && platform !== 'link' && platform !== 'website') {
        return socialMeta(platform).label;
      }

      try {
        return new URL(link.url).hostname.replace(/^www\./, '');
      } catch {
        return link.url;
      }
    },
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
    async submitTime(seconds) {
      if (!this.todaySession || this.busy) {
        return;
      }

      this.busy = true;
      this.error = '';

      try {
        await api(`/sessions/${this.todaySession.id}/checkin`, {
          method: 'PATCH',
          body: { seconds },
        });
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
  <div class="page-shell page">
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
          <i class="fa-solid fa-calendar-plus" aria-hidden="true" />
          Schedule a session
        </RouterLink>
        <RouterLink class="btn btn-secondary" :to="authStore.clubRoute('sessions')">
          <i class="fa-solid fa-calendar-days" aria-hidden="true" />
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
      <article v-if="club" class="card club-overview">
        <div class="club-overview-body">
          <div class="club-overview-media">
            <img
              v-if="signedClubImageUrl"
              :src="signedClubImageUrl"
              :alt="`${club.name} club image`"
              class="club-cover"
            />
            <div v-else class="club-cover club-cover-placeholder" aria-hidden="true">
              <i class="fa-solid fa-people-group" />
            </div>
          </div>

          <div class="stack-sm club-overview-details">
            <span class="badge">Club</span>
            <h2>{{ club.name }}</h2>
            <p class="muted">
              {{ club.description || 'A run club tracking sessions and attendance.' }}
            </p>

            <div class="row small muted">
              <span v-if="zipCode" class="icon-text">
                <i class="fa-solid fa-location-dot" aria-hidden="true" />
                <span>{{ zipCode }}</span>
              </span>
              <span v-if="club.timezone" class="icon-text">
                <i class="fa-solid fa-clock" aria-hidden="true" />
                <span>{{ club.timezone }}</span>
              </span>
            </div>

            <div v-if="socialLinks.length" class="row club-socials">
              <a
                v-for="link in socialLinks"
                :key="link.url"
                class="btn btn-secondary btn-sm"
                :href="link.url"
                target="_blank"
                rel="noreferrer"
              >
                <i :class="socialMeta(link.platform).icon" aria-hidden="true" />
                {{ socialLabel(link) }}
              </a>
            </div>
          </div>
        </div>

        <div class="club-overview-extra">
          <div class="club-tabs" role="tablist" aria-label="Club details">
            <button
              id="club-map-tab"
              class="club-tab"
              :class="{ 'is-active': activeClubTab === 'map' }"
              type="button"
              role="tab"
              :aria-selected="activeClubTab === 'map'"
              aria-controls="club-tab-panel"
              @click="activeClubTab = 'map'"
            >
              <i class="fa-solid fa-map" aria-hidden="true" />
              Club map
            </button>
            <button
              id="club-waiver-tab"
              class="club-tab"
              :class="{ 'is-active': activeClubTab === 'waiver' }"
              type="button"
              role="tab"
              :aria-selected="activeClubTab === 'waiver'"
              aria-controls="club-tab-panel"
              @click="activeClubTab = 'waiver'"
            >
              <i class="fa-solid fa-file-lines" aria-hidden="true" />
              Waiver
            </button>
          </div>

          <div
            id="club-tab-panel"
            class="club-tab-panel"
            role="tabpanel"
            :aria-labelledby="activeClubTab === 'map' ? 'club-map-tab' : 'club-waiver-tab'"
          >
            <template v-if="activeClubTab === 'map'">
              <figure v-if="signedMapImageUrl" class="club-map">
                <img :src="signedMapImageUrl" :alt="`${club.name} location map`" />
                <figcaption>Club location</figcaption>
              </figure>
              <p v-else class="small muted">No map image has been added yet.</p>
            </template>

            <template v-else>
              <p v-if="waiver" class="small muted club-waiver-text">{{ waiver }}</p>
              <p v-else class="small muted">No waiver has been added yet.</p>
            </template>
          </div>
        </div>
      </article>

      <CheckInCard
        v-if="todaySession"
        :session="todaySession"
        :can-check-in="canCheckIn"
        :checked-in="checkedIn"
        :can-undo="canUndo"
        :busy="busy"
        :finish-time-seconds="todaySession.my_finish_time_seconds"
        @checkin="checkIn"
        @undo="undoCheckIn"
        @submit-time="submitTime"
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
            <i class="fa-solid fa-plus" aria-hidden="true" />
            Create a session
          </RouterLink>
          <RouterLink
            v-else-if="nextSession"
            class="btn btn-secondary"
            :to="authStore.clubRoute('session-detail', { id: nextSession.id })"
          >
            <i class="fa-solid fa-arrow-right" aria-hidden="true" />
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
            <i class="fa-solid fa-arrow-right" aria-hidden="true" />
            View
          </RouterLink>
        </div>
      </article>

      <section>
        <div class="section-title">
          <h2>Recent sessions</h2>
          <RouterLink class="small icon-text" :to="authStore.clubRoute('sessions')">
            <span>View all</span>
            <i class="fa-solid fa-arrow-right" aria-hidden="true" />
          </RouterLink>
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

<style scoped>
.club-overview {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.club-overview-body {
  display: grid;
  grid-template-columns: minmax(0, 240px) minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}

.club-overview-media {
  min-width: 0;
}

.club-cover {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.club-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 2rem;
}

.club-overview-details {
  min-width: 0;
}

.club-socials {
  gap: 0.4rem;
}

.club-overview-extra {
  padding-top: 1.25rem;
  border-top: 1px solid var(--border);
}

.club-tabs {
  display: flex;
  gap: 0.4rem;
  border-bottom: 1px solid var(--border);
}

.club-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.85rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 650;
  cursor: pointer;
}

.club-tab:hover {
  color: var(--text);
}

.club-tab.is-active {
  border-bottom-color: var(--primary);
  color: var(--primary);
}

.club-tab-panel {
  padding-top: 1rem;
}

.club-map {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-width: 480px;
  margin: 0;
}

.club-map img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.club-map figcaption {
  font-size: 0.8rem;
  color: var(--muted);
}

.club-waiver-text {
  white-space: pre-line;
}

@media (max-width: 640px) {
  .club-overview-body {
    grid-template-columns: 1fr;
  }
}
</style>
