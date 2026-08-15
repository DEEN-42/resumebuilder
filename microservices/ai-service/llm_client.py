import os
import json
import re
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

_client = None

def get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", "dummy_key"))
    return _client

async def generate(prompt: str) -> dict:
    try:
        client = get_client()
        response = await client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        
        raw_response = response.choices[0].message.content
        
        # Defensively strip markdown json fences if the model still includes them
        if raw_response.startswith("```"):
            raw_response = re.sub(r"^```(?:json)?\s*|```$", "", raw_response, flags=re.MULTILINE).strip()
            
        return json.loads(raw_response)
    except Exception as e:
        print(f"Failed to generate AI content: {e}")
        try:
            print(f"Raw response was: {raw_response}")
        except:
            pass
        raise e
