import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import fetch, listings, saved_searches

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
app.include_router(saved_searches.router, prefix="/api", tags=["saved-searches"])

@app.get("/health")
def health_check():
    return {"status": "ok"}