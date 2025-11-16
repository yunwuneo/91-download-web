// 简单的前端逻辑，用于调用 91-download-api

/**
 * 获取输入值的工具函数
 */
function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

/**
 * 设置文本内容
 */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text || "";
  }
}

/**
 * 设置 textarea 内容
 */
function setTextarea(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.value = text || "";
  }
}

/**
 * 追加日志
 */
function appendLog(message, type = "info") {
  const logEl = document.getElementById("logOutput");
  if (!logEl) return;

  const time = new Date().toLocaleTimeString();
  const lineClass =
    type === "error" ? "log-line-error" : type === "success" ? "log-line-success" : "log-line-info";
  const prefix = type === "error" ? "[ERROR]" : type === "success" ? "[OK]" : "[INFO]";

  const line = document.createElement("div");
  line.className = lineClass;
  line.textContent = `${time} ${prefix} ${message}`;
  logEl.appendChild(line);

  // 滚动到底部
  logEl.parentElement.scrollTop = logEl.parentElement.scrollHeight;
}

/**
 * 添加下载记录
 */
function addHistoryRecord({ type, source, status, downloadUrl }) {
  const tbody = document.getElementById("historyTableBody");
  if (!tbody) return;

  const tr = document.createElement("tr");
  const timeStr = new Date().toLocaleString();

  tr.innerHTML = `
    <td>${timeStr}</td>
    <td>${type}</td>
    <td class="text-truncate" style="max-width: 260px;" title="${source || ""}">
      ${source || ""}
    </td>
    <td>${status}</td>
    <td>
      ${
        downloadUrl
          ? `<a href="${downloadUrl}" target="_blank" rel="noreferrer" class="btn btn-sm btn-outline-success">下载</a>`
          : "-"
      }
    </td>
  `;

  tbody.prepend(tr);
}

/**
 * 构造通用请求 headers
 */
function buildHeaders() {
  const token = getInputValue("apiToken");
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    // 后端支持 x-api-token 或 Authorization Bearer
    headers["x-api-token"] = token;
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * 从 select + textarea 获取 storage 配置
 */
function buildStorageConfig(typeSelectId, jsonTextareaId) {
  const mode = getInputValue(typeSelectId);
  if (!mode || mode === "local") {
    return { type: "local" };
  }

  const raw = document.getElementById(jsonTextareaId)?.value.trim();
  if (!raw) {
    throw new Error("已选择自定义 storage，但未填写 JSON 配置");
  }

  try {
    const obj = JSON.parse(raw);
    return obj;
  } catch (e) {
    throw new Error("storage JSON 解析失败，请检查格式是否正确");
  }
}

/**
 * 通用 fetch 帮助函数
 */
async function callApi(path, options = {}) {
  const baseUrl = getInputValue("apiBaseUrl");
  if (!baseUrl) {
    throw new Error("请先填写 API 基础地址");
  }

  const url = `${baseUrl}${path}`;
  const opts = {
    method: "GET",
    headers: buildHeaders(),
    ...options,
  };

  appendLog(`请求 ${opts.method || "GET"} ${url}`);

  const res = await fetch(url, opts);
  let bodyText;
  try {
    bodyText = await res.text();
  } catch {
    bodyText = "";
  }

  let data;
  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    data = bodyText;
  }

  if (!res.ok) {
    appendLog(`请求失败：HTTP ${res.status} - ${JSON.stringify(data)}`, "error");
    const error = new Error(`HTTP ${res.status}`);
    error.response = data;
    throw error;
  }

  appendLog(`请求成功：${JSON.stringify(data)}`, "success");
  return data;
}

/**
 * 健康检查
 */
async function handleHealthCheck() {
  setText("healthResult", "检查中...");
  try {
    const data = await callApi("/health", {
      method: "GET",
    });
    setText("healthResult", JSON.stringify(data, null, 2));
  } catch (e) {
    setText("healthResult", `请求失败：${e.message}`);
  }
}

/**
 * 仅解析 M3U8
 */
