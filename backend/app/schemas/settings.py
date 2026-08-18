from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import ClassVar, Optional
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import re


class SettingsBase(BaseModel):
    # Invoice configuration
    invoice_prefix: Optional[str] = Field(None, min_length=1, max_length=20)
    invoice_footer: Optional[str] = Field(None, max_length=500)
    show_gstin: Optional[bool] = None
    show_drug_license: Optional[bool] = None

    # Regional preferences
    default_currency: Optional[str] = Field(None, min_length=3, max_length=3)
    timezone: Optional[str] = Field(None, max_length=50)
    date_format: Optional[str] = Field(None, max_length=20)

    # Inventory preferences
    low_stock_threshold: Optional[int] = Field(None, ge=0)

    model_config = ConfigDict(extra="forbid")

    _supported_date_formats: ClassVar[set[str]] = {
        "DD-MM-YYYY",
        "DD/MM/YYYY",
        "YYYY-MM-DD",
        "MM-DD-YYYY",
    }

    @field_validator("invoice_prefix")
    @classmethod
    def validate_invoice_prefix(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not value.strip():
            raise ValueError("Invoice prefix must contain non-whitespace characters")
        return value.strip() if value is not None else value

    @field_validator("default_currency")
    @classmethod
    def validate_currency(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not re.fullmatch(r"[A-Z]{3}", value):
            raise ValueError("Currency must be a three-letter uppercase code")
        return value

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            try:
                ZoneInfo(value)
            except ZoneInfoNotFoundError as exc:
                raise ValueError("Timezone must be a valid IANA timezone") from exc
        return value

    @field_validator("date_format")
    @classmethod
    def validate_date_format(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in cls._supported_date_formats:
            raise ValueError("Unsupported date format")
        return value


class SettingsUpdate(SettingsBase):
    pass


class SettingsResponse(SettingsBase):
    invoice_prefix: str
    invoice_footer: Optional[str] = None
    show_gstin: bool
    show_drug_license: bool
    default_currency: str
    timezone: str
    date_format: str
    low_stock_threshold: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
