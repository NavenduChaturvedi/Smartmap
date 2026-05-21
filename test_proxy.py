import urllib.request, json, sys, time, re

url = "http://127.0.0.1:8765/api/ai/chat"
schemaPrompt = """You are RoadmapOS Planner. Return ONLY valid JSON with this exact shape:
{
  "roadmap": { "name": "string", "description": "string" },
  "tasks": [
    {
      "title": "string",
      "xp": number,
      "subtasks": [
        {
          "title": "string",
          "xp": number,
          "subtasks": []
        }
      ]
    }
  ]
}

Rules:
- Include 3 to 8 top-level tasks.
- Include subtasks only when useful.
- Use integers for xp.
- No markdown fences, comments, or extra keys."""
command = "Create a 14-day roadmap to launch a portfolio site. Include planning, design, content, deployment phases and weekly milestones."
prompt = schemaPrompt + "\n\nUser request: " + command
payload = {"prompt": prompt, "model":"gemini-1.5-flash", "context": {"page":"ai-test"}}
req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type":"application/json"})

def extract_json(text):
    if not text: return None
    text = text.strip()
    try:
        return json.loads(text)
    except:
        pass
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.I)
    if m:
        try:
            return json.loads(m.group(1).strip())
        except:
            pass
    fb = text.find("{")
    lb = text.rfind("}")
    if fb!=-1 and lb>fb:
        try:
            return json.loads(text[fb:lb+1])
        except:
            return None
    return None

try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        print("Initial status", resp.status)
        body = resp.read().decode("utf-8")
        print("Initial body:", body[:1000])
        data = json.loads(body)
        reply = data.get("reply")
except Exception as e:
    print("ERROR initial:", type(e).__name__, e)
    sys.exit(1)

parsed = extract_json(reply)
print("Parsed JSON?", bool(parsed))
if not parsed:
    convert_prompt = schemaPrompt + "\n\nConvert the following model response into ONLY the JSON matching the schema above. Respond with JSON only.\n\nOriginal response:\n" + reply
    payload2 = {"prompt": convert_prompt, "model":"gemini-1.5-flash", "context": {"page":"ai-test"}}
    req2 = urllib.request.Request(url, data=json.dumps(payload2).encode("utf-8"), headers={"Content-Type":"application/json"})
    try:
        with urllib.request.urlopen(req2, timeout=60) as r2:
            print("Convert status", r2.status)
            b2 = r2.read().decode("utf-8")
            print("Convert body:", b2[:1000])
            d2 = json.loads(b2)
            reply2 = d2.get("reply")
            parsed2 = extract_json(reply2)
            print("Parsed converted JSON?", bool(parsed2))
            if parsed2:
                print("Converted JSON sample keys:", list(parsed2.keys()))
    except Exception as e:
        print("ERROR convert:", type(e).__name__, e)
