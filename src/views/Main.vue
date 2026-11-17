<script setup>
import { computed, ref } from 'vue'
import Upload from './functions/Upload.vue'
import ListDoc from './functions/ListDoc.vue'
import ListCode from './functions/ListCode.vue'
import ListTopic from './functions/ListTopic.vue'
import ListRule from './functions/ListRule.vue'
import AgentMarking from './functions/AgentMarking.vue'
import MarkingResult from './functions/MarkingResult.vue'

const currentPage = ref('upload')
const isTeacher = ref(localStorage.getItem('user_id') === '1')

// lucide 线性图标路径，统一 16px / 1.5 描边
const ICONS = {
  upload: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'],
  file: [
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
    'M14 2v6h6',
    'M16 13H8',
    'M16 17H8',
    'M10 9H8',
  ],
  code: ['M16 18l6-6-6-6', 'M8 6l-6 6 6 6'],
  folder: ['M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z'],
  sliders: [
    'M4 21v-7',
    'M4 10V3',
    'M12 21v-9',
    'M12 8V3',
    'M20 21v-5',
    'M20 12V3',
    'M1 14h6',
    'M9 8h6',
    'M17 16h6',
  ],
  play: ['M5 3l14 9-14 9V3z'],
  list: [
    'M9 6h11',
    'M9 12h11',
    'M9 18h11',
    'M3 6l1.5 1.5L7 5',
    'M3 12l1.5 1.5L7 11',
    'M3 18l1.5 1.5L7 17',
  ],
}

const navGroups = computed(() => {
  if (!isTeacher.value) {
    return [{ label: '作业', items: [{ key: 'upload', label: '上传作业', icon: 'upload' }] }]
  }

  return [
    {
      label: '作业',
      items: [
        { key: 'upload', label: '上传作业', icon: 'upload' },
        { key: 'listDoc', label: '文档', icon: 'file' },
        { key: 'listCode', label: '源代码', icon: 'code' },
      ],
    },
    {
      label: '配置',
      items: [
        { key: 'topic', label: '专题', icon: 'folder' },
        { key: 'topicRule', label: '评分规则', icon: 'sliders' },
      ],
    },
    {
      label: '批改',
      items: [
        { key: 'agentMarking', label: '一键批改', icon: 'play' },
        { key: 'markingResult', label: '批改结果', icon: 'list' },
      ],
    },
  ]
})

function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user_id')
  window.location.reload()
}
</script>

<template>
  <div class="shell">
    <aside class="side">
      <div class="brand">
        <div class="brand-word"><span class="sig-underline">批改台</span></div>
        <div class="brand-tagline">作业自动批改</div>
      </div>

      <nav class="side-nav">
        <div v-for="group in navGroups" :key="group.label" class="nav-group">
          <div class="nav-label">{{ group.label }}</div>
          <button
            v-for="item in group.items"
            :key="item.key"
            class="nav-item"
            :class="{ active: currentPage === item.key }"
            @click="currentPage = item.key"
          >
            <svg
              class="nav-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path v-for="d in ICONS[item.icon]" :key="d" :d="d" />
            </svg>
            <span>{{ item.label }}</span>
          </button>
        </div>
      </nav>

      <div class="side-foot">
        <span class="role">{{ isTeacher ? '教师' : '学生' }}</span>
        <button class="logout" @click="logout">退出登录</button>
      </div>
    </aside>

    <main class="main">
      <div class="main-inner">
        <Transition name="page" mode="out-in">
          <div :key="currentPage" class="page-view">
            <Upload v-if="currentPage === 'upload'" />
            <ListDoc v-else-if="currentPage === 'listDoc' && isTeacher" />
            <ListCode v-else-if="currentPage === 'listCode' && isTeacher" />
            <ListTopic v-else-if="currentPage === 'topic' && isTeacher" />
            <ListRule v-else-if="currentPage === 'topicRule' && isTeacher" />
            <AgentMarking v-else-if="currentPage === 'agentMarking' && isTeacher" />
            <MarkingResult v-else-if="currentPage === 'markingResult' && isTeacher" />

            <div v-else class="blank-state">
              <p>从左侧选择一个功能</p>
            </div>
          </div>
        </Transition>
      </div>
    </main>
  </div>
</template>

<style scoped>
.side {
  position: sticky;
  top: 0;
  align-self: flex-start;
  height: 100vh;
}

.brand {
  padding: 0 10px 24px;
}

.brand-word {
  font-size: 19px;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.brand-tagline {
  margin-top: 10px;
  font-size: 12px;
  color: var(--ink-3);
}

.side-nav {
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-label {
  padding: 0 10px 8px;
  font-size: 12px;
  color: var(--ink-3);
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-2);
  font: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.55);
  color: var(--ink);
}

.nav-item.active {
  background: var(--paper-card);
  border-color: var(--line);
  color: var(--ink);
  box-shadow: 0 1px 2px rgba(31, 27, 22, 0.04);
}

.nav-item.active::before {
  content: "";
  position: absolute;
  left: -1px;
  top: 9px;
  bottom: 9px;
  width: 2px;
  border-radius: 2px;
  background: var(--accent);
}

.nav-icon {
  flex: none;
  color: var(--ink-3);
}

.nav-item.active .nav-icon {
  color: var(--accent);
}

.side-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding: 16px 10px 0;
  border-top: 1px solid var(--line);
}

.role {
  font-size: 12px;
  color: var(--ink-3);
}

.logout {
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink-3);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.16s var(--ease);
}

.logout:hover {
  color: var(--accent);
}

.page-view {
  width: 100%;
}

.blank-state {
  display: grid;
  place-items: center;
  min-height: 50vh;
  color: var(--ink-3);
  font-size: 14px;
}

@media (max-width: 960px) {
  .side {
    position: static;
    height: auto;
  }

  .brand {
    padding: 0;
    flex: none;
  }

  .brand-tagline {
    display: none;
  }

  .side-nav {
    flex-direction: row;
    gap: 12px;
    margin-top: 0;
    overflow-x: auto;
  }

  .nav-group {
    flex-direction: row;
    gap: 4px;
  }

  .nav-label {
    display: none;
  }

  .nav-item {
    width: auto;
    white-space: nowrap;
  }

  .side-foot {
    margin-top: 0;
    padding: 0;
    border-top: 0;
    flex: none;
  }

  .role {
    display: none;
  }
}
</style>
