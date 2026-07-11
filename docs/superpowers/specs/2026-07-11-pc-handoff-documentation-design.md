# PC 迁移与 Codex 交接文档设计

日期：2026-07-11

## 背景

项目将转移到另一台 PC，并继续使用 Codex 开发。原本地目录位于包含多个项目的父 Git 仓库中，远程指向其他项目，不能作为可靠迁移来源。GitHub 仓库 `terrylyl/little-english-quest` 已由用户手动更新，是本次工作的最新事实来源。

## 目标

- 使用 GitHub `main` 分支建立独立、干净的本地开发目录。
- 明确项目支持的 Node.js 与 npm 版本，降低新 PC 环境差异。
- 让新会话中的 Codex 无需依赖历史聊天，即可理解项目、定位代码并执行正确的验证命令。
- 区分当前实现、历史设计和未来计划，避免 Codex 把过期实施计划当作当前事实。

## 非目标

- 不安装 npm 依赖。
- 不安装 Playwright 浏览器。
- 不运行单元测试、构建或端到端测试。
- 不修改产品功能、界面或课程内容。
- 不删除原 `english-study` 目录。
- 不自动推送新增提交到 GitHub。

## 仓库处理

标准开发目录为 `C:\Users\lylin\Desktop\codex-projects\little-english-quest`。该目录直接克隆自 GitHub `main`，拥有独立 `.git`、正确的 `origin` 和干净工作区。

旧目录 `C:\Users\lylin\Desktop\codex-projects\english-study` 保留原样。由于 Codex 桌面占用该目录，Windows 无法在当前会话中将其重命名；旧目录不再作为本次修改的目标。

## 版本约束

在 `package.json` 中补充：

- `engines.node`：表达 Vite 7 所需的最低 Node.js 版本范围。
- `packageManager`：固定本项目使用的 npm 主工具版本，便于 Corepack 和 Codex 识别。

版本约束只用于声明环境，不在本次工作中触发依赖安装。

## 文档结构

### `AGENTS.md`

作为 Codex 的首要入口，说明项目目标、目录职责、工程约束、常用命令、浏览器能力边界和最低验证要求。它不复制完整产品设计，而是告诉 Codex 如何安全地在仓库中工作。

### `README.md`

作为开发者与普通读者入口，补充产品现状、技术栈、新 PC 设置步骤、开发命令、浏览器权限、数据持久化、PWA 行为和文档导航。

### `docs/PROJECT_STATUS.md`

记录截至 2026-07-11 的当前实现、已验证状态、已知环境缺口和下一步方向。历史计划与当前代码冲突时，以该文件和代码为准。

### `docs/ARCHITECTURE.md`

说明应用入口、页面状态、领域模块、组件、资源、浏览器 API、持久化与离线缓存之间的关系，并提供“某类需求应修改哪里”的索引。

### `docs/CONTENT_AND_ASSETS.md`

说明 150 个词条的数据约束、插画命名与生成流程、资源清单、Service Worker 缓存关系以及 CC BY-SA 4.0 授权要求。

## 验证策略

本次只执行不依赖安装的静态验证：

- 检查 Git 根目录、分支、远程和工作区状态。
- 检查新增文档是否存在占位符、矛盾和过期数字。
- 检查文档中的命令是否与 `package.json` 脚本一致。
- 检查文档引用的路径是否真实存在。
- 检查 `package.json` 仍为有效 JSON。

测试、构建和 E2E 状态必须在文档中如实标记为“本次未运行”，不得写成已通过。

## 成功标准

- 新 PC 只需克隆正确 GitHub 仓库即可获得完整项目和交接文档。
- Codex 能从 `AGENTS.md` 判断修改边界与验证要求。
- 开发者能从 README 完成环境准备，包括首次安装 Playwright Chromium 的独立步骤。
- 当前功能规模、课程流程、持久化键、浏览器 API 和资源生成方式均有唯一且可定位的说明。
- 所有本次修改形成清晰提交，并在用户确认前保持未推送状态。
