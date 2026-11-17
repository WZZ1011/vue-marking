<script setup>
import { ref } from 'vue'

const documentFile = ref(null)
const sourceCodeFile = ref(null)
const topicId = ref(null)
const message = ref('')
const messageType = ref('error')
const submitting = ref(false)

function onDocChange(uploadFile) {
  documentFile.value = uploadFile.raw
}

function onCodeChange(uploadFile) {
  sourceCodeFile.value = uploadFile.raw
}

async function handleUpload() {
  message.value = ''

  if (!documentFile.value || !sourceCodeFile.value || !topicId.value) {
    message.value = '请选择报告、源码并填写专题 ID'
    messageType.value = 'error'
    return
  }

  submitting.value = true
  try {
    const formData = new FormData()
    formData.append('document', documentFile.value)
    formData.append('source_code', sourceCodeFile.value)
    formData.append('topic_id', topicId.value)

    const res = await fetch('http://127.0.0.1:8000/marking/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    })

    if (res.ok) {
      message.value = '上传成功，已生成一条待批改记录'
      messageType.value = 'success'
    } else if (res.status === 401) {
      message.value = '登录已过期，请重新登录'
      messageType.value = 'error'
    } else {
      message.value = `上传失败（${res.status}），请确认专题存在且文件未重复上传`
      messageType.value = 'error'
    }
  } catch (e) {
    message.value = '上传失败，请检查后端服务'
    messageType.value = 'error'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <div class="page-head">
      <div class="page-head-main">
        <h1 class="page-title"><span class="sig-underline">上传作业</span></h1>
        <p class="page-sub">一份 Word 报告和一份源代码，归入同一个专题</p>
      </div>
    </div>

    <div class="split">
      <el-card class="panel-card">
        <el-form label-position="top" class="upload-form" @submit.prevent>
          <el-form-item label="报告文档">
            <el-upload
              drag
              :auto-upload="false"
              :on-change="onDocChange"
              :limit="1"
              class="dropzone"
            >
              <div class="drop-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M17 8l-5-5-5 5" />
                  <path d="M12 3v12" />
                </svg>
              </div>
              <div class="drop-title">拖入 Word 报告，或点击选择</div>
              <div class="drop-sub">支持 .doc / .docx</div>
            </el-upload>
          </el-form-item>

          <el-form-item label="源代码">
            <el-upload
              drag
              :auto-upload="false"
              :on-change="onCodeChange"
              :limit="1"
              class="dropzone"
            >
              <div class="drop-icon">
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M16 18l6-6-6-6" />
                  <path d="M8 6l-6 6 6 6" />
                </svg>
              </div>
              <div class="drop-title">拖入源码文件，或点击选择</div>
              <div class="drop-sub">提交前请确认与报告属于同一次作业</div>
            </el-upload>
          </el-form-item>

          <el-form-item label="专题 ID">
            <el-input v-model="topicId" type="number" placeholder="例如 1" />
            <p class="field-hint">专题 ID 可在「专题」页查看</p>
          </el-form-item>

          <el-button
            type="primary"
            class="submit-btn"
            :loading="submitting"
            @click="handleUpload"
          >
            上传
          </el-button>

          <div v-if="message" class="status" :class="messageType">
            <span class="status-dot"></span>
            <span>{{ message }}</span>
          </div>
        </el-form>
      </el-card>

      <aside class="note">
        <h2 class="note-title">上传前确认</h2>
        <ul class="note-list">
          <li>报告与源码必须成对上传，缺一不可</li>
          <li>上传后会自动生成一条待批改记录</li>
          <li>同一份文件不要重复上传，系统按内容去重</li>
          <li>专题决定这组作业使用哪套评分规则</li>
        </ul>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.panel-card {
  width: 100%;
}

.upload-form :deep(.el-form-item) {
  margin-bottom: 20px;
}

.upload-form :deep(.el-upload) {
  width: 100%;
}

.dropzone :deep(.el-upload-dragger) {
  width: 100%;
}

.drop-icon {
  color: var(--ink-3);
}

.drop-title {
  margin-top: 10px;
  font-size: 14px;
  color: var(--ink-2);
}

.drop-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ink-3);
}

.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--ink-3);
}

.submit-btn {
  width: 100%;
  margin-top: 4px;
}

.status {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 14px;
  font-size: 13px;
  color: var(--ink-2);
}

.status-dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: var(--ink-3);
  transform: translateY(-1px);
}

.status.success {
  color: var(--el-color-success);
}

.status.success .status-dot {
  background: var(--el-color-success);
}

.status.error {
  color: var(--el-color-danger);
}

.status.error .status-dot {
  background: var(--el-color-danger);
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
