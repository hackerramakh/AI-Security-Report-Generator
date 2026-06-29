import os
import json
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google import genai
from google.genai import types
from dotenv import load_dotenv

app = FastAPI()

# 🛡️ تفعيل الـ CORS بشكل كامل لفك حظر المتصفح المحلي
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()

# تهيئة عميل جيميناي (سيقرأ المتغير GEMINI_API_KEY من النظام تلقائياً وبأعلى كفاءة سحابية)
client = genai.Client()

# 📊 الـ Schema المهيكلة على شكل Dict صريح لمنع مشاكل إصدارات Pydantic
ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "executive_summary": {"type": "string"},
        "vulnerabilities": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name":           {"type": "string"},
                    "severity":       {"type": "string"},
                    "description":    {"type": "string"},
                    "explanation":    {"type": "string"},
                    "impact":         {"type": "string"},
                    "recommendation": {"type": "string"},
                },
                "required": ["name", "severity", "description", "explanation", "impact", "recommendation"]
            }
        },
        "ai_insights": {"type": "string"},
    },
    "required": ["executive_summary", "vulnerabilities", "ai_insights"]
}

@app.get("/")
async def root():
    return {"status": "AI Security Report Generator is running"}

@app.post("/api/analyze")
async def analyze_report(
    text_input: str = Form(default=None),
    file: UploadFile = File(default=None)
):
    # تحقق من وجود محتوى مدخل
    has_text = text_input and text_input.strip() and text_input.strip() != "undefined"
    has_file = file and file.filename and file.filename != ""

    if not has_text and not has_file:
        raise HTTPException(status_code=400, detail="Please provide either text input or a file.")

    contents = []

    # معالجة الملف المرفوع إن وجد
    if has_file:
        try:
            file_bytes = await file.read()
            if len(file_bytes) > 0:
                contents.append(
                    types.Part.from_bytes(
                        data=file_bytes,
                        mime_type=file.content_type or "application/octet-stream"
                    )
                )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    # معالجة النص المكتوب
    if has_text:
        contents.append(f"User Input Context:\n{text_input.strip()}")

    try:
        # الاستدعاء المستقر لنموذج جيميناي
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are an advanced offensive security assessment tool. Analyze the provided "
                    "input and return a structured JSON security report based on your findings."
                ),
                response_mime_type="application/json",
                response_schema=ANALYSIS_SCHEMA,
                temperature=0.2,
            )
        )

        if response and response.text:
            parsed = json.loads(response.text)
            return JSONResponse(content=parsed)

        raise HTTPException(status_code=500, detail="Empty response from Gemini.")

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON Parse Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}")