<template>
  <!-- 模块内自建的极简 Toast：右下角浮层，自动消失，不依赖全局 -->
  <Teleport to="body">
    <Transition name="toast-fade">
      <div v-if="visible" class="guide-toast" role="status" aria-live="polite">
        {{ message }}
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

// 当前是否显示 + 显示的文案
const visible = ref(false)
const message = ref('')
let timer = null

// 对外暴露 show(msg)：显示一条 Toast，2 秒后自动隐藏
function show(msg) {
  message.value = msg
  visible.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    visible.value = false
  }, 2000)
}

defineExpose({ show })
</script>

<style scoped>
.guide-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 9999;
  max-width: 320px;
  padding: 12px 20px;
  background: var(--color-primary-dark);
  color: #fff;
  font-size: 14px;
  border-radius: 50px;
  box-shadow: var(--shadow-card-hover);
}

/* 淡入淡出 + 轻微上移过渡 */
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
