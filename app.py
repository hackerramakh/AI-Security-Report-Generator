import os
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware # استدعاء حزمة الحماية
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

app = FastAPI()

# 🛡️ تفعيل الـ CORS لمنع تعليق الموقع (فك الحظر عن المتصفح)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # يسمح للـ Live Server بالوصول للبيانات بأمان
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# تحديد مسار المجلد الرئيسي للمشروع بدقة ديناميكية لملف الـ .env
# تحديد مسار المجلد الرئيسي للمشروع بدقة ديناميكية لملف الـ .env (للتشغيل المحلي)
BASE_DIR = Path(__file__).resolve().parent.parent
dotenv_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=dotenv_path)

# 🚀 الحل الذكي: يقرأ من البيئة السحابية لـ Render مباشرة، وإذا لم يجدها يقرأ من الملف المحلي
api_key_env = os.environ.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY")

if not api_key_env:
    print("❌ WARNING: GEMINI_API_KEY is missing globally!")
else:
    print("✅ GEMINI_API_KEY loaded successfully from environment!")

# تمرير الكي للعميل
client = genai.Client(api_key=api_key_env)

# الأشكال الهيكلية للبيانات (Pydantic schemas)
class VulnerabilityItem(BaseModel):
    name: str
    severity: str
    description: str
    explanation: str
    impact: str
    recommendation: str

class AnalysisResponse(BaseModel):
    executive_summary: str
    vulnerabilities: list[VulnerabilityItem]
    ai_insights: str

@app.post("/api/analyze")
async def analyze_report(
    text_input: str = Form(None), 
    file: UploadFile = File(None)
):
    if not text_input and not file:
        raise HTTPException(status_code=400, detail="Please provide either text input or a file.")

    contents = []

    if file is not None and file.filename != "":
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

    if text_input and text_input.strip():
        contents.append(f"User Input Context:\n{text_input}")

    if not contents:
        raise HTTPException(status_code=400, detail="No valid content found to analyze.")

    try:
        response = await client.aio.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=(
                    "You are an advanced offensive security assessment tool. Analyze the provided file and context, "
                    "then populate the requested schema items thoroughly based on your findings."
                ),
                response_mime_type="application/json",
                response_schema=AnalysisResponse,
                temperature=0.2,
            )
        )

        if response.parsed:
            return response.parsed
        
        raise HTTPException(status_code=500, detail="Failed to parse valid structured response from Gemini.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)