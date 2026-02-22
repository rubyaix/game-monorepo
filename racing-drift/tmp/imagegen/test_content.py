import os, sys
from google import genai

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

model_name = "gemini-3-pro-image-preview"
print(f"Testing generate_content with {model_name}...")

try:
    response = client.models.generate_content(
        model=model_name,
        contents="Draw a red apple"
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            print(f"Got image: {part.inline_data.mime_type}")
        else:
            print(f"Got text: {part.text}")
except Exception as e:
    print(f"Error: {e}")
