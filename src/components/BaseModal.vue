<script>
export default {
  name: 'BaseModal',
  props: {
    open: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
  },
  emits: ['close'],
  watch: {
    open(value) {
      if (value) {
        this.$nextTick(() => this.$refs.modal?.focus());
      }
    },
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeydown);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeydown);
  },
  methods: {
    handleKeydown(event) {
      if (event.key === 'Escape' && this.open) {
        this.$emit('close');
      }
    },
  },
};
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-backdrop" @click.self="$emit('close')">
      <div
        ref="modal"
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
      >
        <div class="modal-header">
          <h2>{{ title }}</h2>
          <button class="icon-button" type="button" aria-label="Close" @click="$emit('close')">
            <i class="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
        <slot />
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
