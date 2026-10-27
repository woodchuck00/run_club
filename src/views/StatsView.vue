<script>
import { api } from '../lib/api';
import AlertMessage from '../components/AlertMessage.vue';
import BarChart from '../components/BarChart.vue';
import StatCard from '../components/StatCard.vue';

export default {
  name: 'StatsView',
  components: { AlertMessage, BarChart, StatCard },
  data() {
    return {
      stats: null,
      loading: true,
      error: '',
    };
  },
  computed: {
    totals() {
      return this.stats?.totals || {
        sessions: 0,
        activeMembers: 0,
        checkIns: 0,
        averageHeadcount: 0,
      };
    },
    series() {
      return this.stats?.series || [];
    },
    leaderboard() {
      return this.stats?.leaderboard || [];
    },
    averageHint() {
      return this.totals.sessions
        ? `Across ${this.totals.sessions} sessions`
        : 'No sessions yet';
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      this.error = '';

      try {
        this.stats = await api('/stats');
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<template>
  <div class="container page">
    <div class="page-header">
      <div>
        <h1>Stats</h1>
        <p>How consistently the club is showing up.</p>
      </div>
    </div>

    <AlertMessage type="error" :message="error" />

    <div v-if="loading" class="loading">
      <span class="spinner" aria-hidden="true" />
      <span>Crunching the numbers…</span>
    </div>

    <div v-else class="stack">
      <div class="grid grid-3">
        <StatCard
          label="Sessions"
          :value="totals.sessions"
          hint="Held so far"
          icon="fa-solid fa-calendar-days"
        />
        <StatCard
          label="Active members"
          :value="totals.activeMembers"
          hint="On the roster"
          icon="fa-solid fa-users"
        />
        <StatCard
          label="Check-ins"
          :value="totals.checkIns"
          hint="All time"
          icon="fa-solid fa-clipboard-check"
        />
        <StatCard
          label="Average turnout"
          :value="totals.averageHeadcount"
          :hint="averageHint"
          icon="fa-solid fa-chart-simple"
        />
      </div>

      <article class="card">
        <div class="section-title">
          <div>
            <h2>Headcount</h2>
            <p class="small muted">The last 12 sessions.</p>
          </div>
        </div>
        <BarChart :points="series" />
      </article>

      <article class="card">
        <div class="section-title">
          <div>
            <h2>Attendance leaderboard</h2>
            <p class="small muted">
              Streak counts consecutive sessions attended, starting from the latest session.
            </p>
          </div>
        </div>

        <div v-if="leaderboard.length" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Attended</th>
                <th scope="col">Current streak</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(member, index) in leaderboard" :key="member.id">
                <td>
                  <div class="row">
                    <span class="avatar" aria-hidden="true">{{ index + 1 }}</span>
                    <strong>{{ member.name }}</strong>
                  </div>
                </td>
                <td>{{ member.attended }}</td>
                <td>
                  <span v-if="member.streak" class="badge badge-primary">
                    <i class="fa-solid fa-fire" aria-hidden="true" />
                    {{ member.streak }} in a row
                  </span>
                  <span v-else class="muted small">No active streak</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="empty-state">
          <h3>No attendance data yet</h3>
          <p>Once sessions start, the leaderboard will fill in.</p>
        </div>
      </article>
    </div>
  </div>
</template>
