<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const BASE = 'http://127.0.0.1:8000'

const topics = ref([])
const topicId = ref(null)
const loadingTopics = ref(false)
const submitting = ref(false)
const message = ref('')
const result = ref(null)

async function loadTopics() {
  loadingTopics.value = true
  message.value = ''
  topics.value = []

  try {
    // get_page_topic 的 size 上限为 100，循环分页直到取完
    let page = 1
    let total = 0
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${BASE}/marking/get_page_topic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ page, size: 100 }),
      })

      if (res.status === 401) {
        message.value = '登录已过期，请重新登录'
        return
      }
      if (!res.ok) {
        message.value = `专题列表加载失败（${res.status}）`
        return
      }

      const data = await res.json()
      total = data.total || 0
      const items = data.items || []
      topics.value.push(...items)

      if (!items.length || topics.value.length >= total) break
      page += 1
    }
  } catch (e) {
    message.value = '专题列表加载失败，请检查后端服务'
  } finally {
    loadingTopics.value = false
  }
}

async function handleMarking() {
  if (topicId.value === null || topicId.value === undefined || topicId.value === '') {
    ElMessage.warning('请选择专题')
    return
  }

  submitting.value = true
  result.value = null

  try {
    const res = await fetch(`${BASE}/agent/one_click_marking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ topic_id: Number(topicId.value) }),
    })

    if (res.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      return
    }
    if (!res.ok) {
      ElMessage.error(res.status === 400 ? '权重合计需为 100，请先调整评分规则' : `批改失败（${res.status}）`)
      return
    }

    const data = await res.json()
    result.value = data

    if (data.error_count > 0) {
      ElMessage.warning(`批改完成，但失败 ${data.error_count} 条`)
    } else {
      ElMessage.success('批改完成')
    }
  } catch (e) {
    ElMessage.error('批改请求失败，请检查后端服务')
  } finally {
    submitting.value = false
  }
}

onMounted(loadTopics)
</script>

<template>
  <div>
    <div class="page-head">
      <div class="page-head-main">
        <h1 class="page-title"><span class="sig-underline">一键批改</span></h1>
        <p class="page-sub">对专题下尚未批改的作业运行 Agent</p>
      </div>
      <span class="count">{{ topics.length }} 个专题</span>
    </div>

    <div class="split">
      <el-card class="panel-card">
        <el-form label-position="top" @submit.prevent>
          <el-form-item label="专题">
            <el-select
              v-model="topicId"
              filterable
              clearable
              placeholder="选择专题"
              :loading="loadingTopics"
              :disabled="submitting"
              class="topic-select"
            >
              <el-option
                v-for="t in topics"
                :key="t.id"
                :label="`${t.id} - ${t.name}`"
                :value="t.id"
              />
            </el-select>
          </el-form-item>

          <el-button
            type="primary"
            class="submit-btn"
            :loading="submitting"
            :disabled="!topics.length || loadingTopics || submitting"
            @click="handleMarking"
          >
            {{ submitting ? '正在批改…' : '开始批改' }}
          </el-button>
        </el-form>

        <p v-if="message" class="inline-error">{{ message }}</p>
        <p
          v-else-if="!loadingTopics && topics.length === 0"
          class="inline-hint"
        >
          暂无专题，请先在「专题」页创建
        </p>

        <div v-if="submitting" class="running">
          正在批改，可能需要几分钟，请勿关闭页面
        </div>

        <div
          v-if="result"
          class="run-result"
          :class="result.error_count > 0 ? 'warn' : 'ok'"
        >
          <div class="run-title">
            {{ result.error_count > 0 ? '批改完成，有记录失败' : '批改完成' }}
          </div>
          <p class="run-desc">
            <template v-if="result.error_count > 0">
              失败 {{ result.error_count }} 条，失败记录保持待批改，可再次运行。
            </template>
            <template v-else>
              所有待批改作业已处理，可到「批改结果」查看得分与评语。
            </template>
          </p>
        </div>
      </el-card>

      <aside class="note">
        <h2 class="note-title">批改说明</h2>
        <ul class="note-list">
          <li>只处理评语为空的记录，已批改的不会重跑</li>
          <li>该专题 7 条规则权重合计需为 100</li>
          <li>由 LLM 与沙箱完成，可能耗时较长</li>
          <li>失败记录保持待批改，可再次运行</li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.panel-card {
  width: 100%;
}

.topic-select {
  width: 100%;
}

.submit-btn {
  width: 100%;
  margin-top: 4px;
}

.inline-error {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--el-color-danger);
}

.inline-hint {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--ink-3);
}

.running {
  margin-top: 14px;
  font-size: 13px;
  color: var(--ink-3);
}

.run-result {
  margin-top: 20px;
  padding: 12px 14px;
  border-left: 2px solid var(--el-color-success);
  border-radius: 0 8px 8px 0;
  background: #f7f4ee;
}

.run-result.warn {
  border-left-color: var(--el-color-warning);
}

.run-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
}

.run-desc {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ink-2);
}

.note {
  padding: 4px 0 0 24px;
  border-left: 1px solid var(--line);
}

.note-title {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
}

.note-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.note-list li {
  position: relative;
  padding-left: 14px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ink-3);
}

.note-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #b9ae9e;
}

@media (max-width: 960px) {
  .note {
    margin-top: 8px;
    padding: 20px 0 0;
    border-top: 1px solid var(--line);
    border-left: 0;
  }
}
</style>
