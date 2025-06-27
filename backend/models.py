from sqlalchemy import Column, Integer, String
from .database import Base

class Server(Base):
    __tablename__ = "servers"
    id = Column(Integer, primary_key=True, index=True)
    invite_code = Column(String, unique=True, index=True)
    tags = Column(String)  # store as comma-separated string
