from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str


class SimpleMessage(BaseModel):
    message: str
