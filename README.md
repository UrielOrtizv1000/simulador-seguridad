# Security Exam Simulator

An offline practice exam for a cybersecurity course: 141 questions drawn from the
course material, three question types, per-topic practice and a review pass over
everything you got wrong. It is a static page — no server, no build step, no
account — so it runs by opening one file, and it also runs as a site.

## What works today

- **Six ways to practise**: the full exam, a random selection you size yourself,
  one question type, one topic, only the questions you got wrong, or only your
  favourites.
- **Three question types**: 47 multiple choice, 15 true/false and 79 open.
  Objective answers are graded automatically; open ones show an expected answer
  and a list of key points instead of pretending to grade prose.
- **Explanations that teach**: after answering you get the correct answer, why it
  is correct, and which study document and section it came from.
- **Review pass**: finishing an attempt records what you missed, and one button
  starts a session with only those questions.
- **Session memory**: progress, wrong answers, favourites and lifetime statistics
  persist in `localStorage`, and an interrupted attempt can be resumed. Nothing
  leaves the browser.
- **Shuffling**: both the question order and the options are reshuffled on every
  attempt, with the correct answer tracked through the shuffle.
- **Dark and light themes**, keyboard-focusable controls, and a layout that holds
  up from a desktop monitor down to a narrow window.

## Status

Worth being straight about what this is and is not.

- **The questions come from course material that is not in this repo.** The seven
  PDFs they were written from are copyrighted study documents and stay out of the
  repository; only the derived bank and the per-document analysis in
  `tools/source-analysis/` are published. Every question records its source file
  and section, so the traceability is checkable against the material you already
  have.
- **Open questions are self-assessed.** There is no semantic grading, by design.
  You read the guide, then mark the question as mastered or as needing review, and
  only the objective questions feed the score.
- **One language.** The exam copy is Spanish because the course is; the code,
  comments and docs are English.
- **No spaced repetition.** Wrong answers come back when you ask for them, not on
  a schedule.

## Layout

```
index.html                     the whole UI
styles.css                     theme tokens and layout
app.js                         view state, persistence, answer flow
engine.js                      selection, grading and summaries (DOM-free)
questions.js                   generated bank the page loads
data/questions.json            generated bank, normalised
data/inventory.json            source inventory, coverage and known ambiguities
tools/source-analysis/*.json   one analysis per study document: sections + candidates
tools/build_bank.py            normalises, validates and generates the bank
tools/live-check.mjs           smoke test against the deployed site
tests/engine.test.mjs          unit tests for grading and selection
tests/app.spec.js              browser tests for the real flows
```

`questions.js` and `data/questions.json` are generated. Edit the analysis files,
never the output.

## Running it

Open `index.html` in a browser. That is the whole install.

## Working on it

Python 3.11 and Node 22 or newer.

```bash
python tools/build_bank.py                  # regenerate and validate the bank
npm install
npm test                                    # grading and selection units
npx playwright install chromium
npm run test:e2e                            # browser flows
npm run smoke https://your-deployed-url/    # after a deploy
```

The deploy workflow publishes the page and the bank to GitHub Pages on every push
to `main`.

## Where your data lives

`localStorage["securityExamSimulator.v1"]`, in your browser only. Clearing site
data or the simulator's own reset button removes it; nothing is ever sent
anywhere.
