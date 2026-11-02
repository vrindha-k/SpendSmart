from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine, String, Integer, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/spendsmart.db"
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-5-5"
    ai_enabled: bool = False
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
Path("data").mkdir(exist_ok=True)
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
Session = sessionmaker(engine)


class Base(DeclarativeBase):
    pass


class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[str] = mapped_column(String(10))
    merchant: Mapped[str] = mapped_column(String(200))
    cents: Mapped[int] = mapped_column(Integer)
    category: Mapped[str] = mapped_column(String(40))
    kind: Mapped[str] = mapped_column(String(20))
    confidence: Mapped[int] = mapped_column(Integer, default=50)
    source: Mapped[str] = mapped_column(String(10))
    fingerprint: Mapped[str] = mapped_column(String(64))
    __table_args__ = (UniqueConstraint("source", "fingerprint"),)


class Rule(Base):
    __tablename__ = "rules"
    merchant: Mapped[str] = mapped_column(String(200), primary_key=True)
    category: Mapped[str] = mapped_column(String(40))


# Versioned, additive bootstrap migration. Future changes must add migration steps.
class SchemaVersion(Base):
    __tablename__ = "schema_version"
    version: Mapped[int] = mapped_column(primary_key=True)


def migrate():
    Base.metadata.create_all(engine)
    with Session() as db:
        if not db.get(SchemaVersion, 1):
            db.add(SchemaVersion(version=1))
            db.commit()
