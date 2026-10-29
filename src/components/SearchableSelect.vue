<script>
let nextListId = 0;

export default {
  name: 'SearchableSelect',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    options: {
      type: Array,
      default: () => [],
    },
    id: {
      type: String,
      default: undefined,
    },
    placeholder: {
      type: String,
      default: 'Search…',
    },
    required: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      query: this.modelValue || '',
      open: false,
      searching: false,
      highlightedIndex: -1,
      listId: `searchable-select-list-${++nextListId}`,
    };
  },
  computed: {
    normalizedOptions() {
      return this.options.map((option) => (
        typeof option === 'string' ? { value: option, label: option } : option
      ));
    },
    filteredOptions() {
      if (!this.searching) {
        return this.normalizedOptions;
      }

      const query = this.query.trim().toLowerCase();
      if (!query) {
        return this.normalizedOptions;
      }

      return this.normalizedOptions.filter((option) => (
        option.label.toLowerCase().includes(query)
        || option.value.toLowerCase().includes(query)
      ));
    },
    activeOptionId() {
      if (this.highlightedIndex < 0) {
        return undefined;
      }
      return `${this.listId}-option-${this.highlightedIndex}`;
    },
  },
  watch: {
    modelValue(value) {
      if (!this.open && value !== this.query) {
        this.query = value || '';
      }
    },
  },
  methods: {
    selectedLabel() {
      const selected = this.normalizedOptions.find((option) => option.value === this.modelValue);
      return selected ? selected.label : (this.modelValue || '');
    },
    onFocus(event) {
      this.open = true;
      this.searching = false;
      this.highlightedIndex = this.filteredOptions.findIndex(
        (option) => option.value === this.modelValue,
      );
      event.target.select();
    },
    onClick() {
      this.open = true;
      if (!this.searching) {
        this.$refs.input?.select();
      }
    },
    onInput() {
      this.open = true;
      this.searching = true;
      this.highlightedIndex = this.filteredOptions.length ? 0 : -1;
    },
    onBlur() {
      this.open = false;
      this.searching = false;
      this.query = this.selectedLabel();
      this.highlightedIndex = -1;
    },
    selectOption(option) {
      if (!option) {
        return;
      }

      this.query = option.label;
      this.searching = false;
      this.open = false;
      this.highlightedIndex = -1;
      this.$emit('update:modelValue', option.value);
      this.$nextTick(() => this.$refs.input?.select());
    },
    moveHighlight(step) {
      const count = this.filteredOptions.length;
      if (!count) {
        this.highlightedIndex = -1;
        return;
      }

      const current = this.highlightedIndex;
      let next;

      if (current < 0) {
        next = step > 0 ? 0 : count - 1;
      } else {
        next = (current + step + count) % count;
      }

      this.highlightedIndex = next;
      this.scrollHighlightedIntoView();
    },
    scrollHighlightedIntoView() {
      this.$nextTick(() => {
        const active = this.$el.querySelector('.searchable-select-option.is-active');
        if (active) {
          active.scrollIntoView({ block: 'nearest' });
        }
      });
    },
    onKeydown(event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.open = true;
        this.moveHighlight(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.open = true;
        this.moveHighlight(-1);
      } else if (event.key === 'Enter') {
        if (this.open && this.highlightedIndex >= 0) {
          event.preventDefault();
          this.selectOption(this.filteredOptions[this.highlightedIndex]);
        }
      } else if (event.key === 'Escape') {
        this.open = false;
        this.searching = false;
        this.query = this.selectedLabel();
        this.highlightedIndex = -1;
      }
    },
  },
};
</script>

<template>
  <div class="searchable-select">
    <input
      :id="id"
      ref="input"
      v-model="query"
      type="text"
      :placeholder="placeholder"
      :required="required"
      role="combobox"
      autocomplete="off"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-activedescendant="activeOptionId"
      aria-autocomplete="list"
      @focus="onFocus"
      @click="onClick"
      @input="onInput"
      @blur="onBlur"
      @keydown="onKeydown"
    />

    <ul v-if="open" :id="listId" class="searchable-select-menu" role="listbox">
      <li
        v-for="(option, index) in filteredOptions"
        :id="`${listId}-option-${index}`"
        :key="option.value"
        class="searchable-select-option"
        :class="{ 'is-active': index === highlightedIndex }"
        role="option"
        :aria-selected="option.value === modelValue"
        @mousedown.prevent="selectOption(option)"
        @mouseenter="highlightedIndex = index"
      >
        {{ option.label }}
      </li>
      <li v-if="!filteredOptions.length" class="searchable-select-empty">
        No matches
      </li>
    </ul>
  </div>
</template>

<style scoped>
.searchable-select {
  position: relative;
}

.searchable-select-menu {
  position: absolute;
  z-index: 30;
  top: calc(100% + 0.25rem);
  right: 0;
  left: 0;
  max-height: 15rem;
  margin: 0;
  padding: 0.3rem;
  overflow-y: auto;
  list-style: none;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
}

.searchable-select-option {
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  font-size: 0.92rem;
  cursor: pointer;
}

.searchable-select-option.is-active,
.searchable-select-option:hover {
  background: var(--primary-soft);
  color: var(--primary);
}

.searchable-select-option[aria-selected="true"] {
  font-weight: 650;
}

.searchable-select-empty {
  padding: 0.5rem 0.65rem;
  font-size: 0.88rem;
  color: var(--muted);
}
</style>
