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
  },
};
</script>

<template>
  <div v-if="message" :class="className" role="alert">
    {{ message }}
  </div>
</template>
