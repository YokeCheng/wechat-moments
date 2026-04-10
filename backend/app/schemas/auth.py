from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


PlanCode = Literal["free", "basic", "pro", "enterprise"]


class UsageSummary(BaseModel):
    generate_daily_used: int = 0
    generate_daily_limit: int = 0
    prompt_count: int = 0
    channel_count: int = 0
    export_monthly_used: int = 0
    export_monthly_limit: int = 0


class CurrentUser(BaseModel):
    id: str
    username: str
    display_name: str
    plan_code: PlanCode
    usage: UsageSummary


class DevLoginRequest(BaseModel):
    username: str = Field(min_length=1)


class DevLoginUser(BaseModel):
    id: str
    username: str
    display_name: str
    plan_code: PlanCode


class DevLoginResponse(BaseModel):
    token: str
    user: DevLoginUser
