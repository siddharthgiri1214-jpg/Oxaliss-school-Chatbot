import os

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from groq import Groq

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

app = Flask(__name__)

# ----- Load school data (path is relative to this file, so it works from any folder) -----
with open(os.path.join(BASE_DIR, "school_data.txt"), "r", encoding="utf-8") as f:
    SCHOOL_DATA = f.read()

# ----- Groq client (API key comes from .env / environment, never hard-coded) -----
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

MODEL_NAME = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")  # llama-3.1-8b-instant was shut down by Groq on 16 Aug 2026

SUPPORTED_LANGUAGES = {"English", "Tamil", "Hindi", "Telugu", "Kannada", "Malayalam"}

SYSTEM_INSTRUCTION = """You are the official information assistant of Oxaliss International School.
Answer ONLY using the school information given below.
If the answer is not in the information, politely say you do not have that detail and suggest
contacting the school using the phone numbers or email in the information.
Keep answers clear, friendly and short.

MULTI-LANGUAGE RULE:
The student's selected response language is: {language}
Answer in {language}.
Keep names, numbers, dates, URLs, e-mail addresses and phone numbers unchanged.
Do not switch languages unless the student asks you to.

School Information:
{school_data}
"""


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/ask", methods=["POST"])
def ask():
    try:
        if client is None:
            return jsonify({"answer": "Server is not configured: GROQ_API_KEY is missing in the .env file."}), 500

        data = request.get_json(silent=True) or {}
        question = (data.get("question") or "").strip()
        language = data.get("language") or "English"
        if language not in SUPPORTED_LANGUAGES:
            language = "English"

        if not question:
            return jsonify({"answer": "Please type a question."}), 400

        response = client.chat.completions.create(
            model=MODEL_NAME,
            temperature=0.2,
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_INSTRUCTION.format(language=language, school_data=SCHOOL_DATA),
                },
                {"role": "user", "content": question},
            ],
        )

        answer = response.choices[0].message.content
        return jsonify({"answer": answer})

    except Exception as e:
        return jsonify({"answer": "Error: " + str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(debug=debug, port=port)
