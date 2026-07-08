<template>
  <!-- 恢复登录态前占位，避免闪登录页 -->
  <div v-if="!ready" class="gate-loading">正在载入…</div>

  <!-- 未登录：登录/注册切换 -->
  <section v-else-if="!isAuthed" class="gate">
    <div class="gate-card">
      <div class="gate-tabs">
        <button :class="{ on: mode === 'login' }" @click="mode = 'login'">登录</button>
        <button :class="{ on: mode === 'register' }" @click="mode = 'register'">注册</button>
      </div>

      <form class="gate-form" @submit.prevent="onAuthSubmit">
        <label class="gate-field">
          <span>用户名</span>
          <input v-model.trim="f.username" autocomplete="username" placeholder="3~32 个字符" />
        </label>
        <label v-if="mode === 'register'" class="gate-field">
          <span>昵称（可选）</span>
          <input v-model.trim="f.displayName" placeholder="展示用名字" />
        </label>
        <label class="gate-field">
          <span>密码</span>
          <input
            v-model="f.password"
            type="password"
            :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
            placeholder="至少 6 位"
          />
        </label>
        <button class="btn primary" type="submit" :disabled="busy">
          {{ busy ? '请稍候…' : mode === 'login' ? '登录' : '注册并进入' }}
        </button>
      </form>
    </div>
  </section>

  <!-- 已登录：渲染插槽（队伍中枢/工作台由内部页面自行组织）-->
  <template v-else>
    <slot />
  </template>

  <AppToast ref="toastRef" />
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { ready, isAuthed, register, login, restore } from './auth.js'

const mode = ref('login') // 'login' | 'register'
const f = reactive({ username: '', password: '', displayName: '' })
const busy = ref(false)
const toastRef = ref(null)

function toast(msg) {
  toastRef.value?.show(msg)
}

onMounted(restore)

async function onAuthSubmit() {
  if (busy.value) return
  busy.value = true
  try {
    if (mode.value === 'register') {
      await register({ username: f.username, password: f.password, displayName: f.displayName })
      toast('注册成功')
    } else {
      await login({ username: f.username, password: f.password })
      toast('登录成功')
    }
    f.password = ''
  } catch (e) {
    toast(e.message || '操作失败')
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.gate-loading { text-align: center; padding: 4rem 1rem; color: var(--color-text-light); }
.gate { display: flex; justify-content: center; padding: 3rem 1rem; }
.gate-card {
  width: 100%; max-width: 380px; padding: 2rem;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow-card);
}
.gate-tabs { display: flex; gap: .5rem; margin-bottom: 1.4rem; }
.gate-tabs button {
  flex: 1; padding: .6rem; border: 1px solid var(--color-border); border-radius: 10px;
  background: transparent; color: var(--color-text-secondary); font-weight: 600; cursor: pointer;
  transition: all var(--transition);
}
.gate-tabs button.on { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.gate-form { display: flex; flex-direction: column; gap: 1rem; }
.gate-field { display: flex; flex-direction: column; gap: .4rem; }
.gate-field span { font-size: .85rem; font-weight: 600; color: var(--color-text); }
.gate-field input {
  padding: .7rem .9rem; font-size: .92rem; color: var(--color-text);
  background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 10px; outline: none;
  transition: border-color var(--transition);
}
.gate-field input:focus { border-color: var(--color-primary); }
.btn { border: none; border-radius: 50px; cursor: pointer; font-weight: 600; transition: all var(--transition); }
.btn.primary { padding: .7rem 1.4rem; background: var(--color-primary); color: #fff; font-size: .92rem; }
.btn.primary:hover:not(:disabled) { background: var(--color-primary-dark); transform: translateY(-1px); }
.btn.primary:disabled { opacity: .6; cursor: default; }
</style>
