<template>
  <SiteHeader />
  <main><router-view /></main>
  <SiteFooter v-if="!isEditorRoute" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'
import '@/assets/theme/theme.css'

const route = useRoute()
const isEditorRoute = computed(() => route.path.startsWith('/builder/editor') || route.path.startsWith('/builder/display'))
</script>
