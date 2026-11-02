import os

os.environ["DATABASE_URL"] = "sqlite://"
from sqlalchemy.pool import StaticPool
from sqlalchemy import create_engine
from app import database

database.engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
database.Session.configure(bind=database.engine)
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    database.Base.metadata.drop_all(database.engine)
    with TestClient(app) as client:
        yield client
