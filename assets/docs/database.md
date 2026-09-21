languages:
- id: int (PK)
- language: uz | ru | en

words:
- id: int (PK)
- language: int (FK -> languages.id)
- word: str          # faqat headword (yozilishi), tur/ta'rif/talaffuzsiz

types:
- id: int (PK)
- type: str # adverb verb noun ...

# bitta so'z bir nechta turda bo'lishi mumkin (masalan "update" ham
# noun, ham verb), va har bir tur o'ziga xos talaffuz/ta'rifga ega
# bo'lishi mumkin (masalan "record" noun/verb sifatida boshqacha
# talaffuz qilinadi) - shuning uchun bu ma'lumotlar words'da emas,
# shu junction jadvalda saqlanadi.
word_types:
- id: int (PK)
- word_id: int (FK -> words.id)
- type_id: int (FK -> types.id)
- transcript: str

# bir xil so'z+tur bir nechta ta'rifga ega bo'lishi mumkin (turli ma'no)
definitions:
- id: int (PK)
- word_type_id: int (FK -> word_types.id)
- definition: str

samples:
- id: int (PK)
- word_type_id: int (FK -> word_types.id)
- sample: str        # o'sha so'z+tur bilan tuzilgan misol gap

sample_translations:
- id: int (PK)
- from_sample_id: int (FK -> samples.id)
- to_sample_id: int (FK -> samples.id)

# tallafuzi ikki til uchun ikki xil yozilishi mumkin, masalan koreyslar ohangni lotincha alifbodan tushunmaslik muammosi tufayli
vocabularies:
- id: int
- from_language: int (FK -> languages.id)
- to_language: int (FK -> languages.id)
- from_word_type: int (FK -> word_types.id)
- to_word_type: int (FK -> word_types.id)
- transcript: str # native til tallafuzi qoidasiga moslangani
- definition: str # native tarjimasi
- deprecated: bool # default false - sifatsiz/xato tarjima seed qilingan bo'lsa, o'chirmasdan shu bilan belgilanadi
- replaced_by: int | null (FK -> vocabularies.id) # deprecated=true bo'lsa, to'g'rilangan yozuvga ishora qiladi

courses:
- id: int
- name: str
- description: str
- from_language: int (FK -> languages.id)
- to_language: int (FK -> languages.id)
- order: int

chapters:
- id: int (PK)
- name: str
- description: str
- course_id: int (FK -> courses.id)
- order: int

units:
- id: int (PK)
- name: str
- description: str
- chapter_id: int (FK -> chapters.id)
- order: int

unit_words:
- id: int (PK)
- unit_id: int (FK -> units.id)
- word_type_id: int (FK -> word_types.id)
- order: int

used_words:
- id: int
- story_id: int (FK -> stories.id)
- word_id: int (FK -> words.id)

stories:
- id: int
- language_id: int (FK -> languages.id)
- title: str
- body: text

story_translations:
- id: int (PK)
- from_story_id: int (FK -> stories.id)
- to_story_id: int (FK -> stories.id)

word_pictures:
- id: int (PK)
- word_type_id: int (FK -> word_types.id)
- path: str (/storage/name)

course_pictures:
- id: int (PK)
- course_id: int (FK -> courses.id)
- path: str

chapter_pictures:
- id: int (PK)
- chapter_id: int (FK -> chapters.id)
- path: str

unit_pictures:
- id: int (PK)
- unit_id: int (FK -> units.id)
- path: str

story_pictures:
- id: int (PK)
- story_id: int (FK -> stories.id)
- kind: header | body
- order: int | null
- path: str
