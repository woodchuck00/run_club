<template>
  <div class="container page">
    <div class="empty-state">
      <h1>Page not found</h1>
      <p class="muted" style="margin: 0.5rem 0 1.25rem">
        That page does not exist or may have moved.
      </p>
      <RouterLink class="btn" :to="{ name: 'clubs' }">Back to clubs</RouterLink>
    </div>
  </div>
</template>
