from sqlalchemy import Boolean, ForeignKey, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Language(Base):
    __tablename__ = "languages"

    id: Mapped[int] = mapped_column(primary_key=True)
    language: Mapped[str] = mapped_column(unique=True)  # uz | ru | en


class Type(Base):
    __tablename__ = "types"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(unique=True)  # adverb, verb, noun, ...


class Word(Base):
    __tablename__ = "words"

    id: Mapped[int] = mapped_column(primary_key=True)
    language: Mapped[int] = mapped_column(ForeignKey("languages.id"))
    word: Mapped[str]

    word_types: Mapped[list["WordType"]] = relationship(back_populates="word")
    language_rel: Mapped["Language"] = relationship(foreign_keys=[language])


class WordType(Base):
    """Bitta so'zning bitta turi (sense) — talaffuz shu yerda, chunki
    turga qarab farqlanishi mumkin (masalan "record" noun/verb
    sifatida boshqacha talaffuz qilinadi)."""

    __tablename__ = "word_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id"))
    type_id: Mapped[int | None] = mapped_column(ForeignKey("types.id"))
    transcript: Mapped[str | None]

    word: Mapped["Word"] = relationship(back_populates="word_types")
    type: Mapped["Type | None"] = relationship()
    definitions: Mapped[list["Definition"]] = relationship(back_populates="word_type")
    samples: Mapped[list["Sample"]] = relationship(back_populates="word_type")
    vocabularies_from: Mapped[list["Vocabulary"]] = relationship(
        foreign_keys="Vocabulary.from_word_type"
    )


class Definition(Base):
    """Bitta word_type bir nechta ta'rifga ega bo'lishi mumkin
    (turli ma'no), shuning uchun samples kabi alohida 1:N jadval."""

    __tablename__ = "definitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    word_type_id: Mapped[int] = mapped_column(ForeignKey("word_types.id"))
    definition: Mapped[str] = mapped_column(Text)

    word_type: Mapped["WordType"] = relationship(back_populates="definitions")


class Sample(Base):
    __tablename__ = "samples"

    id: Mapped[int] = mapped_column(primary_key=True)
    word_type_id: Mapped[int] = mapped_column(ForeignKey("word_types.id"))
    sample: Mapped[str] = mapped_column(Text)

    word_type: Mapped["WordType"] = relationship(back_populates="samples")


class SampleTranslation(Base):
    __tablename__ = "sample_translations"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_sample_id: Mapped[int] = mapped_column(ForeignKey("samples.id"))
    to_sample_id: Mapped[int] = mapped_column(ForeignKey("samples.id"))


class Vocabulary(Base):
    __tablename__ = "vocabularies"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_language: Mapped[int] = mapped_column(ForeignKey("languages.id"))
    to_language: Mapped[int] = mapped_column(ForeignKey("languages.id"))
    from_word_type: Mapped[int] = mapped_column(ForeignKey("word_types.id"))
    to_word_type: Mapped[int] = mapped_column(ForeignKey("word_types.id"))
    transcript: Mapped[str | None]
    definition: Mapped[str | None] = mapped_column(Text)
    # sifatsiz/xato tarjima o'chirilmasdan shu bilan belgilanadi, keyin
    # to'g'rilangan yozuv seed qilinganda replaced_by orqali unga
    # ishora qiladi - shu tariqa eski (xato) tarjima tarixi yo'qolmaydi.
    deprecated: Mapped[bool] = mapped_column(Boolean, default=False)
    replaced_by: Mapped[int | None] = mapped_column(ForeignKey("vocabularies.id"))

    from_word_type_rel: Mapped["WordType"] = relationship(
        foreign_keys=[from_word_type], overlaps="vocabularies_from"
    )
    to_word_type_rel: Mapped["WordType"] = relationship(foreign_keys=[to_word_type])


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    description: Mapped[str | None] = mapped_column(Text)
    from_language: Mapped[int] = mapped_column(ForeignKey("languages.id"))
    to_language: Mapped[int] = mapped_column(ForeignKey("languages.id"))
    order: Mapped[int]


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    description: Mapped[str | None] = mapped_column(Text)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"))
    order: Mapped[int]


class Unit(Base):
    __tablename__ = "units"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    description: Mapped[str | None] = mapped_column(Text)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id"))
    order: Mapped[int]


class UnitWord(Base):
    __tablename__ = "unit_words"

    id: Mapped[int] = mapped_column(primary_key=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"))
    word_type_id: Mapped[int] = mapped_column(ForeignKey("word_types.id"))
    order: Mapped[int]


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[int] = mapped_column(primary_key=True)
    language_id: Mapped[int] = mapped_column(ForeignKey("languages.id"))
    # hikoya qaysi unit so'zlari asosida yozilgan (beginner'da hikoya
    # yo'q, shuning uchun nullable).
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id"))
    title: Mapped[str]
    body: Mapped[str] = mapped_column(Text)


class StoryTranslation(Base):
    __tablename__ = "story_translations"

    id: Mapped[int] = mapped_column(primary_key=True)
    from_story_id: Mapped[int] = mapped_column(ForeignKey("stories.id"))
    to_story_id: Mapped[int] = mapped_column(ForeignKey("stories.id"))


class UsedWord(Base):
    __tablename__ = "used_words"

    id: Mapped[int] = mapped_column(primary_key=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id"))
    word_id: Mapped[int] = mapped_column(ForeignKey("words.id"))


class WordPicture(Base):
    __tablename__ = "word_pictures"

    id: Mapped[int] = mapped_column(primary_key=True)
    word_type_id: Mapped[int] = mapped_column(ForeignKey("word_types.id"))
    path: Mapped[str]


class CoursePicture(Base):
    __tablename__ = "course_pictures"

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"))
    path: Mapped[str]


class ChapterPicture(Base):
    __tablename__ = "chapter_pictures"

    id: Mapped[int] = mapped_column(primary_key=True)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id"))
    path: Mapped[str]


class UnitPicture(Base):
    __tablename__ = "unit_pictures"

    id: Mapped[int] = mapped_column(primary_key=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"))
    path: Mapped[str]


class StoryPicture(Base):
    __tablename__ = "story_pictures"

    id: Mapped[int] = mapped_column(primary_key=True)
    story_id: Mapped[int] = mapped_column(ForeignKey("stories.id"))
    kind: Mapped[str]  # header | body
    order: Mapped[int | None]
    path: Mapped[str]
