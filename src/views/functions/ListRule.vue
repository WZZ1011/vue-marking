<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const BASE = 'http://127.0.0.1:8000'

const list = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(100)
const topicFilter = ref(null)
const topics = ref([])
const ruleTypes = ref({})
const loading = ref(false)
const message = ref('')
const editingId = ref(null)
const saving = ref(false)

const totalWeight = computed(() =>
  list.value.reduce((sum, item) => sum + (Number(item.weight) || 0), 0),
)

const maxWeightId = computed(() => {
  let max = -1
  let maxId = null
  for (const item of list.value) {
    const weight = Number(item.weight) || 0
    if (weight > max) {
      max = weight
      maxId = item.id
    }
  }
  return maxId
})

const weightSegments = computed(() =>
  list.value
    .filter((item) => Number(item.weight) > 0)
    .map((item) => ({
      id: item.id,
      weight: Number(item.weight),
      label: ruleLabel(item.name),
      color: item.id === maxWeightId.value ? 'var(--accent)' : '#d9d0c2',
    })),
)

const remainingWeight = computed(() => Math.max(0, 100 - totalWeight.value))

const maxWeightLabel = computed(() => {
  const item = list.value.find((rule) => rule.id === maxWeightId.value)
  return item ? ruleLabel(item.name) : '-'
})

function ruleLabel(name) {
  return ruleTypes.value[name]?.label || name
}

function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    ...extra,
  }
}

async function loadRuleTypes() {
  try {
    const res = await fetch(`${BASE}/marking/rule_types`, {
      headers: authHeaders(),
    })
    if (!res.ok) return
    const data = await res.json()
    const map = {}
    for (const item of data.items || []) {
      map[item.value] = { label: item.label, description: item.description }
    }
    ruleTypes.value = map
  } catch (e) {
    // 元数据加载失败时降级为显示原始枚举值
  }
}

async function loadTopics() {
  try {
    // get_page_topic 的 size 上限为 100，循环分页直到取完
    let pageNum = 1
    let topicTotal = 0
    for (let i = 0; i < 10; i++) {
      const res = await fetch(`${BASE}/marking/get_page_topic`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ page: pageNum, size: 100 }),
      })
      if (!res.ok) return

      const data = await res.json()
      topicTotal = data.total || 0
      const items = data.items || []
      topics.value.push(...items)

      if (!items.length || topics.value.length >= topicTotal) break
      pageNum += 1
    }
  } catch (e) {
    // 专题筛选加载失败不影响规则列表
  }
}

async function loadList() {
  loading.value = true
  message.value = ''

  const payload = { page: page.value, size: size.value }
  if (topicFilter.value !== null && topicFilter.value !== undefined && topicFilter.value !== '') {
    payload.topic_id = topicFilter.value
  }

  try {
    const res = await fetch(`${BASE}/marking/get_page_rule`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
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

// 拉取该专题的全部规则，计算「本条改为 newWeight 后」的权重合计
async function topicWeightSum(topicId, exceptId, newWeight) {
  const res = await fetch(`${BASE}/marking/get_page_rule`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ page: 1, size: 100, topic_id: topicId }),
  })
  if (!res.ok) return null

  const data = await res.json()
  let sum = 0
  for (const item of data.items || []) {
    sum += item.id === exceptId ? newWeight : Number(item.weight) || 0
  }
  return sum
}

async function saveEdit(item, field) {
  // 回车保存后输入框卸载会再触发一次 blur，这里挡住重复提交
  if (editingId.value !== item.id || saving.value) return

  saving.value = true
  try {
    if (field === 'weight') {
      const weight = Number(item.weight)
      if (!Number.isInteger(weight) || weight < 0 || weight > 100) {
        ElMessage.warning('权重需为 0-100 的整数')
        return
      }

      const sum = await topicWeightSum(item.topic_id, item.id, weight)
      if (sum === null) {
        ElMessage.error('校验权重失败，请稍后重试')
        return
      }
      if (sum > 100) {
        ElMessage.warning(`该专题权重合计不能超过 100，当前为 ${sum}`)
        return
      }
      item.weight = weight
    }

    // 校验通过后退出编辑态，避免保存过程中 blur 再次触发
    editingId.value = null

    const res = await fetch(`${BASE}/marking/update_rule/${item.id}`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        [field]: item[field],
      }),
    })

    if (res.ok) {
      ElMessage.success('修改成功')
    } else {
      ElMessage.error(res.status === 401 ? '登录已过期，请重新登录' : '修改失败')
      await loadList()
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadRuleTypes()
  loadTopics()
  loadList()
})
</script>

