<script>
import { formatSessionDate } from '../lib/dates';
import { pluralize } from '../lib/format';

export default {
  name: 'SessionListItem',
  props: {
    session: {
      type: Object,
      required: true,
    },
  },
  computed: {
    title() {
      return this.session.title || 'Run club session';
    },
    formattedDate() {
      return formatSessionDate(this.session.session_date);
    },
    headcountLabel() {
      const count = this.session.headcount || 0;
      return pluralize(count, 'attendee');
    },
  },
};
</script>

<template>
  <RouterLink
    class="card card-link"
    :to="{
      name: 'session-detail',
      params: { clubSlug: $route.params.clubSlug, id: session.id },
    }"
  >
    <div class="row-between">
      <div class="stack-sm">
        <div class="row">
          <span v-if="session.is_today" class="badge badge-primary">Today</span>
          <span v-if="session.status === 'cancelled'" class="badge badge-danger">Cancelled</span>
          <span v-if="session.my_attendance_id" class="badge badge-accent">You attended</span>
          <span class="small muted">{{ formattedDate }}</span>
        </div>
        <h3>{{ title }}</h3>
      </div>
      <div class="stack-sm" style="text-align: right">
        <strong>{{ session.headcount || 0 }}</strong>
        <span class="small muted">{{ headcountLabel }}</span>
      </div>
    </div>
  </RouterLink>
</template>
