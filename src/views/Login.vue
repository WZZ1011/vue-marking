<script setup>
import { ref } from 'vue'

const username = ref('')
const password = ref('')
const message = ref('')
const submitting = ref(false)

async function handleLogin() {
  message.value = ''

  if (!username.value || !password.value) {
    message.value = '请输入用户名和密码'
    return
  }

  submitting.value = true
  try {
    const params = new URLSearchParams()
    params.append('username', username.value)
    params.append('password', password.value)

    const res = await fetch('http://127.0.0.1:8000/user/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    if (res.ok) {
      const data = await res.json()
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user_id', password.value)
      window.location.reload()
    } else {
      message.value = '用户名或密码不正确'
    }
  } catch (e) {
    message.value = '无法连接服务器，请确认后端已启动'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="auth-form" @submit.prevent="handleLogin">
    <label class="field">
      <span class="field-label">用户名</span>
      <el-input v-model="username" placeholder="输入用户名" clearable />
    </label>

    <label class="field">
      <span class="field-label">密码</span>
      <el-input
        v-model="password"
        type="password"
        placeholder="输入密码"
        show-password
        clearable
      />
    </label>

    <el-button type="primary" class="submit" native-type="submit" :loading="submitting">
      登录
    </el-button>

    <p v-if="message" class="form-message">{{ message }}</p>
  </form>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 4px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
}

.submit {
  width: 100%;
  margin-top: 4px;
}

.form-message {
  margin: 0;
  font-size: 13px;
  color: var(--el-color-danger);
}
</style>
