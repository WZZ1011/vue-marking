import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import './styles/theme.css'
import App from './App.vue'

const app = createApp(App)
app.use(ElementPlus, { locale: zhCn })   // 全局注册所有组件，并固定中文文案
app.mount('#app')
