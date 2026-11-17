<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const list = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const message = ref('')
const loading = ref(false)

async function loadList() {
  loading.value = true
  message.value = ''

  try {
    const res = await fetch('http://127.0.0.1:8000/marking/list_code', {
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

async function download(row) {
  const res = await fetch(`http://127.0.0.1:8000/marking/download_code/${row.id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  })

  if (!res.ok) {
    ElMessage.error(`下载失败（${res.status}）`)
    return
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = row.file_name || '源码'
  a.click()
  URL.revokeObjectURL(url)
}

async function del(id) {
  const res = await fetch('http://127.0.0.1:8000/marking/delete_code', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code_id: id,
    }),
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

// 后端返回 ISO 时间（如 2026-11-17T09:33:00），去掉 T 便于阅读
function formatTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

onMounted(loadList)
</script>

<template>
  <div>
    <div class="page-head">
      <div class="page-head-main">
        <h1 class="page-title"><span class="sig-underline">源代码</span></h1>
        <p class="page-sub">已上传的源码文件，按上传时间倒序</p>
      </div>
      <span class="count">{{ total }} 份</span>
    </div>

    <p v-if="message" class="inline-error">{{ message }}</p>

    <el-card class="table-card" :body-style="{ padding: '0' }">
      <el-table
        v-loading="loading"
        :data="list"
        empty-text="还没有上传的源代码"
        style="width: 100%"
      >
        <el-table-column label="ID" width="72">
          <template #default="{ row }">
            <span class="mono">{{ row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column label="文件名" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">{{ row.file_name || '-' }}</template>
        </el-table-column>

        <el-table-column label="学生姓名" width="120">
          <template #default="{ row }">{{ row.student_name || '-' }}</template>
        </el-table-column>

        <el-table-column label="学生ID" width="110">
          <template #default="{ row }">
            <span class="mono">{{ row.user_id }}</span>
          </template>
        </el-table-column>

        <el-table-column label="专题" width="90">
          <template #default="{ row }">
            <span class="mono">#{{ row.topic_id }}</span>
          </template>
        </el-table-column>

        <el-table-column label="上传时间" width="180">
          <template #default="{ row }">
            <span class="mono">{{ formatTime(row.created_at) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="140" align="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="download(row)">下载</el-button>
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
  </div>
</template>

<style scoped>
.table-card {
  width: 100%;
}

.inline-error {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-color-danger);
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding: 14px 20px;
  border-top: 1px solid var(--line);
}
</style>
