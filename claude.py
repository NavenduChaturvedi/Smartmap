import anthropic
import os

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
history = []

print("Claude terminal — type 'quit' to exit\n")

while True:
    user_input = input("You: ")
    if user_input.lower() == "quit":
        break
    
    history.append({"role": "user", "content": user_input})
    
    response = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=2048,
        system="You are an expert coding assistant.",
        messages=history
    )
    
    reply = response.content[0].text
    history.append({"role": "assistant", "content": reply})
    
    print(f"\nClaude: {reply}\n")