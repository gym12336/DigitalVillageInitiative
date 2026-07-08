<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-card">
      <header class="modal-header">
        <span class="modal-badge">🌐 网络</span>
        <button class="modal-close" aria-label="关闭" @click="$emit('close')">✕</button>
      </header>

      <h3 class="modal-title">{{ card.title }}</h3>

      <p class="modal-url">{{ card.path }}</p>

      <div class="modal-snippet">
        <p v-if="card.sub">{{ card.sub }}</p>
        <p v-else class="modal-no-snippet">（无内容摘要）</p>
      </div>

      <footer class="modal-footer">
        <button class="btn modal-open-link" @click="openOriginal">打开原网页 ↗</button>
        <button class="btn primary modal-adopt" @click="adopt">采纳此信息</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  card: { type: Object, required: true },
})
const emit = defineEmits(['close', 'adopt'])

function openOriginal() {
  window.open(props.card.path, '_blank')
}
function adopt() {
  emit('adopt')
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
}
.modal-card {
  background: var(--color-card, #fff);
  border-radius: 16px; padding: 1.6rem; max-width: 520px; width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;
}
.modal-badge {
  font-size: .78rem; padding: .2rem .7rem; border-radius: 50px;
  background: #fff3e0; color: #e65100;
}
.modal-close {
  border: none; background: transparent; font-size: 1.2rem; cursor: pointer;
  color: var(--color-text-light, #888);
}
.modal-title {
  margin: 0 0 .5rem; font-size: 1.1rem; color: var(--color-text, #333);
}
.modal-url {
  margin: 0 0 1rem; font-size: .78rem; color: var(--color-text-light, #999);
  word-break: break-all;
}
.modal-snippet {
  margin-bottom: 1.4rem; padding: .8rem; background: var(--color-bg, #f9f9f9);
  border-radius: 10px; font-size: .88rem; line-height: 1.6; color: var(--color-text-secondary, #555);
  max-height: 180px; overflow-y: auto;
}
.modal-snippet p { margin: 0; }
.modal-no-snippet { color: var(--color-text-light, #999); font-style: italic; }
.modal-footer {
  display: flex; gap: .8rem; justify-content: flex-end;
}
.btn {
  border: none; border-radius: 50px; cursor: pointer; font-weight: 600;
  padding: .6rem 1.3rem; font-size: .88rem; transition: all .2s;
}
.btn.primary {
  background: var(--color-primary, #4a8fbf); color: #fff;
}
.btn.primary:hover { filter: brightness(1.1); }
.modal-open-link {
  background: transparent; border: 1px solid var(--color-border, #ddd);
  color: var(--color-text, #333);
}
.modal-open-link:hover { background: var(--color-bg, #f0f0f0); }
</style>
