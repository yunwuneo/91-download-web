// 简单的前端逻辑，用于调用 91-download-api

// 本地配置存储键名
const LOCAL_STORAGE_KEY = "downloadWebConfig.v1";
const LOCAL_STORAGE_LOG_KEY = "downloadWebLogs.v1";
const LOCAL_STORAGE_HISTORY_KEY = "downloadWebHistory.v1";

/**
 * 获取输入值的工具函数
 */
function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

/**
 * 设置输入框的值（不做 trim）
 */
function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.value = value != null ? String(value) : "";
  }
}

/**
 * 设置 checkbox 选中状态
 */
function setCheckboxChecked(id, checked) {
  const el = document.getElementById(id);
  if (el && typeof checked === "boolean") {
    el.checked = checked;
  }
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
 * 将单条日志保存到 localStorage
 */
function saveLogItemToLocalStorage(item) {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_LOG_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push(item);
    // 只保留最近 200 条，避免无限增长
    if (list.length > 200) {
      list.splice(0, list.length - 200);
    }
    window.localStorage.setItem(LOCAL_STORAGE_LOG_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("保存日志到本地失败：", e);
  }
}

/**
 * 从 localStorage 恢复日志到界面
 */
function loadLogsFromLocalStorage() {
  const logEl = document.getElementById("logOutput");
  if (!logEl) return;

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_LOG_KEY);
    if (!raw) return;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return;

    list.forEach((item) => {
      const { time, type, message } = item || {};
      if (!message) return;

      const lineClass =
        type === "error"
          ? "log-line-error"
          : type === "success"
          ? "log-line-success"
          : "log-line-info";
      const prefix =
        type === "error" ? "[ERROR]" : type === "success" ? "[OK]" : "[INFO]";

      const line = document.createElement("div");
      line.className = lineClass;
      const timeStr = time || new Date().toLocaleTimeString();
      line.textContent = `${timeStr} ${prefix} ${message}`;
      logEl.appendChild(line);
    });

    if (logEl.parentElement) {
      logEl.parentElement.scrollTop = logEl.parentElement.scrollHeight;
    }
  } catch (e) {
    console.error("从本地加载日志失败：", e);
  }
}

/**
 * 追加日志（同时写入 localStorage）
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
  if (logEl.parentElement) {
    logEl.parentElement.scrollTop = logEl.parentElement.scrollHeight;
  }

  // 持久化到本地
  saveLogItemToLocalStorage({ time, type, message });
}

/**
 * 将下载记录保存到 localStorage
 */
function saveHistoryRecordToLocalStorage(record) {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    // 只保留最近 200 条
    if (list.length > 200) {
      list.splice(200);
    }
    window.localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("保存下载记录到本地失败：", e);
  }
}

/**
 * 从 localStorage 恢复下载记录到表格
 */
function loadHistoryFromLocalStorage() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
    if (!raw) return;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return;

    list.forEach((record) => {
      addHistoryRecord(record, { skipSave: true });
    });
  } catch (e) {
    console.error("从本地加载下载记录失败：", e);
  }
}

/**
 * 添加下载记录（默认会写入 localStorage）
 */
