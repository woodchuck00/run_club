<script>
export default {
  name: 'AlertMessage',
  props: {
    type: {
      type: String,
      default: 'info',
    },
    message: {
      type: String,
      default: '',
    },
  },
  computed: {
    className() {
      return `alert alert-${this.type}`;
    },
    iconClass() {
      const icons = {
        error: 'fa-circle-exclamation',
        success: 'fa-circle-check',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info',
      };

      return `fa-solid ${icons[this.type] || icons.info}`;
    },
  },
};
</script>

<template>
  <div v-if="message" :class="className" role="alert">
    <i :class="iconClass" aria-hidden="true" />
    <span>{{ message }}</span>
  </div>
</template>
