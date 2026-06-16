Corpus files for sentence serving.

Supported file names per language:

- english: `indicqa.en.json` (or `en.json`, `english.json`, `indicqa.english.json`)
- hindi: `indicqa.hi.json` (or `hi.json`, `hindi.json`, `indicqa.hindi.json`)
- marathi: `indicqa.mr.json` (or `mr.json`, `marathi.json`, `indicqa.marathi.json`)

Extraction behavior:

- IndicQA paragraph `context` is split into sentence-like chunks.
- Devanagari sentence boundaries include `।` and `|` (pipe), and standard punctuation splitting is also applied.
- Questions are also considered.
- Only entries in the 70-120 grapheme range are kept.

Expected format (IndicQA or SQuAD-style nested QA JSON):

```json
{
  "data": [
    {
      "paragraphs": [
        {
          "qas": [
            { "question": "...", "category": "SHORT" }
          ]
        }
      ]
    }
  ]
}
```

Credits:

- IndicQA (Hindi/Marathi): AI4Bharat, Hugging Face dataset `ai4bharat/IndicQA`
- English QA file: SQuAD 2.0 (`dev-v2.0.json`) by Rajpurkar et al.

Source links:

- IndicQA: https://huggingface.co/datasets/ai4bharat/IndicQA
- SQuAD 2.0: https://rajpurkar.github.io/SQuAD-explorer/