<template>
  <div>
    <div class="page-head">
      <div class="page-head-main">
        <h1 class="page-title"><span class="sig-underline">评分规则</span></h1>
        <p class="page-sub">每个专题固定 7 条规则，权重合计不超过 100 · 双击描述或权重修改</p>
      </div>
      <div class="head-actions">
        <el-select
          v-model="topicFilter"
          filterable
          clearable
          placeholder="全部专题"
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

    <el-card class="table-card" :body-style="{ padding: '0' }">
      <div v-if="topicFilter !== null && list.length" class="weight-panel">
        <div class="weight-panel-head">
          <span class="weight-panel-title">权重配比</span>
          <span class="count">{{ totalWeight }} / 100</span>
        </div>
        <div class="weight-bar">
          <span
            v-for="seg in weightSegments"
            :key="seg.id"
            class="weight-seg"
            :style="{ flexGrow: seg.weight, background: seg.color }"
            :title="`${seg.label} ${seg.weight}`"
          />
          <span
            class="weight-seg weight-seg-empty"
            :style="{ flexGrow: remainingWeight }"
          />
        </div>
        <div class="weight-note">
          <template v-if="totalWeight === 100">
            合计 100，权重最大的规则是 {{ maxWeightLabel }}
          </template>
          <template v-else>
            合计需为 100 才能开始批改，当前还差 {{ remainingWeight }}
          </template>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="list"
        empty-text="这个专题还没有规则"
        style="width: 100%"
      >
        <el-table-column label="规则ID" width="86">
          <template #default="{ row }">
            <span class="mono">{{ row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column label="名称" width="180">
          <template #default="{ row }">
            <el-tooltip
              v-if="ruleTypes[row.name]"
              :content="ruleTypes[row.name].description"
              placement="top"
            >
              <span>{{ ruleTypes[row.name].label }}</span>
            </el-tooltip>
            <span v-else>{{ row.name }}</span>
          </template>
        </el-table-column>

        <el-table-column label="描述" min-width="300" show-overflow-tooltip>
          <template #default="{ row }">
            <el-input
              v-if="editingId === row.id"
              v-model="row.description"
              @keyup.enter="saveEdit(row, 'description')"
              @blur="saveEdit(row, 'description')"
            />
            <span v-else class="editable" @dblclick="editingId = row.id">
              {{ row.description }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="权重" width="140">
          <template #default="{ row }">
            <el-input
              v-if="editingId === row.id"
              v-model="row.weight"
              type="number"
              min="0"
              max="100"
              step="1"
              @keyup.enter="saveEdit(row, 'weight')"
              @blur="saveEdit(row, 'weight')"
            />
            <span v-else class="weight-cell" @dblclick="editingId = row.id">
              <span class="weight-num">{{ row.weight }}</span>
              <span class="weight-mini">
                <span
                  class="weight-mini-fill"
                  :style="{ width: `${Math.min(100, Number(row.weight) || 0)}%` }"
                />
              </span>
            </span>
          </template>
        </el-table-column>

        <el-table-column label="专题" width="90">
          <template #default="{ row }">
            <span class="mono">#{{ row.topic_id }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
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

.table-card {
  width: 100%;
}

.inline-error {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-color-danger);
}

.weight-panel {
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--line);
}

.weight-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.weight-panel-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
}

.weight-bar {
  display: flex;
  gap: 2px;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: #eee9e0;
}

.weight-seg {
  height: 100%;
  min-width: 0;
}

.weight-seg-empty {
  background: transparent;
}

.weight-note {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ink-3);
}

.editable {
  display: inline-block;
  min-width: 40px;
  border-bottom: 1px dashed transparent;
  cursor: text;
  transition: border-color 0.16s var(--ease);
}

.editable:hover {
  border-bottom-color: var(--line-strong);
}

.weight-cell {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: text;
}

.weight-num {
  min-width: 22px;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}

.weight-mini {
  width: 48px;
  height: 4px;
  border-radius: 2px;
  background: #eee9e0;
  overflow: hidden;
}

.weight-mini-fill {
  display: block;
  height: 100%;
  background: #c9c0b2;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid var(--line);
}
</style>