async function handleParse() {
  const url = getInputValue("parsePageUrl");
  if (!url) {
    alert("请填写页面 URL");
    return;
  }

  setTextarea("parseResult", "解析中...");

  try {
    const data = await callApi("/api/parse", {
      method: "POST",
      body: JSON.stringify({ url }),
    });

    if (data && data.success) {
      const lines = [];
      if (Array.isArray(data.result)) {
        lines.push(...data.result);
      }
      setTextarea("parseResult", lines.join("\n") || "(无结果)");
    } else {
      setTextarea(
        "parseResult",
        `解析失败：${data && (data.errmsg || data.error || JSON.stringify(data))}`
      );
    }
  } catch (e) {
    setTextarea("parseResult", `请求异常：${e.message}`);
  }
}

/**
 * 仅下载 M3U8
 */
async function handleDownload() {
  const m3u8Url = getInputValue("downloadM3u8Url");
  if (!m3u8Url) {
    alert("请填写 M3U8 URL");
    return;
  }

  const outputDir =
    getInputValue("downloadOutputDir") || getInputValue("defaultOutputDir") || undefined;

  let storage;
  try {
    storage = buildStorageConfig("downloadStorageType", "downloadStorageJson");
  } catch (e) {
    alert(e.message);
    return;
  }

  try {
    const payload = {
      m3u8Url,
      ...(outputDir ? { outputDir } : {}),
      ...(storage ? { storage } : {}),
    };

    const data = await callApi("/api/download", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const ok = data && data.success;
    const downloadUrl = data && data.downloadUrl;

    addHistoryRecord({
      type: "download",
      source: m3u8Url,
      status: ok ? "成功" : "失败",
      downloadUrl: downloadUrl || "",
    });

    if (ok && downloadUrl) {
      alert("下载任务成功，已生成下载链接，可在底部“下载记录”中点击下载。");
    } else if (ok) {
      alert("下载任务成功，但未返回 downloadUrl，可能使用了非本地存储。");
    } else {
      alert("下载任务未成功，请查看日志。");
    }
  } catch (e) {
    addHistoryRecord({
      type: "download",
      source: m3u8Url,
      status: "异常",
      downloadUrl: "",
    });
    alert(`请求异常：${e.message}`);
  }
}

/**
 * 一键处理：解析 + 下载 + 存储
 */
async function handleProcess() {
  const url = getInputValue("processPageUrl");
  if (!url) {
    alert("请填写页面 URL");
    return;
  }

  const outputDir =
    getInputValue("processOutputDir") || getInputValue("defaultOutputDir") || undefined;

  let storage;
  try {
    storage = buildStorageConfig("processStorageType", "processStorageJson");
  } catch (e) {
    alert(e.message);
    return;
  }

  try {
    const payload = {
      url,
      ...(outputDir ? { outputDir } : {}),
      ...(storage ? { storage } : {}),
    };

    const data = await callApi("/api/process", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const ok = data && data.success;
    const downloadUrl = data && data.downloadUrl;

    addHistoryRecord({
      type: "process",
      source: url,
      status: ok ? "成功" : "失败",
      downloadUrl: downloadUrl || "",
    });

    if (ok && downloadUrl) {
      alert("一键处理成功，已生成下载链接，可在底部“下载记录”中点击下载。");
    } else if (ok) {
      alert("一键处理成功，但未返回 downloadUrl，可能使用了非本地存储。");
    } else {
      alert("一键处理未成功，请查看日志。");
    }
  } catch (e) {
    addHistoryRecord({
      type: "process",
      source: url,
      status: "异常",
      downloadUrl: "",
    });
    alert(`请求异常：${e.message}`);
  }
}

/**
 * 绑定事件
 */
function bindEvents() {
  document.getElementById("btnHealth")?.addEventListener("click", () => {
    handleHealthCheck();
  });

  document.getElementById("btnParse")?.addEventListener("click", () => {
    handleParse();
  });

  document.getElementById("btnDownload")?.addEventListener("click", () => {
    handleDownload();
  });

  document.getElementById("btnProcess")?.addEventListener("click", () => {
    handleProcess();
  });

  document.getElementById("btnClearLog")?.addEventListener("click", () => {
    const logEl = document.getElementById("logOutput");
    if (logEl) {
      logEl.innerHTML = "";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  appendLog("页面已加载，等待操作...");
});


