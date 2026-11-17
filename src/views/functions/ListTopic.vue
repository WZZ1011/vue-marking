<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const list = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const message = ref('')
const loading = ref(false)

const showAdd = ref(false)
const adding = ref(false)
const form = ref({
  name: '',
  description: '',
  total_score: 100,
})

const editingId = ref(null)
const saving = ref(false)

async function loadList() {
  loading.value = true
  message.value = ''

  try {
    const res = await fetch('http://127.0.0.1:8000/marking/get_page_topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        page: page.value,
        size: size.value,
      }),
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

async function del(id) {
  const res = await fetch('http://127.0.0.1:8000/marking/delete_topic', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic_id: id }),
  })

  if (res.ok) {
    ElMessage.success('删除成功')
    list.value = list.value.filter((item) => item.id !== id)
    total.value -= 1
    if (!list.value.length && page.value > 1) {
      page.value -= 1
      await loadList()
    }
  } else {
    ElMessage.error('删除失败')
  }
}

function openAdd() {
  form.value = { name: '', description: '', total_score: 100 }
  showAdd.value = true
}

async function submitAdd() {
  if (!form.value.name.trim()) {
    ElMessage.warning('名称不能为空')
    return
  }

  const totalScore = Number(form.value.total_score)
  if (!Number.isInteger(totalScore) || totalScore <= 0) {
    ElMessage.warning('总分必须为大于 0 的整数')
    return
  }

  adding.value = true
  try {
    const res = await fetch('http://127.0.0.1:8000/marking/insert_topic', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: form.value.name.trim(),
        description: form.value.description,
        total_score: totalScore,
      }),
    })

    if (res.ok) {
      ElMessage.success('新增成功')
      showAdd.value = false
      await loadList()
    } else {
      ElMessage.error(res.status === 401 ? '登录已过期，请重新登录' : '新增失败')
    }
  } catch (e) {
    ElMessage.error('新增失败，请检查后端服务')
  } finally {
    adding.value = false
  }
}

async function saveEdit(item, field) {
  // 回车保存后输入框卸载会再触发一次 blur，这里挡住重复提交
  if (editingId.value !== item.id || saving.value) return

  if (field === 'name' && !String(item.name || '').trim()) {
    ElMessage.warning('名称不能为空')
    return
  }

  if (field === 'total_score') {
    const value = Number(item.total_score)
    if (!Number.isInteger(value) || value <= 0) {
      ElMessage.warning('总分必须为大于 0 的整数')
      return
    }
    item.total_score = value
  }

  saving.value = true
  editingId.value = null

  try {
    const res = await fetch(`http://127.0.0.1:8000/marking/update_topic/${item.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        [field]: field === 'name' ? String(item[field]).trim() : item[field],
      }),
    })

    if (res.ok) {
      ElMessage.success('修改成功')
    } else {
      ElMessage.error(res.status === 401 ? '登录已过期，请重新登录' : '修改失败')
      await loadList()
    }
  } catch (e) {
    ElMessage.error('修改失败，请检查后端服务')
    await loadList()
  } finally {
    saving.value = false
  }
}

onMounted(loadList)
</script>

<template>
  <div>
    <div class="page-head">
      <div class="page-head-main">
        <h1 class="page-title"><span class="sig-underline">专题</span></h1>
        <p class="page-sub">每个专题对应一组评分规则和一批作业 · 双击单元格修改</p>
      </div>
      <div class="head-actions">
        <span class="count">{{ total }} 个</span>
        <el-button type="primary" @click="openAdd">新增专题</el-button>
      </div>
    </div>

    <p v-if="message" class="inline-error">{{ message }}</p>

    <el-card class="table-card" :body-style="{ padding: '0' }">
      <el-table
        v-loading="loading"
        :data="list"
        empty-text="还没有专题，先新增一个"
        style="width: 100%"
      >
        <el-table-column label="ID" width="72">
          <template #default="{ row }">
            <span class="mono">{{ row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column label="名称" min-width="180">
          <template #default="{ row }">
            <el-input
              v-if="editingId === row.id"
              v-model="row.name"
              @keyup.enter="saveEdit(row, 'name')"
              @blur="saveEdit(row, 'name')"
            />
            <span v-else class="editable" @dblclick="editingId = row.id">
              {{ row.name }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="描述" min-width="280" show-overflow-tooltip>
          <template #default="{ row }">
            <el-input
              v-if="editingId === row.id"
              v-model="row.description"
              @keyup.enter="saveEdit(row, 'description')"
              @blur="saveEdit(row, 'description')"
            />
            <span v-else class="editable" @dblclick="editingId = row.id">
              {{ row.description || '-' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="总分" width="120">
          <template #default="{ row }">
            <el-input
              v-if="editingId === row.id"
              v-model="row.total_score"
              type="number"
              min="1"
              step="1"
              @keyup.enter="saveEdit(row, 'total_score')"
              @blur="saveEdit(row, 'total_score')"
            />
            <span v-else class="editable num-serif" @dblclick="editingId = row.id">
              {{ row.total_score }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" align="right">
          <template #default="{ row }">
            <el-button link type="danger" @click="del(row.id)">删除</el-button>
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

    <el-dialog v-model="showAdd" title="新增专题" width="480px">
      <el-form :model="form" label-position="top">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="例如 数据结构课程设计" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="这套作业的说明，可留空"
          />
        </el-form-item>
        <el-form-item label="总分">
          <el-input v-model="form.total_score" type="number" min="1" step="1" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAdd = false">取消</el-button>
        <el-button type="primary" :loading="adding" @click="submitAdd">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.head-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.table-card {
  width: 100%;
}

.inline-error {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-color-danger);
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

.pager {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid var(--line);
}

:deep(.el-dialog__body) {
  padding-top: 8px;
}

:deep(.el-dialog .el-form-item) {
  margin-bottom: 18px;
}
</style>
