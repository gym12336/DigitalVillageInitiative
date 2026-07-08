<template>
  <AuthGate>
  <section class="new-page">
    <div class="container">
      <header class="page-head">
        <p class="kicker">乡村实践 · 我的实践</p>
        <h1>新建实践</h1>
        <p class="desc">先填写实践概要，提交后进入三阶段工作台。带 * 的为必填项。</p>
      </header>

      <form class="form" @submit.prevent="onSubmit">
        <!-- 归属队（只读，进队后建档，不放选队下拉）-->
        <div class="field">
          <span class="field-label">归属实践队</span>
          <div class="team-chip">🚩 {{ teamName || '当前队' }}</div>
        </div>

        <!-- 目标地 -->
        <label class="field">
          <span class="field-label">目标地 <i class="req">*</i></span>
          <input
            v-model.trim="form.village"
            class="field-input"
            :class="{ invalid: errors.village }"
            placeholder="如 陈家铺村"
          />
          <span v-if="errors.village" class="field-err">{{ errors.village }}</span>
        </label>

        <!-- 实践主题 -->
        <label class="field">
          <span class="field-label">实践主题 <i class="req">*</i></span>
          <input
            v-model.trim="form.topic"
            class="field-input"
            :class="{ invalid: errors.topic }"
            placeholder="如 非遗文化挖掘"
          />
          <span v-if="errors.topic" class="field-err">{{ errors.topic }}</span>
        </label>

        <!-- 起止时间 -->
        <div class="field">
          <span class="field-label">实践时间</span>
          <div class="date-row">
            <input v-model="form.startDate" type="date" class="field-input" aria-label="开始时间" />
            <span class="date-sep">至</span>
            <input v-model="form.endDate" type="date" class="field-input" aria-label="结束时间" />
          </div>
          <span v-if="errors.date" class="field-err">{{ errors.date }}</span>
        </div>

        <!-- idea -->
        <label class="field">
          <span class="field-label">你的 idea（可选）</span>
          <textarea
            v-model.trim="form.idea"
            class="field-input"
            rows="3"
            placeholder="用一句话描述你想做的实践，比如「去陈家铺村帮村民把竹编卖出去」。也可以进工作台后再填。"
          />
        </label>

        <div class="actions">
          <button type="button" class="btn ghost" @click="onCancel">取消</button>
          <button type="submit" class="btn primary" :disabled="busy">
            {{ busy ? '创建中…' : '创建并进入工作台' }}
          </button>
        </div>
      </form>
    </div>

    <AppToast ref="toastRef" />
  </section>
  </AuthGate>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppToast from '@/components/AppToast.vue'
import AuthGate from './AuthGate.vue'
import { addDossier } from './dossier.js'
import { apiGetTeam } from './api.js'

const route = useRoute()
const router = useRouter()

const teamId = computed(() => Number(route.params.teamId))
const teamName = ref('')

const form = reactive({
  village: '',
  topic: '',
  startDate: '',
  endDate: '',
  idea: '',
})
const errors = reactive({ village: '', topic: '', date: '' })
const busy = ref(false)
const toastRef = ref(null)

// 建档归属当前队；取队名用于档案标题（队名·主题）。
onMounted(async () => {
  try {
    const team = await apiGetTeam(teamId.value)
    teamName.value = team?.name || ''
  } catch (e) {
    toastRef.value?.show(e.message || '加载队伍失败')
    if (e.status === 403 || e.status === 404) router.replace('/practice/mine')
  }
})

function validate() {
  errors.village = form.village ? '' : '请填写目标地'
  errors.topic = form.topic ? '' : '请填写实践主题'
  errors.date =
    form.startDate && form.endDate && form.endDate < form.startDate ? '结束时间不能早于开始时间' : ''
  return !errors.village && !errors.topic && !errors.date
}

async function onSubmit() {
  if (!validate() || busy.value) return
  busy.value = true
  try {
    const d = await addDossier(teamId.value, {
      teamName: teamName.value,
      village: form.village,
      topic: form.topic,
      startDate: form.startDate,
      endDate: form.endDate,
      idea: form.idea,
    })
    router.push({ path: `/practice/mine/team/${teamId.value}`, query: { open: d.id } })
  } catch (e) {
    toastRef.value?.show(e.message || '创建失败')
  } finally {
    busy.value = false
  }
}

function onCancel() {
  router.push(`/practice/mine/team/${teamId.value}`)
}
</script>

<style scoped>
.new-page { padding: 2.6rem 0 3rem; }
.container { max-width: 680px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem); }

.page-head { margin-bottom: 1.8rem; }
.kicker { font-size: 13px; font-weight: 700; color: var(--color-highlight); letter-spacing: .08em; margin: 0 0 .6rem; }
.page-head h1 { font-size: clamp(24px, 4vw, 32px); font-weight: 700; color: var(--color-primary-dark); margin: 0; }
.desc { margin: .7rem 0 0; color: var(--color-text-secondary); font-size: .95rem; line-height: 1.6; }

.form {
  display: flex; flex-direction: column; gap: 1.3rem;
  padding: 1.8rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
}
.field { display: flex; flex-direction: column; gap: .4rem; }
.field-label { font-size: .88rem; font-weight: 600; color: var(--color-text); }
.req { color: var(--color-highlight); font-style: normal; }
.field-input {
  padding: .7rem .9rem; font-size: .92rem; color: var(--color-text);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 10px; outline: none; resize: vertical;
  transition: border-color var(--transition);
}
.field-input:focus { border-color: var(--color-primary); }
.field-input.invalid { border-color: var(--color-highlight); }
.field-err { font-size: .8rem; color: var(--color-highlight); }
.team-chip { display: inline-flex; align-items: center; gap: .4rem; padding: .5rem .9rem; font-size: .9rem; font-weight: 600; color: var(--color-primary-dark); background: var(--color-accent); border-radius: 10px; align-self: flex-start; }

.date-row { display: flex; align-items: center; gap: .7rem; }
.date-row .field-input { flex: 1; }
.date-sep { font-size: .85rem; color: var(--color-text-light); }

.actions { display: flex; justify-content: flex-end; gap: .8rem; margin-top: .4rem; }
.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.primary { padding: .7rem 1.6rem; background: var(--color-primary); color: #fff; font-size: .92rem; }
.btn.primary:hover { background: var(--color-primary-dark); transform: translateY(-1px); }
.btn.ghost { padding: .7rem 1.4rem; background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: .88rem; }
.btn.ghost:hover { border-color: var(--color-primary); color: var(--color-primary); }

@media (max-width: 480px) {
  .date-row { flex-direction: column; align-items: stretch; }
  .actions { flex-direction: column-reverse; }
  .actions .btn { width: 100%; }
}
</style>
