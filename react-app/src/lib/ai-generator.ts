// Calls the real Gemini proxy - api/ai/chat.js in production, server.py for
// local dev - to turn a plain-English command into a roadmap plan. Ports the
// schema prompt and JSON-extraction/repair strategy already proven in the
// legacy vanilla app's AI generator (git history: js/ai-roadmap-creator.js)
// rather than reinventing prompt engineering that already worked.

const LOCAL_ENDPOINT = "http://127.0.0.1:8765/api/ai/chat"
const DEPLOYED_ENDPOINT = "/api/ai/chat"
const REQUEST_TIMEOUT_MS = 30000

function resolveEndpoint() {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return LOCAL_ENDPOINT
  }
  return DEPLOYED_ENDPOINT
}

const SCHEMA_PROMPT = `You are RoadmapOS Planner. Return ONLY valid JSON with this exact shape:
{
  "roadmap": { "name": "string", "description": "string" },
  "tasks": [
    {
      "title": "string",
      "xp": number,
      "subtasks": [
        { "title": "string", "xp": number }
      ]
    }
  ]
}

Rules:
- Include 3 to 8 top-level tasks.
- Include subtasks only when useful.
- Use integers for xp.
- No markdown fences, comments, or extra keys.`

interface GeneratedTask {
  title: string
  xp: number
  subtasks: { title: string; xp: number }[]
}

interface GeneratedPlan {
  name: string
  description: string
  tasks: GeneratedTask[]
}

interface AiContext {
  page: string
  displayName: string
  stats: { streak: number; totalXp: number; roadmapsActive: number; pendingTasks: number }
  roadmaps: { id: string; name: string; description: string }[]
}

function extractJsonText(text: string): string | null {
  const trimmed = (text || "").trim()
  if (!trimmed) return null

  try {
    JSON.parse(trimmed)
    return trimmed
  } catch {
    // continue
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    const block = fenced[1].trim()
    try {
      JSON.parse(block)
      return block
    } catch {
      // continue
    }
  }

  const firstBrace = trimmed.indexOf("{")
  const lastBrace = trimmed.lastIndexOf("}")
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const block = trimmed.slice(firstBrace, lastBrace + 1)
    try {
      JSON.parse(block)
      return block
    } catch {
      return null
    }
  }

  return null
}

// Progressively trims back to the last complete "}" until it parses, for
// replies that got cut off mid-object (hit a token limit, etc).
function repairTruncatedJson(rawReply: string): string | null {
  let candidate: string | null = null
  const fencedMatch = rawReply.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fencedMatch?.[1]) {
    candidate = fencedMatch[1].trim()
  } else {
    const first = rawReply.indexOf("{")
    const last = rawReply.lastIndexOf("}")
    if (first >= 0 && last > first) candidate = rawReply.slice(first, last + 1)
  }
  if (!candidate) return null

  let repaired = candidate
  for (let i = 0; i < 6; i++) {
    try {
      JSON.parse(repaired)
      return repaired
    } catch (err) {
      const message = err instanceof Error ? err.message : ""
      const match = message.match(/position\s*(\d+)/i)
      const pos = match ? Number(match[1]) : Math.floor(repaired.length * 0.9)
      const cut = repaired.lastIndexOf("}", pos > 0 ? pos : repaired.length - 1)
      if (cut <= 0) return null
      repaired = repaired.slice(0, cut + 1)
    }
  }
  return null
}

function normalizeSubtask(node: unknown): { title: string; xp: number } | null {
  if (typeof node === "string") {
    const title = node.trim()
    return title ? { title, xp: 0 } : null
  }
  if (!node || typeof node !== "object") return null
  const obj = node as Record<string, unknown>
  const title = typeof obj.title === "string" ? obj.title.trim() : ""
  if (!title) return null
  const xpNum = Number(obj.xp)
  const xp = Number.isFinite(xpNum) ? Math.max(0, Math.trunc(xpNum)) : 0
  return { title, xp }
}

