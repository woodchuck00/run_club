<script>
import AlertMessage from './AlertMessage.vue';
import BaseModal from './BaseModal.vue';

const AVATAR_SIZE = 512;
const MAX_ZOOM = 3;

export default {
  name: 'AvatarCropper',
  components: { AlertMessage, BaseModal },
  props: {
    open: {
      type: Boolean,
      default: false,
    },
    src: {
      type: String,
      default: '',
    },
  },
  emits: ['close', 'cropped'],
  data() {
    return {
      loading: true,
      error: '',
      saving: false,
      zoom: 1,
      panX: 0,
      panY: 0,
      dragging: false,
      dragStartX: 0,
      dragStartY: 0,
      panStartX: 0,
      panStartY: 0,
      viewportSize: 320,
      naturalWidth: 0,
      naturalHeight: 0,
      imageEl: null,
      maxZoom: MAX_ZOOM,
    };
  },
  computed: {
    baseScale() {
      if (!this.naturalWidth || !this.naturalHeight || !this.viewportSize) {
        return 1;
      }

      return Math.max(
        this.viewportSize / this.naturalWidth,
        this.viewportSize / this.naturalHeight,
      );
    },
    totalScale() {
      return this.baseScale * this.zoom;
    },
    displayWidth() {
      return this.naturalWidth * this.totalScale;
    },
    displayHeight() {
      return this.naturalHeight * this.totalScale;
    },
    imageStyle() {
      return {
        width: `${this.displayWidth}px`,
        height: `${this.displayHeight}px`,
        left: `${(this.viewportSize - this.displayWidth) / 2 + this.panX}px`,
        top: `${(this.viewportSize - this.displayHeight) / 2 + this.panY}px`,
      };
    },
  },
  watch: {
    src() {
      this.reset();
    },
    open(value) {
      if (!value) {
        this.reset();
      }
    },
  },
  mounted() {
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    reset() {
      this.loading = true;
      this.error = '';
      this.saving = false;
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.imageEl = null;
      this.measureViewport();
    },
    measureViewport() {
      if (this.$refs.viewport) {
        this.viewportSize = this.$refs.viewport.clientWidth || 320;
      }
    },
    handleResize() {
      if (!this.open) {
        return;
      }

      this.measureViewport();
      this.clampPan();
    },
    onImageLoad(event) {
      this.imageEl = event.target;
      this.naturalWidth = event.target.naturalWidth;
      this.naturalHeight = event.target.naturalHeight;
      this.measureViewport();
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
      this.loading = false;
      this.$nextTick(this.clampPan);
    },
    onImageError() {
      this.loading = false;
      this.error = 'Could not load that image. Try a different file.';
    },
    clampPan() {
      if (!this.naturalWidth) {
        return;
      }

      const maxX = Math.max(0, (this.displayWidth - this.viewportSize) / 2);
      const maxY = Math.max(0, (this.displayHeight - this.viewportSize) / 2);
      this.panX = Math.min(maxX, Math.max(-maxX, this.panX));
      this.panY = Math.min(maxY, Math.max(-maxY, this.panY));
    },
    onZoomInput() {
      this.clampPan();
    },
    onWheel(event) {
      const delta = event.deltaY < 0 ? 0.08 : -0.08;
      this.zoom = Math.min(MAX_ZOOM, Math.max(1, this.zoom + delta));
      this.clampPan();
    },
    onPointerDown(event) {
      if (this.loading || !this.imageEl || event.button !== 0) {
        return;
      }

      this.dragging = true;
      this.dragStartX = event.clientX;
      this.dragStartY = event.clientY;
      this.panStartX = this.panX;
      this.panStartY = this.panY;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event) {
      if (!this.dragging) {
        return;
      }

      this.panX = this.panStartX + event.clientX - this.dragStartX;
      this.panY = this.panStartY + event.clientY - this.dragStartY;
      this.clampPan();
    },
    onPointerUp(event) {
      if (!this.dragging) {
        return;
      }

      this.dragging = false;

      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    async save() {
      if (this.loading || !this.imageEl || this.saving) {
        return;
      }

      this.saving = true;
      this.error = '';

      try {
        const totalScale = this.totalScale;
        const sourceSize = this.viewportSize / totalScale;
        const left = (this.viewportSize - this.displayWidth) / 2 + this.panX;
        const top = (this.viewportSize - this.displayHeight) / 2 + this.panY;
        const sx = Math.max(
          0,
          Math.min(this.naturalWidth - sourceSize, -left / totalScale),
        );
        const sy = Math.max(
          0,
          Math.min(this.naturalHeight - sourceSize, -top / totalScale),
        );

        const canvas = document.createElement('canvas');
        canvas.width = AVATAR_SIZE;
        canvas.height = AVATAR_SIZE;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Your browser could not create the cropped image.');
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
          this.imageEl,
          sx,
          sy,
          sourceSize,
          sourceSize,
          0,
          0,
          AVATAR_SIZE,
          AVATAR_SIZE,
        );

        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', 0.9);
        });

        if (!blob) {
          throw new Error('Could not create the cropped image.');
        }

        this.$emit('cropped', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      } catch (err) {
        this.error = err.message || 'Could not crop the image.';
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<template>
  <BaseModal :open="open" title="Crop avatar" @close="$emit('close')">
    <AlertMessage type="error" :message="error" />

    <div
      ref="viewport"
      class="cropper-viewport"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.prevent="onWheel"
    >
      <img
        v-if="src"
        :src="src"
        alt="Avatar crop preview"
        class="cropper-image"
        :class="{ 'cropper-image-loading': loading }"
        :style="imageStyle"
        draggable="false"
        @load="onImageLoad"
        @error="onImageError"
      />
      <div class="cropper-guide" aria-hidden="true" />
    </div>

    <div v-if="loading" class="cropper-loading">
      <span class="spinner" aria-hidden="true" />
      <span>Loading image…</span>
    </div>

    <div class="cropper-controls">
      <label for="avatar-zoom">Zoom</label>
      <input
        id="avatar-zoom"
        v-model.number="zoom"
        type="range"
        min="1"
        :max="maxZoom"
        step="0.01"
        :disabled="loading"
        @input="onZoomInput"
      />
      <span class="small muted">{{ Math.round(zoom * 100) }}%</span>
    </div>
    <p class="hint">Drag the image to reposition it. The circle shows how your avatar will appear.</p>

    <template #footer>
      <button class="btn btn-secondary" type="button" @click="$emit('close')">
        <i class="fa-solid fa-xmark" aria-hidden="true" />
        Cancel
      </button>
      <button
        class="btn"
        type="button"
        :disabled="loading || saving || Boolean(error)"
        @click="save"
      >
        <i class="fa-solid fa-check" aria-hidden="true" />
        {{ saving ? 'Saving…' : 'Save avatar' }}
      </button>
    </template>
  </BaseModal>
</template>
