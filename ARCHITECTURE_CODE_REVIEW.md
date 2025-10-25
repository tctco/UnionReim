# 报销应用代码评审与架构改进建议

版本：v1.0（针对当前仓库快照）

本文从架构设计、模块边界、代码冗余、一致性、可测试性与性能等方面提出改进建议，并附带可执行的修复清单，帮助团队逐步演进而不破坏现有功能。

---

## 项目概览

- 技术栈：Electron + React(Fluent UI) + TypeScript + better-sqlite3 + pdf-lib + node-canvas。
- 分层：
  - 主进程：`src/main/*`（IPC、服务、数据库、打印/导入导出/水印等）
  - 预加载：`src/preload/*`（ContextBridge 暴露 API）
  - 渲染层：`src/renderer/*`（页面、组件、hooks）
  - 共享：`src/common/*`（类型、常量、工具）
- 数据：SQLite（better-sqlite3，同步 API），本地文件系统作为附件根目录，注册了 `reimbursement://attachments/<rel>` 协议做沙箱内加载。

---

## 架构改进建议

- 统一“服务”生命周期与依赖注入
  - 现状：很多服务互相在构造函数里 new 其他服务（如 `WatermarkService` 同时 new `AttachmentService`、`ProjectService`、`TemplateService`、`SettingsService`），同时 IPC 注册处也在 new 一遍，导致多个实例维护各自状态。
  - 风险：
    - `AttachmentService` 内部持有 `storagePath` 的“快照”，设置变化或迁移后，老实例可能持有过期路径。
    - 重复实例会重复初始化、重复读取设置或磁盘状态。
  - 建议：
    - 建立一个简单的 Service 容器（单例/模块级）统一构造与共享实例；或将服务改为真正的单例（类似 `DatabaseService`）。
    - 将可变配置（如 storagePath）改为读取“权威源”（SettingsService）或通过订阅设置变更来热更新，避免缓存失效。

- 明确模块边界与数据流
  - 主进程：以服务为边界（Template/Project/Attachment/Watermark/Print/ExportImport/Settings），IPC 仅做薄封装。
  - 渲染层：通过 `ContextBridge` 调用 IPC，渲染组件不直接拼装业务逻辑，复用 hooks 封装数据获取与状态。
  - 建议在 `src/main/services` 内补齐“跨服务”用例的组合层（Facade），减少服务之间的横向耦合。

- 单一事实来源（Single Source of Truth）
  - 水印默认值存在两处且不一致：
    - `src/common/constants.ts:23` 的 `DEFAULT_WATERMARK_SETTINGS`（fontSize=96）
    - `src/main/services/SettingsService.ts:26` 初始化默认设置（fontSize=48）
  - 建议：只保留一个默认配置（放在 `common/constants.ts`），SettingsService 初始化从此处读入；WatermarkService 合并配置时不再引入第二套默认，保证 UI/主进程/后端逻辑一致。

---

## 领域模型与数据层

- 数据库与迁移
  - `DatabaseService` 已采用单例，默认开启外键，良好。
  - 迁移体系目前仅有 v1 示例，建议：
    - 引入“显式 schema 版本号 + 迁移脚本数组”的结构，避免散落 try/catch。
    - 为关键字段新增索引（已对常用外键建立索引，基本 OK）。

- SQL 构造
  - 大多数使用参数化语句，风险较低。
  - `ProjectService.listProjects` 里按需拼接 WHERE，已参数化，无需变更。

- 文件系统组织
  - 路径组织清晰（project/items/{original,watermarked}/）。
  - 建议在 `AttachmentService` 内增设“路径提供器”（或常量化路径片段），集中拼接逻辑，降低硬编码重复。

---

## IPC 与安全

- IPC 响应封装
  - `src/main/ipc/ipcUtils.ts:1` 的 `respond` 统一响应形状，简洁稳健，推荐继续保持。

- 参数校验与白名单
  - 上传入口：
    - `handlers.ts` 里 `attachment:upload` 调用文件对话框时使用 `ALLOWED_ATTACHMENT_EXTS` 过滤（较好）。
    - 但 `attachment:uploadFromPaths` / `attachment:uploadFromData` 未做白名单校验，可能绕过扩展名限制，建议在服务层再次校验：
      - `src/main/services/AttachmentService.ts` 增加入参校验（扩展名/大小/类型），并在 IPC 入口也做一次轻量校验。