function addHistoryRecord({ type, source, status, downloadUrl, time }, options = {}) {
  const { skipSave } = options || {};
  const tbody = document.getElementById("historyTableBody");
  if (!tbody) return;

  const tr = document.createElement("tr");
  const timeStr = time || new Date().toLocaleString();

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

  if (!skipSave) {
    saveHistoryRecordToLocalStorage({
      type,
      source,
      status,
      downloadUrl: downloadUrl || "",
      time: timeStr,
    });
  }
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
 * 根据上下文（process / download）构建 storage 配置
 */
function buildStorageConfig(context) {
  const type = getInputValue(`${context}StorageType`);
  if (!type || type === "local") {
    return { type: "local" };
  }

  if (type === "s3") {
    const region = getInputValue(`${context}StorageS3Region`);
    const bucket = getInputValue(`${context}StorageS3Bucket`);
    const key = getInputValue(`${context}StorageS3Key`);
    const accessKeyId = getInputValue(`${context}StorageS3AccessKeyId`);
    const secretAccessKey = getInputValue(`${context}StorageS3SecretAccessKey`);
    const endpoint = getInputValue(`${context}StorageS3Endpoint`);
    const forcePathStyle = document.getElementById(`${context}StorageS3ForcePathStyle`)?.checked;

    if (!region || !bucket || !key || !accessKeyId || !secretAccessKey) {
      throw new Error("请完整填写 S3 的 region、bucket、key、AccessKeyId、SecretAccessKey");
    }

    const result = {
      type: "s3",
      region,
      bucket,
      key,
      accessKeyId,
      secretAccessKey,
    };
    if (endpoint) result.endpoint = endpoint;
    if (forcePathStyle) result.forcePathStyle = true;
    return result;
  }

  if (type === "webdav") {
    const url = getInputValue(`${context}StorageWebdavUrl`);
    const username = getInputValue(`${context}StorageWebdavUsername`);
    const password = getInputValue(`${context}StorageWebdavPassword`);
    const remotePath = getInputValue(`${context}StorageWebdavRemotePath`);

    if (!url || !remotePath) {
      throw new Error("请至少填写 WebDAV 的 url 和 remotePath");
    }

    const result = {
      type: "webdav",
      url,
      remotePath,
    };
    if (username) result.username = username;
    if (password) result.password = password;
    return result;
  }

  if (type === "ftp") {
    const host = getInputValue(`${context}StorageFtpHost`);
    const portStr = getInputValue(`${context}StorageFtpPort`);
    const user = getInputValue(`${context}StorageFtpUser`);
    const password = getInputValue(`${context}StorageFtpPassword`);
    const remotePath = getInputValue(`${context}StorageFtpRemotePath`);
    const secure = document.getElementById(`${context}StorageFtpSecure`)?.checked;

    if (!host || !remotePath) {
      throw new Error("请至少填写 FTP 的 host 和 remotePath");
    }

    const result = {
      type: "ftp",
      host,
      remotePath,
    };
    if (portStr) {
      const port = Number(portStr);
      if (!Number.isNaN(port)) result.port = port;
    }
    if (user) result.user = user;
    if (password) result.password = password;
    if (secure) result.secure = true;
    return result;
  }

  throw new Error("未知的存储类型，请检查选择");
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
    storage = buildStorageConfig("download");
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
 * 兼容单个和批量页面 URL（同一个文本框，每行一个）
 */
async function handleProcess() {
  const raw = getInputValue("processPageUrl");
  const urls = (raw || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!urls.length) {
    alert("请至少填写一个页面 URL");
    return;
  }

  const outputDir =
    getInputValue("processOutputDir") || getInputValue("defaultOutputDir") || undefined;

  let storage;
  try {
    storage = buildStorageConfig("process");
  } catch (e) {
    alert(e.message);
    return;
  }

  const btn = document.getElementById("btnProcess");
  const originalText = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = urls.length > 1 ? "批量处理中..." : "处理中...";
  }

  try {
    // 单条 URL：沿用原有单次一键处理逻辑
    if (urls.length === 1) {
      const url = urls[0];
      appendLog(`开始一键处理：${url}`);

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
      return;
    }

    // 多条 URL：顺序批量执行
    let successCount = 0;
    let failCount = 0;

    for (const url of urls) {
      appendLog(`开始批量一键处理：${url}`);
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
          type: "process-batch",
          source: url,
          status: ok ? "成功" : "失败",
          downloadUrl: downloadUrl || "",
        });

        if (ok) {
          successCount += 1;
        } else {
          failCount += 1;
        }
      } catch (e) {
        addHistoryRecord({
          type: "process-batch",
          source: url,
          status: "异常",
          downloadUrl: "",
        });
        failCount += 1;
      }
    }

    alert(
      `批量一键处理完成：成功 ${successCount} 条，失败/异常 ${failCount} 条。\n详细结果请查看下方“下载记录”和日志。`
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText || "开始一键处理";
    }
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
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_LOG_KEY);
    } catch (e) {
      console.error("清除本地日志失败：", e);
    }
  });

  document.getElementById("btnSaveConfig")?.addEventListener("click", () => {
    saveConfigToLocalStorage();
  });

  document.getElementById("btnClearConfig")?.addEventListener("click", () => {
    clearConfigFromLocalStorage();
  });
}

