## 91 Download Web UI

基于 [`91-download-api`](https://github.com/yunwuneo/91-download-api) 的简易 Web 前端，用于通过浏览器界面发起视频解析与下载。

> 后端项目说明参考：[`91-download-api` README](https://github.com/yunwuneo/91-download-api)。

---

### 使用方式

- **前提：**
  - 已在本机或服务器上启动 `91-download-api` 服务（默认 `http://localhost:3005`）。
  - 如后端配置了 `API_TOKEN`，请记住该值，前端调用会用到。

- **步骤：**
  1. 在本仓库根目录直接用浏览器打开 `index.html`（双击或通过静态服务器均可）。
  2. 在页面顶部的 **“全局配置”** 中设置：
     - **API 基础地址**：例如 `http://localhost:3005`
     - **API Token（可选）**：与后端 `.env` 中的 `API_TOKEN` 保持一致
     - **默认输出目录**：不填时使用后端默认（`data`）
  3. 使用下面的几个模块进行操作：
     - **健康检查**：点击右上角 `检查` 按钮调用 `GET /health`。
     - **一键处理（解析 + 下载 + 存储）**：
       - 填写页面 URL（当前后端仅支持 `hsex.men`）。
       - 选择输出目录（可选）。
       - 选择存储方式：
         - `本地（local）`：使用 `{ "type": "local" }`
         - `自定义 JSON`：在文本框中粘贴完整的 `storage` 对象（S3 / WebDAV / FTP 等）。
       - 点击 **“开始一键处理”**，对应调用 `POST /api/process`。
     - **仅解析 M3U8**：
       - 填写页面 URL，点击 **“开始解析”**（调用 `POST /api/parse`），结果会在下方文本框中列出所有解析到的 M3U8 URL。
     - **仅下载 M3U8**：
       - 填写一个 M3U8 URL。
       - （可选）指定输出目录、设置存储方式（同上一块）。
       - 点击 **“开始下载”**（调用 `POST /api/download`）。
  4. 页面底部的 **“下载记录”** 会记录本次会话内的下载/处理结果：
     - 显示时间、类型（process / download）、源 URL、状态以及后端返回的 `downloadUrl`（如为本地存储）。

---

### 注意事项

- **CORS：**当前前端是纯静态页面，运行在浏览器中，请确保后端 `91-download-api` 服务允许本页面所在的域名来源（可通过反向代理统一域名来避免跨域问题）。
- **认证：**前端在调用 `/api/*` 时会同时携带：
  - `x-api-token: <token>`
  - `Authorization: Bearer <token>`
  后端只需按自身实现验证其中一个即可。
- **存储方式：**
  - 若选择 `local`，前端发送的 `storage` 为 `{ "type": "local" }`。
  - 若选择自定义 JSON，需要确保填入的是 **合法 JSON** 字符串，与后端 README 中示例格式一致（S3/WebDAV/FTP 等）。

---

### 文件说明

- `index.html`：主页面结构，使用 Bootstrap 进行基本布局和样式。
- `styles.css`：少量补充样式（日志区、字体等）。
- `app.js`：前端业务逻辑：
  - 构造请求体、设置认证头。
  - 调用 `GET /health`、`POST /api/parse`、`POST /api/download`、`POST /api/process`。
  - 维护简单的日志输出和下载历史列表。


