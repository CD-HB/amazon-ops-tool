const state = {
  marketplace: "all",
  skuFilter: "all",
  skus: [
    {
      sku: "TM-20OZ-BLK",
      name: "20oz 保温咖啡杯",
      asin: "B0TM20BLK",
      marketplace: "US",
      revenue: 52340,
      units: 1876,
      sessions: 24700,
      margin: 0.326,
      acos: 0.224,
      stock: 846,
      daily: 68,
      inbound: 420,
      status: "growth"
    },
    {
      sku: "ORGANIZER-GR",
      name: "抽屉收纳盒套装",
      asin: "B0ORG9GRE",
      marketplace: "UK",
      revenue: 28460,
      units: 1094,
      sessions: 13300,
      margin: 0.271,
      acos: 0.317,
      stock: 312,
      daily: 37,
      inbound: 0,
      status: "risk"
    },
    {
      sku: "LED-DESK-PRO",
      name: "护眼台灯 Pro",
      asin: "B0LEDDESK",
      marketplace: "DE",
      revenue: 39780,
      units: 754,
      sessions: 10240,
      margin: 0.292,
      acos: 0.238,
      stock: 580,
      daily: 29,
      inbound: 260,
      status: "stable"
    },
    {
      sku: "PET-BOWL-02",
      name: "不锈钢宠物碗",
      asin: "B0PETBOWL",
      marketplace: "US",
      revenue: 21420,
      units: 1432,
      sessions: 18890,
      margin: 0.241,
      acos: 0.188,
      stock: 1520,
      daily: 51,
      inbound: 360,
      status: "growth"
    },
    {
      sku: "BENTO-KIDS-JP",
      name: "儿童便当盒",
      asin: "B0BENTOJP",
      marketplace: "JP",
      revenue: 17860,
      units: 632,
      sessions: 9180,
      margin: 0.214,
      acos: 0.364,
      stock: 226,
      daily: 23,
      inbound: 120,
      status: "risk"
    }
  ]
};

const defaultSkus = JSON.parse(JSON.stringify(state.skus));
const accountRegistryKey = "sellerops.accounts";
const currentAccountKey = "sellerops.currentPhone";
const accountStoragePrefix = "sellerops.account";

let currentAccountPhone = normalizePhone(localStorage.getItem(currentAccountKey) || "");
let currentAccountPasswordHash = "";
const defaultCloudSyncEndpoint = "https://amazon-ops-tool-eight.vercel.app/api/account-sync";
let cloudSyncTimer = 0;
let cloudSyncInFlight = false;
let cloudSyncQueued = false;
let cloudSyncEnabled = true;

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const cnyMoney = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const percent = new Intl.NumberFormat("zh-CN", {
  style: "percent",
  maximumFractionDigits: 1
});

const statusMap = {
  growth: { label: "增长", className: "good" },
  stable: { label: "稳定", className: "warn" },
  risk: { label: "风险", className: "risk" }
};

const matchTypeOptions = [
  { value: "exact", label: "精准" },
  { value: "phrase", label: "词组" },
  { value: "broad", label: "广泛" }
];

const negativeMatchTypeOptions = [
  { value: "negative exact", label: "否定精准" },
  { value: "negative phrase", label: "否定词组" }
];

const biddingStrategyOptions = [
  { value: "Dynamic bids - up and down", label: "动态竞价 - 提高和降低" },
  { value: "Dynamic bids - down only", label: "动态竞价 - 只降低" },
  { value: "Fixed bid", label: "固定竞价" }
];

function normalizeBiddingStrategy(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  const lower = text.toLowerCase();
  if (!text) return "Dynamic bids - up and down";
  if (lower === "fixed bid" || lower === "fixed bids" || lower === "fixedbid" || lower === "固定竞价") {
    return "Fixed bid";
  }
  if (lower === "dynamic bids - down only" || lower.includes("down only") || lower === "仅降低") {
    return "Dynamic bids - down only";
  }
  if (lower === "dynamic bids - up and down" || lower.includes("up and down") || lower === "提高和降低") {
    return "Dynamic bids - up and down";
  }
  return biddingStrategyOptions.some((option) => option.value === text) ? text : "Dynamic bids - up and down";
}

const autoTargetOptions = [
  { value: "close-match", label: "紧密匹配", factor: 1 },
  { value: "loose-match", label: "宽泛匹配", factor: 0.86 },
  { value: "substitutes", label: "同类商品", factor: 0.72 },
  { value: "complements", label: "相似商品", factor: 0.62 }
];

const asinTargetOptions = [
  { value: "asin", label: "精准", expressionPrefix: "asin", factor: 1 },
  { value: "asin-expanded", label: "已扩展", expressionPrefix: "asin-expanded", factor: 0.86 }
];

const campaignTypeOptions = [
  { value: "keyword", label: "SP关键词投放", product: "Sponsored Products" },
  { value: "asin", label: "SP商品投放", product: "Sponsored Products" },
  { value: "auto", label: "SP自动投放", product: "Sponsored Products" }
];

const bulkColumns = [
  "Product",
  "Entity",
  "Operation",
  "Campaign Id",
  "Ad Group Id",
  "Portfolio Id",
  "Ad Id",
  "Keyword Id",
  "Product Targeting Id",
  "Campaign Name",
  "Ad Group Name",
  "Start Date",
  "End Date",
  "Targeting Type",
  "State",
  "Daily Budget",
  "sku",
  "asin",
  "Ad Group Default Bid",
  "Bid",
  "Keyword Text",
  "Match Type",
  "Bidding Strategy",
  "Placement",
  "Percentage",
  "Product Targeting Expression",
  "Audience Id",
  "Shopper Cohort Percentage",
  "Shopper Cohort Type",
  "Sites",
  "Campaign Type",
  "Ad Format",
  "Media ID",
  "Creative ASINs",
  "Brand Entity ID",
  "Creative Asset Id",
  "Brand Name",
  "Landing Page",
  "Video Ad Format"
];

const bulkPreviewLimit = 9;

let bulkRows = [];

function defaultBulkCampaigns() {
  return [
    {
      id: "bulk-campaign-1",
      enabled: true,
      name: "",
      type: "keyword",
      matchType: "exact",
      matchTypes: ["exact"],
      biddingStrategy: "Dynamic bids - up and down",
      adGroupSuffix: "1",
      budget: 10,
      defaultBid: 0.3,
      products: "",
      keywords: "",
      keywordBids: "",
      targets: "",
      creativeAssetId: "",
      brandEntityId: "",
      brandName: "",
      landingPage: "",
      negativeMatchTypes: ["negative exact"],
      negativeExact: "",
      negativePhrase: "",
      negatives: ""
    }
  ];
}

let bulkCampaigns = defaultBulkCampaigns();

function byId(id) {
  return document.getElementById(id);
}

function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("86") && digits.length === 13) {
    digits = digits.slice(2);
  }
  return digits;
}

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone);
}

function isValidPassword(password) {
  return String(password || "").length >= 6;
}

