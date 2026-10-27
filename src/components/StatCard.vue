<script>
export default {
  name: 'StatCard',
  props: {
    label: {
      type: String,
      required: true,
    },
    value: {
      type: [String, Number],
      required: true,
    },
    hint: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: '',
    },
  },
};
</script>

<template>
  <article class="card">
    <div class="stat-label">
      <i v-if="icon" :class="icon" class="stat-icon" aria-hidden="true" />
      <span>{{ label }}</span>
    </div>
    <div class="stat-value">{{ value }}</div>
    <div v-if="hint" class="stat-hint">{{ hint }}</div>
  </article>
</template>
