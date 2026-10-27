<script>
import { formatSessionDate } from '../lib/dates';

export default {
  name: 'CheckInCard',
  props: {
    session: {
      type: Object,
      required: true,
    },
    canCheckIn: {
      type: Boolean,
      default: false,
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    canUndo: {
      type: Boolean,
      default: false,
    },
    busy: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['checkin', 'undo'],
  computed: {
    isCancelled() {
      return this.session.status === 'cancelled';
    },
    sessionTitle() {
      return this.session.title || 'Run club session';
    },
    formattedDate() {
      return formatSessionDate(this.session.session_date);
    },
  },
};
</script>

<template>
  <article class="card card-lg checkin-card">
    <div class="row-between">
      <div class="stack-sm">
        <span class="badge">{{ isCancelled ? 'Cancelled' : 'Today' }}</span>
        <h2>{{ sessionTitle }}</h2>
        <p class="icon-text">
          <i class="fa-solid fa-calendar-days" aria-hidden="true" />
          <span>{{ formattedDate }}</span>
        </p>
      </div>
      <div class="stack-sm" style="text-align: right">
        <span class="checkin-count">{{ session.headcount ?? 0 }}</span>
        <span class="small">checked in</span>
      </div>
    </div>

    <hr class="divider" />

    <div class="row-between">
      <div>
        <strong v-if="isCancelled">This session has been cancelled.</strong>
        <strong v-else-if="checkedIn">You are checked in for today.</strong>
        <strong v-else>Ready to run?</strong>
        <p v-if="!isCancelled && !checkedIn" class="hint">
          Check-in is available on the day of the session only.
        </p>
      </div>

      <div class="row">
        <button
          v-if="checkedIn && canUndo"
          class="btn btn-ghost"
          type="button"
          :disabled="busy"
          @click="$emit('undo')"
        >
          <i class="fa-solid fa-rotate-left" aria-hidden="true" />
          {{ busy ? 'Undoing…' : 'Undo check-in' }}
        </button>
        <button
          v-else-if="canCheckIn"
          class="btn"
          type="button"
          :disabled="busy"
          @click="$emit('checkin')"
        >
          <i class="fa-solid fa-person-running" aria-hidden="true" />
          {{ busy ? 'Checking in…' : "I'm here" }}
        </button>
        <span v-else-if="checkedIn" class="badge">
          <i class="fa-solid fa-circle-check" aria-hidden="true" />
          Checked in
        </span>
        <span v-else-if="!isCancelled" class="badge">
          <i class="fa-solid fa-clock" aria-hidden="true" />
          Scheduled
        </span>
      </div>
    </div>
  </article>
</template>