// Infers an ordering number from a task title ("Day 3", "Week 2", "Phase 1")
// so generated stages come out in the sequence the model intended even if it
// didn't return them in that array order.
function extractOrderFromTitle(title: string): number {
  const t = title.toLowerCase()
  const m = t.match(/\b(?:day|days|week|weeks|phase|ph)\b\s*(\d{1,4})/i)
  if (m?.[1]) return Number(m[1])
  const m2 = t.match(/\b(\d{1,4})\b/)
  if (m2?.[1]) return Number(m2[1])
  if (t.includes("post") || t.includes("after") || t.includes("launch")) return 1e6
  return 1e9
}

function normalizePlan(payload: unknown): GeneratedPlan | null {
  if (!payload || typeof payload !== "object") return null
  const obj = payload as Record<string, unknown>
  const roadmap = obj.roadmap as Record<string, unknown> | undefined
  const name = typeof roadmap?.name === "string" ? roadmap.name.trim() : ""
  const description = typeof roadmap?.description === "string" ? roadmap.description.trim() : ""
  const rawTasks = Array.isArray(obj.tasks) ? obj.tasks : []

  const ordered = rawTasks
    .map((node) => {
      if (!node || typeof node !== "object") return null
      const t = node as Record<string, unknown>
      const title = typeof t.title === "string" ? t.title.trim() : ""
      if (!title) return null
      const xpNum = Number(t.xp)
      const xp = Number.isFinite(xpNum) ? Math.max(0, Math.trunc(xpNum)) : 0
      const subtasks = Array.isArray(t.subtasks)
        ? t.subtasks.map(normalizeSubtask).filter((s): s is { title: string; xp: number } => s !== null)
        : []
      const explicitOrder = Number(t.order)
      const order = Number.isFinite(explicitOrder) ? explicitOrder : extractOrderFromTitle(title)
      return { title, xp, subtasks, order }
    })
    .filter((t): t is { title: string; xp: number; subtasks: { title: string; xp: number }[]; order: number } => t !== null)
    .sort((a, b) => a.order - b.order)

  if (!name || ordered.length === 0) return null
  return { name, description, tasks: ordered.map(({ title, xp, subtasks }) => ({ title, xp, subtasks })) }
}

async function callProxy(prompt: string, context: AiContext): Promise<{ reply: string }> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(resolveEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, context, model: "gemini-2.5-flash" }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("The AI request timed out after 30s. Try again.")
    }
    throw new Error("Couldn't reach the AI proxy. Is it running?")
  } finally {
    window.clearTimeout(timeout)
  }

  const payload = (await response.json().catch(() => ({}))) as { reply?: string; error?: string; details?: string }
  if (!response.ok) {
    const message = payload.error || `Request failed (${response.status})`
    throw new Error(payload.details ? `${message}: ${payload.details}` : message)
  }
  return { reply: payload.reply ?? "" }
}

async function generateRoadmapPlan(command: string, context: AiContext): Promise<GeneratedPlan> {
  const first = await callProxy(`${SCHEMA_PROMPT}\n\nUser request: ${command}`, context)
  let reply = first.reply
  let jsonText = extractJsonText(reply)

  if (!jsonText) {
    // Second pass: ask the model to convert its own reply into the schema.
    const converted = await callProxy(
      `${SCHEMA_PROMPT}\n\nConvert the following model response into ONLY the JSON matching the schema above. Respond with JSON only.\n\nOriginal response:\n${reply}`,
      context,
    )
    reply = converted.reply || reply
    jsonText = extractJsonText(reply)
  }

  if (!jsonText) {
    jsonText = repairTruncatedJson(reply)
  }

  if (!jsonText) {
    throw new Error("The model didn't return a usable roadmap. Try rephrasing your request.")
  }

  const plan = normalizePlan(JSON.parse(jsonText))
  if (!plan) {
    throw new Error("The generated plan was missing a name or tasks.")
  }
  return plan
}

export { generateRoadmapPlan }
export type { GeneratedPlan, GeneratedTask, AiContext }
