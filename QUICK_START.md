# Quick Start Guide - 报销材料辅助软件

## 项目状态

✅ **项目已完成！** 所有阶段 1-3 的功能已实现。

## 技术栈

- **前端**: React 18 + FluentUI v9
- **后端**: Electron 37
- **数据库**: better-sqlite3
- **PDF 处理**: pdf-lib
- **图片处理**: canvas
- **打包**: adm-zip

## 快速开始

### 1. 开发模式运行

```bash
npm run dev
```

应用将启动并自动打开窗口。

### 2. 构建生产版本

```bash
npm run build
```

### 3. 打包应用

```bash
npm run package
```

这将创建适用于您平台的可执行文件。

## 主要功能

### ✅ 已完成功能（阶段 1-3）

1. **模板管理**
   - 创建、编辑、删除、克隆模板
   - 定义模板条目（必填项、文件类型、水印设置等）

2. **项目管理**
   - 基于模板创建项目
   - 填写项目元信息
   - 自动生成项目条目

3. **文件上传和管理**
   - 支持 PDF、JPG、PNG、OFD 格式
   - 文件预览（图片和 PDF）
   - OFD 文件使用系统默认程序打开
   - 多文件上传支持

4. **水印处理**
   - 自动对图片和 PDF 应用水印
   - 支持模板变量：`{userName}`, `{itemName}`, `{projectName}`, `{date}`
   - 水印版本单独存储

5. **项目预览**
   - 查看所有项目材料
   - 显示项目元信息和文件状态

6. **导入/导出**
   - 将项目导出为 ZIP 包
   - 从 ZIP 包导入项目
   - 包含所有文件和元数据

## 使用流程

### 第一步：创建模板

1. 进入 **Templates** 标签页
2. 点击 **New Template**
3. 添加模板条目，配置各项属性
4. 保存模板

### 第二步：创建项目

1. 进入 **Projects** 标签页
2. 点击 **New Project**
3. 选择一个模板
4. 填写项目信息
5. 创建项目

### 第三步：上传文件

1. 打开项目
2. 对每个条目点击 **Upload** 上传文件
3. 对需要水印的文件，点击水印图标应用水印

### 第四步：预览和导出

1. 点击 **Preview** 查看所有材料
2. 点击 **Export Project** 导出为 ZIP 包

## 项目结构

```
src/
├── main/              # Electron 主进程
│   ├── database/     # 数据库服务
│   ├── services/     # 业务逻辑服务
│   ├── ipc/         # IPC 通信处理
│   └── index.ts     # 主入口
├── preload/         # 预加载脚本
├── renderer/        # React 前端
│   ├── components/  # React 组件
│   ├── pages/       # 页面组件
│   ├── hooks/       # 自定义 Hooks
│   └── App.tsx      # 主应用组件
└── common/          # 共享类型定义
```

## 数据存储

### 数据库位置
- **Windows**: `%APPDATA%/electron-fluent-ui/reimbursement.db`
- **macOS**: `~/Library/Application Support/electron-fluent-ui/reimbursement.db`
- **Linux**: `~/.config/electron-fluent-ui/reimbursement.db`

### 文件存储结构
```
storage/
└── projects/
    └── <project_id>/
        ├── items/
        │   └── <item_id>/
        │       ├── original/     # 原始文件
        │       └── watermarked/  # 水印文件
        └── export/              # 导出的 ZIP 包
```

## 开发命令

```bash
# 开发模式
npm run dev

# 类型检查
npm run typecheck

# 代码检查
npm run lint

# 代码格式化
npm run prettier:write

# 测试
npm test

# 构建
npm run build

# 打包
npm run package
```

## 常见问题

### Q: Canvas 编译错误
A: Canvas 是原生模块，需要重新构建：
```bash
npm rebuild canvas --update-binary
```

### Q: 水印不工作
A: 确保：
1. 模板条目启用了"需要水印"选项
2. 配置了水印模板文本
3. 文件格式是 JPG、PNG 或 PDF

### Q: 导入失败
A: 确认：
1. ZIP 文件格式正确
2. manifest.json 存在且有效
3. 文件路径正确

## 文档

- **English Documentation**: [README_EN.md](./README_EN.md)
- **User Guide**: [USAGE.md](./USAGE.md)
- **中文需求文档**: [README.md](./README.md)

## 下一步扩展（可选）

- [ ] **阶段 4**: 打印功能
- [ ] **阶段 5**: 模板市场、多用户协作
- [ ] OCR 发票识别
- [ ] 云同步和备份
- [ ] PDF 合并功能
- [ ] 自定义主题

## 技术支持

如有问题，请查看：
1. [USAGE.md](./USAGE.md) 用户指南
2. [README_EN.md](./README_EN.md) 技术文档
3. 项目 Issues

---

🎉 **项目已完成并可以使用！** 运行 `npm run dev` 开始体验。


