<script setup>
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const formRef = ref(null)

const form = reactive({
  name: '',
  userId: '',
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  userId: [{ required: true, message: '请输入学号', trigger: 'blur' }],
}

const loading = ref(false)

async function handleRegister() {
  // 先让 Element 做校验，校验不过直接 return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const res = await fetch('http://127.0.0.1:8000/user/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        user_id: form.userId,
      }),
    })

    if (res.ok) {
      ElMessage.success('注册成功')
    } else if (res.status === 400) {
      ElMessage.error('该学号已注册')
    } else {
      ElMessage.error(`注册失败（${res.status}）`)
    }
  } catch (e) {
    ElMessage.error('无法连接服务器，请确认后端已启动')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-form
    ref="formRef"
    class="auth-form"
    :model="form"
    :rules="rules"
    label-position="top"
    @submit.prevent="handleRegister"
  >
    <el-form-item label="姓名" prop="name">
      <el-input v-model="form.name" placeholder="输入姓名" clearable />
    </el-form-item>

    <el-form-item label="学号" prop="userId">
      <el-input v-model="form.userId" placeholder="输入学号" clearable />
    </el-form-item>

    <el-button type="primary" class="submit" native-type="submit" :loading="loading">
      注册
    </el-button>
  </el-form>
</template>

<style scoped>
.auth-form {
  padding-top: 4px;
}

.auth-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.submit {
  width: 100%;
  margin-top: 4px;
}
</style>
