from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv
from flask_cors import CORS
import logging
from google import genai
from google.genai.errors import APIError
import uuid

load_dotenv()
logging.basicConfig(level=logging.INFO)

# --- OFFICIAL API CONFIGURATION ---
MODEL_NAME = os.environ.get("GEMINI_MODEL_NAME", "gemini-2.5-flash")
API_KEY = os.environ.get("GEMINI_API_KEY")

if not API_KEY:
    print("Warning: GEMINI_API_KEY not set. Please set it in your .env file.")

# Initialize the Gemini Client
try:
    client = genai.Client(api_key=API_KEY)
except Exception as e:
    print(f"Error initializing Gemini client: {e}")
    client = None

app = Flask(__name__)
CORS(app)

chat_sessions = {}

BLACKLIST = ["violence", "adult", "sex", "drugs"]

def is_safe(text):
    return all(word not in text.lower() for word in BLACKLIST)

@app.route("/ask", methods=["POST"])
def ask():
    if not client:
        return jsonify({"answer": "Internal Server Error: Gemini client failed to initialize."}), 500

    data = request.json
    question = data.get("question", "")
    
    session_id = data.get("session_id", str(uuid.uuid4()))

    if not is_safe(question):
        return jsonify({"answer": "Sorry! I can't answer that question."}), 200

    if session_id not in chat_sessions:
        config = genai.types.GenerateContentConfig(
            max_output_tokens=2048,
            temperature=0.7
        )
        chat = client.chats.create(
            model=MODEL_NAME,
            config=config
        )
        chat_sessions[session_id] = chat
    else:
        chat = chat_sessions[session_id]

    try:
        response = chat.send_message(question)
        
        answer = response.text 

    except APIError as api_err:
        app.logger.error("Gemini API request failed: %s", api_err)
        return jsonify({"answer": f"API Error: {api_err.message}"}), 502
    
    except Exception as exc:
        app.logger.exception("Failed to send message to AI service")
        return jsonify({"answer": "Sorry, couldn't reach AI service (Internal Error)."}), 502

    return jsonify({"answer": answer, "session_id": session_id})

if __name__ == "__main__":
    app.run(port=5000, debug=True)