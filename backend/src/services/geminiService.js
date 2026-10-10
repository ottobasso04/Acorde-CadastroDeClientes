const config = require("../config");

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

class GeminiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function isConfigured() {
  return Boolean(config.geminiApiKey);
}

function parseJsonText(raw) {
  const cleaned = String(raw)
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {}
    }
    throw new GeminiError("O Gemini respondeu em um formato inesperado.");
  }
}

async function generateJson({ systemInstruction, prompt, schema, temperature = 0.4 }) {
  if (!isConfigured()) throw new GeminiError("Chave do Gemini não configurada.");

  const url = `${API_BASE}/${encodeURIComponent(config.geminiModel)}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": config.geminiApiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.geminiTimeoutMs),
    });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError";
    throw new GeminiError(timedOut ? "O Gemini demorou demais para responder." : "Não foi possível conectar ao Gemini.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.error?.message ? `: ${data.error.message}` : "";
    throw new GeminiError(`O Gemini recusou a requisição (HTTP ${response.status})${detail}`, response.status);
  }
  if (data?.promptFeedback?.blockReason) {
    throw new GeminiError(`O Gemini bloqueou a solicitação (${data.promptFeedback.blockReason}).`);
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((part) => !part.thought)
    .map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) throw new GeminiError("O Gemini não devolveu conteúdo.");

  return parseJsonText(text);
}

module.exports = { generateJson, isConfigured, GeminiError, parseJsonText };
