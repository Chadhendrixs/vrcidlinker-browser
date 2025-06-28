from sqlalchemy import Column, Integer, String
from database import Base

class Server(Base):
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True, index=True)
    invite_code = Column(String, unique=True, index=True)
    tags = Column(String)

    name = Column(String, nullable=True)
    description = Column(String, nullable=True)
    member_count = Column(Integer, nullable=True)
    custom_tag = Column(String, nullable=True)
    boost_tier = Column(Integer, nullable=True)
    icon_url = Column(String, nullable=True)
    banner_url = Column(String, nullable=True)
