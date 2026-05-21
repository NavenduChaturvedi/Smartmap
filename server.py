import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ROOT_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
DEFAULT_BACKUP_MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini")
DEFAULT_PORT = int(os.environ.get("AI_PROXY_PORT", "8765"))
DEFAULT_SYSTEM_PROMPT = os.environ.get(
    "AI_SYSTEM_PROMPT",
    "You are AEGIS, a tactical productivity assistant for RoadmapOS. Be concise, practical, and grounded in the user's current roadmap state."
)


def load_dotenv(dotenv_path: Path) -> None:
    if not dotenv_path.exists():
        return

    for raw_line in dotenv_path.read_text(encoding="utf-8").splitlines():
      line = raw_line.strip()
      if not line or line.startswith("#") or "=" not in line:
          continue

      key, value = line.split("=", 1)
      key = key.strip()
      value = value.strip().strip('"').strip("'")
      if key and key not in os.environ:
          os.environ[key] = value


def build_context_block(context: dict | None) -> str:
    if not context:
        return "No roadmap context was provided."

    stats = context.get("stats") or {}
    roadmaps = context.get("roadmaps") or []
    tasks = context.get("tasks") or []

    lines = [
        f"Page: {context.get('page', 'unknown')}",
        f"Commander: {context.get('commanderName', 'unknown')}",
        f"Streak: {stats.get('streak', 0)}",
        f"XP: {stats.get('totalXp', 0)}",
        f"Active roadmaps: {stats.get('roadmapsActive', 0)}",
        f"Pending tasks: {stats.get('pendingTasks', 0)}",
    ]

    if roadmaps:
        lines.append("Roadmaps:")
        for roadmap in roadmaps[:6]:
            lines.append(
                f"- {roadmap.get('name', 'Unnamed roadmap')} | {roadmap.get('completed', 0)}/{roadmap.get('total', 0)} complete | {roadmap.get('percentage', 0)}%"
            )

    if tasks:
        lines.append("Recent tasks:")
        for task in tasks[:8]:
            status = "done" if task.get("done") else "open"
            lines.append(f"- [{status}] {task.get('title', 'Untitled task')} (+{task.get('xp', 0)} XP)")

    return "\n".join(lines)


def extract_reply_text(response_data: dict, provider: str) -> str:
    if provider == "openrouter":
        choices = response_data.get("choices") or []
        if choices:
            message = choices[0].get("message") or {}
            content = message.get("content")
            if isinstance(content, str):
                return content.strip()
            if isinstance(content, list):
                parts = []
                for part in content:
                    if isinstance(part, dict):
                        text = part.get("text")
                        if text:
                            parts.append(text)
                return "\n".join(parts).strip()
        return "OpenRouter returned no text response."

    candidates = response_data.get("candidates") or []
    text_parts = []
    if candidates:
        content = candidates[0].get("content") or {}
        for part in content.get("parts") or []:
            text = part.get("text")
            if text:
                text_parts.append(text)

    reply_text = "\n".join(text_parts).strip()
    if not reply_text:
        reply_text = "Gemini returned no text response."
    return reply_text


def call_gemini(prompt: str, context_block: str, system_prompt: str, model: str, api_key: str) -> str:
    gemini_payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [{
            "role": "user",
            "parts": [{"text": f"Use the following RoadmapOS context to answer the user's request.\n\nContext:\n{context_block}\n\nUser request:\n{prompt}"}]
        }],
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": 3000,
            "candidateCount": 1
        },
    }

    request = Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}",
        data=json.dumps(gemini_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urlopen(request, timeout=60) as response:
        response_data = json.loads(response.read().decode("utf-8"))

    return extract_reply_text(response_data, "gemini")


def call_openrouter(prompt: str, context_block: str, system_prompt: str, model: str, api_key: str) -> str:
    openrouter_payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"Use the following RoadmapOS context to answer the user's request.\n\nContext:\n{context_block}\n\nUser request:\n{prompt}",
            },
        ],
        "temperature": 0.0,
        "max_tokens": 3000,
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    site_url = os.environ.get("OPENROUTER_SITE_URL")
    app_name = os.environ.get("OPENROUTER_APP_NAME", "RoadmapOS")
    if site_url:
        headers["HTTP-Referer"] = site_url
    headers["X-Title"] = app_name

    request = Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(openrouter_payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    with urlopen(request, timeout=60) as response:
        response_data = json.loads(response.read().decode("utf-8"))

    return extract_reply_text(response_data, "openrouter")


class GeminiProxyHandler(BaseHTTPRequestHandler):
    server_version = "AegisGeminiProxy/1.0"

    def _send_json(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/ai/chat":
            self._send_json(404, {"error": "Not found"})
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json(400, {"error": "Invalid JSON payload"})
            return

        prompt = str(payload.get("prompt", "")).strip()
        if not prompt:
            self._send_json(400, {"error": "Prompt is required"})
            return

        context_block = build_context_block(payload.get("context"))
        system_prompt = payload.get("systemPrompt") or DEFAULT_SYSTEM_PROMPT
        model = payload.get("model") or DEFAULT_MODEL
        try:
            api_key = os.environ.get("GEMINI_API_KEY")
            if api_key:
                reply_text = call_gemini(prompt, context_block, system_prompt, model, api_key)
                self._send_json(200, {"reply": reply_text, "model": model, "provider": "gemini"})
                return

            raise RuntimeError("GEMINI_API_KEY is not set")
        except (HTTPError, URLError, RuntimeError) as gemini_error:
            backup_key = os.environ.get("OPENROUTER_API_KEY")
            if not backup_key:
                if isinstance(gemini_error, HTTPError):
                    error_body = gemini_error.read().decode("utf-8", errors="replace")
                    self._send_json(gemini_error.code, {"error": "Gemini request failed", "details": error_body})
                elif isinstance(gemini_error, URLError):
                    self._send_json(502, {"error": "Unable to reach Gemini", "details": str(gemini_error.reason)})
                else:
                    self._send_json(500, {"error": str(gemini_error)})
                return

            backup_model = os.environ.get("OPENROUTER_MODEL", DEFAULT_BACKUP_MODEL)
            try:
                reply_text = call_openrouter(prompt, context_block, system_prompt, backup_model, backup_key)
                self._send_json(200, {
                    "reply": reply_text,
                    "model": backup_model,
                    "provider": "openrouter",
                    "fallbackFrom": "gemini"
                })
                return
            except HTTPError as error:
                error_body = error.read().decode("utf-8", errors="replace")
                self._send_json(error.code, {
                    "error": "Fallback OpenRouter request failed",
                    "details": error_body,
                    "fallbackError": str(gemini_error)
                })
                return
            except URLError as error:
                self._send_json(502, {
                    "error": "Fallback OpenRouter request failed",
                    "details": str(error.reason),
                    "fallbackError": str(gemini_error)
                })
                return


def main() -> None:
    load_dotenv(ROOT_DIR / ".env")
    load_dotenv(ROOT_DIR / ".env.local")

    server = ThreadingHTTPServer(("127.0.0.1", DEFAULT_PORT), GeminiProxyHandler)
    print(f"Gemini proxy listening on http://127.0.0.1:{DEFAULT_PORT}/api/ai/chat")
    server.serve_forever()


if __name__ == "__main__":
    main()