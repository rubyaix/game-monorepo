import os, sys
try:
    from google import genai
except ImportError:
    print("google-genai not installed")
    sys.exit(1)
    
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
for m in client.models.list():
    print(f"Name: {m.name}, Display: {m.display_name}")
