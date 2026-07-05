<template>
  <span ref="el">{{ display }}</span>
</template>

<script setup>
// 滚动到视口时从 0 递增到目标值的计数动画（Intersection Observer 触发，1.5s ease-out）。
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  value: { type: Number, required: true },
  duration: { type: Number, default: 1500 },
})

const el = ref(null)
const display = ref(0)
let obs = null
let started = false

function easeOut(t) { return 1 - Math.pow(1 - t, 3) }

function run() {
  if (started) return
  started = true
  const start = performance.now()
  const step = (now) => {
    const p = Math.min(1, (now - start) / props.duration)
    display.value = Math.round(easeOut(p) * props.value)
    if (p < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') { display.value = props.value; return }
  obs = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) run()
  }, { threshold: 0.3 })
  obs.observe(el.value)
})
onBeforeUnmount(() => { if (obs) obs.disconnect() })
</script>
