const ACCOUNT_PREFIX = "sellerops:account:";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("86") && digits.length === 13) digits = digits.slice(2);
  return digits;
}

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone);
}

function accountKey(phone) {
  return `${ACCOUNT_PREFIX}${phone}`;
}

function redisConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
    process.env.KV_REST_API_URL ||
    process.env.STORAGE_KV_REST_API_URL ||
    process.env.STORAGE_REST_API_URL ||
    process.env.STORAGE_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.STORAGE_KV_REST_API_TOKEN ||
    process.env.STORAGE_REST_API_TOKEN ||
    process.env.STORAGE_TOKEN;
  if (!url || !token) {
    throw new Error("Upstash Redis REST URL and token are required");
  }
  return { url, token };
}

async function redisCommand(command, ...args) {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([command, ...args])
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw new Error(payload.error || `Redis ${command} failed`);
  }
  return payload.result;
}

function normalizeAccountData(data) {
  const source = data && typeof data === "object" ? data : {};
  return {
    version: 2,
    updatedAt: source.updatedAt || new Date().toISOString(),
    skus: Array.isArray(source.skus) ? source.skus : [],
    bulkCampaigns: Array.isArray(source.bulkCampaigns) ? source.bulkCampaigns : [],
    bulkSettings: source.bulkSettings && typeof source.bulkSettings === "object" ? source.bulkSettings : {},
    prompts: Array.isArray(source.prompts) ? source.prompts : [],
    tasks: Array.isArray(source.tasks) ? source.tasks : []
  };
}

function parseStoredAccount(value) {
  if (!value) return null;
  try {
    const account = typeof value === "string" ? JSON.parse(value) : value;
    return account && typeof account === "object" ? account : null;
  } catch {
    return null;
  }
}

function isNewer(incoming, existing) {
  const incomingTime = Date.parse(incoming?.updatedAt || "");
  const existingTime = Date.parse(existing?.updatedAt || "");
  return Number.isFinite(incomingTime) && (!Number.isFinite(existingTime) || incomingTime > existingTime);
}

async function readAccount(phone) {
  return parseStoredAccount(await redisCommand("GET", accountKey(phone)));
}

async function writeAccount(phone, account) {
  await redisCommand("SET", accountKey(phone), JSON.stringify(account));
  return account;
}

function createAccount(phone, passwordHash, data) {
  const now = new Date().toISOString();
  return {
    phone,
    passwordHash,
    createdAt: now,
    updatedAt: now,
    data: normalizeAccountData({ ...data, updatedAt: data?.updatedAt || now })
  };
}

async function handleLogin(body) {
  const phone = normalizePhone(body.phone);
  const passwordHash = String(body.passwordHash || "");
  if (!isValidPhone(phone) || !passwordHash) return { status: 400, body: { error: "Invalid account credentials" } };

  const incomingData = normalizeAccountData(body.data);
  const stored = await readAccount(phone);
  if (!stored) {
    const account = await writeAccount(phone, createAccount(phone, passwordHash, incomingData));
    return { status: 200, body: { created: true, data: account.data } };
  }

  if (stored.passwordHash !== passwordHash) {
    return { status: 401, body: { error: "Password is incorrect" } };
  }

  let account = stored;
  if (body.hasLocalAccount && isNewer(incomingData, stored.data)) {
    account = {
      ...stored,
      updatedAt: new Date().toISOString(),
      data: incomingData
    };
    await writeAccount(phone, account);
  }

  return { status: 200, body: { created: false, data: account.data } };
}

async function handleSave(body) {
  const phone = normalizePhone(body.phone);
  const passwordHash = String(body.passwordHash || "");
  if (!isValidPhone(phone) || !passwordHash) return { status: 400, body: { error: "Invalid account credentials" } };

  const data = normalizeAccountData(body.data);
  const stored = await readAccount(phone);
  if (stored && stored.passwordHash !== passwordHash) {
    return { status: 401, body: { error: "Password is incorrect" } };
  }

  const account = {
    ...(stored || createAccount(phone, passwordHash, data)),
    phone,
    passwordHash,
    updatedAt: new Date().toISOString(),
    data
  };
  await writeAccount(phone, account);
  return { status: 200, body: { saved: true, data: account.data } };
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const action = String(body.action || "");
    const result = action === "save" ? await handleSave(body) : await handleLogin(body);
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(503).json({ error: error.message || "Account sync unavailable" });
  }
};
