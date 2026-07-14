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
  { value: "Fixed bids", label: "固定竞价" }
];

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
  "Sites"
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
  const riskCount = items.filter((item) => item.status === "risk").length;
  const health = Math.max(
    0,
    Math.min(100, Math.round(72 + margin * 50 - acos * 32 + Math.min(cover, 60) * 0.28 - riskCount * 5))
  );

  byId("revenueKpi").textContent = currency.format(revenue);
  byId("marginKpi").textContent = percent.format(margin);
  byId("acosKpi").textContent = percent.format(acos);
  byId("coverKpi").textContent = `${Math.round(cover)} 天`;
  byId("cvrKpi").textContent = percent.format(cvr);
  byId("healthScore").textContent = String(health);
  byId("healthBar").style.width = `${health}%`;
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

function updateProfit() {
  const price = numberValue("salePrice");
  const unitCost = numberValue("unitCost");
  const referralRate = numberValue("referralRate") / 100;
  const fba = numberValue("fbaFee");
  const ad = numberValue("adCost");
  const shipping = numberValue("shippingCost");
  const refundRate = numberValue("refundRate") / 100;
  const targetMargin = numberValue("targetMargin") / 100;
  const refundReserve = price * refundRate * 0.18;
  const referral = price * referralRate;
  const profit = price - unitCost - referral - fba - ad - shipping - refundReserve;
  const margin = price ? profit / price : 0;
  const breakEven = price ? (price - unitCost - referral - fba - shipping - refundReserve) / price : 0;
  const denominator = 1 - referralRate - refundRate * 0.18 - targetMargin;
  const minPrice = denominator > 0 ? (unitCost + fba + ad + shipping) / denominator : 0;

  byId("profitValue").textContent = money.format(profit);
  byId("profitMargin").textContent = percent.format(margin);
  byId("breakEvenAcos").textContent = percent.format(Math.max(0, breakEven));
  byId("minPrice").textContent = money.format(Math.max(0, minPrice));
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

function getBulkSettings() {
  return {
    portfolioId: byId("bulkPortfolioId").value.trim(),
    marketplace: byId("bulkMarketplace").value,
    startDate: formatBulkDate(byId("bulkStartDate").value),
    biddingStrategy: byId("bulkBiddingStrategy").value
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
}

function readBulkCampaigns() {
  const campaigns = readJsonStorage(accountStorageKey("bulkCampaigns"), defaultBulkCampaigns);
  return Array.isArray(campaigns) && campaigns.length ? campaigns : defaultBulkCampaigns();
}

function saveBulkCampaigns() {
  if (!currentAccountPhone) return;
  writeJsonStorage(accountStorageKey("bulkCampaigns"), bulkCampaigns);
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
  byId("bulkBiddingStrategy").value = settings.biddingStrategy || "Dynamic bids - up and down";
}

function saveBulkSettings() {
  if (!currentAccountPhone) return;
  writeJsonStorage(accountStorageKey("bulkSettings"), getBulkSettings());
}

function readCampaignNumber(campaign, field, fallback) {
  const value = Number.parseFloat(campaign[field]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function defaultCampaignName(index, marketplace) {
  return `SP-${marketplace}-Campaign-${index + 1}`;
}

function adGroupNameFor(campaign, campaignName) {
  const suffix = String(campaign.adGroupSuffix || "1").trim();
  return `${campaignName}-AG-${suffix || "1"}`;
}

function targetPlaceholderFor(type) {
  if (type === "asin") return "商品 ASIN，每行一个";
  if (type === "auto") return "使用右侧四个自动投放分组";
  return "travel mug, 0.95";
}

function createBulkCampaign(overrides = {}) {
  const nextNumber = bulkCampaigns.length + 1;
  const marketplace = byId("bulkMarketplace")?.value || "US";
  const defaultBiddingStrategy = byId("bulkBiddingStrategy")?.value || "Dynamic bids - up and down";
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
    asinTargets: defaultAsinTargets(0.45),
    autoTargets: defaultAutoTargets(0.45),
    negativeMatchTypes: ["negative exact"],
    negativeExact: "",
    negativePhrase: "",
    negatives: "",
    ...overrides
  };
}

function buildProductAdRows(products, campaignName, adGroupName) {
  return products.map((product) =>
    createBulkRow({
      Entity: "Product ad",
      "Campaign Id": campaignName,
      "Ad Group Id": adGroupName,
      sku: product.sku || "",
      asin: product.sku ? "" : product.asin
    })
  );
}

function buildTargetRows(campaign, campaignName, adGroupName, defaultBid) {
  if (campaign.type === "asin") {
    const asins = parseAsinTargets(campaign.targets).filter((item) => item.asin);
    const targetTypes = normalizeAsinTargetTypes(campaign, defaultBid).filter((item) => item.enabled);
    return asins.flatMap((asinItem) =>
      targetTypes.map((targetType) =>
        createBulkRow({
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
      createBulkRow({
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
      createBulkRow({
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
  const campaignName = campaign.name.trim() || defaultCampaignName(index, settings.marketplace);
  const adGroupName = adGroupNameFor(campaign, campaignName);
  const budget = readCampaignNumber(campaign, "budget", 10);
  const defaultBid = readCampaignNumber(campaign, "defaultBid", 0.45);
  const biddingStrategy = campaign.biddingStrategy || settings.biddingStrategy;
  const targetingType = campaign.type === "auto" ? "auto" : "manual";
  const products = parseBulkProducts(campaign.products);
  const negatives = negativeEntriesForCampaign(campaign);

  return [
    createBulkRow({
      Entity: "Campaign",
      "Campaign Id": campaignName,
      "Portfolio Id": settings.portfolioId,
      "Campaign Name": campaignName,
      "Start Date": settings.startDate,
      "Targeting Type": targetingType === "auto" ? "Auto" : "Manual",
      "Daily Budget": budget,
      "Bidding Strategy": biddingStrategy
    }),
    ...["placement top", "placement rest of search", "placement product page"].map((placement) =>
      createBulkRow({
        Entity: "Bidding adjustment",
        "Campaign Id": campaignName,
        State: "",
        "Bidding Strategy": biddingStrategy,
        Placement: placement,
        Percentage: 0
      })
    ),
    createBulkRow({
      Entity: "Ad group",
      "Campaign Id": campaignName,
      "Ad Group Id": adGroupName,
      "Ad Group Name": adGroupName,
      "Ad Group Default Bid": defaultBid
    }),
    ...buildProductAdRows(products, campaignName, adGroupName),
    ...buildTargetRows(campaign, campaignName, adGroupName, defaultBid),
    ...negatives.map((item) =>
      createBulkRow({
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
    .filter((campaign) => campaign.enabled)
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

const referenceColumnWidths = [12, 16, 8, 20, 20, 12, 8, 10, 14, 20, 20, 10, 10, 10, 8, 10, 14, 14, 14, 8, 14, 10, 22, 20, 10, 28, 12, 16, 16, 14];

function styleIndexForEntity(entity) {
  const styles = {
    Campaign: 2,
    "Bidding adjustment": 3,
    "Ad group": 4,
    "Product ad": 5,
    "Product targeting": 6,
    Keyword: 7,
    "Negative Keyword": 7
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
  <sheets><sheet name="Sponsored Products" sheetId="1" r:id="rId1"/></sheets>
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
              <option value="keyword" ${campaign.type === "keyword" ? "selected" : ""}>关键词投放</option>
              <option value="asin" ${campaign.type === "asin" ? "selected" : ""}>商品投放（ASIN）</option>
              <option value="auto" ${campaign.type === "auto" ? "selected" : ""}>自动投放</option>
            </select>
          </td>
          <td>
            ${
              campaign.type === "keyword"
                ? renderKeywordMatchTypeEditor(campaign)
                : `<span class="disabled-cell">不适用</span>`
            }
          </td>
          <td>
            <input data-field="adGroupSuffix" type="text" value="${escapeHtml(campaign.adGroupSuffix)}" placeholder="1" />
          </td>
          <td>
            <select data-field="biddingStrategy" aria-label="竞价方案">
              ${optionTags(biddingStrategyOptions, campaign.biddingStrategy || "Dynamic bids - up and down")}
            </select>
          </td>
          <td>
            <input data-field="budget" type="number" min="1" step="1" value="${escapeHtml(campaign.budget)}" />
          </td>
          <td>
            <input data-field="defaultBid" type="number" min="0.02" step="0.01" value="${escapeHtml(campaign.defaultBid)}" />
          </td>
          <td>
            <textarea data-field="products" rows="3" placeholder="B0ASIN0001, SKU">${escapeHtml(campaign.products)}</textarea>
          </td>
          <td>
            ${
              campaign.type === "auto"
                ? renderAutoTargetEditor(campaign)
                : campaign.type === "asin"
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
    if (control.value === "keyword") {
      campaign.matchTypes = normalizeKeywordMatchTypes(campaign);
      campaign.keywords ??= keywordLinesForEditor(campaign);
      campaign.keywordBids ??= keywordBidLinesForEditor(campaign);
    }
    if (control.value === "auto" && !campaign.autoTargets) {
      campaign.autoTargets = defaultAutoTargets(readCampaignNumber(campaign, "defaultBid", 0.45));
    }
    if (control.value === "asin" && !campaign.asinTargets) {
      campaign.asinTargets = defaultAsinTargets(readCampaignNumber(campaign, "defaultBid", 0.45));
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
  if (bulkCampaigns.length === 1) return;
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
  if (campaign.type === "asin") {
    const asins = parseAsinTargets(campaign.targets);
    const hasTargetType = normalizeAsinTargetTypes(campaign, defaultBid).some((item) => item.enabled);
    return hasTargetType && asins.length > 0 && asins.every((item) => isAsin(item.asin) && !isPlaceholderValue(item.asin));
  }
  const keywords = keywordEntriesForCampaign(campaign, defaultBid);
  const matchTypes = normalizeKeywordMatchTypes(campaign);
  return matchTypes.length > 0 && keywords.length > 0 && keywords.every((item) => item.keyword && !isPlaceholderValue(item.keyword));
}

function getBulkValidation(rows = bulkRows) {
  const portfolioId = byId("bulkPortfolioId").value.trim();
  const activeCampaigns = bulkCampaigns.filter((campaign) => campaign.enabled);
  const productsByCampaign = activeCampaigns.map((campaign) => parseBulkProducts(campaign.products));
  const campaignsHaveNames = activeCampaigns.every((campaign, index) => (campaign.name.trim() || defaultCampaignName(index, byId("bulkMarketplace").value)).length);
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
      body: "关键词投放需填写关键词并至少选择一个匹配类型；竞价可用批量竞价，也可逐行覆盖。商品投放（ASIN）需填写真实 10 位 ASIN。"
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
          : row["Targeting Type"] || "—";
      return `
        <tr>
          <td>${row.Entity}</td>
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
  { value: "main-image", label: "主图生成" },
  { value: "aplus", label: "A+ 生成" },
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

function registerOrLogin(phone, password) {
  const accounts = readAccounts();
  const firstAccount = Object.keys(accounts).length === 0;
  const existing = accounts[phone];
  const hash = passwordHash(phone, password);
  if (existing?.passwordHash && existing.passwordHash !== hash) {
    setAuthStatus("密码不正确，请重新输入。");
    byId("passwordInput").select();
    return false;
  }
  accounts[phone] = {
    ...existing,
    phone,
    createdAt: existing?.createdAt || new Date().toISOString(),
    passwordHash: existing?.passwordHash || hash,
    lastLoginAt: new Date().toISOString()
  };
  saveAccounts(accounts);
  currentAccountPhone = phone;
  localStorage.setItem(currentAccountKey, phone);
  if (firstAccount && !existing) migrateLegacyDataForFirstAccount();
  loadAccountData();
  byId("passwordInput").value = "";
  return true;
}

function logoutAccount() {
  currentAccountPhone = "";
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
  renderAccountState();
}

function handleAuthSubmit(event) {
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
  registerOrLogin(phone, password);
  return false;
}

window.handleAuthSubmit = handleAuthSubmit;

function renderAll() {
  updateKpis();
  renderSkuTable();
  updateProfit();
  updateInventory();
  renderBulkCampaignTable();
  renderBulkAds();
  renderPromptLibrary();
  renderTasks();
}

function bindEvents() {
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

  byId("profitForm").addEventListener("input", updateProfit);
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
