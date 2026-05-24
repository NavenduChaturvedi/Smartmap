const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const DEFAULT_BACKUP_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const DEFAULT_SYSTEM_PROMPT = process.env.AI_SYSTEM_PROMPT || "You are AEGIS, a tactical productivity assistant for RoadmapOS. Be concise, practical, and grounded in the user's current roadmap state.";

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.status(statusCode);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Content-Length", Buffer.byteLength(body));
  res.end(body);
}

function buildContextBlock(context) {
  if (!context) {
    return "No roadmap context was provided.";
  }

  const stats = context.stats || {};
  const roadmaps = context.roadmaps || [];
  const tasks = context.tasks || [];

  const lines = [
    `Page: ${context.page || "unknown"}`,
    `Commander: ${context.commanderName || "unknown"}`,
    `Streak: ${stats.streak || 0}`,
    `XP: ${stats.totalXp || 0}`,
    `Active roadmaps: ${stats.roadmapsActive || 0}`,
    `Pending tasks: ${stats.pendingTasks || 0}`,
  ];

  if (roadmaps.length > 0) {
    lines.push("Roadmaps:");
    roadmaps.slice(0, 6).forEach((roadmap) => {
      lines.push(`- ${roadmap.name || "Unnamed roadmap"} | ${roadmap.completed || 0}/${roadmap.total || 0} complete | ${roadmap.percentage || 0}%`);
    });
  }

  if (tasks.length > 0) {
    lines.push("Recent tasks:");
    tasks.slice(0, 8).forEach((task) => {
      const status = task.done ? "done" : "open";
      lines.push(`- [${status}] ${task.title || "Untitled task"} (+${task.xp || 0} XP)`);
    });
  }

  return lines.join("\n");
}

function extractReplyText(responseData, provider) {
  if (provider === "openrouter") {
    const choices = responseData.choices || [];
    if (choices.length > 0) {
      const message = choices[0].message || {};
      const content = message.content;
      if (typeof content === "string") {
        return content.trim();
      }
      if (Array.isArray(content)) {
        return content
          .map((part) => (part && typeof part.text === "string" ? part.text : ""))
          .filter(Boolean)
          .join("\n")
          .trim();
      }
    }
    return "OpenRouter returned no text response.";
  }

  const candidates = responseData.candidates || [];
  const parts = [];
  if (candidates.length > 0) {
    const content = candidates[0].content || {};
    (content.parts || []).forEach((part) => {
      if (part && typeof part.text === "string") {
        parts.push(part.text);
      }
    });
  }

  const replyText = parts.join("\n").trim();
  return replyText || "Gemini returned no text response.";
}

async function callGemini(prompt, contextBlock, systemPrompt, model, apiKey) {
  const geminiPayload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Use the following RoadmapOS context to answer the user's request.\n\nContext:\n${contextBlock}\n\nUser request:\n${prompt}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 3000,
      candidateCount: 1,
    },
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(geminiPayload),
  });

  const responseText = await response.text();
  if (!response.ok) {
    const error = new Error(responseText || `Gemini request failed with status ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  const responseData = JSON.parse(responseText);
  return extractReplyText(responseData, "gemini");
}

async function callOpenRouter(prompt, contextBlock, systemPrompt, model, apiKey) {
  const openrouterPayload = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Use the following RoadmapOS context to answer the user's request.\n\nContext:\n${contextBlock}\n\nUser request:\n${prompt}`,
      },
    ],
    temperature: 0,
    max_tokens: 3000,
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (process.env.OPENROUTER_SITE_URL) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
  }
  headers["X-Title"] = process.env.OPENROUTER_APP_NAME || "RoadmapOS";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify(openrouterPayload),
  });

  const responseText = await response.text();
  if (!response.ok) {
    const error = new Error(responseText || `OpenRouter request failed with status ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  const responseData = JSON.parse(responseText);
  return extractReplyText(responseData, "openrouter");
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      sendJson(res, 400, { error: "Invalid JSON payload" });
      return;
    }
  }

  if (!payload || typeof payload !== "object") {
    sendJson(res, 400, { error: "Invalid JSON payload" });
    return;
  }

  const prompt = String(payload.prompt || "").trim();
  if (!prompt) {
    sendJson(res, 400, { error: "Prompt is required" });
    return;
  }

  const contextBlock = buildContextBlock(payload.context);
  const systemPrompt = payload.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const model = payload.model || DEFAULT_MODEL;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  try {
    if (geminiApiKey) {
      const replyText = await callGemini(prompt, contextBlock, systemPrompt, model, geminiApiKey);
      sendJson(res, 200, { reply: replyText, model, provider: "gemini" });
      return;
    }

    throw new Error("GEMINI_API_KEY is not set");
  } catch (geminiError) {
    const backupKey = process.env.OPENROUTER_API_KEY;
    if (!backupKey) {
      const statusCode = geminiError.statusCode || 500;
      sendJson(res, statusCode, {
        error: geminiError.message || "Gemini request failed",
        details: geminiError.message || "",
      });
      return;
    }

    try {
      const backupModel = process.env.OPENROUTER_MODEL || DEFAULT_BACKUP_MODEL;
      const replyText = await callOpenRouter(prompt, contextBlock, systemPrompt, backupModel, backupKey);
      sendJson(res, 200, {
        reply: replyText,
        model: backupModel,
        provider: "openrouter",
        fallbackFrom: "gemini",
      });
      return;
    } catch (backupError) {
      const statusCode = backupError.statusCode || 502;
      sendJson(res, statusCode, {
        error: "Fallback OpenRouter request failed",
        details: backupError.message || "",
        fallbackError: geminiError.message || "",
      });
    }
  }
};