<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'home'">
      <path d="m3.5 10 8.5-7 8.5 7" /><path d="M5.5 9v11h13V9" /><path d="M9.5 20v-6h5v6" />
    </template>
    <template v-else-if="name === 'villages' || name === 'archive' || name === 'book'">
      <path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22Z" />
      <path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22Z" />
    </template>
    <template v-else-if="name === 'practice' || name === 'footprint'">
      <path d="M8.2 4.2c1.7 1.6 1.8 4.4.3 6.1-1.3 1.5-3.5 1.4-4.5-.2-1.2-2 .2-5.6 1.8-6.5.8-.5 1.7-.2 2.4.6Z" />
      <path d="M15.8 13.7c1.7 1.6 1.8 4.4.3 6.1-1.3 1.5-3.5 1.4-4.5-.2-1.2-2 .2-5.6 1.8-6.5.8-.5 1.7-.2 2.4.6Z" />
    </template>
    <template v-else-if="name === 'voice' || name === 'message'">
      <path d="M4 4h16v12H9l-5 4Z" /><path d="M8 8h8M8 12h5" />
    </template>
    <template v-else-if="name === 'guide' || name === 'compass'">
      <circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9Z" />
    </template>
    <template v-else-if="name === 'goods' || name === 'basket'">
      <path d="m4 9 2 11h12l2-11Z" /><path d="M8 11V7a4 4 0 0 1 8 0v4M3 9h18" />
    </template>
    <template v-else-if="name === 'about' || name === 'users'">
      <circle cx="9" cy="8" r="3" /><path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2" />
      <path d="M16 5.3a3 3 0 0 1 0 5.4M17 13a5.5 5.5 0 0 1 3.5 5v2" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" />
    </template>
    <template v-else-if="name === 'map-pin'">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" />
    </template>
    <template v-else-if="name === 'building' || name === 'museum'">
      <path d="m3 9 9-6 9 6M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M3 21h18M4 18h16" />
    </template>
    <template v-else-if="name === 'seedling'">
      <path d="M12 21V10" /><path d="M12 14C7 14 4 11 4 6c5 0 8 3 8 8ZM12 10c0-4 3-7 8-7 0 5-3 8-8 8" />
    </template>
    <template v-else-if="name === 'university'">
      <path d="m3 9 9-5 9 5-9 5Z" /><path d="M6 11v5c3 2 9 2 12 0v-5M21 9v7" />
    </template>
    <template v-else-if="name === 'arrow-right'">
      <path d="M4 12h15M14 6l6 6-6 6" />
    </template>
    <template v-else-if="name === 'upload'">
      <path d="M12 16V3M7 8l5-5 5 5" /><path d="M4 14v6h16v-6" />
    </template>
    <template v-else-if="name === 'folder'">
      <path d="M3 6h7l2 2h9v11H3Z" />
    </template>
    <template v-else-if="name === 'play'">
      <circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4Z" />
    </template>
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" />
    </template>
    <template v-else-if="name === 'tag'">
      <path d="M3 4h7l11 11-6 6L4 10Z" /><circle cx="7.5" cy="8" r="1" />
    </template>
    <template v-else-if="name === 'eye'">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" />
    </template>
    <template v-else-if="name === 'heart'">
      <path d="M20.8 5.8c-2-2-5.1-1.8-6.8.3L12 8.4l-2-2.3C8.3 4 5.2 3.8 3.2 5.8 1 8 1.2 11.4 3.5 13.5L12 21l8.5-7.5C22.8 11.4 23 8 20.8 5.8Z" />
    </template>
    <template v-else-if="name === 'star'">
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
    </template>
    <template v-else-if="name === 'download'">
      <path d="M12 3v12M7 10l5 5 5-5" /><path d="M4 20h16" />
    </template>
    <template v-else-if="name === 'document'">
      <path d="M6 2h8l4 4v16H6Z" /><path d="M14 2v5h5M9 12h6M9 16h6" />
    </template>
    <template v-else-if="name === 'image'">
      <rect x="3" y="4" width="18" height="16" rx="1" /><circle cx="9" cy="9" r="2" /><path d="m5 18 5-5 3 3 2-2 4 4" />
    </template>
    <template v-else-if="name === 'chart'">
      <path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7M2 20h20" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="m5 5 14 14M19 5 5 19" />
    </template>
    <template v-else-if="name === 'chevron-down'">
      <path d="m6 9 6 6 6-6" />
    </template>
    <template v-else-if="name === 'chevron-left'">
      <path d="m15 5-7 7 7 7" />
    </template>
    <template v-else-if="name === 'chevron-right'">
      <path d="m9 5 7 7-7 7" />
    </template>
    <template v-else-if="name === 'alert'">
      <path d="M12 3 2.5 20h19Z" /><path d="M12 9v5M12 17h.01" />
    </template>
    <template v-else-if="name === 'lightbulb'">
      <path d="M9 18h6M10 22h4" /><path d="M8.5 16c-1.6-1.1-2.5-2.9-2.5-5a6 6 0 1 1 12 0c0 2.1-.9 3.9-2.5 5-.7.5-1 1.1-1 2h-5c0-.9-.3-1.5-1-2Z" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="8" /><path d="M12 8v8M8 12h8" />
    </template>
  </svg>
</template>

<script setup>
defineProps({
  name: { type: String, default: 'archive' },
  size: { type: [Number, String], default: 20 },
})
</script>

<style scoped>
.app-icon { display: block; flex: none; }
</style>
