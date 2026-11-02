from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from .database import Session, Transaction, migrate
from .demo import demo_rows
from .routes import router, insert_rows


@asynccontextmanager
async def lifespan(app):
    migrate()
    with Session() as db:
        if not db.scalar(select(Transaction).where(Transaction.source == "demo")):
            insert_rows(db, demo_rows(), "demo")
    yield


app = FastAPI(title="SpendSmart local API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)
app.include_router(router)