- 自定义协议安全
  - `src/main/index.ts:49` 起对 `reimbursement://attachments/<rel>` 做了路径归一化与前缀校验，能有效防止目录穿越，良好。

- 依赖缓存
  - `fonts:list` 每次拉取系统字体，成本较高，建议：
    - 在主进程缓存一次，监听“设置变化”或“显式刷新”再更新；或在渲染层引入简短 TTL 缓存。

---

## 服务层设计细节

- AttachmentService
  - 正面：
    - 文件名清洗与去重（`sanitizeFileNameBase`/递增后缀）较完善；
    - 删除附件会回退 `project_items.status` 到 `pending`，业务闭环较好；
    - 存储迁移 `migrateStorage` 支持“尝试重命名，否则递归复制”，异常可控。
  - 改进：
    - 将 `storagePath` 从构造快照改为“按需读取 + 缓存 + 监听设置变更”模型，避免多个实例状态不一致。
    - `uploadFromData` 的 MIME 推断到扩展名映射有限，可适度扩充或在 `constants` 中集中维护。

- WatermarkService
  - 仅支持图片类型（jpg/png），当前满足最小可用；
  - 可以考虑：
    - 读取 EXIF 方向并矫正；
    - 文字描边/阴影、重复平铺、边界留白；
    - PDF 水印（pdf-lib 合成）后续版本按需加入。

- PrintService
  - 当前按 A4 等比缩放、页边距 20pt，逻辑清晰；
  - 改进点：
    - PDF 附件仅取第一页，可选项：允许“全部页”或“指定页”。
    - 输出路径返回相对路径（`project_id/print/xxx.pdf`），渲染层再经 `reimbursement://` 协议加载，这个设计很好；建议在返回结构中显式标注 `relativePath` 字段，便于扩展其它元数据。

- ExportImportService
  - 清晰的 manifest 结构，导入时按名称匹配/冲突重命名；
  - 改进：
    - 导出/导入统一清理临时文件（某些路径在异常分支可能残留）。

---

## 渲染层与状态管理

- `ContextBridge` 类型完备（`src/common/ContextBridge.ts:1`），API 命名一致。
- 建议：
  - 将 `useAsync`/`useProjects`/`useAttachments` 合并复用更一致的“数据 + loading + error”返回形态；或引入 React Query 统一缓存与失效策略。
  - 统一错误提示与重试（`toastHelpers.tsx` 已有基础能力）。
  - 将打印预览页的加载状态与“确认打印”动作解耦：当前 `PrintPreviewPage.tsx` 请求生成 PDF 后展示 `<embed>`，可以加入“重生成/打开系统打印对话框”的显著入口与失败重试。

---

## 一致性与本地化

- 文案混用中英：见 `src/main/services/TemplateService.ts:172, 190` 的中文错误提示与其它位置英文提示混用。
- 建议：
  - 建立简单的 i18n 层（键值 + 当前语言设置）；
  - 所有错误/提示语走同一套字典。

---

## 代码冗余与可维护性

- 重复/过时引用
  - `src/main/index.ts:5` 引入了 `@common/constants` 的 `DEFAULT_STORAGE_SUBPATH`，但 `src/common/constants.ts` 未导出该常量，且当前文件内也未使用。
  - 建议：删除该 import；如需要子路径常量，请在 `constants.ts` 明确定义来源并统一使用。

- 默认值重复定义
  - 同一配置在多个位置定义默认值（见水印配置），应合并为单一来源。

- 路径/扩展名/正则散落
  - 多处出现“安全化文件名/相对路径拼接/扩展名判断”的重复逻辑，建议抽到 `src/common/constants.ts` 或 `src/common/utils/*`。

---

## 性能与资源

- 字体列表缓存（见上）。
- 生成/合成 PDF：对大文件或大量图片，主线程 CPU 占用较高，可考虑：
  - 分批处理与进度反馈；
  - 使用 worker 线程（Node.js Worker）处理合成再回传。

---

## 测试与工具链

- 配置已包含 Vitest 与 eslint/prettier 脚本，但仓库内暂未见到单测。
- 建议优先为以下模块补充单元测试：
  - `src/common/urlHelpers.ts`（协议地址生成与边界情况）
  - `src/main/index.ts` 的协议处理（路径穿越防护）
  - `AttachmentService` 的文件名清洗、去重、迁移逻辑
  - `TemplateService` 的克隆/安全删除判定
  - `PrintService` 的页面尺寸与缩放计算

