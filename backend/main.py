import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from backend.api.routes import router

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("venturelens.main")

app = FastAPI(
    title="VentureLens AI Backend",
    description="Multi-Project Capital Allocation Advisor with Real ML Models, Deterministic Finance Engine, and PuLP Optimization",
    version="1.0.0"
)

# CORS configuration for Next.js frontend and external consumption
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "https://venture-lens-ai-delta.vercel.app",
        "https://venture-lens-ai.vercel.app",
    ],
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/")
def root():
    return {
        "message": "Welcome to VentureLens AI API",
        "documentation": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
