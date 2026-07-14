<template>
  <div class="result-cards">
    <CompareBars :items="comparable" />
    <KpiGrid :items="kpis" />
    <TimelineView :items="timeline" />
    <PeopleWall :items="people" />

    <p v-if="isEmpty" class="empty">
      还没有可展示的数据。先在「实践前 / 实践中」补充指标、材料与人物访谈，成果卡会自动生成。
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CompareBars from './CompareBars.vue'
import KpiGrid from './KpiGrid.vue'
import TimelineView from './TimelineView.vue'
import PeopleWall from './PeopleWall.vue'

const props = defineProps({
  dossier: { type: Object, required: true },
})

const collected = computed(() => props.dossier?.collected || {})

const comparable = computed(() => {
  const mv = collected.value.metricValues || []
  return mv
    .filter((m) => isNum(m.before) && isNum(m.after))
    .map((m) => {
      const before = Number(m.before)
      const after = Number(m.after)
      const max = Math.max(before, after, 1)
      const delta = after - before
      return {
        name: m.name,
        unit: m.unit || '',
        before,
        after,
        beforePct: Math.round((before / max) * 100),
        afterPct: Math.round((after / max) * 100),
        up: delta > 0,
        down: delta < 0,
        deltaLabel: delta === 0 ? '持平' : (delta > 0 ? '▲ +' : '▼ ') + Math.abs(delta) + (m.unit || ''),
      }
    })
})

const kpis = computed(() => {
  const mv = collected.value.metricValues || []
  return mv
    .filter((m) => isNum(m.after) || isNum(m.before))
    .map((m) => ({
      name: m.name,
      unit: m.unit || '',
      value: isNum(m.after) ? Number(m.after) : Number(m.before),
    }))
})

const timeline = computed(() => (collected.value.materials || []).filter((m) => m.name))

const people = computed(() => (collected.value.people || []).filter((p) => p.name))

const isEmpty = computed(
  () => !comparable.value.length && !kpis.value.length && !timeline.value.length && !people.value.length,
)

function isNum(v) {
  return v !== undefined && v !== null && String(v).trim() !== '' && !Number.isNaN(Number(v))
}
</script>

<style scoped>
.result-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.2rem; }
.empty { grid-column: 1 / -1; padding: 2.5rem; text-align: center; color: var(--color-text-light); background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }
</style>
