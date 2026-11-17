# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
npm install      # 安装依赖
npm run dev      # 启动 Vite 开发服务器（通常是 http://localhost:5173）
npm run build    # 生产构建，输出到 dist/
npm run preview  # 预览生产构建
```

项目没有配置测试、lint 或格式化工具。`package.json` 要求 Node `^22.18.0 || >=24.12.0`。

后端需要单独运行在 `http://127.0.0.1:8000`（FastAPI 项目位于 `D:\projects\marking-agent`）。后端未启动时，所有页面都会显示加载失败。

## 架构

技术栈是 Vue 3 单文件组件 + Vite + Element Plus。项目**没有 vue-router、没有 Pinia/Vuex、也没有 axios**，不要假设它们存在。

- `src/main.js` 创建应用并全局注册 Element Plus（所有组件和 `ElMessage` 可直接使用，无需逐个引入组件），同时加载中文 locale 和 `src/styles/theme.css`。
- `src/App.vue` 是登录门禁：`localStorage.token` 存在时渲染 `src/views/Main.vue`，否则渲染左侧品牌说明 + 右侧登录/注册 Tab 的认证页。
- `src/views/Main.vue` 是应用外壳：左侧是自定义侧栏（`navGroups` 数据 + 内联 SVG 图标）驱动 `currentPage` ref，右侧内容区是一串基于该 ref 的 `v-if` / `v-else-if`，外面套一层页面切换过渡。**新增页面 = 加一个 import、一个导航项、一个 `v-else-if` 分支，而不是加路由。**
- `src/views/functions/*.vue` 是各自独立的功能页。每个页面自己发 `fetch`，维护 `page` / `size` / `list` / `total` 等 ref，在 `onMounted` 中加载，用 `ElMessage` 反馈结果。项目没有统一的 API 客户端，`http://127.0.0.1:8000` 这个 base URL 在每个组件里重复硬编码。

### 认证与角色

- 登录（`src/views/Login.vue`）以 form-urlencoded 方式 POST `username` / `password` 到 `/user/login`，把 `access_token` 存为 `token`、把**密码**存为 `user_id`，然后刷新页面。这个"密码当 user_id"是已知的临时做法，`Main.vue` 正是用它判断 `isTeacher`（`user_id === '1'`）。不要随意"修正"它，它直接决定菜单是否可见。
- 注册以 JSON `{name, user_id}` POST 到 `/user/register`。
- 所有 `/marking/*` 和 `/agent/*` 请求都带 `Authorization: Bearer <token>`。
- 仅教师可见的导航：文档、源代码、专题、评分规则、一键批改、批改结果。上传作业对所有登录用户可见。

## 后端接口契约（FastAPI，项目 `D:\projects\marking-agent`）

接口文档在 `http://127.0.0.1:8000/docs`，原始 schema 在 `/openapi.json`。后端使用 SQLite（`app.db`）和 Alembic；表结构或数据修复应通过迁移完成，不要直接改数据库。

- 分页接口（`/marking/get_page_topic`、`/marking/get_page_rule`、`/marking/list_doc`、`/marking/list_code`、`/agent/get_marking_result`）接收 `page` 和 `size`，**`size` 最大为 100**。
- `/marking/get_page_rule` 只返回 7 个顶层 `RuleTypeEnum` 值：`format_error`、`chapter_missing`、`report_code_match`、`ast_error`、`meaning_analysis`、`running_no_result`、`running_result_error`。系统 AST 子规则对教师隐藏。
- `/marking/list_doc`、`/marking/list_code` 的 item 为 `{id, file_name, user_id, student_name, topic_id, created_at, download_url}`，**不再返回** `word_doc` / `source_code` 磁盘路径。
- `/marking/update_rule/{id}` **只接受** `description` 和 `weight`（0–100），`name` 和 `topic_id` 不可修改。`/marking/update_topic/{id}` 接受 `name`、`description`、`total_score`。
- `/marking/insert_rule` 的 `name` 必须是上述枚举值之一（自由文本会被 422 拒绝），另需 `description`、`weight`、`topic_id`。
- Agent 接口：`POST /agent/one_click_marking`，body `{topic_id}` → `{ok, error_count}`（由 LLM 支撑，耗时较长）；`GET /agent/get_marking_result?page&size&topic_id` → `{total, page, size, items[]}`，其中 item 包含 `student_name`、`student_id`、`document_id`、`code_id`、`topic_id`、`llm_comment`。
- 一键批改要求该专题的 7 条规则权重合计为 100 才能执行。

## 约定与注意事项

- 界面文案、注释和提示信息都使用中文；新增用户可见文本继续保持中文。界面里不用感叹号、寒暄式文案和 emoji。
- 列表页结构统一：页面顶部用 `.page-head` / `.page-title`（标题内套 `.sig-underline`）/ `.page-sub`，右侧放操作和 `.count`；表格放在 `el-card` 里，`:body-style="{ padding: '0' }"`，不要 `border` 和 `stripe`；分页放在卡片底部的 `.pager` 里，`layout="prev, pager, next, total"`。
- 表单页用 `.split` 两栏：左侧 `el-card` 放表单，右侧 `.note` 放说明。单页内容宽度由 `Main.vue` 的 `.main-inner` 控制（最大 1280）。
- 行内编辑（`ListTopic.vue`、`ListRule.vue`）每行共用一个 `editingId`：双击单元格进入编辑态，回车或显式 blur 处理函数调用 `saveEdit`。后端会拒绝的值要在前端先校验（例如权重必须在 0–100）。
- Element Plus 的 `el-input` 不识别 `v-model.number` 修饰符，取到的仍是字符串；发送数字字段前要手动 `Number()` 转换。
- 列表页的删除操作直接调用接口，没有确认弹窗。
- 后端和前端是两个独立项目；修改接口行为、规则名或种子数据必须去 `marking-agent` 做（包括新增 Alembic 迁移）。

## 设计系统

全站视觉是「暖纸 + 朱红批注」，**所有颜色、字号、圆角、Element Plus 覆盖都集中在 `src/styles/theme.css`**，不要在组件里另写一套色值。

- 暖纸中性色：页面 `#f7f4ee`、卡片 `#fdfbf7`、抬升面 `#f2ede4`；文字 `#1f1b16` / `#5e554a` / `#7b7266`；发丝线 `rgba(31,27,22,.1)`。
- 强调色是朱红 `#b23a2b`，只用于主按钮、选中态、关键数字和「红笔」细节。不要新增紫色、渐变、发光、彩色阴影或 emoji 图标。
- 页面标题下有一道朱红手写短划线（`.sig-underline`），这是全站唯一的签名细节；批改得分另有同款短线，不要扩散到别处。
- 字体：界面用系统中文字体栈（`--sans`），得分和大数字用衬线栈（`.num-serif`）；小号数字和元信息用 `.mono` / `.count`，保持等宽对齐。
- 图标用内联 lucide 路径（`Main.vue` 的 `ICONS`），统一 16px、1.5 描边、跟随文字颜色；不要引入 emoji 或第二个图标集。
- 动效只保留页面切换的淡入上移（180ms）和控件 160ms 的颜色过渡，统一 `cubic-bezier(0.22,1,0.36,1)`；不要加循环、弹跳或大位移。
- Element Plus 已设 `zh-CN` locale，分页等内置文案保持中文；新增组件不要绕过 `theme.css` 再写一套主色。
