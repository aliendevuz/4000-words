from pydantic import BaseModel, ConfigDict, Field


class DefinitionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    definition: str


class SampleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sample: str


class TranslationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    vocabulary_id: int
    word_type_id: int
    word: str
    language: str
    transcript: str | None
    deprecated: bool


class WordTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: str | None
    transcript: str | None
    definitions: list[DefinitionOut]
    samples: list[SampleOut]
    translations: list[TranslationOut]


class WordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    word: str
    language: str
    types: list[WordTypeOut]


class WordSenseOut(BaseModel):
    """Bitta word_type'ning o'z so'ziga qo'shilgan holda to'liq ko'rinishi
    (get_vocab javobida from/to tomon uchun ishlatiladi)."""

    word_type_id: int
    word: str
    language: str
    type: str | None
    transcript: str | None
    definitions: list[DefinitionOut]
    samples: list[SampleOut]


class VocabOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int  # 0-based indeks (so'ralgan ?id= qiymati)
    vocabulary_id: int
    from_: WordSenseOut = Field(serialization_alias="from")
    to: WordSenseOut
    transcript: str | None
    deprecated: bool


class StoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    body: str


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    order: int


class ChapterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    order: int


class UnitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    order: int
