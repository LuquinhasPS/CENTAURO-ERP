from pydantic import BaseModel
from typing import Optional

# Ticket Schemas
class TicketBase(BaseModel):
    contract_id: int
    title: str
    status: str = "OPEN"
    priority: str = "MEDIUM"
    responsible_id: Optional[int] = None

class TicketCreate(TicketBase):
    pass

class TicketResponse(TicketBase):
    id: int
    
    class Config:
        from_attributes = True
