<script>
import { formatShortDate } from '../lib/dates';

export default {
  name: 'BarChart',
  props: {
    points: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    maxValue() {
      return Math.max(1, ...this.points.map((point) => Number(point.headcount) || 0));
    },
    bars() {
      return this.points.map((point) => {
        const headcount = Number(point.headcount) || 0;
        return {
          ...point,
          headcount,
          height: Math.max(4, Math.round((headcount / this.maxValue) * 100)),
          label: formatShortDate(point.date),
        };
      });
    },
    summary() {
      if (!this.bars.length) {
        return 'No session data yet';
      }

      return this.bars
        .map((bar) => `${bar.label}: ${bar.headcount}`)
        .join(', ');
    },
  },
};
</script>

<template>
  <div
    v-if="bars.length"
    class="chart"
    role="img"
    :aria-label="`Headcount for the last ${bars.length} sessions. ${summary}`"
  >
    <div v-for="bar in bars" :key="bar.date" class="chart-column">
      <span class="chart-value">{{ bar.headcount }}</span>
      <div class="chart-bar-track">
        <div
          class="chart-bar"
          :style="{ height: `${bar.height}%` }"
          :title="`${bar.label}: ${bar.headcount} ${bar.headcount === 1 ? 'attendee' : 'attendees'}`"
        />
      </div>
      <span class="chart-label">{{ bar.label }}</span>
    </div>
  </div>
  <div v-else class="empty-state">
    <h3>No attendance data yet</h3>
    <p>Headcounts will appear here after your first session.</p>
  </div>
</template>
