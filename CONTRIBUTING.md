# Contributing

The interesting part of this repo is the question bank, and it is generated: the
editable input is the per-file analysis in `tools/source-analysis/`, one JSON per
study document, and `tools/build_bank.py` turns those into `data/questions.json`
plus the `questions.js` the page loads.

## Adding or fixing questions

1. Edit the analysis file for the document you are working from. Every question
   needs a `topic`, a `prompt`, an `explanation` and a real `source_file` that
   matches one of the PDFs listed at the top of `tools/build_bank.py`.
2. If the question comes from a multiple-select, matching or ordering exercise
   in the source, keep the full answer in `expected_answer` or `key_points`. These
   become open questions, and a rubric that only says "distinguish correctly" is
   useless for studying.
3. Run the generator. It validates types, correct-answer indexes, duplicate
   options, difficulty values, traceability and the presence of a real expected
   answer, and it refuses to write anything if a question fails:

   ```bash
   python tools/build_bank.py
   ```

4. Corrections that override generated text live in `AUDIT_OVERRIDES` keyed by
   source file plus exact prompt, so they survive reordering. Do not reach for the
   ordinal `Q###` ids.

## Everything else

Keep the code and the docs in English and the exam itself in Spanish — the
questions are for a Spanish-taught course. Run the checks in the README before
opening a pull request, and work on a branch: `main` is protected.