function passwordHash(phone, password) {
  const source = `sellerops:v1:${phone}:${password}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function maskPhone(phone) {
  return phone ? `${phone.slice(0, 3)}****${phone.slice(7)}` : "未登录";
}

function accountStorageKey(name) {
  return currentAccountPhone ? `${accountStoragePrefix}.${currentAccountPhone}.${name}` : `sellerops.${name}`;
}

function readJsonStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return typeof fallback === "function" ? fallback() : fallback;
    return JSON.parse(stored);
  } catch {
    return typeof fallback === "function" ? fallback() : fallback;
  }
}

function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readAccounts() {
  const accounts = readJsonStorage(accountRegistryKey, {});
  return accounts && typeof accounts === "object" && !Array.isArray(accounts) ? accounts : {};
}

function saveAccounts(accounts) {
  writeJsonStorage(accountRegistryKey, accounts);
}

function setCloudSyncStatus(text, stateName = "local") {
  const status = byId("cloudSyncStatus");
  if (!status) return;
  status.textContent = text;
  status.className = `sync-status is-${stateName}`;
}

function accountUpdatedAtKey() {
  return accountStorageKey("updatedAt");
}

function readAccountUpdatedAt() {
  return currentAccountPhone ? localStorage.getItem(accountUpdatedAtKey()) || "" : "";
}

function writeAccountUpdatedAt(value = new Date().toISOString()) {
  if (!currentAccountPhone) return "";
  localStorage.setItem(accountUpdatedAtKey(), value);
  return value;
}

function readStoredAccountSnapshot() {
  return {
    version: 2,
    updatedAt: readAccountUpdatedAt() || new Date().toISOString(),
    skus: readAccountSkus(),
    bulkCampaigns: readBulkCampaigns(),
    bulkSettings: readBulkSettings(),
    prompts: readPromptLibrary(),
    tasks: readTasks()
  };
}

function currentBulkSettingsSnapshot() {
  return byId("bulkPortfolioId") && byId("bulkMarketplace") ? getBulkSettings() : readBulkSettings();
}

function currentAccountSnapshot(updatedAt = readAccountUpdatedAt() || new Date().toISOString()) {
  return {
    version: 2,
    updatedAt,
    skus: state.skus,
    bulkCampaigns,
    bulkSettings: currentBulkSettingsSnapshot(),
    prompts: promptLibrary,
    tasks
  };
}

function applyAccountSnapshot(snapshot) {
  if (!currentAccountPhone || !snapshot || typeof snapshot !== "object") return false;
  if (Array.isArray(snapshot.skus)) writeJsonStorage(accountStorageKey("skus"), snapshot.skus);
  if (Array.isArray(snapshot.bulkCampaigns)) writeJsonStorage(accountStorageKey("bulkCampaigns"), snapshot.bulkCampaigns);
  if (snapshot.bulkSettings && typeof snapshot.bulkSettings === "object") {
    writeJsonStorage(accountStorageKey("bulkSettings"), snapshot.bulkSettings);
  }
  if (Array.isArray(snapshot.prompts)) writeJsonStorage(accountStorageKey("prompts"), snapshot.prompts);
  if (Array.isArray(snapshot.tasks)) writeJsonStorage(accountStorageKey("tasks"), snapshot.tasks);
  writeAccountUpdatedAt(snapshot.updatedAt || new Date().toISOString());
  return true;
}

async function cloudAccountRequest(body) {
  const response = await fetch(defaultCloudSyncEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `云端同步失败：${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function loginCloudAccount(phone, passwordHashValue, hasLocalAccount) {
  if (!cloudSyncEnabled) return { ok: false, mode: "local" };
  try {
    setCloudSyncStatus("正在同步", "syncing");
    const payload = await cloudAccountRequest({
      action: "login",
      phone,
      passwordHash: passwordHashValue,
      hasLocalAccount,
      data: readStoredAccountSnapshot()
    });
    cloudSyncEnabled = true;
    if (payload.data) applyAccountSnapshot(payload.data);
    setCloudSyncStatus(payload.created ? "云端已创建" : "云端已同步", "synced");
    return { ok: true, ...payload };
  } catch (error) {
    if (error.status === 401) throw error;
    cloudSyncEnabled = false;
    setCloudSyncStatus("本地模式", "local");
    return { ok: false, error };
  }
}

async function pushCloudAccountNow() {
  if (!currentAccountPhone || !currentAccountPasswordHash || !cloudSyncEnabled) return;
  if (cloudSyncInFlight) {
    cloudSyncQueued = true;
    return;
  }
  cloudSyncInFlight = true;
  setCloudSyncStatus("正在同步", "syncing");
  try {
    const updatedAt = writeAccountUpdatedAt();
    const payload = await cloudAccountRequest({
      action: "save",
      phone: currentAccountPhone,
      passwordHash: currentAccountPasswordHash,
      data: currentAccountSnapshot(updatedAt)
    });
    if (payload.data?.updatedAt) writeAccountUpdatedAt(payload.data.updatedAt);
    setCloudSyncStatus("云端已同步", "synced");
  } catch (error) {
    cloudSyncEnabled = false;
    setCloudSyncStatus(error.status === 401 ? "密码错误" : "本地模式", error.status === 401 ? "error" : "local");
  } finally {
    cloudSyncInFlight = false;
    if (cloudSyncQueued) {
      cloudSyncQueued = false;
      window.setTimeout(pushCloudAccountNow, 300);
    }
  }
}

function scheduleCloudSync() {
  if (!currentAccountPhone) return;
  window.clearTimeout(cloudSyncTimer);
  cloudSyncTimer = window.setTimeout(pushCloudAccountNow, 900);
}

function markAccountDataChanged() {
  if (!currentAccountPhone) return;
  writeAccountUpdatedAt();
  scheduleCloudSync();
}

function filteredSkus() {
  return state.skus.filter((item) => {
    const marketMatch = state.marketplace === "all" || item.marketplace === state.marketplace;
    const filterMatch =
      state.skuFilter === "all" ||
      (state.skuFilter === "risk" && item.status === "risk") ||
      (state.skuFilter === "growth" && item.status === "growth");
    return marketMatch && filterMatch;
  });
}

function weightedAverage(items, key, weightKey) {
  const totalWeight = items.reduce((sum, item) => sum + item[weightKey], 0);
  if (!totalWeight) return 0;
  return items.reduce((sum, item) => sum + item[key] * item[weightKey], 0) / totalWeight;
}

function updateKpis() {
  const items = filteredSkus();
  const revenue = items.reduce((sum, item) => sum + item.revenue, 0);
  const units = items.reduce((sum, item) => sum + item.units, 0);
  const sessions = items.reduce((sum, item) => sum + item.sessions, 0);
  const daily = items.reduce((sum, item) => sum + item.daily, 0);
  const stock = items.reduce((sum, item) => sum + item.stock + item.inbound, 0);
  const margin = weightedAverage(items, "margin", "revenue");
  const acos = weightedAverage(items, "acos", "revenue");
  const cover = daily ? stock / daily : 0;
  const cvr = sessions ? units / sessions : 0;

  byId("revenueKpi").textContent = currency.format(revenue);
  byId("marginKpi").textContent = percent.format(margin);
  byId("acosKpi").textContent = percent.format(acos);
  byId("coverKpi").textContent = `${Math.round(cover)} 天`;
  byId("cvrKpi").textContent = percent.format(cvr);
  byId("revenueDelta").className = "positive";
  byId("revenueDelta").textContent = revenue > 100000 ? "+18.4%" : "+7.2%";
  byId("marginDelta").className = margin >= 0.28 ? "positive" : "warning";
  byId("acosDelta").className = acos <= 0.24 ? "positive" : "warning";
  byId("coverDelta").className = cover >= 35 ? "positive" : "warning";
  byId("cvrDelta").className = cvr >= 0.075 ? "positive" : "warning";
}

function renderSkuTable() {
  const body = byId("skuTableBody");
  const rows = filteredSkus()
    .map((item) => {
      const status = statusMap[item.status] || statusMap.stable;
      const coverage = item.daily ? Math.round((item.stock + item.inbound) / item.daily) : 0;
      return `
        <tr>
          <td>
            <strong>${item.sku}</strong>
            <span class="sku-name">${item.name} · ${item.asin}</span>
          </td>
          <td>${item.marketplace}</td>
          <td>${currency.format(item.revenue)}</td>
          <td>${percent.format(item.margin)}</td>
          <td>${percent.format(item.acos)}</td>
          <td>${item.stock.toLocaleString("zh-CN")} · ${coverage} 天</td>
          <td><span class="status-pill ${status.className}">${status.label}</span></td>
        </tr>
      `;
    })
    .join("");
  body.innerHTML =
    rows ||
    `<tr><td colspan="7">当前筛选下暂无 SKU。</td></tr>`;
}

function numberValue(id) {
  return Number.parseFloat(byId(id).value) || 0;
}

const profitMarketplaceConfigs = {
  US: {
    label: "美国站",
    fbaLabel: "美国站 2026 非高峰期",
    exchangeLabel: "美元兑人民币汇率",
    currency: "USD",
    symbol: "$",
    locale: "en-US",
    defaultRate: 7.2,
    vatRate: 0,
    fbaRegion: "US",
    surchargeEligible: true
  },
  CA: {
    label: "加拿大站",
    fbaLabel: "加拿大站 2026 非高峰期",
    exchangeLabel: "加元兑人民币汇率",
    currency: "CAD",
    symbol: "CA$",
    locale: "en-CA",
    defaultRate: 5.3,
    vatRate: 0,
    fbaRegion: "CA",
    surchargeEligible: true
  },
  UK: {
    label: "英国站",
    fbaLabel: "英国站 2026 标准FBA",
    exchangeLabel: "英镑兑人民币汇率",
    currency: "GBP",
    symbol: "£",
    locale: "en-GB",
    defaultRate: 9.2,
    vatRate: 20,
    fbaRegion: "UK",
    surchargeEligible: true
  }
};

let exchangeRateManuallyEdited = false;

function setExchangeRateStatus(message) {
  const status = byId("exchangeRateStatus");
  if (status) status.textContent = message || "";
}

function getProfitMarketplaceConfig() {
  const selected = byId("profitMarketplace")?.value || "US";
  return profitMarketplaceConfigs[selected] || profitMarketplaceConfigs.US;
}

function formatProfitMoney(value, config = getProfitMarketplaceConfig()) {
  if (!Number.isFinite(value)) return "待核实";
  const formatted = new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
  return config.currency === "CAD" ? formatted.replace("$", "CA$") : formatted;
}

function updateProfitCurrencyLabels() {
  const config = getProfitMarketplaceConfig();
  [
    "salePriceCurrencyLabel",
    "fbaFeeCurrencyLabel",
    "buyerShippingCurrencyLabel",
    "profitCurrencyLabel",
    "minPriceCurrencyLabel"
  ].forEach((id) => {
    const element = byId(id);
    if (element) element.textContent = config.symbol;
  });
  const exchangeLabel = byId("exchangeRateLabel");
  if (exchangeLabel) exchangeLabel.textContent = config.exchangeLabel;
  const vatField = byId("vatRateField");
  if (vatField) vatField.hidden = config.fbaRegion !== "UK";
  const vatInput = byId("vatRate");
  if (vatInput && config.fbaRegion === "UK" && !vatInput.value) vatInput.value = String(config.vatRate);
  const fbaMarketplaceLabel = byId("fbaMarketplaceLabel");
  if (fbaMarketplaceLabel) fbaMarketplaceLabel.textContent = config.fbaLabel;
  const fbaSurchargeInput = byId("fbaIncludeSurcharge");
  if (fbaSurchargeInput) {
    if (!config.surchargeEligible) {
      fbaSurchargeInput.dataset.lastEligibleChecked = String(fbaSurchargeInput.checked);
      fbaSurchargeInput.checked = false;
      fbaSurchargeInput.disabled = true;
    } else {
      fbaSurchargeInput.disabled = false;
      if (fbaSurchargeInput.dataset.lastEligibleChecked === "true") fbaSurchargeInput.checked = true;
      delete fbaSurchargeInput.dataset.lastEligibleChecked;
    }
  }
}

async function refreshExchangeRate() {
  const input = byId("usdCnyRate");
  if (!input) return;
  const config = getProfitMarketplaceConfig();
  const apiUrl = `https://api.frankfurter.app/latest?from=${encodeURIComponent(config.currency)}&to=CNY`;
  setExchangeRateStatus("正在获取最新汇率...");
  try {
    const response = await fetch(apiUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Exchange rate request failed");
    const data = await response.json();
    const rate = Number(data?.rates?.CNY);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("Exchange rate unavailable");
    if (!exchangeRateManuallyEdited) {
      input.value = rate.toFixed(4);
      updateProfit();
    }
    const dateText = data?.date ? `，${data.date}` : "";
    setExchangeRateStatus(`自动汇率：1 ${config.currency} = ${rate.toFixed(4)} CNY${dateText}`);
  } catch {
    if (!exchangeRateManuallyEdited && config.defaultRate) {
      input.value = config.defaultRate.toFixed(2);
      updateProfit();
    }
    setExchangeRateStatus("自动汇率获取失败，可手动填写");
  }
}

const fbaSurchargeRate = 0.035;
const fbaDimensionalWeightDivisor = 139;
const cmPerInch = 2.54;
const lbPerKg = 2.2046226218;

const fbaRateTables = {
  standard: {
    smallStandard: [
      [2, 2.43, 3.32, 3.58],
      [4, 2.49, 3.42, 3.68],
      [6, 2.56, 3.45, 3.71],
      [8, 2.66, 3.54, 3.80],
      [10, 2.77, 3.68, 3.94],
      [12, 2.82, 3.78, 4.04],
      [14, 2.92, 3.91, 4.17],
      [16, 2.95, 3.96, 4.22]
    ],
    largeStandard: [
      [4, 2.91, 3.73, 3.99],
      [8, 3.13, 3.95, 4.21],
      [12, 3.38, 4.20, 4.46],
      [16, 3.78, 4.60, 4.86],
      [20, 4.22, 5.04, 5.30],
      [24, 4.60, 5.42, 5.68],
      [28, 4.75, 5.57, 5.83],
      [32, 5.00, 5.82, 6.08],
      [36, 5.10, 5.92, 6.18],
      [40, 5.28, 6.10, 6.36],
      [44, 5.44, 6.26, 6.52],
      [48, 5.85, 6.67, 6.93]
    ]
  },
  apparel: {
    smallStandard: [
      [4, 3.27, 4.16, 4.42],
      [8, 3.43, 4.31, 4.57],
      [12, 3.60, 4.57, 4.83],
      [16, 3.85, 4.86, 5.12]
    ],
    largeStandard: [
      [4, 4.09, 4.91, 5.17],
      [8, 4.38, 5.20, 5.46],
      [12, 4.69, 5.51, 5.77],
      [16, 5.13, 5.95, 6.21],
      [20, 5.57, 6.39, 6.65],
      [24, 5.97, 6.79, 7.05],
      [28, 6.11, 6.93, 7.19],
      [32, 6.31, 7.13, 7.39],
      [36, 6.47, 7.29, 7.55],
      [40, 6.65, 7.47, 7.73],
      [44, 6.81, 7.63, 7.89],
      [48, 7.01, 7.83, 8.09]
    ]
  },
  dangerous: {
    smallStandard: [
      [4, 3.37, 4.26, 4.52],
      [8, 3.48, 4.36, 4.62],
      [12, 3.60, 4.57, 4.83],
      [16, 3.75, 4.76, 5.02]
    ],
    largeStandard: [
      [4, 4.33, 5.15, 5.41],
      [8, 4.45, 5.27, 5.53],
      [12, 4.67, 5.49, 5.75],
      [16, 4.99, 5.81, 6.07],
      [20, 5.44, 6.26, 6.52],
      [24, 5.72, 6.54, 6.80],
      [28, 5.98, 6.80, 7.06],
      [32, 6.21, 7.03, 7.29],
      [36, 6.38, 7.20, 7.46],
      [40, 6.58, 7.40, 7.66],
      [44, 6.74, 7.56, 7.82],
      [48, 7.03, 7.85, 8.11]
    ]
  }
};

const fbaTierLabels = {
  smallStandard: "小号标准尺寸",
  largeStandard: "大号标准尺寸",
  smallBulky: "小号大件（估算）",
  largeBulky: "大号大件（估算）",
  extraLarge0To50: "超大件 0-50 lb（估算）",
  extraLarge50To70: "超大件 50-70 lb（估算）",
  extraLarge70To150: "超大件 70-150 lb（估算）",
  overLimit: "超出常规 FBA 尺寸"
};

function fbaPriceBand(price) {
  if (price < 10) return 1;
  if (price > 50) return 3;
  return 2;
}

function fbaSortedDimensions() {
  return [numberValue("fbaLength"), numberValue("fbaWidth"), numberValue("fbaHeight")]
    .map((cm) => cm / cmPerInch)
    .sort((a, b) => a - b);
}

function fbaRoundUp(value, step) {
  return Math.ceil(value / step) * step;
}

function fbaSizeTier(dimensions, unitWeightLb) {
  const [shortest, middle, longest] = dimensions;
  const dimensionalWeight = dimensions.reduce((total, value) => total * Math.max(0.01, value), 1) / fbaDimensionalWeightDivisor;
  const largeShipWeight = Math.max(unitWeightLb, dimensionalWeight);
  const lengthPlusGirth = longest + 2 * (middle + shortest);

  if (longest <= 15 && middle <= 12 && shortest <= 0.75 && unitWeightLb <= 1) {
    return { tier: "smallStandard", shippingWeight: unitWeightLb, dimensionalWeight, estimated: false };
  }
  if (longest <= 18 && middle <= 14 && shortest <= 8 && largeShipWeight <= 20) {
    return { tier: "largeStandard", shippingWeight: largeShipWeight, dimensionalWeight, estimated: false };
  }
  if (longest <= 37 && middle <= 30 && shortest <= 12 && largeShipWeight <= 50) {
    return { tier: "smallBulky", shippingWeight: largeShipWeight, dimensionalWeight, estimated: true };
  }
  if (longest <= 59 && middle <= 33 && shortest <= 33 && lengthPlusGirth <= 130 && largeShipWeight <= 50) {
    return { tier: "largeBulky", shippingWeight: largeShipWeight, dimensionalWeight, estimated: true };
  }
  if (longest <= 108 && largeShipWeight <= 50) {
    return { tier: "extraLarge0To50", shippingWeight: largeShipWeight, dimensionalWeight, estimated: true };
  }
  if (longest <= 108 && largeShipWeight <= 70) {
    return { tier: "extraLarge50To70", shippingWeight: largeShipWeight, dimensionalWeight, estimated: true };
  }
  if (longest <= 108 && largeShipWeight <= 150) {
    return { tier: "extraLarge70To150", shippingWeight: largeShipWeight, dimensionalWeight, estimated: true };
  }
  return { tier: "overLimit", shippingWeight: largeShipWeight, dimensionalWeight, estimated: true };
}

function fbaStandardFee(category, tier, shippingWeightLb, price) {
  const table = fbaRateTables[category]?.[tier] || fbaRateTables.standard[tier];
  const priceIndex = fbaPriceBand(price);
  const weightOz = Math.max(0.01, shippingWeightLb * 16);
  if (category === "standard" && tier === "largeStandard" && weightOz > 48) {
    const baseOver3Lb = [6.15, 6.97, 7.23][priceIndex - 1];
    return baseOver3Lb + Math.ceil((weightOz - 48) / 4) * 0.08;
  }
  const matched = table.find((row) => weightOz <= row[0]) || table[table.length - 1];
  if (weightOz <= matched[0]) return matched[priceIndex];

  const extraUnits = Math.ceil((weightOz - matched[0]) / 4);
  return matched[priceIndex] + extraUnits * 0.08;
}

function fbaBulkyFee(tier, shippingWeightLb, price) {
  const band = fbaPriceBand(price);
  const bases = {
    smallBulky: [6.78, 7.55, 7.55],
    largeBulky: [8.58, 9.35, 9.35],
    extraLarge0To50: [25.56, 26.33, 26.60],
    extraLarge50To70: [39.35, 40.12, 40.39],
    extraLarge70To150: [54.13, 54.90, 55.17]
  };
  if (!bases[tier]) return 0;
  const base = bases[tier][band - 1];
  const extraWeight = Math.max(0, Math.ceil(shippingWeightLb) - 1);
  return base + extraWeight * 0.38;
}

function fbaSortedDimensionsCm() {
  return [numberValue("fbaLength"), numberValue("fbaWidth"), numberValue("fbaHeight")]
    .sort((a, b) => a - b);
}

function fbaPackageInfo() {
  const dimensionsCm = fbaSortedDimensionsCm();
  const [shortestCm, middleCm, longestCm] = dimensionsCm;
  const weightKg = Math.max(0.01, numberValue("fbaWeight"));
  return {
    dimensionsCm,
    shortestCm,
    middleCm,
    longestCm,
    weightKg,
    volumeCm3: dimensionsCm.reduce((total, value) => total * Math.max(0.01, value), 1)
  };
}

function findWeightBand(bands, weight) {
  return bands.find((band) => weight <= band[0]) || bands[bands.length - 1];
}

function roundUpStep(value, step) {
  return Math.ceil(value / step) * step;
}

function calculateUsFbaFee(category, price) {
  const unitWeightLb = numberValue("fbaWeight") * lbPerKg;
  const tierInfo = fbaSizeTier(fbaSortedDimensions(), unitWeightLb);
  const baseFee =
    tierInfo.tier === "smallStandard" || tierInfo.tier === "largeStandard"
      ? fbaStandardFee(category, tierInfo.tier, tierInfo.shippingWeight, price)
      : tierInfo.tier === "overLimit" ? NaN : fbaBulkyFee(tierInfo.tier, tierInfo.shippingWeight, price);
  return {
    ...tierInfo,
    tierLabel: fbaTierLabels[tierInfo.tier] || tierInfo.tier,
    shippingWeightLabel: `${fbaRoundUp(tierInfo.shippingWeight, 0.01).toFixed(2)} lb / ${fbaRoundUp(tierInfo.shippingWeight / lbPerKg, 0.01).toFixed(2)} kg`,
    baseFee,
    note: tierInfo.tier === "overLimit"
      ? "该尺寸/重量可能超出美国站常规 FBA 配送费层级，请用 Seller Central 费用预览复核。"
      : tierInfo.estimated
        ? "美国站大件费用按公开费率区间估算；最终费用建议以上传前 Seller Central 费用预览为准。"
        : "输入单位为 cm / kg，系统已换算为 inch / lb 后按美国站 2026 FBA 配送费率估算。"
  };
}

function calculateCanadaFbaFee(category, price, pack) {
  const envelopeBands = [
    [0.1, 4.45],
    [0.2, 4.75],
    [0.3, 5.00],
    [0.4, 5.24],
    [0.5, 5.45]
  ];
  const standardBands = [
    [0.1, 5.82],
    [0.2, 5.92],
    [0.3, 6.12],
    [0.4, 6.34],
    [0.5, 6.67],
    [0.6, 7.16],
    [0.7, 7.46],
    [0.8, 7.69],
    [0.9, 7.96],
    [1.0, 8.25],
    [1.1, 8.48],
    [1.2, 8.58],
    [1.3, 8.84],
    [1.4, 9.04],
    [1.5, 9.29]
  ];
  const shippingWeightKg = Math.max(pack.weightKg, pack.volumeCm3 / 5000);
  const isEnvelope = pack.longestCm <= 38 && pack.middleCm <= 27 && pack.shortestCm <= 2 && pack.weightKg <= 0.5;
  const isStandard = pack.longestCm <= 45 && pack.middleCm <= 35 && pack.shortestCm <= 20 && pack.weightKg <= 9;
  let tier = "caSpecialOversize";
  let tierLabel = "特殊大件（估算）";
  let baseFee = 153.57 + Math.max(0, Math.ceil((shippingWeightKg - 0.5) / 0.5)) * 0.95;

  if (isEnvelope) {
    tier = "caEnvelope";
    tierLabel = "加拿大信封";
    baseFee = findWeightBand(envelopeBands, pack.weightKg)[1];
  } else if (isStandard) {
    tier = "caStandard";
    tierLabel = "加拿大标准尺寸";
    if (shippingWeightKg <= 1.5) {
      baseFee = findWeightBand(standardBands, shippingWeightKg)[1];
    } else {
      baseFee = 10.28 + Math.max(0, Math.ceil((shippingWeightKg - 1.5) / 0.1)) * 0.09;
    }
  } else if (pack.longestCm <= 60 && pack.middleCm <= 45 && pack.shortestCm <= 30 && shippingWeightKg <= 9) {
    tier = "caSmallOversize";
    tierLabel = "加拿大小号大件（估算）";
    baseFee = 15.43 + Math.max(0, Math.ceil((shippingWeightKg - 0.5) / 0.5)) * 0.46;
  } else if (pack.longestCm <= 108 && shippingWeightKg <= 23) {
    tier = "caMediumOversize";
    tierLabel = "加拿大中号大件（估算）";
    baseFee = 37.78 + Math.max(0, Math.ceil((shippingWeightKg - 0.5) / 0.5)) * 0.52;
  } else if (pack.longestCm <= 274 && shippingWeightKg <= 68) {
    tier = "caLargeOversize";
    tierLabel = "加拿大大号大件（估算）";
    baseFee = 95.75 + Math.max(0, Math.ceil((shippingWeightKg - 0.5) / 0.5)) * 0.60;
  }

  if (category === "dangerous") baseFee += 0.11;
  if (price > 0 && price < 14 && (tier === "caEnvelope" || tier === "caStandard")) {
    baseFee = Math.max(0, baseFee - 0.80);
  }

  return {
    tier,
    tierLabel,
    shippingWeight: shippingWeightKg,
    shippingWeightLabel: `${roundUpStep(shippingWeightKg, 0.01).toFixed(2)} kg`,
    baseFee,
    estimated: !isEnvelope && !isStandard,
    note: "加拿大站按 Amazon.ca 当前公开 FBA 费率估算；低价商品已按售价低于 CA$14 扣减 CA$0.80，最终费用请以上传前 Seller Central 预览为准。"
  };
}

function calculateUkFbaFee(category, pack) {
  const dimensionalKg = pack.volumeCm3 / 5000;
  let shippingWeightKg = Math.max(pack.weightKg, dimensionalKg);
  const bands = {
    lightEnvelope: [
      [0.02, 1.83],
      [0.04, 1.87],
      [0.06, 1.89],
      [0.08, 2.07],
      [0.1, 2.08]
    ],
    standardEnvelope: [
      [0.21, 2.10],
      [0.46, 2.16]
    ],
    largeEnvelope: [[0.96, 2.72]],
    extraLargeEnvelope: [[0.96, 2.94]],
    smallParcel: [
      [0.15, 2.91],
      [0.4, 3.00],
      [0.9, 3.04],
      [1.4, 3.05],
      [1.9, 3.25],
      [3.9, 3.27]
    ],
    standardParcel: [
      [0.15, 2.94],
      [0.4, 3.01],
      [0.9, 3.06],
      [1.4, 3.26],
      [1.9, 3.48],
      [2.9, 3.49],
      [3.9, 3.54],
      [5.9, 3.56],
      [8.9, 3.57],
      [11.9, 3.58]
    ]
  };
  const lengthPlusGirth = pack.longestCm + 2 * (pack.middleCm + pack.shortestCm);
  let tier = "ukHeavyOversize";
  let tierLabel = "英国重型大件（估算）";
  let baseFee = NaN;
  let estimated = false;

  if (pack.longestCm <= 33 && pack.middleCm <= 23 && pack.shortestCm <= 2.5 && pack.weightKg <= 0.1) {
    tier = "ukLightEnvelope";
    tierLabel = "英国轻小信封";
    baseFee = findWeightBand(bands.lightEnvelope, pack.weightKg)[1];
  } else if (pack.longestCm <= 33 && pack.middleCm <= 23 && pack.shortestCm <= 2.5 && pack.weightKg <= 0.46) {
    tier = "ukStandardEnvelope";
    tierLabel = "英国标准信封";
    baseFee = findWeightBand(bands.standardEnvelope, pack.weightKg)[1];
  } else if (pack.longestCm <= 33 && pack.middleCm <= 23 && pack.shortestCm <= 4 && pack.weightKg <= 0.96) {
    tier = "ukLargeEnvelope";
    tierLabel = "英国大号信封";
    baseFee = findWeightBand(bands.largeEnvelope, pack.weightKg)[1];
  } else if (pack.longestCm <= 33 && pack.middleCm <= 23 && pack.shortestCm <= 6 && pack.weightKg <= 0.96) {
    tier = "ukExtraLargeEnvelope";
    tierLabel = "英国超大号信封";
    baseFee = findWeightBand(bands.extraLargeEnvelope, pack.weightKg)[1];
  } else if (category === "apparel" && pack.longestCm <= 45 && pack.middleCm <= 34 && pack.shortestCm <= 26 && pack.weightKg <= 11.9) {
    const parcel = [
      [35, 25, 7, 3.9, 2.83, 0.02, "小包裹 1"],
      [35, 25, 9, 3.9, 2.87, 0.02, "小包裹 2"],
      [35, 25, 12, 3.9, 2.91, 0.02, "小包裹 3"],
      [40, 30, 6, 11.9, 2.97, 0.02, "中包裹 1"],
      [40, 30, 20, 11.9, 3.10, 0.03, "中包裹 2"],
      [45, 34, 10, 11.9, 3.34, 0.03, "大包裹 1"],
      [45, 34, 26, 11.9, 3.97, 0.03, "大包裹 2"]
    ].find(([l, m, s, w]) => pack.longestCm <= l && pack.middleCm <= m && pack.shortestCm <= s && pack.weightKg <= w);
    shippingWeightKg = pack.weightKg;
    tier = "ukSelectedParcel";
    tierLabel = `英国服装/鞋靴 ${parcel[6]}`;
    baseFee = parcel[4] + Math.max(0, Math.ceil((pack.weightKg - 0.1 - 1e-9) / 0.1)) * parcel[5];
  } else if (pack.longestCm <= 35 && pack.middleCm <= 25 && pack.shortestCm <= 12 && pack.weightKg <= 3.9 && dimensionalKg <= 2.1) {
    tier = "ukSmallParcel";
    tierLabel = "英国小包裹";
    baseFee = findWeightBand(bands.smallParcel, shippingWeightKg)[1];
  } else if (pack.longestCm <= 45 && pack.middleCm <= 34 && pack.shortestCm <= 26 && pack.weightKg <= 11.9 && dimensionalKg <= 7.96) {
    tier = "ukStandardParcel";
    tierLabel = "英国标准包裹";
    baseFee = findWeightBand(bands.standardParcel, shippingWeightKg)[1];
  } else {
    estimated = true;
    if (pack.longestCm > 175 || lengthPlusGirth > 360 || pack.weightKg > 31.5) {
      tier = "overLimit";
      tierLabel = "英国特殊大件：请手填官方费用";
    } else if (pack.longestCm <= 61 && pack.middleCm <= 46 && pack.shortestCm <= 46 && pack.weightKg <= 1.76 && dimensionalKg <= 25.82) {
      tier = "ukSmallOversize";
      tierLabel = "英国小号大件（估算）";
      baseFee = 3.49 + Math.max(0, Math.ceil(shippingWeightKg - 0.76)) * 0.25;
    } else if (pack.longestCm <= 101 && pack.middleCm <= 60 && pack.shortestCm <= 60 && pack.weightKg <= 23 && dimensionalKg <= 72.72) {
      tier = "ukStandardOversize";
      tierLabel = pack.weightKg <= 15 ? "英国标准大件（轻）" : "英国标准大件（重）";
      baseFee = pack.weightKg <= 15
        ? 4.35 + Math.max(0, Math.ceil(shippingWeightKg - 0.76)) * 0.15
        : 6.58 + Math.max(0, Math.ceil(shippingWeightKg - 15.76)) * 0.08;
    } else if (pack.longestCm <= 120 && pack.middleCm <= 60 && pack.shortestCm <= 60 && pack.weightKg <= 23 && dimensionalKg <= 86.4) {
      tier = "ukStandardOversize";
      tierLabel = "英国标准大件（估算）";
      baseFee = 5.67 + Math.max(0, Math.ceil(shippingWeightKg - 0.76)) * 0.07;
    } else if (pack.weightKg <= 23 && dimensionalKg <= 126) {
      tier = "ukBulkyOversize";
      tierLabel = "英国大件（估算）";
      baseFee = 10.20 + Math.max(0, Math.ceil(shippingWeightKg - 0.76)) * 0.24;
    } else if (pack.weightKg > 23 && pack.weightKg <= 31.5 && dimensionalKg <= 126) {
      baseFee = 13.04 + Math.max(0, Math.ceil(shippingWeightKg - 31.5)) * 0.09;
    }
  }

  if (category === "dangerous") baseFee += 0.10;
  if (tier.includes("Envelope")) shippingWeightKg = pack.weightKg;

  return {
    tier,
    tierLabel,
    shippingWeight: shippingWeightKg,
    shippingWeightLabel: `${roundUpStep(shippingWeightKg, 0.01).toFixed(2)} kg`,
    baseFee,
    estimated,
    note: "英国站按 2026-04-17 官方标准FBA费率表估算；服装/鞋靴包裹使用按100g递增费率。未计算低价FBA、SIPP优惠及其他特殊类目费率。"
  };
}

function calculateFbaFee() {
  if (["fbaLength", "fbaWidth", "fbaHeight", "fbaWeight"].some((id) => numberValue(id) <= 0)) {
    return { tier: "overLimit", tierLabel: "请填写有效尺寸和重量", shippingWeightLabel: "--", baseFee: NaN, surcharge: NaN, finalFee: NaN, note: "长、宽、高和包装重量必须大于 0。" };
  }
  const category = byId("fbaCategory").value;
  const price = numberValue("salePrice");
  const config = getProfitMarketplaceConfig();
  const pack = fbaPackageInfo();
  let result;
  if (config.fbaRegion === "CA") {
    result = calculateCanadaFbaFee(category, price, pack);
  } else if (config.fbaRegion === "UK") {
    result = calculateUkFbaFee(category, pack);
  } else {
    result = calculateUsFbaFee(category, price);
  }
  const surcharge = byId("fbaIncludeSurcharge").checked ? result.baseFee * (config.fbaRegion === "UK" ? 0.015 : fbaSurchargeRate) : 0;
  return {
    ...result,
    surcharge,
    finalFee: result.baseFee + surcharge
  };
}

function updateFbaCalculator() {
  const result = calculateFbaFee();
  const profitConfig = getProfitMarketplaceConfig();
  const fbaAutoSync = byId("fbaAutoSync");
  const surchargeInput = byId("fbaIncludeSurcharge");
  if (surchargeInput) surchargeInput.disabled = !profitConfig.surchargeEligible;
  byId("fbaSizeTier").textContent = result.tierLabel || fbaTierLabels[result.tier] || result.tier;
  byId("fbaShipWeight").textContent = result.shippingWeightLabel;
  byId("fbaBaseFee").textContent = formatProfitMoney(result.baseFee, profitConfig);
  byId("fbaSurcharge").textContent = formatProfitMoney(result.surcharge, profitConfig);
  byId("fbaFinalFee").textContent = formatProfitMoney(result.finalFee, profitConfig);
  const surchargePercent = profitConfig.fbaRegion === "UK" ? "1.5%" : "3.5%";
  byId("fbaSurchargeLabel").textContent = `包含 2026-04-17 起 ${surchargePercent} 燃油/物流附加费`;
  const surchargeNote = `附加费按配送费的 ${surchargePercent} 计算。仅估算配送费，不含仓储、入库配置、低库存及旺季等费用。`;
  const source = profitConfig.fbaRegion === "UK"
    ? "https://m.media-amazon.com/images/G/02/sell/images/260410-FBA-Rate-Card-EN.pdf"
    : `https://sellercentral.amazon.${profitConfig.fbaRegion === "CA" ? "ca" : "com"}/help/hub/reference/external/GABBX6GZPA8MSZGW`;
  byId("fbaRateSource").innerHTML = `<a href="${source}" target="_blank" rel="noopener noreferrer">亚马逊官方费率表</a> · ${profitConfig.fbaRegion === "UK" ? "2026-04-17 版非旺季标准；特殊类目另计" : "基础费率沿用现有估算表，最新完整表尚未核实；3.5% 附加费已核实"} · 核对日期 2026-09-10`;
  byId("fbaPolicyNote").textContent = [result.note, surchargeNote].filter(Boolean).join(" ");

  fbaAutoSync.disabled = byId("fulfillmentMethod").value === "FBM";
  if (fbaAutoSync?.checked && !fbaAutoSync.disabled && Number.isFinite(result.finalFee)) {
    byId("fbaFee").value = result.finalFee.toFixed(2);
  } else if (fbaAutoSync?.checked && !fbaAutoSync.disabled) {
    byId("fbaFee").value = "";
  }
}

function updateProfit() {
  updateProfitCurrencyLabels();
  const config = getProfitMarketplaceConfig();
  const price = numberValue("salePrice");
  const cnyRate = Math.max(0.01, numberValue("usdCnyRate") || config.defaultRate);
  const isFbm = byId("fulfillmentMethod").value === "FBM";
  byId("buyerShippingField").hidden = !isFbm;
  byId("fbmShippingCostField").hidden = !isFbm;
  byId("fbaFeeField").hidden = isFbm;
  if (!isFbm && byId("fbaAutoSync").checked && !Number.isFinite(calculateFbaFee().finalFee)) {
    ["profitValue", "profitValueCny", "profitMargin", "breakEvenAcos", "minPrice"].forEach((id) => { byId(id).textContent = "待核实"; });
    byId("profitBreakdown").textContent = "无法自动估算配送费。请修正尺寸/重量，或关闭自动同步并填写官方费用后再计算。";
    return;
  }
  const buyerShipping = isFbm ? numberValue("buyerShipping") : 0;
  const totalSales = price + buyerShipping;
  const vatRate = config.fbaRegion === "UK" ? Math.max(0, numberValue("vatRate")) / 100 : 0;
  const netSales = totalSales / (1 + vatRate);
  const vatAmount = Math.max(0, totalSales - netSales);
  const unitCostCny = numberValue("unitCost");
  const unitCost = unitCostCny / cnyRate;
  const referralRate = numberValue("referralRate") / 100;
  const fba = isFbm ? numberValue("fbmShippingCost") / cnyRate : numberValue("fbaFee");
  const adRate = Math.max(0, numberValue("acoas")) / 100;
  const ad = price * adRate;
  byId("adCostHint").textContent = `广告费 = 商品售价 × ACOAS = ${formatProfitMoney(ad, config)}；不含买家运费。`;
  const shippingCny = numberValue("shippingCost");
  const shipping = shippingCny / cnyRate;
  const refundRate = numberValue("refundRate") / 100;
  const targetMargin = numberValue("targetMargin") / 100;
  const refundReserveRate = refundRate * 0.18;
  const refundReserve = netSales * refundReserveRate;
  const referral = totalSales * referralRate;
  const profit = netSales - unitCost - referral - fba - ad - shipping - refundReserve;
  const profitCny = profit * cnyRate;
  const margin = totalSales ? profit / totalSales : 0;
  const breakEven = price ? (netSales - unitCost - referral - fba - shipping - refundReserve) / price : 0;
  const retainedRate = (1 - refundReserveRate) / (1 + vatRate) - referralRate - targetMargin;
  const denominator = retainedRate - adRate;
  const minPrice = denominator > 0 ? Math.max(0, (unitCost + fba + shipping - buyerShipping * retainedRate) / denominator) : NaN;

  byId("profitValue").textContent = formatProfitMoney(profit, config);
  byId("profitValueCny").textContent = cnyMoney.format(profitCny);
  byId("profitMargin").textContent = percent.format(margin);
  byId("breakEvenAcos").textContent = percent.format(Math.max(0, breakEven));
  byId("minPrice").textContent = Number.isFinite(minPrice) ? formatProfitMoney(minPrice, config) : "无法达到";
  const breakdown = byId("profitBreakdown");
  if (breakdown) {
    const rows = [
      ["站点", config.label],
      ["配送方式", isFbm ? "FBM 自配送" : "FBA 亚马逊配送"],
      ["销售价格", formatProfitMoney(price, config)],
      ["买家运费收入", formatProfitMoney(buyerShipping, config)],
      ["订单收入", formatProfitMoney(totalSales, config)],
      ["VAT 扣除", vatRate > 0 ? `${formatProfitMoney(vatAmount, config)}（${percent.format(vatRate)}，含税价倒扣）` : "无"],
      ["净销售额", formatProfitMoney(netSales, config)],
      ["采购成本", `${cnyMoney.format(unitCostCny)} ÷ ${cnyRate.toFixed(4)} = ${formatProfitMoney(unitCost, config)}`],
      ["头程/包装", `${cnyMoney.format(shippingCny)} ÷ ${cnyRate.toFixed(4)} = ${formatProfitMoney(shipping, config)}`],
      ["佣金（含买家运费）", `${formatProfitMoney(totalSales, config)} × ${percent.format(referralRate)} = ${formatProfitMoney(referral, config)}`],
      [isFbm ? "FBM 发货成本" : "FBA 费用", formatProfitMoney(fba, config)],
      ["广告费 / ACOAS", `${formatProfitMoney(price, config)} × ${percent.format(adRate)} = ${formatProfitMoney(ad, config)}`],
      ["退款预留", `${formatProfitMoney(netSales, config)} × ${percent.format(refundRate)} × 18% = ${formatProfitMoney(refundReserve, config)}`],
      ["单件利润", `${formatProfitMoney(profit, config)} / ${cnyMoney.format(profitCny)}`],
      ["利润率（订单收入）", totalSales ? `${formatProfitMoney(profit, config)} ÷ ${formatProfitMoney(totalSales, config)} = ${percent.format(margin)}` : "无收入"],
      ["建议商品底价", denominator > 0 ? formatProfitMoney(minPrice, config) : "目标毛利与广告占比过高，无法计算"],
      ["测算口径", "底价按当前配送费、买家运费与广告占比测算；售价跨费率档位时需重新核算。退款预留采用退款率 × 净销售额 × 18% 的内部估算。"]
    ];
    breakdown.innerHTML = rows
      .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
      .join("");
  }
}

function updateInventory() {
  const daily = numberValue("dailySales");
  const lead = numberValue("leadTime");
  const safety = numberValue("safetyDays");
  const stock = numberValue("stockOnHand");
  const inbound = numberValue("inboundUnits");
  const carton = Math.max(1, numberValue("cartonSize"));
  const targetUnits = daily * (lead + safety);
  const reorder = Math.max(0, targetUnits - stock - inbound);
  const roundedReorder = Math.ceil(reorder / carton) * carton;
  const coverage = daily ? (stock + inbound) / daily : 0;
  const stockout = new Date();
  stockout.setDate(stockout.getDate() + Math.floor(daily ? stock / daily : 0));

  byId("coverageDays").textContent = `${Math.round(coverage)} 天`;
  byId("coverageBar").style.width = `${Math.min(100, Math.round((coverage / (lead + safety || 1)) * 100))}%`;
  byId("reorderUnits").textContent = roundedReorder.toLocaleString("zh-CN");
  byId("cartonCount").textContent = Math.ceil(roundedReorder / carton).toLocaleString("zh-CN");
  byId("stockoutDate").textContent = stockout.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit"
  });
}

function csvValue(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function optionTags(options, selectedValue) {
  return options
    .map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === selectedValue ? "selected" : ""}>${option.label}</option>`)
    .join("");
}

function autoTargetLabel(value) {
  return autoTargetOptions.find((option) => option.value === value)?.label || value;
}

function productTargetLabel(value) {
  return [...autoTargetOptions, ...asinTargetOptions].find((option) => option.value === value)?.label || value;
}

function productTargetPreview(expression) {
  const prefix = String(expression || "").split("=")[0];
  return `${productTargetLabel(prefix)} · ${expression}`;
}


function defaultAutoTargets(defaultBid) {
  return Object.fromEntries(
    autoTargetOptions.map((option) => [
      option.value,
      {
        enabled: true,
        bid: Math.max(0.02, defaultBid * option.factor).toFixed(2)
      }
    ])
  );
}

function defaultAsinTargets(defaultBid) {
  return Object.fromEntries(
    asinTargetOptions.map((option) => [
      option.value,
      {
        enabled: true,
        bid: Math.max(0.02, defaultBid * option.factor).toFixed(2)
      }
    ])
  );
}

function createId(prefix = "id") {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatBulkDate(value) {
  return value ? value.replaceAll("-", "") : todayInputValue().replaceAll("-", "");
}

function splitBulkLines(value) {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isAsin(value) {
  return /^[A-Z0-9]{10}$/i.test(String(value || "").trim());
}

function isPlaceholderValue(value) {
  return /^(123456789012345|B0EXAMPLE1|B0ASIN0001|B08COMP111|B09COMP222|SKU-1|SKU-001|main keyword)$/i.test(
    String(value || "").trim()
  );
}

function parseBulkProducts(value) {
  return splitBulkLines(value).map((line) => {
    const [first = "", second = ""] = line.split(/[,，\t]+/).map((part) => part.trim());
    const firstIsAsin = isAsin(first);
    return {
      asin: firstIsAsin ? first : "",
      sku: second || (firstIsAsin ? "" : first)
    };
  });
}

function parseBulkKeywords(value, defaultBid, defaultMatch = "exact") {
  const matchTypes = new Set(["exact", "phrase", "broad"]);
  return splitBulkLines(value).map((line) => {
    const parts = line.split(/[,，\t]+/).map((part) => part.trim()).filter(Boolean);
    const possibleMatch = (parts[1] || "").toLowerCase();
    const keyword = parts[0] || "";
    const match = matchTypes.has(possibleMatch) ? possibleMatch : defaultMatch;
    const bid = Number.parseFloat(parts[2] || (matchTypes.has(possibleMatch) ? "" : parts[1])) || defaultBid;
    return { keyword, match, bid };
  });
}

function normalizeKeywordMatchTypes(campaign) {
  const allowed = new Set(matchTypeOptions.map((option) => option.value));
  const selected = Array.isArray(campaign.matchTypes) && campaign.matchTypes.length ? campaign.matchTypes : [campaign.matchType || "exact"];
  const normalized = selected.filter((type) => allowed.has(type));
  return normalized.length ? normalized : ["exact"];
}

function normalizeNegativeMatchValue(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (normalized === "negative exact" || normalized === "exact") return "negative exact";
  if (normalized === "negative phrase" || normalized === "phrase") return "negative phrase";
  return "";
}

function normalizeNegativeMatchTypes(campaign) {
  const allowed = new Set(negativeMatchTypeOptions.map((option) => option.value));
  const selected =
    Array.isArray(campaign.negativeMatchTypes) && campaign.negativeMatchTypes.length
      ? campaign.negativeMatchTypes
      : [campaign.negativeMatchType || "negative exact"];
  const normalized = selected.map(normalizeNegativeMatchValue).filter((type) => allowed.has(type));
  return normalized.length ? normalized : ["negative exact"];
}

function keywordLinesForEditor(campaign) {
  if (campaign.keywords != null) return campaign.keywords;
  const defaultBid = readCampaignNumber(campaign, "defaultBid", 0.45);
  return parseBulkKeywords(campaign.targets || "", defaultBid, campaign.matchType || "exact")
    .map((item) => item.keyword)
    .join("\n");
}

function keywordBidLinesForEditor(campaign) {
  if (campaign.keywordBids != null) return campaign.keywordBids;
  const defaultBid = readCampaignNumber(campaign, "defaultBid", 0.45);
  return parseBulkKeywords(campaign.targets || "", defaultBid, campaign.matchType || "exact")
    .map((item) => item.bid)
    .join("\n");
}

function parseKeywordBid(value) {
  const bid = Number.parseFloat(String(value || "").trim());
  return Number.isFinite(bid) && bid > 0 ? bid : null;
}

function keywordEntriesForCampaign(campaign, defaultBid) {
  if (campaign.keywords == null && campaign.keywordBids == null && campaign.targets) {
    return parseBulkKeywords(campaign.targets, defaultBid, campaign.matchType || "exact").map((item) => ({
      keyword: item.keyword,
      bid: item.bid || defaultBid
    }));
  }

  const keywordLines = splitBulkLines(campaign.keywords || "");
  const bidLines = splitBulkLines(campaign.keywordBids || "");
  return keywordLines.map((line, index) => {
    const parts = line.split(/[,，\t]+/).map((part) => part.trim()).filter(Boolean);
    const inlineBid = parseKeywordBid(parts[1]);
    const lineBid = parseKeywordBid(bidLines[index]);
    return {
      keyword: parts[0] || "",
      bid: lineBid || inlineBid || defaultBid
    };
  });
}

function parseBulkTargets(value, defaultBid) {
  return splitBulkLines(value).map((line) => {
    const parts = line.split(/[,，\t]+/).map((part) => part.trim()).filter(Boolean);
    return {
      asin: parts[0] || "",
      bid: Number.parseFloat(parts[1]) || defaultBid
    };
  });
}

function parseBulkNegatives(value, matchTypes = ["negative exact"]) {
  const selectedMatchTypes = matchTypes.length ? matchTypes : ["negative exact"];
  return splitBulkLines(value).flatMap((line) => {
    const parts = line.split(/[,，\t]+/).map((part) => part.trim()).filter(Boolean);
    const inlineMatch = normalizeNegativeMatchValue(parts.slice(1).join(" "));
    const matches = inlineMatch ? [inlineMatch] : selectedMatchTypes;
    return matches.map((match) => ({
      keyword: parts[0] || "",
      match
    }));
  });
}

function parseNegativeLinesForMatch(value, match) {
  return splitBulkLines(value).map((line) => {
    const parts = line.split(/[,，\t]+/).map((part) => part.trim()).filter(Boolean);
    return {
      keyword: parts[0] || "",
      match
    };
  });
}

function legacyNegativeEntriesForCampaign(campaign) {
  return parseBulkNegatives(campaign.negatives || "", normalizeNegativeMatchTypes(campaign));
}

function negativeLinesForEditor(campaign, match) {
  const field = match === "negative phrase" ? "negativePhrase" : "negativeExact";
  if (campaign[field] != null) return campaign[field];
  return legacyNegativeEntriesForCampaign(campaign)
    .filter((item) => item.match === match)
    .map((item) => item.keyword)
    .join("\n");
}

function negativeEntriesForCampaign(campaign) {
  const hasSplitFields = campaign.negativeExact != null || campaign.negativePhrase != null;
  if (!hasSplitFields) {
    return legacyNegativeEntriesForCampaign(campaign);
  }
  return [
    ...parseNegativeLinesForMatch(campaign.negativeExact || "", "negative exact"),
    ...parseNegativeLinesForMatch(campaign.negativePhrase || "", "negative phrase")
  ];
}

function parseAutoTargets(value, defaultBid) {
  const defaults = [
    ["close-match", defaultBid],
    ["loose-match", Math.max(0.02, defaultBid * 0.86).toFixed(2)],
    ["substitutes", Math.max(0.02, defaultBid * 0.72).toFixed(2)],
    ["complements", Math.max(0.02, defaultBid * 0.62).toFixed(2)]
  ];
  const lines = splitBulkLines(value);
  const source = lines.length ? lines : defaults.map((item) => item.join(", "));
  return source.map((line) => {
    const parts = Array.isArray(line)
      ? line
      : String(line)
          .split(/[,，\t]+/)
          .map((part) => part.trim())
          .filter(Boolean);
    return {
      target: parts[0] || "close-match",
      bid: Number.parseFloat(parts[1]) || defaultBid
    };
  });
}

function normalizeAutoTargets(campaign, defaultBid) {
  if (campaign.autoTargets) {
    return autoTargetOptions.map((option) => {
      const config = campaign.autoTargets[option.value] || {};
      return {
        target: option.value,
        label: option.label,
        enabled: config.enabled !== false,
        bid: Number.parseFloat(config.bid) || Math.max(0.02, defaultBid * option.factor).toFixed(2)
      };
    });
  }

  const legacyTargets = parseAutoTargets(campaign.targets, defaultBid);
  return autoTargetOptions.map((option) => {
    const existing = legacyTargets.find((item) => item.target === option.value);
    return {
      target: option.value,
      label: option.label,
      enabled: Boolean(existing) || !legacyTargets.length,
      bid: existing?.bid || Math.max(0.02, defaultBid * option.factor).toFixed(2)
    };
  });
}

function parseAsinTargets(value) {
  return splitBulkLines(value).map((line) => {
    const [asin = ""] = line.split(/[,，\t]+/).map((part) => part.trim());
    return { asin };
  });
}

function normalizeAsinTargetTypes(campaign, defaultBid) {
  if (campaign.asinTargets) {
    return asinTargetOptions.map((option) => {
      const config = campaign.asinTargets[option.value] || {};
      return {
        type: option.value,
        label: option.label,
        expressionPrefix: option.expressionPrefix,
        enabled: config.enabled !== false,
        bid: Number.parseFloat(config.bid) || Math.max(0.02, defaultBid * option.factor).toFixed(2)
      };
    });
  }

  return asinTargetOptions.map((option) => ({
    type: option.value,
    label: option.label,
    expressionPrefix: option.expressionPrefix,
    enabled: true,
    bid: Math.max(0.02, defaultBid * option.factor).toFixed(2)
  }));
}

function createBulkRow(overrides = {}) {
  const row = Object.fromEntries(bulkColumns.map((column) => [column, ""]));
  return {
    ...row,
    Product: "Sponsored Products",
    Operation: "Create",
    State: "enabled",
    ...overrides
  };
}

function createCampaignRow(campaign, overrides = {}) {
  const videoMeta = isVideoCampaign(campaign)
    ? {
        "Campaign Type": "Sponsored Brands",
        "Ad Format": "Video",
        "Media ID": campaign.creativeAssetId || "",
        "Brand Entity ID": campaign.brandEntityId || "",
        "Brand Name": campaign.brandName || "",
        "Landing Page": campaign.landingPage || "",
        "Video Ad Format": "Sponsored Brands video"
      }
    : {
        "Campaign Type": "Sponsored Products"
      };
  return createBulkRow({
    Product: campaignProductFor(campaign.type),
    ...videoMeta,
    ...overrides
  });
}

function getBulkSettings() {
  return {
    portfolioId: byId("bulkPortfolioId").value.trim(),
    marketplace: byId("bulkMarketplace").value,
    startDate: formatBulkDate(byId("bulkStartDate").value),
    biddingStrategy: normalizeBiddingStrategy(byId("bulkBiddingStrategy").value)
  };
}

function cloneDefaultSkus() {
  return JSON.parse(JSON.stringify(defaultSkus));
}

function readAccountSkus() {
  const skus = readJsonStorage(accountStorageKey("skus"), cloneDefaultSkus);
  return Array.isArray(skus) && skus.length ? skus : cloneDefaultSkus();
}

function saveAccountSkus() {
  if (!currentAccountPhone) return;
  writeJsonStorage(accountStorageKey("skus"), state.skus);
  markAccountDataChanged();
}

function readBulkCampaigns() {
  const campaigns = readJsonStorage(accountStorageKey("bulkCampaigns"), defaultBulkCampaigns);
  const allowedTypes = new Set(campaignTypeOptions.map((option) => option.value));
  const restored = Array.isArray(campaigns) && campaigns.length
    ? campaigns.map((campaign) => ({
        ...campaign,
        type: allowedTypes.has(campaign.type) || isVideoCampaign(campaign) ? campaign.type : "keyword",
        creativeAssetId: campaign.creativeAssetId || "",
        brandEntityId: campaign.brandEntityId || "",
        brandName: campaign.brandName || "",
        landingPage: campaign.landingPage || "",
        biddingStrategy: normalizeBiddingStrategy(campaign.biddingStrategy)
      }))
    : defaultBulkCampaigns();
  // Preserve retired video records for account sync, without rendering or exporting them.
  return restored.some((campaign) => !isVideoCampaign(campaign)) ? restored : [...restored, ...defaultBulkCampaigns()];
}

function saveBulkCampaigns() {
  if (!currentAccountPhone) return;
  writeJsonStorage(accountStorageKey("bulkCampaigns"), bulkCampaigns);
  markAccountDataChanged();
}

function readBulkSettings() {
  const settings = readJsonStorage(accountStorageKey("bulkSettings"), {});
  return settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
}

function applyBulkSettings() {
  const settings = readBulkSettings();
  byId("bulkPortfolioId").value = settings.portfolioId || "";
  byId("bulkMarketplace").value = settings.marketplace || "US";
  byId("bulkStartDate").value = settings.startDate || todayInputValue();
  byId("bulkBiddingStrategy").value = normalizeBiddingStrategy(settings.biddingStrategy);
}

function saveBulkSettings() {
  if (!currentAccountPhone) return;
  writeJsonStorage(accountStorageKey("bulkSettings"), getBulkSettings());
  markAccountDataChanged();
}

function readCampaignNumber(campaign, field, fallback) {
  const value = Number.parseFloat(campaign[field]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function defaultCampaignName(index, marketplace) {
  return `SP-${marketplace}-Campaign-${index + 1}`;
}

function campaignNamePrefix(campaign) {
  return isVideoCampaign(campaign) ? "SBV" : "SP";
}

function defaultCampaignNameFor(campaign, index, marketplace) {
  return `${campaignNamePrefix(campaign)}-${marketplace}-Campaign-${index + 1}`;
}

function adGroupNameFor(campaign, campaignName) {
  const suffix = String(campaign.adGroupSuffix || "1").trim();
  return `${campaignName}-AG-${suffix || "1"}`;
}

function targetPlaceholderFor(type) {
  if (type === "videoAsin") return "商品 ASIN，每行一个";
  if (type === "videoKeyword") return "视频广告关键词，每行一个";
  if (type === "asin") return "商品 ASIN，每行一个";
  if (type === "auto") return "使用右侧四个自动投放分组";
  return "travel mug, 0.95";
}

function campaignProductFor(type) {
  return campaignTypeOptions.find((option) => option.value === type)?.product || "Sponsored Products";
}

function isVideoCampaign(campaign) {
  return String(campaign.type || "").startsWith("video");
}

function videoCampaignTargetMode(campaign) {
  return campaign.type === "videoAsin" ? "asin" : "keyword";
}

function createBulkCampaign(overrides = {}) {
  const nextNumber = bulkCampaigns.length + 1;
  const marketplace = byId("bulkMarketplace")?.value || "US";
  const defaultBiddingStrategy = normalizeBiddingStrategy(byId("bulkBiddingStrategy")?.value);
  return {
    id: createId("bulk-campaign"),
    enabled: true,
    name: `SP-${marketplace}-Campaign-${nextNumber}`,
    type: "keyword",
    matchType: "exact",
    matchTypes: ["exact"],
    biddingStrategy: defaultBiddingStrategy,
    adGroupSuffix: String(nextNumber),
    budget: 10,
    defaultBid: 0.45,
    products: "",
    keywords: "",
    keywordBids: "",
    targets: "",
    creativeAssetId: "",
    brandEntityId: "",
    brandName: "",
    landingPage: "",
    asinTargets: defaultAsinTargets(0.45),
    autoTargets: defaultAutoTargets(0.45),
    negativeMatchTypes: ["negative exact"],
    negativeExact: "",
    negativePhrase: "",
    negatives: "",
    ...overrides
  };
}

function buildProductAdRows(campaign, products, campaignName, adGroupName) {
  return products.map((product) =>
    createCampaignRow(campaign, {
      Entity: "Product ad",
      "Campaign Id": campaignName,
      "Ad Group Id": adGroupName,
      sku: product.sku || "",
      asin: product.sku ? "" : product.asin
    })
  );
}

function buildVideoAdRows(campaign, campaignName, adGroupName, products) {
  const creativeAssetId = String(campaign.creativeAssetId || "").trim();
  const brandEntityId = String(campaign.brandEntityId || "").trim();
  const brandName = String(campaign.brandName || "").trim();
  const landingPage = String(campaign.landingPage || "").trim();
  const creativeAsin = products.find((product) => product.asin)?.asin || "";
  const rows = products.length ? products : [{ asin: "", sku: "" }];
  return rows.map((product) =>
    createCampaignRow(campaign, {
      Entity: "Video ad",
      "Campaign Id": campaignName,
      "Ad Group Id": adGroupName,
      asin: product.asin || "",
      sku: product.sku || "",
      "Campaign Type": "Sponsored Brands",
      "Ad Format": "Video",
      "Media ID": creativeAssetId,
      "Creative ASINs": creativeAsin || product.asin || "",
      "Brand Entity ID": brandEntityId,
      "Creative Asset Id": creativeAssetId,
      "Audience Id": creativeAssetId,
      "Brand Name": brandName,
      "Landing Page": landingPage,
      "Video Ad Format": "Sponsored Brands video"
    })
  );
}

function buildTargetRows(campaign, campaignName, adGroupName, defaultBid) {
  if (campaign.type === "asin" || campaign.type === "videoAsin") {
    const asins = parseAsinTargets(campaign.targets).filter((item) => item.asin);
    const targetTypes = normalizeAsinTargetTypes(campaign, defaultBid).filter((item) => item.enabled);
    return asins.flatMap((asinItem) =>
      targetTypes.map((targetType) =>
        createCampaignRow(campaign, {
          Entity: "Product targeting",
          "Campaign Id": campaignName,
          "Ad Group Id": adGroupName,
          Bid: targetType.bid,
          "Product Targeting Expression": `${targetType.expressionPrefix}="${asinItem.asin}"`
        })
      )
    );
  }

  if (campaign.type === "auto") {
    return normalizeAutoTargets(campaign, defaultBid).map((item) =>
      createCampaignRow(campaign, {
        Entity: "Product targeting",
        "Campaign Id": campaignName,
        "Ad Group Id": adGroupName,
        Bid: item.bid,
        State: item.enabled ? "enabled" : "paused",
        "Product Targeting Expression": item.target
      })
    );
  }

  const matchTypes = normalizeKeywordMatchTypes(campaign);
  return keywordEntriesForCampaign(campaign, defaultBid).flatMap((item) =>
    matchTypes.map((match) =>
      createCampaignRow(campaign, {
        Entity: "Keyword",
        "Campaign Id": campaignName,
        "Ad Group Id": adGroupName,
        Bid: item.bid,
        "Keyword Text": item.keyword,
        "Match Type": match
      })
    )
  );
}

function buildRowsForCampaign(campaign, index, settings) {
  const campaignName = campaign.name.trim() || defaultCampaignNameFor(campaign, index, settings.marketplace);
  const adGroupName = adGroupNameFor(campaign, campaignName);
  const budget = readCampaignNumber(campaign, "budget", 10);
  const defaultBid = readCampaignNumber(campaign, "defaultBid", 0.45);
  const biddingStrategy = normalizeBiddingStrategy(campaign.biddingStrategy || settings.biddingStrategy);
  const targetingType = campaign.type === "auto" ? "auto" : "manual";
  const products = parseBulkProducts(campaign.products);
  const negatives = negativeEntriesForCampaign(campaign);
  const videoMode = isVideoCampaign(campaign);

  return [
    createCampaignRow(campaign, {
      Entity: "Campaign",
      "Campaign Id": campaignName,
      "Portfolio Id": settings.portfolioId,
      "Campaign Name": campaignName,
      "Start Date": settings.startDate,
      "Targeting Type": targetingType === "auto" ? "Auto" : "Manual",
      "Daily Budget": budget,
      "Bidding Strategy": biddingStrategy,
      "Campaign Type": isVideoCampaign(campaign) ? "Sponsored Brands" : "Sponsored Products",
      "Ad Format": isVideoCampaign(campaign) ? "Video" : "",
      "Media ID": isVideoCampaign(campaign) ? campaign.creativeAssetId || "" : "",
      "Creative ASINs": isVideoCampaign(campaign) ? products.find((product) => product.asin)?.asin || "" : "",
      "Brand Entity ID": isVideoCampaign(campaign) ? campaign.brandEntityId || "" : "",
      "Brand Name": campaign.brandName || "",
      "Landing Page": campaign.landingPage || ""
    }),
    ...["placement top", "placement rest of search", "placement product page"].map((placement) =>
      createCampaignRow(campaign, {
        Entity: "Bidding adjustment",
        "Campaign Id": campaignName,
        State: "",
        "Bidding Strategy": biddingStrategy,
        Placement: placement,
        Percentage: 0
      })
    ),
    createCampaignRow(campaign, {
      Entity: "Ad group",
      "Campaign Id": campaignName,
      "Ad Group Id": adGroupName,
      "Ad Group Name": adGroupName,
      "Ad Group Default Bid": defaultBid
    }),
    ...(videoMode ? buildVideoAdRows(campaign, campaignName, adGroupName, products) : buildProductAdRows(campaign, products, campaignName, adGroupName)),
    ...buildTargetRows(campaign, campaignName, adGroupName, defaultBid),
    ...negatives.map((item) =>
      createCampaignRow(campaign, {
        Entity: "Negative Keyword",
        "Campaign Id": campaignName,
        "Ad Group Id": adGroupName,
        "Keyword Text": item.keyword,
        "Match Type": item.match
      })
    )
  ];
}

function buildBulkRows() {
  const settings = getBulkSettings();
  return bulkCampaigns
    .filter((campaign) => campaign.enabled && !isVideoCampaign(campaign))
    .flatMap((campaign, index) => buildRowsForCampaign(campaign, index, settings));
}

function bulkRowsToCsv(rows = bulkRows) {
  return [bulkColumns.join(","), ...rows.map((row) => bulkColumns.map((column) => csvValue(row[column])).join(","))].join("\n");
}

function xmlValue(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function columnName(index) {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    const mod = (value - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    value = Math.floor((value - mod) / 26);
  }
  return name;
}

const referenceColumnWidths = [12, 16, 8, 20, 20, 12, 8, 10, 14, 20, 20, 10, 10, 10, 8, 10, 14, 14, 14, 8, 14, 10, 22, 20, 10, 28, 12, 16, 16, 14, 20, 18, 26, 18];

function styleIndexForEntity(entity) {
  const styles = {
    Campaign: 2,
    "Bidding adjustment": 3,
    "Ad group": 4,
    "Product ad": 5,
    "Product targeting": 6,
    Keyword: 7,
    "Negative Keyword": 7,
    "Video ad": 5
  };
  return styles[entity] || 7;
}

function isNumericColumn(column) {
  return ["Daily Budget", "Ad Group Default Bid", "Bid", "Percentage", "Shopper Cohort Percentage"].includes(column);
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><name val="Calibri"/><family val="2"/><color theme="1"/><sz val="11"/><scheme val="minor"/></font>
    <font><name val="Arial"/><b val="1"/><color rgb="00FFFFFF"/><sz val="10"/></font>
    <font><name val="Arial"/><sz val="10"/></font>
  </fonts>
  <fills count="9">
    <fill><patternFill/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="002F4F8F"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="00DCE6F1"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="00E8E8E8"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="00E2EFDA"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="00EAF4E8"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="00EEF4FF"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="00FFFFFF"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="00CCCCCC"/></left>
      <right style="thin"><color rgb="00CCCCCC"/></right>
      <top style="thin"><color rgb="00CCCCCC"/></top>
      <bottom style="thin"><color rgb="00CCCCCC"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="8">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyAlignment="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" applyAlignment="1" xfId="0"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="4" borderId="1" applyAlignment="1" xfId="0"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="5" borderId="1" applyAlignment="1" xfId="0"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="6" borderId="1" applyAlignment="1" xfId="0"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="7" borderId="1" applyAlignment="1" xfId="0"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="8" borderId="1" applyAlignment="1" xfId="0"><alignment horizontal="left" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0" hidden="0"/></cellStyles>
</styleSheet>`;
}

function worksheetXml(rows) {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const styleIndex = rowIndex === 0 ? 1 : styleIndexForEntity(row[1]);
      const cells = row
        .map((value, cellIndex) => {
          const ref = `${columnName(cellIndex)}${rowIndex + 1}`;
          if (value === "" || value == null) {
            return `<c r="${ref}" s="${styleIndex}"/>`;
          }
          if (isNumericColumn(bulkColumns[cellIndex]) && Number.isFinite(Number(value))) {
            return `<c r="${ref}" s="${styleIndex}"><v>${Number(value)}</v></c>`;
          }
          return `<c r="${ref}" s="${styleIndex}" t="inlineStr"><is><t>${xmlValue(value)}</t></is></c>`;
        })
        .join("");
      const height = rowIndex === 0 ? ' ht="24" customHeight="1"' : "";
      return `<row r="${rowIndex + 1}"${height}>${cells}</row>`;
    })
    .join("");
  const cols = referenceColumnWidths
    .map((width, index) => `<col width="${width}" customWidth="1" min="${index + 1}" max="${index + 1}"/>`)
    .join("");
  const endCell = `${columnName(bulkColumns.length - 1)}${rows.length}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${endCell}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A1" sqref="A1"/></sheetView></sheetViews>
  <cols>${cols}</cols>
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

function createCrc32Table() {
  return Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });
}

const crc32Table = createCrc32Table();

function crc32(bytes) {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(value) {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function uint32(value) {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function concatBytes(chunks) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
}

function createZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const checksum = crc32(dataBytes);
    const localHeader = new Uint8Array([
      ...uint32(0x04034b50),
      ...uint16(20),
      ...uint16(0x0800),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(checksum),
      ...uint32(dataBytes.length),
      ...uint32(dataBytes.length),
      ...uint16(nameBytes.length),
      ...uint16(0)
    ]);
    localParts.push(localHeader, nameBytes, dataBytes);

    const centralHeader = new Uint8Array([
      ...uint32(0x02014b50),
      ...uint16(20),
      ...uint16(20),
      ...uint16(0x0800),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(checksum),
      ...uint32(dataBytes.length),
      ...uint32(dataBytes.length),
      ...uint16(nameBytes.length),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(0),
      ...uint32(offset)
    ]);
    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + dataBytes.length;
  });

  const centralOffset = offset;
  const centralDirectory = concatBytes(centralParts);
  const endRecord = new Uint8Array([
    ...uint32(0x06054b50),
    ...uint16(0),
    ...uint16(0),
    ...uint16(files.length),
    ...uint16(files.length),
    ...uint32(centralDirectory.length),
    ...uint32(centralOffset),
    ...uint16(0)
  ]);

  return concatBytes([...localParts, centralDirectory, endRecord]);
}

function bulkRowsToXlsxBlob(rows = bulkRows) {
  const tableRows = [bulkColumns, ...rows.map((row) => bulkColumns.map((column) => row[column] ?? ""))];
  const files = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Bulk Ads" sheetId="1" r:id="rId1"/></sheets>
</workbook>`
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: worksheetXml(tableRows)
    },
    {
      name: "xl/styles.xml",
      content: stylesXml()
    },
    {
      name: "docProps/core.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>SellerOps Bulk Ads</dc:title>
  <dc:creator>SellerOps</dc:creator>
  <cp:lastModifiedBy>SellerOps</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`
    },
    {
      name: "docProps/app.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>SellerOps</Application>
</Properties>`
    }
  ];
  return new Blob([createZip(files)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

function renderAutoTargetEditor(campaign) {
  const defaultBid = readCampaignNumber(campaign, "defaultBid", 0.45);
  return `
    <div class="auto-target-grid">
      ${normalizeAutoTargets(campaign, defaultBid)
        .map(
          (item) => `
            <label class="auto-target-option">
              <input data-auto-key="${item.target}" data-auto-field="enabled" type="checkbox" ${item.enabled ? "checked" : ""} />
              <span>${item.label}</span>
              <input data-auto-key="${item.target}" data-auto-field="bid" type="number" min="0.02" step="0.01" value="${escapeHtml(item.bid)}" aria-label="${item.label}竞价" />
            </label>
          `
        )
        .join("")}
    </div>
  `;
}

function renderAsinTargetEditor(campaign) {
  const defaultBid = readCampaignNumber(campaign, "defaultBid", 0.45);
  return `
    <div class="asin-target-editor">
      <textarea data-field="targets" rows="3" placeholder="${targetPlaceholderFor(campaign.type)}">${escapeHtml(campaign.targets)}</textarea>
      <div class="asin-filter-row">
        <span>商品投放</span>
        ${normalizeAsinTargetTypes(campaign, defaultBid)
          .map(
            (item) => `
              <label class="asin-filter-option">
                <input data-asin-type="${item.type}" data-asin-field="enabled" type="checkbox" ${item.enabled ? "checked" : ""} />
                <span>${item.label}</span>
                <input data-asin-type="${item.type}" data-asin-field="bid" type="number" min="0.02" step="0.01" value="${escapeHtml(item.bid)}" aria-label="${item.label}竞价" />
              </label>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderKeywordMatchTypeEditor(campaign) {
  const selected = new Set(normalizeKeywordMatchTypes(campaign));
  return `
    <div class="match-type-grid">
      ${matchTypeOptions
        .map(
          (option) => `
            <label class="match-type-option">
              <input data-match-type="${option.value}" type="checkbox" ${selected.has(option.value) ? "checked" : ""} />
              <span>${option.label}</span>
            </label>
          `
        )
        .join("")}
    </div>
  `;
}

function renderVideoCreativeEditor(campaign) {
  if (!isVideoCampaign(campaign)) {
    return `<span class="disabled-cell">不适用</span>`;
  }
  return `
    <div class="video-creative-editor">
      <input data-field="creativeAssetId" type="text" value="${escapeHtml(campaign.creativeAssetId || "")}" placeholder="视频素材ID（Media ID）" title="填写 Amazon Ads 素材库里的视频 Media ID / Creative Asset ID" aria-label="视频素材 ID" />
      <input data-field="brandEntityId" type="text" value="${escapeHtml(campaign.brandEntityId || "")}" placeholder="品牌实体ID（Brand Entity ID）" title="填写 Amazon Ads 品牌实体 ID" aria-label="品牌实体 ID" />
      <input data-field="brandName" type="text" value="${escapeHtml(campaign.brandName || "")}" placeholder="品牌名（备注，可选）" title="填写品牌名，仅作备注和核对" aria-label="品牌名" />
      <input data-field="landingPage" type="text" value="${escapeHtml(campaign.landingPage || "")}" placeholder="落地页URL（店铺/商品页）" title="填写品牌旗舰店或商品详情页链接" aria-label="落地页" />
    </div>
  `;
}

function renderKeywordTargetEditor(campaign) {
  return `
    <div class="keyword-target-editor">
      <div class="keyword-target-head">
        <span>关键词</span>
        <span>单独竞价（留空用批量）</span>
      </div>
      <div class="keyword-target-grid">
        <textarea data-field="keywords" rows="4" placeholder="travel mug&#10;insulated coffee cup">${escapeHtml(keywordLinesForEditor(campaign))}</textarea>
        <textarea data-field="keywordBids" rows="4" placeholder="0.30&#10;0.45">${escapeHtml(keywordBidLinesForEditor(campaign))}</textarea>
      </div>
    </div>
  `;
}

function renderNegativeKeywordEditor(campaign) {
  return `
    <div class="negative-target-editor">
      <div class="negative-target-head">
        <span>否定精准</span>
        <span>否定词组</span>
      </div>
      <div class="negative-target-grid">
        <textarea data-field="negativeExact" rows="3" placeholder="tote bag">${escapeHtml(negativeLinesForEditor(campaign, "negative exact"))}</textarea>
        <textarea data-field="negativePhrase" rows="3" placeholder="leopard tote">${escapeHtml(negativeLinesForEditor(campaign, "negative phrase"))}</textarea>
      </div>
    </div>
  `;
}

function renderBulkCampaignTable() {
  const body = byId("bulkCampaignTableBody");
  body.innerHTML = bulkCampaigns
    .filter((campaign) => !isVideoCampaign(campaign))
    .map(
      (campaign, index) => `
        <tr data-campaign-id="${campaign.id}">
          <td>
            <input class="campaign-enabled" data-field="enabled" type="checkbox" ${campaign.enabled ? "checked" : ""} aria-label="启用第 ${index + 1} 个广告活动" />
          </td>
          <td>
            <div class="row-actions">
              <button class="icon-button" data-action="duplicate" type="button" title="复制活动">
                <i data-lucide="copy" aria-hidden="true"></i>
              </button>
              <button class="icon-button" data-action="delete" type="button" title="删除活动">
                <i data-lucide="trash-2" aria-hidden="true"></i>
              </button>
            </div>
          </td>
          <td>
            <input data-field="name" type="text" value="${escapeHtml(campaign.name)}" placeholder="SP_品牌_产品" />
          </td>
          <td>
            <select data-field="type" aria-label="投放类型">
              ${optionTags(campaignTypeOptions, campaign.type || "keyword")}
            </select>
          </td>
          <td>
            ${
              campaign.type === "keyword" || campaign.type === "videoKeyword"
                ? renderKeywordMatchTypeEditor(campaign)
                : `<span class="disabled-cell">不适用</span>`
            }
          </td>
          <td>
            <input data-field="adGroupSuffix" type="text" value="${escapeHtml(campaign.adGroupSuffix)}" placeholder="1" />
          </td>
          <td>
            <select data-field="biddingStrategy" aria-label="竞价方案">
              ${optionTags(biddingStrategyOptions, normalizeBiddingStrategy(campaign.biddingStrategy))}
            </select>
          </td>
          <td>
            <input data-field="budget" type="number" min="1" step="1" value="${escapeHtml(campaign.budget)}" />
          </td>
          <td>
            <input data-field="defaultBid" type="number" min="0.02" step="0.01" value="${escapeHtml(campaign.defaultBid)}" />
          </td>
          <td>
            <textarea data-field="products" rows="3" placeholder="${isVideoCampaign(campaign) ? "B0ASIN0001, SKU（视频广告第一列必须是真实 ASIN）" : "B0ASIN0001, SKU"}">${escapeHtml(campaign.products)}</textarea>
          </td>
          <td>
            ${
              campaign.type === "auto"
                ? renderAutoTargetEditor(campaign)
                : campaign.type === "asin" || campaign.type === "videoAsin"
                  ? renderAsinTargetEditor(campaign)
                  : renderKeywordTargetEditor(campaign)
            }
          </td>
          <td>
            ${renderNegativeKeywordEditor(campaign)}
          </td>
        </tr>
      `
    )
    .join("");
  refreshIcons();
}

function updateBulkCampaignFromControl(control) {
  const row = control.closest("[data-campaign-id]");
  const field = control.dataset.field;
  if (!row || !field) return;
  const campaign = bulkCampaigns.find((item) => item.id === row.dataset.campaignId);
  if (!campaign) return;
  if (field === "enabled") {
    campaign[field] = control.checked;
  } else if (field === "budget" || field === "defaultBid") {
    campaign[field] = control.value;
    if (field === "defaultBid" && campaign.type === "auto" && !campaign.autoTargets) {
      campaign.autoTargets = defaultAutoTargets(Number.parseFloat(control.value) || 0.45);
    }
  } else if (field === "type") {
    campaign[field] = control.value;
    if (control.value === "keyword" || control.value === "videoKeyword") {
      campaign.matchTypes = normalizeKeywordMatchTypes(campaign);
      campaign.keywords ??= keywordLinesForEditor(campaign);
      campaign.keywordBids ??= keywordBidLinesForEditor(campaign);
    }
    if (control.value === "auto" && !campaign.autoTargets) {
      campaign.autoTargets = defaultAutoTargets(readCampaignNumber(campaign, "defaultBid", 0.45));
    }
    if ((control.value === "asin" || control.value === "videoAsin") && !campaign.asinTargets) {
      campaign.asinTargets = defaultAsinTargets(readCampaignNumber(campaign, "defaultBid", 0.45));
    }
    if (isVideoCampaign(campaign)) {
      campaign.creativeAssetId ??= "";
      campaign.brandEntityId ??= "";
      campaign.brandName ??= "";
      campaign.landingPage ??= "";
    }
  } else {
    campaign[field] = control.value;
  }
}

function updateKeywordMatchTypeFromControl(control) {
  const row = control.closest("[data-campaign-id]");
  if (!row) return;
  const campaign = bulkCampaigns.find((item) => item.id === row.dataset.campaignId);
  if (!campaign) return;
  const selected = new Set(normalizeKeywordMatchTypes(campaign));
  if (control.checked) {
    selected.add(control.dataset.matchType);
  } else {
    selected.delete(control.dataset.matchType);
  }
  if (!selected.size) {
    control.checked = true;
    return;
  }
  campaign.matchTypes = matchTypeOptions.map((option) => option.value).filter((type) => selected.has(type));
  campaign.matchType = campaign.matchTypes[0] || "exact";
}

function updateAutoTargetFromControl(control) {
  const row = control.closest("[data-campaign-id]");
  if (!row) return;
  const campaign = bulkCampaigns.find((item) => item.id === row.dataset.campaignId);
  if (!campaign) return;
  if (!campaign.autoTargets) {
    campaign.autoTargets = defaultAutoTargets(readCampaignNumber(campaign, "defaultBid", 0.45));
  }
  const key = control.dataset.autoKey;
  const field = control.dataset.autoField;
  campaign.autoTargets[key] ||= { enabled: true, bid: readCampaignNumber(campaign, "defaultBid", 0.45) };
  if (field === "enabled") {
    campaign.autoTargets[key].enabled = control.checked;
  }
  if (field === "bid") {
    campaign.autoTargets[key].bid = control.value;
  }
}

function updateAsinTargetFromControl(control) {
  const row = control.closest("[data-campaign-id]");
  if (!row) return;
  const campaign = bulkCampaigns.find((item) => item.id === row.dataset.campaignId);
  if (!campaign) return;
  if (!campaign.asinTargets) {
    campaign.asinTargets = defaultAsinTargets(readCampaignNumber(campaign, "defaultBid", 0.45));
  }
  const key = control.dataset.asinType;
  const field = control.dataset.asinField;
  campaign.asinTargets[key] ||= { enabled: true, bid: readCampaignNumber(campaign, "defaultBid", 0.45) };
  if (field === "enabled") {
    campaign.asinTargets[key].enabled = control.checked;
  }
  if (field === "bid") {
    campaign.asinTargets[key].bid = control.value;
  }
}

function duplicateBulkCampaign(id) {
  const campaign = bulkCampaigns.find((item) => item.id === id);
  if (!campaign) return;
  const index = bulkCampaigns.findIndex((item) => item.id === id);
  const copy = {
    ...campaign,
    asinTargets: campaign.asinTargets ? JSON.parse(JSON.stringify(campaign.asinTargets)) : undefined,
    autoTargets: campaign.autoTargets ? JSON.parse(JSON.stringify(campaign.autoTargets)) : undefined,
    id: createId("bulk-campaign"),
    name: `${campaign.name || "Campaign"} Copy`,
    adGroupSuffix: `${campaign.adGroupSuffix || index + 1}-copy`
  };
  bulkCampaigns.splice(index + 1, 0, copy);
}

function deleteBulkCampaign(id) {
  if (bulkCampaigns.filter((campaign) => !isVideoCampaign(campaign)).length <= 1) return;
  bulkCampaigns = bulkCampaigns.filter((campaign) => campaign.id !== id);
}

function productIsUploadable(product) {
  if (product.sku && !isPlaceholderValue(product.sku)) return true;
  return isAsin(product.asin) && !isPlaceholderValue(product.asin);
}

function campaignHasTargets(campaign) {
  const defaultBid = readCampaignNumber(campaign, "defaultBid", 0.45);
  if (campaign.type === "auto") {
    return normalizeAutoTargets(campaign, defaultBid).some((item) => item.enabled);
  }
  if (campaign.type === "asin" || campaign.type === "videoAsin") {
    const asins = parseAsinTargets(campaign.targets);
    const hasTargetType = normalizeAsinTargetTypes(campaign, defaultBid).some((item) => item.enabled);
    return hasTargetType && asins.length > 0 && asins.every((item) => isAsin(item.asin) && !isPlaceholderValue(item.asin));
  }
  const keywords = keywordEntriesForCampaign(campaign, defaultBid);
  const matchTypes = normalizeKeywordMatchTypes(campaign);
  return matchTypes.length > 0 && keywords.length > 0 && keywords.every((item) => item.keyword && !isPlaceholderValue(item.keyword));
}

function campaignHasVideoCreative(campaign) {
  if (!isVideoCampaign(campaign)) return true;
  const products = parseBulkProducts(campaign.products);
  return (
    Boolean(String(campaign.creativeAssetId || "").trim()) &&
    !isPlaceholderValue(campaign.creativeAssetId) &&
    Boolean(String(campaign.brandEntityId || "").trim()) &&
    !isPlaceholderValue(campaign.brandEntityId) &&
    products.some((product) => isAsin(product.asin) && !isPlaceholderValue(product.asin))
  );
}

function getBulkValidation(rows = bulkRows) {
  const portfolioId = byId("bulkPortfolioId").value.trim();
  const activeCampaigns = bulkCampaigns.filter((campaign) => campaign.enabled && !isVideoCampaign(campaign));
  const productsByCampaign = activeCampaigns.map((campaign) => parseBulkProducts(campaign.products));
  const campaignsHaveNames = activeCampaigns.every((campaign, index) => (campaign.name.trim() || defaultCampaignNameFor(campaign, index, byId("bulkMarketplace").value)).length);
  const campaignsHaveNumbers = activeCampaigns.every((campaign) => readCampaignNumber(campaign, "budget", 0) > 0 && readCampaignNumber(campaign, "defaultBid", 0) > 0);
  const campaignsHaveProducts = productsByCampaign.every((products) => products.length > 0 && products.every(productIsUploadable));
  const campaignsHaveTargets = activeCampaigns.every(campaignHasTargets);
  const checks = [
    {
      ok: !portfolioId || (/^\d{5,}$/.test(portfolioId) && !isPlaceholderValue(portfolioId)),
      title: "Portfolio ID（选填）",
      body: "错误报告显示默认假 ID 会触发 EntityID does not exist；没有真实广告组合 ID 时请留空。"
    },
    {
      ok: activeCampaigns.length > 0 && campaignsHaveNames && campaignsHaveNumbers,
      title: "Campaign Rows",
      body: "每一行会生成一个广告活动和一个广告组；名称、预算、默认竞价需完整。"
    },
    {
      ok: activeCampaigns.length > 0 && campaignsHaveProducts,
      title: "Product Ads",
      body: "每个活动至少填写一个真实 SKU 或 10 位 ASIN；只填 ASIN 时会导出到 asin 列，不再生成 SKU-1。"
    },
    {
      ok: campaignsHaveTargets,
      title: "Target Rows",
      body: "关键词需填写关键词并至少选择一个匹配类型；商品投放需填写真实 10 位 ASIN。"
    },
    {
      ok: rows.length <= 1000,
      title: "Bulk Size",
      body: "当前批量表适合一次创建多个活动；行数过大时建议分批上传。"
    }
  ];

  return {
    checks,
    canDownload: checks.every((check) => check.ok),
    message: checks
      .filter((check) => !check.ok)
      .map((check) => check.title)
      .join("、")
  };
}

function renderBulkChecklist(rows) {
  const validation = getBulkValidation(rows);

  byId("bulkChecklist").innerHTML = validation.checks
    .map(
      (check) => `
        <div class="bulk-check ${check.ok ? "good" : "warn"}">
          <i data-lucide="${check.ok ? "check-circle-2" : "alert-triangle"}" aria-hidden="true"></i>
          <div>
            <strong>${check.title}</strong>
            <span>${check.body}</span>
          </div>
        </div>
      `
    )
    .join("");
  return validation;
}

function renderBulkAds() {
  bulkRows = buildBulkRows();
  const campaignCount = bulkRows.filter((row) => row.Entity === "Campaign").length;
  const budgetTotal = bulkRows
    .filter((row) => row.Entity === "Campaign")
    .reduce((sum, row) => sum + (Number.parseFloat(row["Daily Budget"]) || 0), 0);

  byId("bulkRowCount").textContent = bulkRows.length.toLocaleString("zh-CN");
  byId("bulkCampaignCount").textContent = campaignCount.toLocaleString("zh-CN");
  byId("bulkBudgetTotal").textContent = currency.format(budgetTotal);
  byId("bulkPreviewBody").innerHTML = bulkRows
    .slice(0, bulkPreviewLimit)
    .map((row) => {
      const target = row["Keyword Text"]
        ? `${row["Keyword Text"]} · ${row["Match Type"] || "exact"}`
        : row["Product Targeting Expression"]
          ? productTargetPreview(row["Product Targeting Expression"])
          : row["Creative Asset Id"]
            ? `视频素材 ${row["Creative Asset Id"]}`
            : row["Targeting Type"] || "—";
      return `
        <tr>
          <td>${row.Product === "Sponsored Products" ? row.Entity : `${row.Product} / ${row.Entity}`}</td>
          <td>${row["Campaign Name"] || row["Campaign Id"] || "—"}</td>
          <td>${row["Ad Group Name"] || row["Ad Group Id"] || "—"}</td>
          <td>${row["Portfolio Id"] || "—"}</td>
          <td>${target}</td>
          <td>${row.Bid || row["Ad Group Default Bid"] || "—"}</td>
          <td>${row["Bidding Strategy"] || "—"}</td>
          <td>${row.State ? `<span class="status-pill ${row.State === "paused" ? "warn" : "good"}">${row.State}</span>` : "—"}</td>
        </tr>
      `;
    })
    .join("");
  const validation = renderBulkChecklist(bulkRows);
  const downloadButton = byId("downloadBulkButton");
  if (downloadButton) {
    downloadButton.disabled = !validation.canDownload;
    downloadButton.title = validation.canDownload ? "下载亚马逊后台上传表格" : `请先修正：${validation.message}`;
  }
  refreshIcons();
}

function downloadBulkWorkbook() {
  const validation = getBulkValidation(bulkRows);
  if (!validation.canDownload) {
    window.alert(`请先修正后再下载：${validation.message}`);
    return;
  }
  const blob = bulkRowsToXlsxBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sellerops-bulk-ads-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyBulkCsv() {
  const csv = bulkRowsToCsv();
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(csv);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = csv;
  textarea.setAttribute("readonly", "");
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

const promptCategories = [
  { value: "ads", label: "广告优化" },
  { value: "keywords", label: "关键词分类" },
  { value: "other", label: "其他" }
];

let promptCategoryFilter = "all";
let editingPromptId = "";

function promptCategoryLabel(value) {
  return promptCategories.find((category) => category.value === value)?.label || "其他";
}

function readPromptLibrary() {
  try {
    const stored = localStorage.getItem(accountStorageKey("prompts"));
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let promptLibrary = readPromptLibrary();

function savePromptLibrary() {
  if (!currentAccountPhone) return;
  localStorage.setItem(accountStorageKey("prompts"), JSON.stringify(promptLibrary));
  markAccountDataChanged();
}

function setPromptStatus(text) {
  const status = byId("promptStatus");
  if (!status) return;
  status.textContent = text;
  if (text) {
    window.setTimeout(() => {
      status.textContent = "";
    }, 1800);
  }
}

function promptFormValue(id) {
  return byId(id).value.trim();
}

function clearPromptForm() {
  editingPromptId = "";
  byId("promptTitleInput").value = "";
  byId("promptCategoryInput").value = "ads";
  byId("promptTagsInput").value = "";
  byId("promptContentInput").value = "";
  byId("promptNoteInput").value = "";
  setPromptStatus("");
}

function renderPromptCategoryOptions() {
  byId("promptCategoryInput").innerHTML = promptCategories
    .map((category) => `<option value="${category.value}">${category.label}</option>`)
    .join("");
}

function renderPromptTabs() {
  const categories = [{ value: "all", label: "全部" }, ...promptCategories];
  byId("promptCategoryTabs").innerHTML = categories
    .map(
      (category) => `
        <button class="prompt-tab ${promptCategoryFilter === category.value ? "is-selected" : ""}" type="button" data-prompt-category="${category.value}">
          ${category.label}
        </button>
      `
    )
    .join("");
}

function promptSearchText(prompt) {
  return [prompt.title, prompt.category, prompt.tags, prompt.content, prompt.note].join(" ").toLowerCase();
}

function filteredPrompts() {
  const query = byId("promptSearchInput")?.value.trim().toLowerCase() || "";
  return promptLibrary
    .filter((prompt) => promptCategoryFilter === "all" || prompt.category === promptCategoryFilter)
    .filter((prompt) => !query || promptSearchText(prompt).includes(query))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

function promptExcerpt(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > 150 ? `${text.slice(0, 150)}...` : text;
}

function renderPromptList() {
  const prompts = filteredPrompts();
  byId("promptList").innerHTML = prompts.length
    ? prompts
        .map(
          (prompt) => `
            <article class="prompt-card" data-prompt-id="${prompt.id}">
              <div class="prompt-card-top">
                <h3>${escapeHtml(prompt.title || "未命名提示词")}</h3>
                <span class="prompt-category-pill">${escapeHtml(promptCategoryLabel(prompt.category))}</span>
              </div>
              <p>${escapeHtml(promptExcerpt(prompt.content) || "暂无内容")}</p>
              ${prompt.tags ? `<p>${escapeHtml(prompt.tags)}</p>` : ""}
              <div class="prompt-card-actions">
                <button class="icon-text-button" type="button" data-prompt-action="edit" title="编辑提示词">
                  <i data-lucide="edit-3" aria-hidden="true"></i>
                  <span>编辑</span>
                </button>
                <button class="icon-text-button" type="button" data-prompt-action="copy" title="复制提示词">
                  <i data-lucide="copy" aria-hidden="true"></i>
                  <span>复制</span>
                </button>
                <button class="icon-text-button" type="button" data-prompt-action="copy-open" title="复制提示词并打开 ChatGPT">
                  <i data-lucide="external-link" aria-hidden="true"></i>
                  <span>复制并打开</span>
                </button>
                <button class="icon-text-button" type="button" data-prompt-action="delete" title="删除提示词">
                  <i data-lucide="trash-2" aria-hidden="true"></i>
                  <span>删除</span>
                </button>
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="prompt-empty">还没有提示词</div>`;
  refreshIcons();
}

function renderPromptLibrary() {
  renderPromptCategoryOptions();
  renderPromptTabs();
  renderPromptList();
}

function fillPromptForm(id) {
  const prompt = promptLibrary.find((item) => item.id === id);
  if (!prompt) return;
  editingPromptId = prompt.id;
  byId("promptTitleInput").value = prompt.title || "";
  byId("promptCategoryInput").value = prompt.category || "other";
  byId("promptTagsInput").value = prompt.tags || "";
  byId("promptContentInput").value = prompt.content || "";
  byId("promptNoteInput").value = prompt.note || "";
  setPromptStatus("已载入");
}

function savePromptFromForm() {
  const now = new Date().toISOString();
  const title = promptFormValue("promptTitleInput") || "未命名提示词";
  const prompt = {
    id: editingPromptId || createId("prompt"),
    title,
    category: byId("promptCategoryInput").value || "other",
    tags: promptFormValue("promptTagsInput"),
    content: promptFormValue("promptContentInput"),
    note: promptFormValue("promptNoteInput"),
    updatedAt: now
  };
  const index = promptLibrary.findIndex((item) => item.id === prompt.id);
  if (index >= 0) {
    promptLibrary[index] = { ...promptLibrary[index], ...prompt };
  } else {
    promptLibrary.unshift({ ...prompt, createdAt: now });
  }
  editingPromptId = prompt.id;
  savePromptLibrary();
  renderPromptList();
  setPromptStatus("已保存");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function openChatGpt() {
  window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
}

async function copyPromptById(id) {
  const prompt = promptLibrary.find((item) => item.id === id);
  if (!prompt) return;
  await copyText(prompt.content || "");
  setPromptStatus("已复制");
}

async function copyPromptByIdAndOpen(id) {
  await copyPromptById(id);
  openChatGpt();
}

async function copyCurrentPrompt() {
  await copyText(promptFormValue("promptContentInput"));
  setPromptStatus("已复制");
}

async function copyCurrentPromptAndOpen() {
  await copyCurrentPrompt();
  openChatGpt();
}

function deletePrompt(id) {
  promptLibrary = promptLibrary.filter((prompt) => prompt.id !== id);
  if (editingPromptId === id) clearPromptForm();
  savePromptLibrary();
  renderPromptList();
  setPromptStatus("已删除");
}

function exportPromptLibrary() {
  const payload = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      prompts: promptLibrary
    },
    null,
    2
  );
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sellerops-prompts-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importPromptLibrary(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const imported = Array.isArray(parsed) ? parsed : parsed.prompts;
  if (!Array.isArray(imported)) throw new Error("Invalid prompt file");
  const normalized = imported
    .filter((prompt) => prompt && (prompt.title || prompt.content))
    .map((prompt) => ({
      id: prompt.id || createId("prompt"),
      title: prompt.title || "未命名提示词",
      category: prompt.category || "other",
      tags: prompt.tags || "",
      content: prompt.content || "",
      note: prompt.note || "",
      createdAt: prompt.createdAt || new Date().toISOString(),
      updatedAt: prompt.updatedAt || new Date().toISOString()
    }));
  const existingIds = new Set(promptLibrary.map((prompt) => prompt.id));
  promptLibrary = [...normalized.filter((prompt) => !existingIds.has(prompt.id)), ...promptLibrary];
  savePromptLibrary();
  renderPromptList();
  setPromptStatus(`已导入 ${normalized.length} 条`);
}

const taskGroups = [
  { value: "today", label: "今日", title: "今日任务" },
  { value: "week", label: "本周", title: "本周任务" },
  { value: "weekend", label: "周末必做", title: "每周末必做" },
  { value: "monthEnd", label: "月底必做", title: "每月底必做" }
];

function normalizeTaskType(type) {
  return taskGroups.some((group) => group.value === type) ? type : "today";
}

function defaultTasks() {
  return [
    { id: createId("task"), title: "检查风险 SKU 的库存覆盖天数", type: "today", done: false },
    { id: createId("task"), title: "整理 ACOS 超目标广告组的否定词", type: "today", done: false },
    { id: createId("task"), title: "更新 Travel Mug 标题关键词顺序", type: "week", done: false },
    { id: createId("task"), title: "复盘本周广告花费、ACOS 和否定词", type: "weekend", done: false },
    { id: createId("task"), title: "检查本周库存风险并安排下周补货动作", type: "weekend", done: false },
    { id: createId("task"), title: "汇总本月销售额、利润率、广告花费和库存现金占用", type: "monthEnd", done: false },
    { id: createId("task"), title: "备份本月广告导出与运营记录", type: "monthEnd", done: false }
  ];
}

function readTasks() {
  try {
    const stored = localStorage.getItem(accountStorageKey("tasks"));
    const parsed = stored ? JSON.parse(stored) : defaultTasks();
    return Array.isArray(parsed)
      ? parsed
          .filter((task) => task && typeof task === "object" && task.title && task.type !== "watch")
          .map((task) => ({
            id: task.id || createId("task"),
            title: String(task.title),
            type: normalizeTaskType(task.type),
            done: Boolean(task.done)
          }))
      : defaultTasks();
  } catch {
    return defaultTasks();
  }
}

let tasks = readTasks();

function saveTasks() {
  if (!currentAccountPhone) return;
  localStorage.setItem(accountStorageKey("tasks"), JSON.stringify(tasks));
  markAccountDataChanged();
}

function renderTasks() {
  const labels = Object.fromEntries(taskGroups.map((group) => [group.value, group.label]));
  byId("taskList").innerHTML = taskGroups
    .map((group) => {
      const groupTasks = tasks.filter((task) => normalizeTaskType(task.type) === group.value);
      const doneCount = groupTasks.filter((task) => task.done).length;
      const items = groupTasks.length
        ? groupTasks
            .map(
              (task) => `
                <label class="task-item ${task.done ? "is-done" : ""}">
                  <input type="checkbox" data-task-id="${escapeHtml(task.id)}" ${task.done ? "checked" : ""} />
                  <span class="task-title">${escapeHtml(task.title)}</span>
                  <span class="task-badge ${normalizeTaskType(task.type)}">${labels[normalizeTaskType(task.type)]}</span>
                </label>
              `
            )
            .join("")
        : `<div class="task-empty">暂无任务</div>`;

      return `
        <section class="task-section" data-task-section="${group.value}">
          <div class="task-section-heading">
            <strong>${group.title}</strong>
            <span>${doneCount}/${groupTasks.length}</span>
          </div>
          <div class="task-section-list">${items}</div>
        </section>
      `;
    })
    .join("");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some(Boolean));
}

function importCsv(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const rows = parseCsv(String(reader.result || ""));
    const [headers, ...records] = rows;
    if (!headers || !records.length) return;
    const keys = headers.map((header) => header.trim().toLowerCase());
    const imported = records.map((record) => {
      const get = (name, fallback = "") => {
        const index = keys.indexOf(name);
        return index >= 0 ? record[index] : fallback;
      };
      const revenue = Number.parseFloat(get("revenue", "0")) || 0;
      const units = Number.parseFloat(get("units", "0")) || 0;
      return {
        sku: get("sku", "NEW-SKU"),
        name: get("name", "Imported SKU"),
        asin: get("asin", "-"),
        marketplace: get("marketplace", "US").toUpperCase(),
        revenue,
        units,
        sessions: Number.parseFloat(get("sessions", String(units * 18))) || units * 18,
        margin: (Number.parseFloat(get("margin", "25")) || 25) / 100,
        acos: (Number.parseFloat(get("acos", "24")) || 24) / 100,
        stock: Number.parseFloat(get("stock", "0")) || 0,
        daily: Number.parseFloat(get("daily", "1")) || 1,
        inbound: Number.parseFloat(get("inbound", "0")) || 0,
        status: get("status", "stable").toLowerCase()
      };
    });
    state.skus = imported;
    saveAccountSkus();
    renderAll();
  });
  reader.readAsText(file);
}

function exportSnapshot() {
  const headers = ["sku", "name", "asin", "marketplace", "revenue", "units", "margin", "acos", "stock", "daily", "inbound", "status"];
  const rows = state.skus.map((item) =>
    headers
      .map((key) => {
        const value = key === "margin" || key === "acos" ? Math.round(item[key] * 1000) / 10 : item[key];
        return `"${String(value).replaceAll('"', '""')}"`;
      })
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sellerops-snapshot-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  }
}

window.refreshIcons = refreshIcons;

function setAuthStatus(message) {
  const status = byId("authStatus");
  if (status) status.textContent = message || "";
}

function renderAccountState() {
  const isLoggedIn = Boolean(currentAccountPhone);
  byId("authScreen").hidden = isLoggedIn;
  byId("appShell").hidden = !isLoggedIn;
  const phone = byId("currentAccountPhone");
  if (phone) phone.textContent = maskPhone(currentAccountPhone);
  refreshIcons();
}

function migrateLegacyDataForFirstAccount() {
  [
    ["sellerops.prompts", "prompts"],
    ["sellerops.tasks", "tasks"]
  ].forEach(([legacyKey, accountKey]) => {
    const legacyValue = localStorage.getItem(legacyKey);
    const scopedKey = accountStorageKey(accountKey);
    if (legacyValue && !localStorage.getItem(scopedKey)) {
      localStorage.setItem(scopedKey, legacyValue);
    }
  });
}

function loadAccountData() {
  state.skus = readAccountSkus();
  bulkCampaigns = readBulkCampaigns();
  promptLibrary = readPromptLibrary();
  tasks = readTasks();
  promptCategoryFilter = "all";
  editingPromptId = "";
  applyBulkSettings();
  renderAccountState();
  renderAll();
}

async function registerOrLogin(phone, password) {
  const accounts = readAccounts();
  const firstAccount = Object.keys(accounts).length === 0;
  const existing = accounts[phone];
  const hash = passwordHash(phone, password);
  if (existing?.passwordHash && existing.passwordHash !== hash) {
    setAuthStatus("密码不正确，请重新输入。");
    byId("passwordInput").select();
    return false;
  }
  currentAccountPhone = phone;
  currentAccountPasswordHash = hash;
  const cloudLogin = await loginCloudAccount(phone, hash, Boolean(existing));
  accounts[phone] = {
    ...existing,
    phone,
    createdAt: existing?.createdAt || new Date().toISOString(),
    passwordHash: existing?.passwordHash || hash,
    lastLoginAt: new Date().toISOString()
  };
  saveAccounts(accounts);
  localStorage.setItem(currentAccountKey, phone);
  if (firstAccount && !existing) migrateLegacyDataForFirstAccount();
  loadAccountData();
  if (!cloudLogin.ok) {
    setAuthStatus("云端同步暂不可用，已使用本机数据登录。");
  } else {
    setAuthStatus("");
  }
  byId("passwordInput").value = "";
  return true;
}

function logoutAccount() {
  byId("negativeKeywordForm").reset();
  resetNegativeKeywordResults("请粘贴关键词并填写产品相关词根。");
  currentAccountPhone = "";
  currentAccountPasswordHash = "";
  cloudSyncEnabled = true;
  bulkCampaigns = defaultBulkCampaigns();
  promptLibrary = [];
  tasks = defaultTasks();
  byId("phoneInput").value = "";
  byId("passwordInput").value = "";
  setAuthStatus("");
  renderAccountState();
}

function bootstrapAuth() {
  if (currentAccountPhone && isValidPhone(currentAccountPhone)) byId("phoneInput").value = currentAccountPhone;
  currentAccountPhone = "";
  currentAccountPasswordHash = "";
  renderAccountState();
  setCloudSyncStatus("本地", "local");
  refreshExchangeRate();
}

async function handleAuthSubmit(event) {
  event?.preventDefault();
  const phone = normalizePhone(byId("phoneInput").value);
  const password = byId("passwordInput").value;
  if (!isValidPhone(phone)) {
    setAuthStatus("请输入有效的 11 位手机号。");
    return false;
  }
  if (!isValidPassword(password)) {
    setAuthStatus("密码至少需要 6 位。");
    byId("passwordInput").focus();
    return false;
  }
  setAuthStatus("");
  try {
    await registerOrLogin(phone, password);
  } catch (error) {
    if (error.status === 401) {
      currentAccountPhone = "";
      currentAccountPasswordHash = "";
      setAuthStatus("密码不正确，请重新输入。");
      byId("passwordInput").select();
      renderAccountState();
    } else {
      setAuthStatus("登录失败，请稍后重试。");
    }
  }
  return false;
}

window.handleAuthSubmit = handleAuthSubmit;

function renderAll() {
  updateKpis();
  renderSkuTable();
  updateFbaCalculator();
  updateProfit();
  updateInventory();
  renderBulkCampaignTable();
  renderBulkAds();
  renderPromptLibrary();
  renderTasks();
}

function filterNegativeKeywords(input, rootInput, mode = "word") {
  const normalize = (value) => value.trim().replace(/\s+/gu, " ").toLowerCase();
  const lines = input.split(/\r?\n/u).map((line) => line.trim().replace(/\s+/gu, " ")).filter(Boolean);
  const keywords = [...new Map(lines.map((line) => [normalize(line), line])).values()];
  const roots = [...new Set(rootInput.split(/[\r\n,，]+/u).map(normalize).filter(Boolean))];
  if (!roots.length) throw new Error("请填写至少一个产品相关词根，例如产品名称或同义词。");
  const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = roots.map((root) => new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escapePattern(root)}(?=$|[^\\p{L}\\p{N}_])`, "u"));
  const results = keywords.filter((keyword) => {
    const value = normalize(keyword);
    return !roots.some((root, index) => mode === "contains" ? value.includes(root) : patterns[index].test(value));
  });
  return { results, total: lines.length, unique: keywords.length, duplicates: lines.length - keywords.length };
}

function resetNegativeKeywordResults(message = "输入已更新，请重新筛选。") {
  byId("negativeKeywordOutput").value = "";
  byId("negativeKeywordStatus").textContent = message;
  byId("copyNegativeKeywords").disabled = true;
  byId("downloadNegativeKeywords").disabled = true;
}

function bindNegativeKeywordEvents() {
  byId("negativeKeywordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const result = filterNegativeKeywords(byId("negativeKeywordInput").value, byId("negativeKeywordRoots").value, byId("negativeKeywordMode").value);
      if (!result.total) { resetNegativeKeywordResults("请先粘贴关键词，每行一个。"); return; }
      byId("negativeKeywordOutput").value = result.results.join("\n");
      byId("negativeKeywordStatus").textContent = `原始 ${result.total} 条 · 去重 ${result.duplicates} 条 · 命中相关词根 ${result.unique - result.results.length} 条 · 待否定候选 ${result.results.length} 条`;
      byId("copyNegativeKeywords").disabled = !result.results.length;
      byId("downloadNegativeKeywords").disabled = !result.results.length;
    } catch (error) { resetNegativeKeywordResults(error.message); }
  });
  ["negativeKeywordInput", "negativeKeywordRoots", "negativeKeywordMode"].forEach((id) => {
    byId(id).addEventListener("input", () => resetNegativeKeywordResults());
  });
  byId("copyNegativeKeywords").addEventListener("click", async () => {
    const output = byId("negativeKeywordOutput");
    if (!output.value) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(output.value);
      else { output.focus(); output.select(); if (!document.execCommand("copy")) throw new Error("copy"); }
      byId("negativeKeywordStatus").textContent = `已复制 ${output.value.split("\n").length} 条待否定候选。`;
    } catch { byId("negativeKeywordStatus").textContent = "复制失败，请选中结果手动复制。"; }
  });
  byId("downloadNegativeKeywords").addEventListener("click", () => {
    const value = byId("negativeKeywordOutput").value;
    if (!value) return;
    const url = URL.createObjectURL(new Blob(["\ufeff", value], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "待否定候选关键词.txt";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

function bindEvents() {
  bindNegativeKeywordEvents();
  byId("authForm").addEventListener("submit", handleAuthSubmit);

  byId("logoutButton").addEventListener("click", logoutAccount);

  byId("marketplaceSelect").addEventListener("change", (event) => {
    state.marketplace = event.target.value;
    renderAll();
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      byId(button.dataset.target).scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll(".segmented button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".segmented button").forEach((item) => item.classList.remove("is-selected"));
      button.classList.add("is-selected");
      state.skuFilter = button.dataset.filter;
      renderAll();
    });
  });

  byId("profitMarketplace").addEventListener("change", () => {
    const config = getProfitMarketplaceConfig();
    exchangeRateManuallyEdited = false;
    byId("usdCnyRate").value = config.defaultRate.toFixed(2);
    updateProfitCurrencyLabels();
    updateFbaCalculator();
    updateProfit();
    refreshExchangeRate();
  });
  byId("profitForm").addEventListener("input", (event) => {
    if (event.target.id === "usdCnyRate") {
      exchangeRateManuallyEdited = true;
      setExchangeRateStatus("使用手动汇率");
    }
    if (["salePrice", "fulfillmentMethod"].includes(event.target.id)) updateFbaCalculator();
    updateProfit();
  });
  byId("fbaFeeForm").addEventListener("input", () => {
    updateFbaCalculator();
    updateProfit();
  });
  byId("inventoryForm").addEventListener("input", updateInventory);
  if (!byId("bulkStartDate").value) {
    byId("bulkStartDate").value = todayInputValue();
  }
  byId("bulkAdsForm").addEventListener("input", () => {
    saveBulkSettings();
    renderBulkAds();
  });
  byId("bulkAdsForm").addEventListener("change", () => {
    saveBulkSettings();
    renderBulkAds();
  });
  byId("addBulkCampaignButton").addEventListener("click", () => {
    bulkCampaigns.push(createBulkCampaign());
    saveBulkCampaigns();
    renderBulkCampaignTable();
    renderBulkAds();
  });
  byId("bulkCampaignTableBody").addEventListener("input", (event) => {
    const autoControl = event.target.closest("[data-auto-key]");
    if (autoControl) {
      updateAutoTargetFromControl(autoControl);
      saveBulkCampaigns();
      renderBulkAds();
      return;
    }
    const asinControl = event.target.closest("[data-asin-type]");
    if (asinControl) {
      updateAsinTargetFromControl(asinControl);
      saveBulkCampaigns();
      renderBulkAds();
      return;
    }
    const control = event.target.closest("[data-field]");
    if (!control) return;
    updateBulkCampaignFromControl(control);
    saveBulkCampaigns();
    renderBulkAds();
  });
  byId("bulkCampaignTableBody").addEventListener("change", (event) => {
    const matchControl = event.target.closest("[data-match-type]");
    if (matchControl) {
      updateKeywordMatchTypeFromControl(matchControl);
      saveBulkCampaigns();
      renderBulkAds();
      return;
    }
    const autoControl = event.target.closest("[data-auto-key]");
    if (autoControl) {
      updateAutoTargetFromControl(autoControl);
      saveBulkCampaigns();
      renderBulkAds();
      return;
    }
    const asinControl = event.target.closest("[data-asin-type]");
    if (asinControl) {
      updateAsinTargetFromControl(asinControl);
      saveBulkCampaigns();
      renderBulkAds();
      return;
    }
    const control = event.target.closest("[data-field]");
    if (!control) return;
    updateBulkCampaignFromControl(control);
    saveBulkCampaigns();
    if (control.dataset.field === "type") {
      renderBulkCampaignTable();
    }
    renderBulkAds();
  });
  byId("bulkCampaignTableBody").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const row = button.closest("[data-campaign-id]");
    if (!row) return;
    if (button.dataset.action === "duplicate") {
      duplicateBulkCampaign(row.dataset.campaignId);
    }
    if (button.dataset.action === "delete") {
      deleteBulkCampaign(row.dataset.campaignId);
    }
    saveBulkCampaigns();
    renderBulkCampaignTable();
    renderBulkAds();
  });
  byId("downloadBulkButton").addEventListener("click", downloadBulkWorkbook);
  byId("copyBulkButton").addEventListener("click", () => {
    copyBulkCsv().catch(() => {});
  });

  byId("promptForm").addEventListener("submit", (event) => {
    event.preventDefault();
    savePromptFromForm();
  });
  byId("newPromptButton").addEventListener("click", () => {
    clearPromptForm();
    setPromptStatus("已新建");
  });
  byId("copyCurrentPromptButton").addEventListener("click", () => {
    copyCurrentPrompt().catch(() => setPromptStatus("复制失败"));
  });
  byId("copyOpenChatGptButton").addEventListener("click", () => {
    copyCurrentPromptAndOpen().catch(() => setPromptStatus("打开失败"));
  });
  byId("openChatGptButton").addEventListener("click", openChatGpt);
  byId("promptSearchInput").addEventListener("input", renderPromptList);
  byId("promptCategoryTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-prompt-category]");
    if (!button) return;
    promptCategoryFilter = button.dataset.promptCategory;
    renderPromptTabs();
    renderPromptList();
  });
  byId("promptList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-prompt-action]");
    if (!button) return;
    const card = button.closest("[data-prompt-id]");
    if (!card) return;
    const id = card.dataset.promptId;
    if (button.dataset.promptAction === "edit") fillPromptForm(id);
    if (button.dataset.promptAction === "copy") copyPromptById(id).catch(() => setPromptStatus("复制失败"));
    if (button.dataset.promptAction === "copy-open") copyPromptByIdAndOpen(id).catch(() => setPromptStatus("打开失败"));
    if (button.dataset.promptAction === "delete") deletePrompt(id);
  });
  byId("exportPromptButton").addEventListener("click", exportPromptLibrary);
  byId("importPromptButton").addEventListener("click", () => byId("promptImportInput").click());
  byId("promptImportInput").addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) {
      importPromptLibrary(file).catch(() => {
        setPromptStatus("导入失败");
      });
    }
    event.target.value = "";
  });

  byId("taskForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = byId("taskInput");
    const title = input.value.trim();
    if (!title) return;
    tasks.unshift({
      id: createId("task"),
      title,
      type: byId("taskType").value,
      done: false
    });
    input.value = "";
    saveTasks();
    renderTasks();
  });

  byId("taskList").addEventListener("change", (event) => {
    const checkbox = event.target.closest("input[type='checkbox']");
    if (!checkbox) return;
    tasks = tasks.map((task) => (task.id === checkbox.dataset.taskId ? { ...task, done: checkbox.checked } : task));
    saveTasks();
    renderTasks();
  });

  byId("clearDoneButton").addEventListener("click", () => {
    tasks = tasks.filter((task) => !task.done);
    saveTasks();
    renderTasks();
  });

  byId("importButton").addEventListener("click", () => byId("csvInput").click());
  byId("csvInput").addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (file) importCsv(file);
    event.target.value = "";
  });
  byId("exportButton").addEventListener("click", exportSnapshot);
}

bindEvents();
bootstrapAuth();
