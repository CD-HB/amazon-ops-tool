const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const OPENAI_IMAGE_API_BASE = "https://api.openai.com/v1/images";

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

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(String(dataUrl || ""));
  if (!match) throw new Error("Invalid image data URL");
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

function normalizeImages(data) {
  const items = Array.isArray(data.images) ? data.images : [];
  return items.slice(0, 4).filter((image) => image?.dataUrl);
}

async function callOpenAiImages(body) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const prompt = String(body.prompt || "").trim();
  if (!prompt) throw new Error("Prompt is required");

  const size = body.size || "1024x1024";
  const quality = body.quality || "medium";
  const referenceImages = normalizeImages(body);
  const headers = { Authorization: `Bearer ${apiKey}` };

  let response;
  if (referenceImages.length) {
    const form = new FormData();
    form.append("model", OPENAI_IMAGE_MODEL);
    form.append("prompt", prompt);
    form.append("size", size);
    form.append("quality", quality);
    form.append("output_format", "png");

    referenceImages.forEach((image, index) => {
      const parsed = parseDataUrl(image.dataUrl);
      const blob = new Blob([parsed.buffer], { type: image.mime || parsed.mime || "image/png" });
      form.append("image[]", blob, image.name || `reference-${index + 1}.png`);
    });

    response = await fetch(`${OPENAI_IMAGE_API_BASE}/edits`, {
      method: "POST",
      headers,
      body: form
    });
  } else {
    response = await fetch(`${OPENAI_IMAGE_API_BASE}/generations`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt,
        size,
        quality,
        output_format: "png"
      })
    });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || "OpenAI image request failed";
    throw new Error(message);
  }

  return {
    model: OPENAI_IMAGE_MODEL,
    images: (payload.data || []).map((item) =>
      item.b64_json ? `data:image/png;base64,${item.b64_json}` : item.url
    )
  };
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
    const result = await callOpenAiImages(body);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Image generation failed" });
  }
};
