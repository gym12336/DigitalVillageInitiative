import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useFlowBox(comp, p) {
  const flowActive = ref(p.value.activeIndex || 0)
  const flowDuration = computed(() => p.value.animationDuration || 400)

  const flowSlides = computed(() => {
    const children = p.value.children || []
    const c = comp.value
    return children.map(child => ({
      type: child.type,
      x: 0,
      y: 0,
      width: c.width,
      height: c.height,
      props: child.props,
    }))
  })

  let timer = null

  function goToSlide(idx) {
    const len = flowSlides.value.length
    if (len === 0) return
    flowActive.value = ((idx % len) + len) % len
    if (p.value.autoPlay !== false) {
      resetTimer()
    }
  }

  function next() {
    goToSlide(flowActive.value + 1)
  }

  function prev() {
    goToSlide(flowActive.value - 1)
  }

  function resetTimer() {
    if (timer) clearTimeout(timer)
    const interval = (p.value.interval || 5) * 1000
    timer = setTimeout(() => {
      next()
      resetTimer()
    }, interval)
  }

  function onFlowWheel(e) {
    if (e.deltaY > 0) {
      next()
    } else {
      prev()
    }
  }

  onMounted(() => {
    if (p.value.autoPlay !== false && flowSlides.value.length > 1) {
      resetTimer()
    }
  })

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
  })

  return {
    flowActive,
    flowSlides,
    flowDuration,
    goToSlide,
    onFlowWheel,
  }
}
