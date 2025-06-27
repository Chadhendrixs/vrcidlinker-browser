from fastapi import FastAPI, HTTPException
from database import SessionLocal, engine, Base
from models import Server
import requests

Base.metadata.create_all(bind=engine)
app = FastAPI()

@app.get("/servers")
def get_servers():
    db = SessionLocal()
    return db.query(Server).all()

@app.get("/invite/{code}")
def get_invite(code: str):
    discord_data = requests.get(
        f"https://discord.com/api/invites/{code}?with_counts=true"
    ).json()

    db = SessionLocal()
    server = db.query(Server).filter(Server.invite_code == code).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    tags = server.tags.split(",")
    return {**discord_data, "custom_tags": tags}

@app.post("/publish")
def publish_server(invite_code: str, tags: str):  # tags = comma-separated string
    db = SessionLocal()
    existing = db.query(Server).filter(Server.invite_code == invite_code).first()
    if existing:
        existing.tags = tags
    else:
        server = Server(invite_code=invite_code, tags=tags)
        db.add(server)
    db.commit()
    return {"status": "ok"}
