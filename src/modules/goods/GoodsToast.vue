<template>
  <!-- 乡村好物模块自建的轻量 Toast，不依赖全局。通过模板 ref 暴露 show() -->
  <Teleport to="body">
    <transition name="goods-toast">
      <div v-if="visible" class="goods-toast" role="status" aria-live="polite">
        {{ message }}
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

// 当前提示文案与可见状态
const message = ref('')
const visible = ref(false)
let timer = null

// 显示一条提示，duration 毫秒后自动消失
function show(text, duration = 2400) {
  message.value = text
  visible.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    visible.value = false
  }, duration)
}

// 供父组件通过模板 ref 调用
defineExpose({ show })
</script>

<style scoped>
.goods-toast {
  position: fixed;
  left: 50%;
  bottom: 12%;
  transform: translateX(-50%);
  z-index: 3000;
  max-width: min(88vw, 420px);
  padding: 0.85rem 1.4rem;
  border-radius: 50px;
  background: var(--color-highlight);
  color: #fff;
  font-size: 0.95rem;
  text-align: center;
  box-shadow: 0 8px 30px rgba(224, 122, 95, 0.35);
}

/* 淡入淡出 + 轻微上浮 */
.goods-toast-enter-active,
.goods-toast-leave-active {
  transition: opacity var(--transition), transform var(--transition);
}
.goods-toast-enter-from,
.goods-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}
</style>
