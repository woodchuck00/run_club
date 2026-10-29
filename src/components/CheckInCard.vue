<script>
import { formatSessionDate } from '../lib/dates';
import { formatFinishTime, parseFinishTime } from '../lib/time';

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
    finishTimeSeconds: {
      type: Number,
      default: null,
    },
  },
  emits: ['checkin', 'undo', 'submit-time'],
  data() {
    return {
      editingTime: false,
      timeInput: '',
      timeError: '',
    };
  },
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
    hasFinishTime() {
      return Number.isFinite(this.finishTimeSeconds) && this.finishTimeSeconds > 0;
    },
    formattedFinishTime() {
      return this.hasFinishTime ? formatFinishTime(this.finishTimeSeconds) : '';
    },
    showTimeEditor() {
      return Boolean(!this.isCancelled && this.checkedIn);
    },
  },
  watch: {
    finishTimeSeconds() {
      this.editingTime = false;
      this.timeInput = '';
      this.timeError = '';
    },
  },
  methods: {
    startEditingTime() {
      this.editingTime = true;
      this.timeError = '';
      this.timeInput = this.formattedFinishTime;
    },
    cancelEditingTime() {
      this.editingTime = false;
      this.timeInput = '';
      this.timeError = '';
    },
    submitTime() {
      const seconds = parseFinishTime(this.timeInput);

      if (!seconds) {
        this.timeError = 'Enter a time like 25:30 or 1:02:15';
        return;
      }

      this.timeError = '';
      this.editingTime = false;
      this.$emit('submit-time', seconds);
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

    <div v-if="showTimeEditor" class="checkin-time">
      <div v-if="hasFinishTime && !editingTime" class="row-between">
        <div class="stack-sm">
          <span class="field-label">Your finish time</span>
          <strong class="checkin-time-value">{{ formattedFinishTime }}</strong>
        </div>
        <button
          class="btn btn-secondary btn-sm"
          type="button"
          :disabled="busy"
          @click="startEditingTime"
        >
          <i class="fa-solid fa-pen" aria-hidden="true" />
          Edit time
        </button>
      </div>

      <form v-else class="row checkin-time-form" @submit.prevent="submitTime">
        <div class="field" style="flex: 1 1 12rem">
          <label for="checkin-finish-time">Your finish time</label>
          <input
            id="checkin-finish-time"
            v-model="timeInput"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            placeholder="25:30 or 1:02:15"
          />
          <span v-if="timeError" class="hint checkin-time-error">{{ timeError }}</span>
        </div>
        <div class="row" style="align-self: flex-start; margin-top: 1.55rem">
          <button class="btn btn-sm" type="submit" :disabled="busy">
            <i class="fa-solid fa-stopwatch" aria-hidden="true" />
            {{ busy ? 'Saving…' : (hasFinishTime ? 'Update time' : 'Submit time') }}
          </button>
          <button
            v-if="hasFinishTime"
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="busy"
            @click="cancelEditingTime"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </article>
</template>

<style scoped>
.checkin-time {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.checkin-time-value {
  font-size: 1.45rem;
  font-variant-numeric: tabular-nums;
}

.checkin-time-error {
  color: var(--danger);
}

.checkin-time-form label {
  color: var(--text);
}

.checkin-time .field-label {
  color: var(--text);
}

@media (max-width: 520px) {
  .checkin-time-form {
    align-items: stretch;
  }

  .checkin-time-form > .row {
    margin-top: 0;
  }
}
</style>
