from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.database import SessionLocal
from app.models import (
    Chapter,
    Course,
    Language,
    Story,
    Unit,
    Vocabulary,
    Word,
    WordType,
)
from app.schemas import (
    ChapterOut,
    CourseOut,
    DefinitionOut,
    SampleOut,
    StoryOut,
    TranslationOut,
    UnitOut,
    VocabOut,
    WordOut,
    WordSenseOut,
    WordTypeOut,
)

app = FastAPI(title="4000 Words Dictionary API")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def word_type_to_out(wt: WordType) -> WordTypeOut:
    translations = []
    for v in wt.vocabularies_from:
        to_wt = v.to_word_type_rel
        translations.append(
            TranslationOut(
                vocabulary_id=v.id,
                word_type_id=to_wt.id,
                word=to_wt.word.word,
                language=to_wt.word.language_rel.language,
                transcript=v.transcript,
                deprecated=v.deprecated,
            )
        )
    return WordTypeOut(
        id=wt.id,
        type=wt.type.type if wt.type else None,
        transcript=wt.transcript,
        definitions=[DefinitionOut.model_validate(d) for d in wt.definitions],
        samples=[SampleOut.model_validate(s) for s in wt.samples],
        translations=translations,
    )


def word_to_out(w: Word) -> WordOut:
    return WordOut(
        id=w.id,
        word=w.word,
        language=w.language_rel.language,
        types=[word_type_to_out(wt) for wt in w.word_types],
    )


@app.get("/languages")
def list_languages(db: Session = Depends(get_db)):
    return db.scalars(select(Language)).all()


@app.get("/words", response_model=list[WordOut])
def search_words(
    q: str | None = Query(None, description="So'z matni bo'yicha qidirish (boshlanishi)"),
    language: str | None = Query(None, description="en | uz"),
    limit: int = Query(20, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    stmt = (
        select(Word)
        .join(Language, Language.id == Word.language)
        .options(
            joinedload(Word.language_rel),
            joinedload(Word.word_types).joinedload(WordType.type),
            joinedload(Word.word_types).joinedload(WordType.definitions),
            joinedload(Word.word_types).joinedload(WordType.samples),
            joinedload(Word.word_types)
            .joinedload(WordType.vocabularies_from)
            .joinedload(Vocabulary.to_word_type_rel)
            .joinedload(WordType.word),
        )
    )
    if q:
        stmt = stmt.where(Word.word.ilike(f"{q}%"))
    if language:
        stmt = stmt.where(Language.language == language)
    stmt = stmt.order_by(Word.word).offset(offset).limit(limit)

    words = db.scalars(stmt).unique().all()
    return [word_to_out(w) for w in words]


@app.get("/words/{word_id}", response_model=WordOut)
def get_word(word_id: int, db: Session = Depends(get_db)):
    stmt = (
        select(Word)
        .where(Word.id == word_id)
        .options(
            joinedload(Word.language_rel),
            joinedload(Word.word_types).joinedload(WordType.type),
            joinedload(Word.word_types).joinedload(WordType.definitions),
            joinedload(Word.word_types).joinedload(WordType.samples),
            joinedload(Word.word_types)
            .joinedload(WordType.vocabularies_from)
            .joinedload(Vocabulary.to_word_type_rel)
            .joinedload(WordType.word),
        )
    )
    word = db.scalars(stmt).unique().one_or_none()
    if word is None:
        raise HTTPException(status_code=404, detail="Word not found")
    return word_to_out(word)


@app.get("/courses", response_model=list[CourseOut])
def list_courses(db: Session = Depends(get_db)):
    return db.scalars(select(Course).order_by(Course.order)).all()


@app.get("/courses/{course_id}/chapters", response_model=list[ChapterOut])
def list_chapters(course_id: int, db: Session = Depends(get_db)):
    return db.scalars(
        select(Chapter).where(Chapter.course_id == course_id).order_by(Chapter.order)
    ).all()


@app.get("/chapters/{chapter_id}/units", response_model=list[UnitOut])
def list_units(chapter_id: int, db: Session = Depends(get_db)):
    return db.scalars(
        select(Unit).where(Unit.chapter_id == chapter_id).order_by(Unit.order)
    ).all()


@app.get("/units/{unit_id}/words", response_model=list[WordOut])
def list_unit_words(unit_id: int, db: Session = Depends(get_db)):
    from app.models import UnitWord

    stmt = (
        select(Word)
        .join(WordType, WordType.word_id == Word.id)
        .join(UnitWord, UnitWord.word_type_id == WordType.id)
        .where(UnitWord.unit_id == unit_id)
        .options(
            joinedload(Word.language_rel),
            joinedload(Word.word_types).joinedload(WordType.type),
            joinedload(Word.word_types).joinedload(WordType.definitions),
            joinedload(Word.word_types).joinedload(WordType.samples),
            joinedload(Word.word_types)
            .joinedload(WordType.vocabularies_from)
            .joinedload(Vocabulary.to_word_type_rel)
            .joinedload(WordType.word),
        )
        .order_by(UnitWord.order)
    )
    words = db.scalars(stmt).unique().all()
    return [word_to_out(w) for w in words]


def word_type_to_sense_out(wt: WordType) -> WordSenseOut:
    return WordSenseOut(
        word_type_id=wt.id,
        word=wt.word.word,
        language=wt.word.language_rel.language,
        type=wt.type.type if wt.type else None,
        transcript=wt.transcript,
        definitions=[DefinitionOut.model_validate(d) for d in wt.definitions],
        samples=[SampleOut.model_validate(s) for s in wt.samples],
    )


@app.get("/get_vocab", response_model=VocabOut, response_model_by_alias=True)
def get_vocab(
    id: int = Query(..., ge=0, description="0-based indeks, vocabularies jadvali bo'yicha"),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(Vocabulary))
    if id >= total:
        raise HTTPException(
            status_code=404, detail=f"id {id} chegaradan tashqarida (0..{total - 1})"
        )

    load_opts = (
        joinedload(Vocabulary.from_word_type_rel).joinedload(WordType.word).joinedload(Word.language_rel),
        joinedload(Vocabulary.from_word_type_rel).joinedload(WordType.type),
        joinedload(Vocabulary.from_word_type_rel).joinedload(WordType.definitions),
        joinedload(Vocabulary.from_word_type_rel).joinedload(WordType.samples),
        joinedload(Vocabulary.to_word_type_rel).joinedload(WordType.word).joinedload(Word.language_rel),
        joinedload(Vocabulary.to_word_type_rel).joinedload(WordType.type),
        joinedload(Vocabulary.to_word_type_rel).joinedload(WordType.definitions),
        joinedload(Vocabulary.to_word_type_rel).joinedload(WordType.samples),
    )
    vocab = db.scalars(
        select(Vocabulary).order_by(Vocabulary.id).offset(id).limit(1).options(*load_opts)
    ).first()

    return VocabOut(
        id=id,
        vocabulary_id=vocab.id,
        from_=word_type_to_sense_out(vocab.from_word_type_rel),
        to=word_type_to_sense_out(vocab.to_word_type_rel),
        transcript=vocab.transcript,
        deprecated=vocab.deprecated,
    )


@app.get("/stories", response_model=list[StoryOut])
def list_stories(limit: int = Query(20, le=200), offset: int = 0, db: Session = Depends(get_db)):
    return db.scalars(select(Story).offset(offset).limit(limit)).all()


@app.get("/stories/{story_id}", response_model=StoryOut)
def get_story(story_id: int, db: Session = Depends(get_db)):
    story = db.get(Story, story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")
    return story
