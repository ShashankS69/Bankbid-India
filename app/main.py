import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import fetch, listings

app = FastAPI(
    title="BankBid India API",
    description="Multi-source bank auction property aggregator",
    version="1.0.0"
)

origins = ["http://localhost:3000"]
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fetch.router, prefix="/api", tags=["fetch"])
app.include_router(listings.router, prefix="/api", tags=["listings"])

@app.get("/health")
def health_check():
    return {"status": "ok"}