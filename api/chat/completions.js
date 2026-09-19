const UPSTREAM = "https://tooken.club/v1/chat/completions";
const MODEL = "gpt-5.6-luna";
const MAX_OUTPUT_TOKENS = 35000;

// Серверная системная инструкция.
// Её можно задать через Vercel Environment Variable:
// UNFILTEREDAI_SYSTEM_PROMPT
const DEFAULT_SYSTEM_PROMPT = `Ты — UnFilteredAI, технический ИИ.
Отвечай точно, подробно и по существу.
Для запросов на код предоставляй рабочий код, а не псевдокод.
Для сложных задач структурируй ответ по шагам и явно указывай технические предпосылки.`;

const SYSTEM_PROMPT =
  process.env.UNFILTEREDAI_SYSTEM_PROMPT?.trim() || DEFAULT_SYSTEM_PROMPT;

function error(res, status, message, type = "invalid_request_error") {
  return res.status(status).json({ error: { message, type } });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return error(res, 405, "Method not allowed");

  const apiKey = process.env.TOOKEN_CLUB_API_KEY;
  if (!apiKey) {
    return error(
      res,
      500,
      "TOOKEN_CLUB_API_KEY is not configured",
      "server_error"
    );
  }

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};

    if (!Array.isArray(body.messages)) {
      return error(res, 400, "messages must be an array");
    }

    // Пользовательские system-сообщения удаляем, чтобы клиент не мог
    // заменить серверную инструкцию. Серверный system всегда первый.
    const userMessages = body.messages.filter(
      (message) => message && message.role !== "system"
    );

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...userMessages
    ];

    const requested = Number(body.max_tokens);
    const maxTokens =
      Number.isFinite(requested) && requested > 0
        ? Math.min(Math.floor(requested), MAX_OUTPUT_TOKENS)
        : MAX_OUTPUT_TOKENS;

    const payload = {
      ...body,
      model: MODEL,
      messages,
      max_tokens: maxTokens
    };

    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      res.status(upstream.status);
      res.setHeader(
        "Content-Type",
        upstream.headers.get("content-type") || "application/json"
      );
      return res.end(text);
    }

    if (body.stream === true) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      if (!upstream.body) return res.end();

      const reader = upstream.body.getReader();

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
        res.end();
      }

      return;
    }

    const text = await upstream.text();

    res.status(200);
    res.setHeader(
      "Content-Type",
      upstream.headers.get("content-type") || "application/json"
    );

    return res.end(text);
  } catch (e) {
    console.error("Tooken Club upstream error:", e);
    return error(res, 500, "Upstream request failed", "server_error");
  }
}
