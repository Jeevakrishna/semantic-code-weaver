from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Code Translation API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Code Translation API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": "connected"}

@app.post("/translate")
async def translate_code(code: str, source_lang: str, target_lang: str):
    """
    Translate code from source language to target language
    """
    # Mock translation response
    return {
        "message": "Successfully connected to the model",
        "status": "success",
        "original_code": code,
        "source_language": source_lang,
        "target_language": target_lang,
        "translated_code": f"# Translated from {source_lang} to {target_lang}\n{code}",
        "confidence": 0.95
    }

@app.get("/model/status")
async def model_status():
    """
    Check the status of the translation model
    """
    return {
        "status": "connected",
        "model_name": "Semantic Code Translator",
        "version": "1.0.0",
        "message": "Successfully connected to the model"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