---

## 快速可执行修复清单

1) 统一水印默认值
- 在 `src/common/constants.ts:17` 保留唯一 `DEFAULT_WATERMARK_SETTINGS`，将 `src/main/services/SettingsService.ts:26` 的默认水印字段改为引用该常量。
- 在 `WatermarkService` 合并配置时仅依赖 Settings + 常量，不再二次定义默认值。

2) 移除无效 import
- 删除 `src/main/index.ts:5` 对 `DEFAULT_STORAGE_SUBPATH` 的引入。

3) 加强类型与白名单校验
- 在 `AttachmentService.uploadAttachment*` 内统一检查扩展名是否属于 `ALLOWED_ATTACHMENT_EXTS`；对 `uploadFromData` 的 `mime` 做更完备映射，并在 `constants` 集中定义。

4) Service 实例化策略
- 新增简单的 `services/index.ts` 导出共享单例：`export const services = { settings, attachment, ... }`；
- `handlers.ts` 与服务之间不再相互 new，全部复用共享实例；
- `AttachmentService` 的 `storagePath` 改为按需读取 `SettingsService.getDefaultStoragePath()`，或订阅 `settings:changed` 事件更新内部缓存。

5) 文案与 i18n
- 抽取错误文本到字典，并根据 `AppSettings.language` 返回对应语言。

6) 字体缓存
- 主进程缓存 `fonts:list` 结果，设置一个合理刷新入口或 TTL。

---

## 潜在问题清单（建议排期修复）

- `src/main/index.ts:5` 引入未导出的符号，可能导致构建失败（具体取决于构建配置是否严格类型检查）。
- 设置变更后的旧 `AttachmentService` 实例依旧使用旧 `storagePath`，可能导致“文件找不到/写入到旧目录”。
- `ExportImportService` 在异常情况下的临时目录未清理。
- 打印合成时对大型图片内存占用较高，建议压缩或分块处理。
- 文案中英混用，影响可读性与一致性。

---

## 参考文件位置

- 协议注册与路径校验：`src/main/index.ts:49`
- IPC 统一响应封装：`src/main/ipc/ipcUtils.ts:1`
- 默认常量：`src/common/constants.ts:1`
- 上下文桥类型：`src/common/ContextBridge.ts:1`
- 水印逻辑：`src/main/services/WatermarkService.ts:1`
- 打印逻辑：`src/main/services/PrintService.ts:1`
- 附件服务：`src/main/services/AttachmentService.ts:1`
- 模板服务：`src/main/services/TemplateService.ts:1`
- 项目服务：`src/main/services/ProjectService.ts:1`
- 打印预览页：`src/renderer/pages/PrintPreviewPage.tsx:1`

---

以上建议按“低风险/高收益”优先级编排，先做无侵入的一致性修复与白名单校验，再推进服务实例化策略与缓存优化；最后再评估 PDF 水印、i18n 与异步合成的投入产出。

---

## 前端模块改进建议（Renderer）

- 状态与数据获取
  - 统一异步数据返回形态：所有 hooks 返回 `{ data, loading, error, refresh }`，便于页面解构复用。
    - 参考现有 `src/renderer/hooks/useAsync.ts:1`，抽象出基础 `useAsyncQuery(fn, deps)` 并让 `useProjects`、`useTemplates`、`useAttachments` 基于它实现。
  - 引入轻量数据缓存：可用 React Query 替代自研缓存，统一失效策略/并发去重/错误重试；若暂不引入依赖，也应在 hooks 内做简单缓存与失效。
  - 渲染层 API 封装：在 `src/renderer/utils/` 新增 `apiClient.ts`，对 `window.ContextBridge` 的 `ApiResponse<T>` 统一做成功/失败拆箱，避免在各页面手写 `resp.success ? resp.data : toast`。

- 路由与导航
  - 按路由代码分割：`src/renderer/App.tsx:1` 路由较多，建议对页面级组件使用 `React.lazy` + `Suspense` 懒加载，减小首屏包。
  - 错误边界与空白态：在路由外层添加 `ErrorBoundary` 与全局 `Suspense` Fallback，避免白屏。
  - 面包屑与标题：`src/renderer/components/Layout/Breadcrumb.tsx:1` 可从路由 meta 或集中配置生成，减少页面手写。