/**
 * 初始化标签页切换
 */
function initTabs() {
  const tabContainer = document.getElementById("mainTab");
  if (!tabContainer) return;

  const buttons = tabContainer.querySelectorAll("[data-tab-target]");
  const panes = document.querySelectorAll(".tab-pane");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab-target");
      if (!target) return;

      // 切换 nav 激活态
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // 切换内容区域
      panes.forEach((pane) => {
        if (`#${pane.id}` === target) {
          pane.classList.remove("d-none");
          pane.classList.add("active");
        } else {
          pane.classList.add("d-none");
          pane.classList.remove("active");
        }
      });
    });
  });
}

/**
 * 初始化存储方式选择 UI（本地 / S3 / WebDAV / FTP）
 */
function initStorageUI() {
  const selects = document.querySelectorAll(".storage-type-select");
  const sections = document.querySelectorAll(".storage-section");

  function refresh(context, type) {
    sections.forEach((section) => {
      const secContext = section.getAttribute("data-context");
      const secType = section.getAttribute("data-type");
      if (secContext === context) {
        if (secType === type) {
          section.classList.remove("d-none");
        } else {
          section.classList.add("d-none");
        }
      }
    });
  }

  selects.forEach((select) => {
    const context = select.getAttribute("data-context");
    if (!context) return;

    // 默认刷新一次（处理初始状态）
    refresh(context, select.value || "local");

    select.addEventListener("change", () => {
      refresh(context, select.value || "local");
    });
  });
}

/**
 * 从当前界面收集存储配置（不做必填校验，仅用于本地保存）
 */
function collectStorageConfigForContext(context) {
  const selectEl = document.getElementById(`${context}StorageType`);
  const type = selectEl ? selectEl.value || "local" : "local";

  const result = { type };

  if (type === "s3") {
    result.region = getInputValue(`${context}StorageS3Region`);
    result.bucket = getInputValue(`${context}StorageS3Bucket`);
    result.key = getInputValue(`${context}StorageS3Key`);
    result.accessKeyId = getInputValue(`${context}StorageS3AccessKeyId`);
    result.secretAccessKey = getInputValue(`${context}StorageS3SecretAccessKey`);
    result.endpoint = getInputValue(`${context}StorageS3Endpoint`);
    const forcePathStyleEl = document.getElementById(`${context}StorageS3ForcePathStyle`);
    if (forcePathStyleEl && forcePathStyleEl.checked) {
      result.forcePathStyle = true;
    }
  } else if (type === "webdav") {
    result.url = getInputValue(`${context}StorageWebdavUrl`);
    result.username = getInputValue(`${context}StorageWebdavUsername`);
    result.password = getInputValue(`${context}StorageWebdavPassword`);
    result.remotePath = getInputValue(`${context}StorageWebdavRemotePath`);
  } else if (type === "ftp") {
    result.host = getInputValue(`${context}StorageFtpHost`);
    result.port = getInputValue(`${context}StorageFtpPort`);
    result.user = getInputValue(`${context}StorageFtpUser`);
    result.password = getInputValue(`${context}StorageFtpPassword`);
    result.remotePath = getInputValue(`${context}StorageFtpRemotePath`);
    const secureEl = document.getElementById(`${context}StorageFtpSecure`);
    if (secureEl && secureEl.checked) {
      result.secure = true;
    }
  }

  return result;
}

/**
 * 将存储配置应用到界面
 */
