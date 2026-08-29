from pydantic import BaseModel, Field

class PostModel(BaseModel):
    title: str = Field(..., min_length=5, max_length=50) # Drift: tightened bounds!
    body: str
    views: int = Field(0, ge=0)
    is_published: bool = True