- 组件结构与复用
  - 容器/展示分离：页面（Page）只编排数据与动作，UI 细节拆分至 `components/*`，利于复用与单测。
  - 表格/列表虚拟化：`src/renderer/pages/ProjectListPage.tsx:1` 在数据可能较多时，考虑虚拟滚动（如 react-virtualized/virtuoso）。
  - 输入节流与去抖：列表页的搜索框做 300ms 去抖，减少 IPC 频率。

- 性能优化
  - Memo/Callback：对频繁渲染的卡片与行组件（如 `src/renderer/components/Project/ProjectItemCard.tsx:1`）加 `React.memo`、稳定的 `key` 与 `useCallback`，减少重渲染。
  - 资源懒加载：图片/预览在可视区域内再加载；对大图可以按容器尺寸生成缩略图后再点开查看原图。
  - CSS 层面：统一通过 Fluent tokens 定义间距/颜色，减少内联 style，提升样式缓存命中。

- 可访问性与交互
  - 键盘可达性：为主要交互（上传、删除、预览、打印）提供可聚焦元素与 `Enter/Space` 行为；`aria-label` 明确操作含义。
  - 焦点管理：对弹窗（如 `src/renderer/components/Common/ConfirmDialog.tsx:1`、`src/renderer/components/Watermark/WatermarkApplyDialog.tsx:1`）开启初始焦点与 Esc 关闭，关闭后将焦点还原到触发元素。
  - 文案与本地化：前端提示语统一走 i18n 字典，与主进程保持键一致。

- 错误处理与健壮性
  - 全局通知约定：`src/renderer/utils/toastHelpers.tsx:1` 统一入口，页面/组件仅抛出业务错误，由上层捕获并 toast，避免重复文案。
  - API 拆箱错误：`apiClient` 将 `ApiResponse` 的错误转换为异常或标准错误对象，配合 `useAsyncQuery` 统一处理。
  - 错误边界：在 `src/renderer/App.tsx:1` 顶层包裹 ErrorBoundary，防止单页错误影响全局。

- 表单与校验
  - 表单库：建议使用 React Hook Form 管理如 `src/renderer/components/Project/NewProjectMetadataForm.tsx:1` 的表单，结合 Zod 校验 schema，保证类型与错误提示一致。
  - 字段组件化：抽出通用的 `TextField`, `SelectField`, `DateRangeField` 等，减少重复粘贴。

- 预览与打印体验
  - 打印预览：`src/renderer/pages/PrintPreviewPage.tsx:1` 当前用 `<embed>`，建议：
    - 增加“重新生成”“打开系统打印对话框”“在外部打开”按钮组合；
    - `<embed>` 加载失败 fallback（展示下载链接与错误信息）。
  - 附件悬浮预览：`src/renderer/components/Preview/AttachmentHoverPreview.tsx:1` 限制最大尺寸，支持键盘触发与关闭。
  - 拖拽上传：在 `src/renderer/components/Common/FileUploader.tsx:1` 支持 DnD，展示拖拽高亮区域与可接受类型提示。

- 工具与一致性
  - ESLint/Prettier 约束：升级/启用针对 React Hooks 的规则并修复依赖列表；启用 `@typescript-eslint/consistent-type-imports` 保持导入风格一致。
  - 类型边界：渲染层类型只来自 `@common/types`，组件内避免 `any` 与重复定义。
  - 主题一致性：`src/renderer/App.tsx:1` 已随设置切换主题，建议在组件中尽量通过 Fluent tokens 而非硬编码颜色。

### 前端快速修复清单

1) 新增 `apiClient.ts`（统一拆箱与错误处理），改造现有页面将 `resp.success` 判断移除为 `try/catch`。
2) 将页面组件懒加载：`const ProjectListPage = lazy(() => import('...'));` 并在 `App.tsx` 外包一层 `Suspense` 与 `ErrorBoundary`。
3) 抽象 `useAsyncQuery`，`useProjects/useTemplates/useAttachments` 全部迁移到统一形态。
4) 为 `PrintPreviewPage.tsx:1` 增加失败 fallback 与“确认打印”按钮区。
5) 给 `FileUploader.tsx:1` 增加 DnD 支持与类型提示；输入框搜索加 300ms 去抖。
6) 对高频渲染组件加 `React.memo` 与稳定 `key`；列表过万行时引入虚拟化。