function applyStorageConfigForContext(context, cfg) {
  if (!cfg || typeof cfg !== "object") return;

  const typeSelect = document.getElementById(`${context}StorageType`);
  if (typeSelect && cfg.type) {
    typeSelect.value = cfg.type;
    // 触发一次 change，刷新 UI 显隐
    typeSelect.dispatchEvent(new Event("change"));
  }

  const type = cfg.type;

  if (type === "s3") {
    if (cfg.region) setInputValue(`${context}StorageS3Region`, cfg.region);
    if (cfg.bucket) setInputValue(`${context}StorageS3Bucket`, cfg.bucket);
    if (cfg.key) setInputValue(`${context}StorageS3Key`, cfg.key);
    if (cfg.accessKeyId) setInputValue(`${context}StorageS3AccessKeyId`, cfg.accessKeyId);
    if (cfg.secretAccessKey) {
      setInputValue(`${context}StorageS3SecretAccessKey`, cfg.secretAccessKey);
    }
    if (cfg.endpoint) setInputValue(`${context}StorageS3Endpoint`, cfg.endpoint);
    setCheckboxChecked(`${context}StorageS3ForcePathStyle`, !!cfg.forcePathStyle);
  } else if (type === "webdav") {
    if (cfg.url) setInputValue(`${context}StorageWebdavUrl`, cfg.url);
    if (cfg.username) setInputValue(`${context}StorageWebdavUsername`, cfg.username);
    if (cfg.password) setInputValue(`${context}StorageWebdavPassword`, cfg.password);
    if (cfg.remotePath) setInputValue(`${context}StorageWebdavRemotePath`, cfg.remotePath);
  } else if (type === "ftp") {
    if (cfg.host) setInputValue(`${context}StorageFtpHost`, cfg.host);
    if (cfg.port) setInputValue(`${context}StorageFtpPort`, cfg.port);
    if (cfg.user) setInputValue(`${context}StorageFtpUser`, cfg.user);
    if (cfg.password) setInputValue(`${context}StorageFtpPassword`, cfg.password);
    if (cfg.remotePath) setInputValue(`${context}StorageFtpRemotePath`, cfg.remotePath);
    setCheckboxChecked(`${context}StorageFtpSecure`, !!cfg.secure);
  }
}

/**
 * 从界面收集整体配置
 */
function collectAllConfigFromUI() {
  const config = {
    apiBaseUrl: getInputValue("apiBaseUrl"),
    apiToken: getInputValue("apiToken"),
    defaultOutputDir: getInputValue("defaultOutputDir"),
    storage: {
      process: collectStorageConfigForContext("process"),
      download: collectStorageConfigForContext("download"),
    },
  };
  return config;
}

/**
 * 将配置应用到界面
 */
function applyConfigToUI(config) {
  if (!config || typeof config !== "object") return;

  if (config.apiBaseUrl) setInputValue("apiBaseUrl", config.apiBaseUrl);
  if (config.apiToken) setInputValue("apiToken", config.apiToken);
  if (config.defaultOutputDir) setInputValue("defaultOutputDir", config.defaultOutputDir);

  if (config.storage) {
    if (config.storage.process) {
      applyStorageConfigForContext("process", config.storage.process);
    }
    if (config.storage.download) {
      applyStorageConfigForContext("download", config.storage.download);
    }
  }
}

/**
 * 将当前配置保存到浏览器 localStorage
 */
function saveConfigToLocalStorage() {
  try {
    const config = collectAllConfigFromUI();
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    appendLog("配置已保存到本地浏览器 localStorage。", "success");
    alert("配置已保存到本地浏览器，下次打开页面会自动填充。");
  } catch (e) {
    console.error(e);
    appendLog(`保存配置到本地失败：${e.message}`, "error");
    alert(`保存配置到本地失败：${e.message}`);
  }
}

/**
 * 尝试从 localStorage 读取配置并应用到界面
 */
function loadConfigFromLocalStorage() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return;
    const config = JSON.parse(raw);
    applyConfigToUI(config);
    appendLog("已从本地浏览器加载配置。");
  } catch (e) {
    console.error(e);
    appendLog(`从本地加载配置失败：${e.message}`, "error");
  }
}

/**
 * 清除本地保存的配置
 */
function clearConfigFromLocalStorage() {
  try {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
    appendLog("已清除本地保存的配置。");
    alert("已清除本地保存的配置，刷新页面后将恢复为默认值。");
  } catch (e) {
    console.error(e);
    appendLog(`清除本地配置失败：${e.message}`, "error");
    alert(`清除本地配置失败：${e.message}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  initTabs();
  initStorageUI();
  loadConfigFromLocalStorage();
  loadLogsFromLocalStorage();
  loadHistoryFromLocalStorage();
  appendLog("页面已加载，等待操作...");
});


