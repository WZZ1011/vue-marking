<script setup>
import { ref, onMounted } from 'vue'

const BASE = 'http://127.0.0.1:8000'

const list = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const topicFilter = ref(null)
const topics = ref([])
const loading = ref(false)
const loadingTopics = ref(false)
const message = ref('')
const openIds = ref([])

async function loadTopics() {
  loadingTopics.value = true
  topics.value = []

  try {
    // get_page_topic 的 size 上限为 100，循环分页直到取完
    let pageNum = 1
    let topicTotal = 0
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${BASE}/marking/get_page_topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ page: pageNum, size: 100 }),
      })

      if (res.status === 401) {
        message.value = '登录已过期，请重新登录'
        return
      }
      if (!res.ok) return

      const data = await res.json()
      topicTotal = data.total || 0
      const items = data.items || []
      topics.value.push(...items)

      if (!items.length || topics.value.length >= topicTotal) break
      pageNum += 1
    }
  } catch (e) {
    // 专题筛选加载失败不影响结果列表，保持静默
  } finally {
    loadingTopics.value = false
  }
}

async function loadList() {
  loading.value = true
  message.value = ''

  const params = new URLSearchParams({
    page: page.value,
    size: size.value,
  })
  if (topicFilter.value !== null && topicFilter.value !== undefined && topicFilter.value !== '') {
    params.append('topic_id', topicFilter.value)
  }

  try {
    const res = await fetch(`${BASE}/agent/get_marking_result?${params}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })

    if (res.status === 401) {
      message.value = '登录已过期，请重新登录'
      list.value = []
      total.value = 0
      return
    }
    if (!res.ok) {
      message.value = `加载失败（${res.status}）`
      return
    }

    const data = await res.json()
    list.value = data.items || []
    total.value = data.total || 0
    openIds.value = []
  } catch (e) {
    message.value = '加载失败，请检查后端服务'
  } finally {
    loading.value = false
  }
}

function onTopicChange() {
  page.value = 1
  loadList()
}

function toggle(id) {
  openIds.value = openIds.value.includes(id)
    ? openIds.value.filter((item) => item !== id)
    : [...openIds.value, id]
}

function scoreOf(row) {
  const match = /得分\s*([0-9]+(?:\.[0-9]+)?)/.exec(row.llm_comment || '')
  return match ? match[1] : null
}

function topicName(id) {
  const topic = topics.value.find((item) => item.id === id)
  return topic ? topic.name : `专题 ${id}`
}

// 把评语拆成「一、…」小节，去掉开头重复的「得分 93.75，」
function sectionsOf(row) {
  const text = String(row.llm_comment || '')
    .replace(/^得分\s*[0-9]+(?:\.[0-9]+)?\s*[，,]\s*/, '')
    .trim()
  if (!text) return []

  const sections = []
  let current = { title: '', paragraphs: [] }
  const headingPattern = /^[一二三四五六七八九十]+、.+/

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    // 「总结：……」把冒号后的整段作为正文，而不是标题
    const summary = line.match(/^总结[：:]\s*(.*)$/)
    if (summary) {
      if (current.title || current.paragraphs.length) sections.push(current)
      current = { title: '总结', paragraphs: summary[1] ? [summary[1]] : [] }
      continue
    }

    if (headingPattern.test(line)) {
      if (current.title || current.paragraphs.length) sections.push(current)
      current = { title: line, paragraphs: [] }
    } else {
      current.paragraphs.push(line)
    }
  }

  if (current.title || current.paragraphs.length) sections.push(current)
  return sections
}

onMounted(() => {
  loadTopics()
  loadList()
})
</script>

<template>
  <div>
    <div class="page-head">
      <div class="page-head-main">
        <h1 class="page-title"><span class="sig-underline">批改结果</span></h1>
        <p class="page-sub">按学生与专题查看得分和逐条评语</p>
      </div>
      <div class="head-actions">
        <el-select
          v-model="topicFilter"
          filterable
          clearable
          placeholder="全部专题"
          :loading="loadingTopics"
          class="topic-select"
          @change="onTopicChange"
        >
          <el-option
            v-for="t in topics"
            :key="t.id"
            :label="`${t.id} - ${t.name}`"
            :value="t.id"
          />
        </el-select>
        <span class="count">{{ total }} 条</span>
      </div>
    </div>

    <p v-if="message" class="inline-error">{{ message }}</p>

    <el-card class="result-card" :body-style="{ padding: '0' }">
      <div v-loading="loading" class="result-body">
        <div v-if="!loading && !list.length" class="empty-state">
          <p class="empty-title">还没有批改结果</p>
          <p class="empty-sub">先上传作业，再到「一键批改」运行一次</p>
        </div>

        <article v-for="row in list" :key="row.id" class="result-item">
          <div class="result-head">
            <div class="who">
              <span class="student">{{ row.student_name || '未命名学生' }}</span>
              <span class="meta">学号 {{ row.student_id }}</span>
            </div>

            <div class="topic">{{ topicName(row.topic_id) }}</div>

            <div class="score" :class="{ pending: scoreOf(row) === null }">
              <template v-if="scoreOf(row) !== null">
                <span class="score-num num-serif">{{ scoreOf(row) }}</span>
                <span class="score-unit">/ 100</span>
              </template>
              <span v-else class="score-pending">待批改</span>
            </div>

            <button
              class="comment-toggle"
              :disabled="!row.llm_comment"
              @click="toggle(row.id)"
            >
              {{ openIds.includes(row.id) ? '收起评语' : '查看评语' }}
            </button>
          </div>

          <div class="refs">
            <span class="mono">报告 #{{ row.document_id }}</span>
            <span class="ref-dot">·</span>
            <span class="mono">源码 #{{ row.code_id }}</span>
            <span class="ref-dot">·</span>
            <span class="mono">记录 #{{ row.id }}</span>
          </div>

          <div v-if="openIds.includes(row.id)" class="comment">
            <section
              v-for="(section, index) in sectionsOf(row)"
              :key="index"
              class="comment-section"
            >
              <h3 v-if="section.title" class="comment-title">{{ section.title }}</h3>
              <p
                v-for="(paragraph, pIndex) in section.paragraphs"
                :key="pIndex"
                class="comment-text"
              >
                {{ paragraph }}
              </p>
            </section>
          </div>
        </article>
      </div>

      <div v-if="list.length" class="pager">
        <el-pagination
          layout="prev, pager, next, total"
          :total="total"
          :page-size="size"
          :current-page="page"
          @current-change="(p) => { page = p; loadList() }"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.head-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.topic-select {
  width: 220px;
}

.inline-error {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-color-danger);
}

.result-card {
  width: 100%;
}

.result-body {
  min-height: 160px;
}

.empty-state {
  padding: 56px 24px;
  text-align: center;
}

.empty-title {
  margin: 0;
  font-size: 15px;
  color: var(--ink-2);
}

.empty-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--ink-3);
}

.result-item {
  padding: 20px 24px;
  border-bottom: 1px solid var(--line);
}

.result-item:last-child {
  border-bottom: 0;
}

.result-head {
  display: flex;
  align-items: center;
  gap: 16px;
}

.who {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.student {
  font-size: 16px;
  font-weight: 500;
  color: var(--ink);
}

.meta {
  font-size: 12px;
  color: var(--ink-3);
}

.topic {
  width: 160px;
  font-size: 13px;
  color: var(--ink-2);
}

.score {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 4px;
  width: 130px;
}

.score-num {
  position: relative;
  font-size: 34px;
  line-height: 1;
  color: var(--ink);
  padding-bottom: 4px;
}

.score-num::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 5px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 6' preserveAspectRatio='none'%3E%3Cpath d='M1 4.4C18 1.6 34 5.4 52 3S82 1.4 99 4' fill='none' stroke='%23b23a2b' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E")
    no-repeat left center / 100% 5px;
}

.score-unit {
  font-size: 12px;
  color: var(--ink-3);
}

.score-pending {
  font-size: 13px;
  color: var(--ink-3);
}

.comment-toggle {
  width: 76px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink-3);
  font: inherit;
  font-size: 13px;
  text-align: right;
  cursor: pointer;
  transition: color 0.16s var(--ease);
}

.comment-toggle:hover:not(:disabled) {
  color: var(--accent);
}

.comment-toggle:disabled {
  color: #bdb5a9;
  cursor: default;
}

.refs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
}

.ref-dot {
  color: #c7bdac;
}

.comment {
  margin-top: 16px;
  padding: 16px 18px;
  background: #fbf8f2;
  border-left: 2px solid var(--accent);
  border-radius: 0 10px 10px 0;
}

.comment-section {
  max-width: 780px;
}

.comment-section + .comment-section {
  margin-top: 14px;
}

.comment-title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
}

.comment-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--ink-2);
}

.comment-text + .comment-text {
  margin-top: 4px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid var(--line);
}

@media (max-width: 760px) {
  .result-head {
    flex-wrap: wrap;
    gap: 10px 16px;
  }

  .who {
    flex: 1 1 100%;
  }

  .topic {
    width: auto;
    flex: 1;
  }

  .score {
    width: auto;
  }

  .comment-toggle {
    width: auto;
  }
}
</style>
