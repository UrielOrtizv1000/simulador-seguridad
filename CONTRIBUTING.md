# Contributing

All the exam content lives in `js/preguntas.js`, in two pieces: `TOPICS` describes
the seven themes of the course, and `QUESTION_BANK` holds the questions. The engine
in `js/app.js` reads both at runtime, so adding, editing or removing questions of
an existing type needs no change to the logic at all.

## Adding or editing a question

1. Add the object to `QUESTION_BANK` with a unique `id`, a `topic` that already
   exists in `TOPICS`, the right `type`, and an `explain` line that says why the
   answer is the answer. Open questions carry a `model` answer instead.
2. Follow the shape of the type you are writing — `options` plus `answerIndex` for
   `mc`, `answer` for `vf`, `answers` for `fill`, `pairs` for `match` and `connect`,
   `slots` plus `pool` for `diagram`. The README documents each one with an example.
3. Keep the answer inside the question. A distractor is fine; a second correct
   option is not, and neither is a `diagram` whose `pool` has no possible solution.
4. Reload `index.html` and walk the question once, both answering it right and
   answering it wrong: the feedback, the locked state and the topic breakdown are
   the parts a bad edit breaks.

Adding a new question type does mean touching `js/app.js`, since each type is
rendered and graded separately.

## Everything else

Keep the code and the docs in English and the exam itself in Spanish — the
questions and their explanations are for a Spanish-taught course. Work on a
branch and open a pull request: `main` is protected.
