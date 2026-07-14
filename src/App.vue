<template>
  <SiteHeader v-if="!isPreviewRoute" />
  <main><router-view /></main>
  <SiteFooter v-if="!isEditorRoute && !isPreviewRoute" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import '@/assets/theme/theme.css'

const route = useRoute()
const isEditorRoute = computed(() => route.path.startsWith('/builder/editor') || route.path.startsWith('/builder/display'))
const isPreviewRoute = computed(() => route.path.startsWith('/builder/preview'))
</script>
