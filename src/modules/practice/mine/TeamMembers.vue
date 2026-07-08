<template>
  <div class="members">
    <div v-if="loading" class="members-loading">载入队员…</div>
    <ul v-else class="member-list">
      <li v-for="m in members" :key="m.userId" class="member">
        <div class="m-avatar">{{ (m.displayName || m.username).slice(0, 1) }}</div>
        <div class="m-info">
          <span class="m-name">
            {{ m.displayName || m.username }}
            <span v-if="m.role === 'owner'" class="m-badge">建队人</span>
          </span>
          <span class="m-sub">@{{ m.username }} · 加入于 {{ formatDate(m.joinedAt) }}</span>
        </div>
        <span class="m-count">{{ m.dossierCount }} 份实践</span>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiTeamMembers } from './api.js'

const props = defineProps({
  teamId: { type: [Number, String], required: true },
})
const emit = defineEmits(['error'])

const members = ref([])
const loading = ref(true)

function formatDate(iso) {
  if (!iso) return ''
  return String(iso).slice(0, 10)
}

onMounted(async () => {
  try {
    members.value = await apiTeamMembers(props.teamId)
  } catch (e) {
    emit('error', e.message || '加载队员失败')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.members-loading { padding: 1rem 0; color: var(--color-text-light); font-size: .9rem; }
.member-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .7rem; }
.member {
  display: flex; align-items: center; gap: .9rem;
  padding: .8rem 1rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: 12px;
}
.m-avatar {
  flex-shrink: 0; width: 38px; height: 38px; border-radius: 50%;
  display: grid; place-items: center; font-weight: 700;
  background: var(--color-accent); color: var(--color-primary-dark);
}
.m-info { flex: 1; display: flex; flex-direction: column; gap: .2rem; min-width: 0; }
.m-name { font-size: .95rem; font-weight: 600; color: var(--color-text); display: flex; align-items: center; gap: .5rem; }
.m-badge { font-size: .7rem; font-weight: 600; padding: .1rem .55rem; border-radius: 50px; background: var(--color-accent); color: var(--color-primary-dark); }
.m-sub { font-size: .78rem; color: var(--color-text-light); }
.m-count { font-size: .82rem; color: var(--color-text-secondary); white-space: nowrap; }
</style>
