<template>
  <div class="track-progress">
    <!-- 四维完成度看板 -->
    <section class="dash">
      <h2 class="block-title">📊 采集进度</h2>
      <div class="dash-grid">
        <div v-for="d in dims" :key="d.key" class="dash-cell">
          <div class="dash-ring" :style="ringStyle(d.ratio)">
            <span class="dash-pct">{{ Math.round(d.ratio * 100) }}%</span>
          </div>
          <span class="dash-label">{{ d.label }}</span>
          <span class="dash-sub">{{ d.detail }}</span>
        </div>
      </div>
    </section>

    <!-- 缺口分析 / 动态督进 -->
    <section class="block gap-block">
      <h2 class="block-title">🔍 还缺什么</h2>
      <div v-if="analysis.gaps.length" class="gap-list">
        <div v-for="(g, i) in analysis.gaps" :key="i" class="gap-item" :class="g.level">
          <span class="gap-ic">{{ g.level === 'warn' ? '⚠️' : '💡' }}</span>
          <span>{{ g.message }}</span>
        </div>
      </div>
      <p v-else class="gap-ok">✅ 数据齐整，随时可以去「实践后」生成成果卡。</p>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { analyzeGaps } from './gapAnalysis.js'

const props = defineProps({
  dossier: { type: Object, required: true },
})

const MATERIAL_MIN = 3
const PEOPLE_MIN = 2

const analysis = computed(() => analyzeGaps(props.dossier))

// 四维完成度：任务 / 指标 / 材料 / 人物。
const dims = computed(() => {
  const plan = props.dossier.plan || {}
  const collected = props.dossier.collected || {}
  const phases = Array.isArray(plan.phases) ? plan.phases : []
  const track = phases.find((p) => p && p.stage === 'track')
  const tasks = track && Array.isArray(track.tasks) ? track.tasks : []
  const planMetrics = Array.isArray(plan.metrics) ? plan.metrics : []
  const metricValues = Array.isArray(collected.metricValues) ? collected.metricValues : []
  const materials = Array.isArray(collected.materials) ? collected.materials : []
  const people = Array.isArray(collected.people) ? collected.people : []

  const filledMetrics = new Set(
    metricValues.filter((m) => isFilled(m.before) && isFilled(m.after)).map((m) => m.name),
  )
  const doneTasks = tasks.filter((t) => t.done).length
  const metricDone = planMetrics.filter((pm) => filledMetrics.has(pm.name)).length

  return [
    { key: 'task', label: '任务', ratio: ratio(doneTasks, tasks.length), detail: tasks.length ? `${doneTasks}/${tasks.length}` : '无任务' },
    { key: 'metric', label: '指标', ratio: ratio(metricDone, planMetrics.length), detail: planMetrics.length ? `${metricDone}/${planMetrics.length}` : '无指标' },
    { key: 'material', label: '材料', ratio: Math.min(1, materials.length / MATERIAL_MIN), detail: `${materials.length}/${MATERIAL_MIN}` },
    { key: 'people', label: '人物', ratio: Math.min(1, people.length / PEOPLE_MIN), detail: `${people.length}/${PEOPLE_MIN}` },
  ]
})

function ratio(n, total) {
  return total > 0 ? n / total : 0
}
function isFilled(v) {
  return v !== undefined && v !== null && String(v).trim() !== ''
}
function ringStyle(r) {
  const deg = Math.round(r * 360)
  return { background: `conic-gradient(var(--color-primary) ${deg}deg, var(--color-bg) 0deg)` }
}
</script>

<style scoped>
.track-progress { display: flex; flex-direction: column; gap: 1.6rem; }
.block-title { font-size: 1.15rem; color: var(--color-primary-dark); margin: 0 0 .9rem; }

.dash-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
.dash-cell {
  display: flex; flex-direction: column; align-items: center; gap: .4rem; text-align: center;
  padding: 1.2rem 1rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
}
.dash-ring {
  width: 64px; height: 64px; border-radius: 50%;
  display: grid; place-items: center; position: relative;
}
.dash-ring::after {
  content: ''; position: absolute; inset: 8px; border-radius: 50%; background: var(--color-card);
}
.dash-pct { position: relative; z-index: 1; font-size: .9rem; font-weight: 700; color: var(--color-primary-dark); }
.dash-label { font-size: .9rem; font-weight: 600; color: var(--color-text); }
.dash-sub { font-size: .78rem; color: var(--color-text-light); }

.gap-block { padding: 1.3rem 1.4rem; background: var(--color-card); border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card); }
.gap-list { display: flex; flex-direction: column; gap: .6rem; }
.gap-item { display: flex; gap: .6rem; align-items: flex-start; padding: .7rem .9rem; border-radius: 10px; font-size: .88rem; line-height: 1.5; }
.gap-item.warn { background: #fff3e0; color: #a15b28; }
.gap-item.tip { background: var(--color-bg); color: var(--color-text-secondary); }
.gap-ok { margin: 0; font-size: .92rem; color: var(--color-primary); }

@media (max-width: 640px) {
  .dash-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
