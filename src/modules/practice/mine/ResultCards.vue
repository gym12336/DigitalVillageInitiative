<template>
  <div class="result-cards">
    <!-- 帮扶前后对比 -->
    <section v-if="comparable.length" class="card">
      <h3 class="card-title"><AppIcon name="chart" :size="17" />帮扶前后对比</h3>
      <div class="cmp-list">
        <div v-for="m in comparable" :key="m.name" class="cmp-row">
          <div class="cmp-head">
            <span class="cmp-name">{{ m.name }}</span>
            <span class="cmp-delta" :class="m.up ? 'up' : m.down ? 'down' : ''">
              {{ m.deltaLabel }}
            </span>
          </div>
          <div class="cmp-bars">
            <div class="bar-line">
              <span class="bar-tag">前</span>
              <div class="bar-track"><div class="bar before" :style="{ width: m.beforePct + '%' }" /></div>
              <span class="bar-val">{{ m.before }}{{ m.unit }}</span>
            </div>
            <div class="bar-line">
              <span class="bar-tag">后</span>
              <div class="bar-track"><div class="bar after" :style="{ width: m.afterPct + '%' }" /></div>
              <span class="bar-val">{{ m.after }}{{ m.unit }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- KPI 卡组 -->
    <section v-if="kpis.length" class="card">
      <h3 class="card-title"><AppIcon name="chart" :size="17" />关键指标</h3>
      <div class="kpi-grid">
        <div v-for="k in kpis" :key="k.name" class="kpi">
          <span class="kpi-num">{{ k.value }}<i class="kpi-unit">{{ k.unit }}</i></span>
          <span class="kpi-label">{{ k.name }}</span>
        </div>
      </div>
    </section>

    <!-- 足迹时间线 -->
    <section v-if="timeline.length" class="card">
      <h3 class="card-title"><AppIcon name="practice" :size="17" />实践足迹</h3>
      <ol class="timeline">
        <li v-for="(t, i) in timeline" :key="i" class="tl-item">
          <span class="tl-dot" />
          <div class="tl-body">
            <p class="tl-name">{{ t.name }}</p>
            <p v-if="t.note" class="tl-note">{{ t.note }}</p>
            <span class="tl-type">{{ t.type || '材料' }}</span>
          </div>
        </li>
      </ol>
    </section>

    <!-- 人物故事墙 -->
    <section v-if="people.length" class="card">
      <h3 class="card-title"><AppIcon name="users" :size="17" />人物故事墙</h3>
      <div class="people-wall">
        <article v-for="(p, i) in people" :key="i" class="person">
          <div class="person-avatar" :style="{ background: avatarColor(i) }">{{ initial(p.name) }}</div>
          <p class="person-name">{{ p.name }}<span v-if="p.role" class="person-role">· {{ p.role }}</span></p>
          <p v-if="p.quote" class="person-quote">“{{ p.quote }}”</p>
        </article>
      </div>
    </section>

    <!-- 全空态 -->
    <p v-if="isEmpty" class="empty">
      还没有可展示的数据。先在「实践前 / 实践中」补充指标、材料与人物访谈，成果卡会自动生成。
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  dossier: { type: Object, required: true },
})

const collected = computed(() => props.dossier?.collected || {})

// —— 帮扶前后对比：仅取前后值都填了的指标 ——
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

// —— KPI 卡组：优先展示「后值」，无对比则展示已填的任一值 ——
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

// —— 足迹时间线：材料按登记顺序 ——
const timeline = computed(() => (collected.value.materials || []).filter((m) => m.name))

// —— 人物墙 ——
const people = computed(() => (collected.value.people || []).filter((p) => p.name))

const isEmpty = computed(
  () => !comparable.value.length && !kpis.value.length && !timeline.value.length && !people.value.length,
)

function isNum(v) {
  return v !== undefined && v !== null && String(v).trim() !== '' && !Number.isNaN(Number(v))
}

const AVATAR_COLORS = ['#6b8c5c', '#c9a86a', '#4a8fbf', '#e07a5f', '#8a9a5b', '#b07d62']
function avatarColor(i) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length]
}
function initial(name) {
  return String(name || '?').trim().slice(0, 1)
}
</script>

<style scoped>
.result-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.2rem; }
.card {
  padding: 1.4rem 1.5rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
}
.card-title { display: flex; align-items: center; gap: .45rem; margin: 0 0 1rem; font-size: 1.05rem; color: var(--color-primary-dark); }

/* 对比条 */
.cmp-list { display: flex; flex-direction: column; gap: 1rem; }
.cmp-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: .4rem; }
.cmp-name { font-size: .9rem; font-weight: 600; color: var(--color-text); }
.cmp-delta { font-size: .8rem; color: var(--color-text-light); }
.cmp-delta.up { color: var(--color-primary); }
.cmp-delta.down { color: var(--color-highlight); }
.cmp-bars { display: flex; flex-direction: column; gap: .35rem; }
.bar-line { display: flex; align-items: center; gap: .5rem; }
.bar-tag { flex-shrink: 0; width: 1.4em; font-size: .75rem; color: var(--color-text-light); }
.bar-track { flex: 1; height: 12px; background: var(--color-bg); border-radius: 50px; overflow: hidden; }
.bar { height: 100%; border-radius: 50px; transition: width .5s ease; }
.bar.before { background: #cdd6c4; }
.bar.after { background: var(--color-primary); }
.bar-val { flex-shrink: 0; min-width: 3.5em; text-align: right; font-size: .78rem; color: var(--color-text-secondary); }

/* KPI */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: .8rem; }
.kpi {
  display: flex; flex-direction: column; gap: .3rem; padding: 1rem .8rem; text-align: center;
  background: var(--color-bg); border-radius: 12px;
}
.kpi-num { font-size: 1.6rem; font-weight: 700; color: var(--color-primary-dark); }
.kpi-unit { font-size: .85rem; font-weight: 500; font-style: normal; color: var(--color-text-light); margin-left: 2px; }
.kpi-label { font-size: .8rem; color: var(--color-text-secondary); }

/* 时间线 */
.timeline { list-style: none; margin: 0; padding: 0; }
.tl-item { position: relative; padding: 0 0 1rem 1.4rem; border-left: 2px solid var(--color-border); }
.tl-item:last-child { border-left-color: transparent; padding-bottom: 0; }
.tl-dot { position: absolute; left: -6px; top: 3px; width: 10px; height: 10px; border-radius: 50%; background: var(--color-primary); }
.tl-name { margin: 0; font-size: .9rem; font-weight: 600; color: var(--color-text); }
.tl-note { margin: .2rem 0; font-size: .82rem; color: var(--color-text-secondary); }
.tl-type { font-size: .72rem; color: var(--color-primary); background: var(--color-accent); padding: .1rem .5rem; border-radius: 50px; }

/* 人物墙 */
.people-wall { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: .9rem; }
.person { display: flex; flex-direction: column; align-items: center; gap: .4rem; padding: 1rem .6rem; text-align: center; background: var(--color-bg); border-radius: 12px; }
.person-avatar { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; color: #fff; font-size: 1.1rem; font-weight: 700; }
.person-name { margin: 0; font-size: .88rem; font-weight: 600; color: var(--color-text); }
.person-role { font-weight: 400; color: var(--color-text-light); }
.person-quote { margin: 0; font-size: .8rem; color: var(--color-text-secondary); line-height: 1.5; }

.empty { grid-column: 1 / -1; padding: 2.5rem; text-align: center; color: var(--color-text-light); background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }
</style>
