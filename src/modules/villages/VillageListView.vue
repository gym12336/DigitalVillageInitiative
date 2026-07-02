<template>
  <section class="list">
    <h2>村庄列表</h2>
    <div class="grid">
      <VillageCard v-for="v in villages" :key="v.id" :village="v" />
    </div>
  </section>
</template>

<script setup>
import VillageCard from '@/components/VillageCard.vue'
import villages from '@/data/villages.json'
</script>

<style scoped>
.list { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
</style>
