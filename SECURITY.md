# Security Policy

This project is a static study tool. There is no backend, no account and no
telemetry: the page and its question bank are plain files served from wherever
you host them. Everything the exam stores — progress, wrong answers, favourites
and statistics — stays in the visitor's own browser under
`localStorage["securityExamSimulator.v1"]`.

## Reporting a vulnerability

Open a private report through **Security → Advisories → Report a vulnerability**
in this repository. Please do not use public issues for anything security
related.

Expect an initial reply within a week. This is a personal project, so fixes land
on `main` as they are ready rather than on a scheduled release train.

## Scope

Relevant: cross-site scripting through the question bank or the answer rendering
code, a GitHub Actions workflow that a fork could abuse, or a dependency that
ships something unexpected. Not relevant: the wording or the accuracy of the
questions themselves (open an issue instead), or the fact that the whole bank is
readable in `questions.js` — a study tool that hides its own answers is not much
of a study tool.
