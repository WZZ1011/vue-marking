<script setup>
import { ref } from 'vue'
import Register from './views/Register.vue'
import Login from './views/Login.vue'
import Main from './views/Main.vue'

// 从 localStorage 读取 token，没有则默认为空字符串
const token = ref(localStorage.getItem('token') || '')
const currentPage = ref('login')
</script>

<template>
  <!-- 没登录：品牌说明 + 登录/注册 -->
  <div v-if="!token" class="auth-page">
    <div class="auth-inner">
      <section class="auth-brand">
        <div class="brand-word"><span class="sig-underline">批改台</span></div>
        <p class="brand-desc">
          教师用的作业自动批改工作台。上传报告与源码，配置评分规则，交给 Agent 逐份批改。
        </p>
        <ul class="brand-facts">
          <li>报告与源码成对归档</li>
          <li>7 条评分规则，权重合计 100</li>
          <li>每份作业给出得分与逐条评语</li>
        </ul>
      </section>

      <section class="auth-panel">
        <el-tabs v-model="currentPage" class="auth-tabs">
          <el-tab-pane label="登录" name="login">
            <Login />
          </el-tab-pane>
          <el-tab-pane label="注册" name="register">
            <Register />
          </el-tab-pane>
        </el-tabs>
      </section>
    </div>
  </div>

  <!-- 已登录：显示主界面 -->
  <Main v-else />
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
  background: var(--paper);
}

.auth-inner {
  width: 100%;
  max-width: 920px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 64px;
  align-items: center;
}

.brand-word {
  font-size: 34px;
  line-height: 1.15;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.brand-desc {
  max-width: 360px;
  margin: 16px 0 24px;
  font-size: 14px;
  line-height: 1.75;
  color: var(--ink-2);
}

.brand-facts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  color: var(--ink-3);
}

.brand-facts li {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.brand-facts li::before {
  content: "";
  width: 5px;
  height: 5px;
  flex: none;
  border-radius: 50%;
  background: var(--accent);
  transform: translateY(-2px);
}

.auth-panel {
  padding: 24px 28px 28px;
  background: var(--paper-card);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(31, 27, 22, 0.04);
}

@media (max-width: 820px) {
  .auth-page {
    padding: 24px 16px;
  }

  .auth-inner {
    grid-template-columns: 1fr;
    gap: 32px;
    max-width: 420px;
  }

  .brand-word {
    font-size: 28px;
  }

  .brand-desc {
    margin-bottom: 16px;
  }
}
</style>
