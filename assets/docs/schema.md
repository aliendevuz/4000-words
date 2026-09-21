# Baza sxemasi (diagram)

`dictionary.db`ning joriy holatidan avtomatik chiqarilgan (PRAGMA `table_info`/`foreign_key_list` orqali). Matn tavsifi uchun [`database.md`](database.md)ga qarang.

```mermaid
erDiagram
    languages ||--o{ words : "language"
    languages ||--o{ courses : "from_language"
    languages ||--o{ courses : "to_language"
    languages ||--o{ vocabularies : "from_language"
    languages ||--o{ vocabularies : "to_language"
    languages ||--o{ stories : "language_id"

    words ||--o{ word_types : "word_id"
    types ||--o{ word_types : "type_id"

    word_types ||--o{ definitions : "word_type_id"
    word_types ||--o{ samples : "word_type_id"
    word_types ||--o{ word_pictures : "word_type_id"
    word_types ||--o{ unit_words : "word_type_id"
    word_types ||--o{ vocabularies : "from_word_type"
    word_types ||--o{ vocabularies : "to_word_type"

    samples ||--o{ sample_translations : "from_sample_id"
    samples ||--o{ sample_translations : "to_sample_id"

    vocabularies ||--o{ vocabularies : "replaced_by"

    courses ||--o{ chapters : "course_id"
    courses ||--o{ course_pictures : "course_id"

    chapters ||--o{ units : "chapter_id"
    chapters ||--o{ chapter_pictures : "chapter_id"

    units ||--o{ unit_words : "unit_id"
    units ||--o{ unit_pictures : "unit_id"
    units ||--o{ stories : "unit_id"

    stories ||--o{ story_pictures : "story_id"
    stories ||--o{ story_translations : "from_story_id"
    stories ||--o{ story_translations : "to_story_id"
    stories ||--o{ used_words : "story_id"
    words ||--o{ used_words : "word_id"

    words {
        int id PK
        int language FK
        string word
    }
    word_types {
        int id PK
        int word_id FK
        int type_id FK
        string transcript
    }
    definitions {
        int id PK
        int word_type_id FK
        text definition
    }
    samples {
        int id PK
        int word_type_id FK
        text sample
    }
    vocabularies {
        int id PK
        int from_language FK
        int to_language FK
        int from_word_type FK
        int to_word_type FK
        string transcript
        text definition
        bool deprecated
        int replaced_by FK
    }
    courses {
        int id PK
        string name
        int from_language FK
        int to_language FK
        int order
    }
    chapters {
        int id PK
        string name
        int course_id FK
        int order
    }
    units {
        int id PK
        string name
        int chapter_id FK
        int order
    }
    unit_words {
        int id PK
        int unit_id FK
        int word_type_id FK
        int order
    }
    stories {
        int id PK
        int language_id FK
        int unit_id FK
        string title
        text body
    }
    used_words {
        int id PK
        int story_id FK
        int word_id FK
    }
```

## Yo'nalishlarni o'qish uchun eslatma

- `word_types` — markaziy jadval: deyarli hamma narsa (`definitions`, `samples`, `word_pictures`, `unit_words`, `vocabularies`) shu yerga ulanadi, `words`ga emas
- `vocabularies` ikki marta `word_types`ga ulanadi (`from_word_type`, `to_word_type`) — bitta jadval, ikkita rol
- `vocabularies.replaced_by` — o'ziga-o'zi bog'lanish (self-reference), `deprecated` tuzatilganda ishlatiladi
- `stories.unit_id` — endi bor (backfill qilindi), lekin `used_words.word_id` esa `words`ga bog'lanadi, `word_types`ga emas (chunki "qaysi ma'no" emas, shunchaki "qaysi so'z ishlatilgan")
