from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
ANALYSIS_DIR = ROOT / "tools" / "source-analysis"
DATA_DIR = ROOT / "data"
PUBLIC_DIR = ROOT

SOURCE_CONFIG = {
    "unidad-red.json": "Ética, legislación y comunidad de ciberseguridad",
    "ia-riesgo.json": "IA como factor de riesgo",
    "triangulo.json": "Tríada CIA",
    "frameworks.json": "Frameworks y defensa en profundidad",
    "amenazas.json": "Amenazas, vulnerabilidades y ethical hacking",
    "actividad4.json": "Plataformas de capacitación en ciberseguridad",
    "actividad2.json": "Códigos éticos y ética hacker",
}

MULTIPLE_TYPES = {
    "multiple",
    "multiple_choice",
    "opción múltiple",
    "scenario",
}
TRUE_FALSE_TYPES = {"true_false", "verdadero/falso"}
MULTI_ANSWER_TYPES = {"multiple_select", "selección múltiple", "select_all"}

DIFFICULTY_MAP = {
    "easy": "básica",
    "fácil": "básica",
    "facil": "básica",
    "baja": "básica",
    "basic": "básica",
    "básica": "básica",
    "basica": "básica",
    "medium": "intermedia",
    "intermediate": "intermedia",
    "intermedia": "intermedia",
    "media": "intermedia",
    "moderada": "intermedia",
    "hard": "difícil",
    "difficult": "difícil",
    "difícil": "difícil",
    "dificil": "difícil",
    "alta": "difícil",
}

# Corrections from a second-pass audit against every source PDF. These keep
# transformed matching, ordering, and multi-answer prompts self-contained and
# explicitly preserve ambiguities found in the source material.
AUDIT_OVERRIDES: dict[str, dict[str, Any]] = {
    "Q047": {
        "question": "Enumera las cinco amenazas que el PDF incluye en la sección de confidencialidad.",
    },
    "Q048": {
        "expectedAnswer": "1) Contraseñas sin proteger: dejar la contraseña anotada o visible. 2) Compartir credenciales: prestar el usuario o dejar visible el login. 3) Comunicación sin cifrar: enviar información sensible sin protección, permitiendo su interceptación.",
        "keyPoints": [
            "Contraseñas sin proteger: dejar la contraseña anotada o visible",
            "Compartir credenciales: prestar el usuario o dejar visible el login",
            "Comunicación sin cifrar: enviar información sensible sin protección y permitir su interceptación",
        ],
    },
    "Q056": {
        "expectedAnswer": "1) Redundancia: redes, servidores o aplicaciones alternos entran en acción si falla el sistema principal. 2) Mantenerse actualizado: reduce fallas y cierra brechas nuevas. 3) Backups y recuperación: permiten volver a operar tras un incidente.",
        "keyPoints": [
            "Redundancia: sistemas alternos actúan si falla el principal",
            "Actualizaciones: reducen fallas y cierran brechas",
            "Backups y recuperación: permiten volver a operar",
        ],
    },
    "Q063": {
        "section": "NIST Cybersecurity Framework (CSF); Relación con la defensa en profundidad",
    },
    "Q076": {
        "question": "Enumera las cuatro medidas técnicas concretas que el PDF usa como ejemplos de CIS Controls.",
        "section": "Relación con la defensa en profundidad",
    },
    "Q078": {
        "section": "CIS Controls; Relación con la defensa en profundidad",
    },
    "Q085": {
        "question": "Clasifica cada caso como amenaza involuntaria, amenaza voluntaria interna o amenaza voluntaria externa: borrado accidental de datos, ex empleado con credenciales no revocadas, inundación y competencia desleal.",
    },
    "Q086": {
        "question": "Enumera las cuatro amenazas que el documento incluye en sus listas y distingue de las vulnerabilidades.",
    },
    "Q095": {
        "expectedAnswer": "Limited Entry Points (puntos de entrada limitados); Guards Check Identity (guardias que comprueban identidad); Watch Towers (torres de vigilancia); Moat (foso); Inner Walls (muros internos); High Hard Walls (muros altos y duros).",
        "keyPoints": [
            "Limited Entry Points: puntos de entrada limitados",
            "Guards Check Identity: guardias que comprueban identidad",
            "Watch Towers: torres de vigilancia",
            "Moat: foso",
            "Inner Walls: muros internos",
            "High Hard Walls: muros altos y duros",
        ],
    },
    "Q098": {
        "question": "Relaciona cada hito con el periodo que muestra el PDF; indica cuando dos hitos comparten el mismo intervalo.",
        "expectedAnswer": "Tech Model Railroad Club: años 60-70; phreakers como John Draper: años 60-70; Kevin Mitnick: años 80; Gusano Morris: 1988; Kevin Poulsen: años 90.",
        "keyPoints": [
            "Tech Model Railroad Club: años 60-70",
            "John Draper y los phreakers: años 60-70",
            "Kevin Mitnick: años 80",
            "Gusano Morris: 1988",
            "Kevin Poulsen: años 90",
        ],
    },
    "Q100": {
        "question": "Enumera las cuatro reglas que el documento establece para el hacker ético.",
    },
    "Q110": {
        "question": "Enumera las cinco capacidades defensivas que el documento atribuye a SOC Level 1 y 2 en TryHackMe.",
    },
    "Q126": {
        "question": "Según el apartado «Ámbito de aplicación» de la página 2, ¿a quién obliga formalmente el código ACM?",
        "section": "ACM Code of Ethics and Professional Conduct — Ámbito de aplicación (p. 2)",
        "explanation": "El apartado de ámbito de aplicación de la página 2 menciona a miembros de ACM y a quienes reciben sus premios; otro apartado de la página 3 limita la obligación a miembros, discrepancia tratada por separado en una pregunta comparativa.",
    },
    "Q132": {
        "question": "Compara el carácter vinculante de ACM e IEEE e identifica la discrepancia interna que presenta el documento sobre el alcance de ACM.",
        "expectedAnswer": "ACM: el apartado de la página 2 incluye a miembros y receptores de premios, mientras la página 3 afirma que solo obliga formalmente a miembros; para otros profesionales funciona como orientación. IEEE: el cumplimiento es condición de membresía. Ambos son marcos profesionales o gremiales y no tienen fuerza de ley por sí mismos.",
        "keyPoints": [
            "ACM p. 2: miembros y receptores de premios",
            "ACM p. 3: solo miembros; existe una discrepancia interna",
            "IEEE: condición de membresía",
            "Ambos: carácter profesional o gremial, no legal",
        ],
        "explanation": "La comparación conserva la discrepancia interna del PDF en vez de elegir una de sus dos formulaciones sobre ACM.",
    },
    "Q138": {
        "question": "Enumera los seis principios que el PDF atribuye a la ética hacker.",
    },
}

AUDIT_TARGETS: dict[str, tuple[str, str]] = {
    "Q047": ("Introduccion_Triangulo_Seguridad.pdf", "Selecciona todas las amenazas que el PDF enumera en la sección de confidencialidad."),
    "Q048": ("Introduccion_Triangulo_Seguridad.pdf", "Relaciona cada práctica con su descripción: (1) contraseñas sin proteger, (2) compartir credenciales, (3) comunicación sin cifrar."),
    "Q056": ("Introduccion_Triangulo_Seguridad.pdf", "Relaciona cada control con su función: (1) redundancia, (2) mantenerse actualizado, (3) backups y plan de recuperación."),
    "Q063": ("Frameworks_Ciberseguridad (1).pdf", "Una organización quiere un lenguaje común para orientar decisiones de gobierno y prioridades de inversión, sin recibir una lista técnica obligatoria. ¿Qué marco del PDF encaja mejor y por qué?"),
    "Q076": ("Frameworks_Ciberseguridad (1).pdf", "Selecciona todas las medidas técnicas concretas que el PDF usa como ejemplos de CIS Controls."),
    "Q078": ("Frameworks_Ciberseguridad (1).pdf", "Una organización ya definió resultados estratégicos, pero necesita priorizar acciones técnicas como segmentación, configuraciones, accesos y protección de datos. ¿Qué framework del PDF responde mejor a esa necesidad?"),
    "Q085": ("Amenazas_Vulnerabilidades.pdf", "Clasifica: borrar accidentalmente datos, ex empleado con credenciales no revocadas, inundación y competencia desleal."),
    "Q086": ("Amenazas_Vulnerabilidades.pdf", "Selecciona únicamente amenazas incluidas en las listas del documento."),
    "Q095": ("Amenazas_Vulnerabilidades.pdf", "¿Qué elementos aparecen rotulados en el diagrama del castillo como defensa en profundidad?"),
    "Q098": ("Amenazas_Vulnerabilidades.pdf", "Ordena cronológicamente los hitos: Tech Model Railroad Club, phreakers como John Draper, Kevin Mitnick, Gusano Morris y Kevin Poulsen."),
    "Q100": ("Amenazas_Vulnerabilidades.pdf", "Selecciona las cuatro reglas indicadas para el hacker ético."),
    "Q110": ("Actividad4_UrielOrtiz (1).pdf", "Selecciona todas las capacidades defensivas que el documento atribuye a SOC Level 1 y 2 en TryHackMe."),
    "Q126": ("Actividad2_UrielOrtiz.pdf", "¿A quién obliga formalmente el código ACM según la actividad?"),
    "Q132": ("Actividad2_UrielOrtiz.pdf", "Compara el carácter vinculante de ACM e IEEE según el documento."),
    "Q138": ("Actividad2_UrielOrtiz.pdf", "Selecciona todos los principios que el PDF atribuye a la ética hacker."),
}


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return re.sub(r"\s+", " ", value).strip()
    if isinstance(value, (list, tuple)):
        return "; ".join(clean_text(item) for item in value if clean_text(item))
    if isinstance(value, dict):
        return "; ".join(f"{clean_text(k)}: {clean_text(v)}" for k, v in value.items())
    return str(value).strip()


def normalized_key(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.lower())
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def strip_option_prefix(value: Any) -> str:
    text = clean_text(value)
    return re.sub(r"^[A-Za-z]\s*[\)\.:-]\s*", "", text).strip()


def difficulty(value: Any) -> str:
    key = normalized_key(clean_text(value))
    return DIFFICULTY_MAP.get(key, "intermedia")


def listify(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [clean_text(item) for item in value if clean_text(item)]
    if isinstance(value, dict):
        return [f"{clean_text(key)}: {clean_text(item)}" for key, item in value.items()]
    text = clean_text(value)
    return [text] if text else []


def resolve_multiple_correct(raw_correct: Any, raw_options: list[Any]) -> int | None:
    options = [strip_option_prefix(option) for option in raw_options]
    if isinstance(raw_correct, bool):
        return None
    if isinstance(raw_correct, int):
        return raw_correct if 0 <= raw_correct < len(options) else None
    if isinstance(raw_correct, list):
        return None
    value = clean_text(raw_correct)
    if re.fullmatch(r"[A-Za-z]", value):
        index = ord(value.upper()) - ord("A")
        return index if 0 <= index < len(options) else None
    cleaned = strip_option_prefix(value)
    for index, option in enumerate(options):
        if normalized_key(cleaned) == normalized_key(option):
            return index
    return None


def resolve_true_false(raw_correct: Any) -> bool | None:
    if isinstance(raw_correct, bool):
        return raw_correct
    value = normalized_key(clean_text(raw_correct))
    if value in {"true", "verdadero", "v", "cierto"}:
        return True
    if value in {"false", "falso", "f"}:
        return False
    return None


def resolve_open_correct(candidate: dict[str, Any]) -> list[str]:
    raw_correct = candidate.get("correct")
    raw_options = candidate.get("options") if isinstance(candidate.get("options"), list) else []
    options = [strip_option_prefix(option) for option in raw_options]

    if isinstance(raw_correct, dict):
        return [f"{clean_text(key)}: {clean_text(value)}" for key, value in raw_correct.items()]
    if isinstance(raw_correct, list):
        resolved: list[str] = []
        for item in raw_correct:
            value = clean_text(item)
            if re.fullmatch(r"[A-Za-z]", value):
                index = ord(value.upper()) - ord("A")
                if 0 <= index < len(options):
                    value = options[index]
            if value:
                resolved.append(value)
        return resolved
    if isinstance(raw_correct, bool):
        return ["Verdadero" if raw_correct else "Falso"]

    value = clean_text(raw_correct)
    letter_sequence = [token.strip() for token in value.split(",")]
    if letter_sequence and all(re.fullmatch(r"[A-Za-z]", token) for token in letter_sequence):
        resolved = []
        for token in letter_sequence:
            index = ord(token.upper()) - ord("A")
            if 0 <= index < len(options):
                resolved.append(options[index])
        if resolved:
            return resolved
    return [value] if value else []


def expected_material(candidate: dict[str, Any], original_type: str) -> tuple[str, list[str]]:
    explicit = clean_text(candidate.get("expected_answer"))
    combined_points = listify(candidate.get("expected_answer/key_points"))
    existing_points = listify(candidate.get("key_points"))
    correct_points = resolve_open_correct(candidate)

    if explicit:
        expected_points = [explicit]
        # A full source answer is preferable to a short instructional rubric.
        if len(clean_text(candidate.get("correct"))) > len(explicit):
            expected_points = correct_points
    elif isinstance(candidate.get("correct"), dict):
        expected_points = correct_points
    elif original_type in MULTI_ANSWER_TYPES:
        expected_points = combined_points if len(combined_points) > len(correct_points) else correct_points
    elif correct_points:
        expected_points = correct_points
    elif combined_points:
        expected_points = combined_points
    elif existing_points:
        expected_points = existing_points
    else:
        expected_points = [clean_text(candidate.get("explanation"))]

    expected_points = [point for point in expected_points if point]
    expected_text = "; ".join(expected_points)

    if isinstance(candidate.get("correct"), dict) or isinstance(candidate.get("correct"), list):
        key_points = correct_points
    elif original_type in MULTI_ANSWER_TYPES:
        key_points = expected_points
    else:
        key_points = existing_points or combined_points or correct_points or expected_points
    return expected_text, key_points


def normalize_candidate(candidate: dict[str, Any], main_topic: str) -> dict[str, Any]:
    original_type = clean_text(candidate.get("type")).lower()
    raw_options = candidate.get("options") if isinstance(candidate.get("options"), list) else []
    source_path = Path(clean_text(candidate.get("source_file")))
    base: dict[str, Any] = {
        "topic": main_topic,
        "subtopic": clean_text(candidate.get("topic")) or main_topic,
        "difficulty": difficulty(candidate.get("difficulty")),
        "question": clean_text(candidate.get("prompt")),
        "explanation": clean_text(candidate.get("explanation")),
        "source": source_path.name,
        "section": clean_text(candidate.get("section")) or "Sección no especificada",
        "originalType": original_type,
    }

    if original_type in TRUE_FALSE_TYPES:
        correct = resolve_true_false(candidate.get("correct"))
        if correct is not None:
            base.update({"type": "true_false", "correct": correct})
            return base

    if original_type in MULTIPLE_TYPES and raw_options:
        correct_index = resolve_multiple_correct(candidate.get("correct"), raw_options)
        if correct_index is not None:
            base.update(
                {
                    "type": "multiple",
                    "options": [strip_option_prefix(option) for option in raw_options],
                    "correct": correct_index,
                }
            )
            return base

    # Multi-answer, matching, ordering, comparison and development items become
    # open questions. This preserves the material without pretending there is a
    # single automatically gradable answer.
    expected, key_points = expected_material(candidate, original_type)
    base.update(
        {
            "type": "open",
            "expectedAnswer": expected,
            "keyPoints": key_points,
        }
    )
    return base


def validate_question(question: dict[str, Any], known_sources: set[str]) -> list[str]:
    errors: list[str] = []
    for field in ("topic", "subtopic", "difficulty", "question", "explanation", "source", "section"):
        if not clean_text(question.get(field)):
            errors.append(f"missing {field}")
    if question.get("source") not in known_sources:
        errors.append("unknown source")
    if question.get("difficulty") not in {"básica", "intermedia", "difícil"}:
        errors.append("invalid difficulty")
    qtype = question.get("type")
    if qtype == "multiple":
        options = question.get("options", [])
        correct = question.get("correct")
        if len(options) < 2:
            errors.append("multiple choice has fewer than two options")
        if len({normalized_key(option) for option in options}) != len(options):
            errors.append("duplicate options")
        if not isinstance(correct, int) or isinstance(correct, bool) or not 0 <= correct < len(options):
            errors.append("invalid correct option")
    elif qtype == "true_false":
        if not isinstance(question.get("correct"), bool):
            errors.append("invalid true/false answer")
    elif qtype == "open":
        if not clean_text(question.get("expectedAnswer")):
            errors.append("open question without expected answer")
        if not question.get("keyPoints"):
            errors.append("open question without key points")
    else:
        errors.append("invalid type")
    return errors


def build() -> dict[str, Any]:
    analyses: list[dict[str, Any]] = []
    questions: list[dict[str, Any]] = []
    known_sources: set[str] = set()

    for filename, main_topic in SOURCE_CONFIG.items():
        path = ANALYSIS_DIR / filename
        if not path.exists():
            raise FileNotFoundError(f"Missing analysis file: {path}")
        payload = json.loads(path.read_text(encoding="utf-8"))
        source_name = Path(clean_text(payload.get("source_file"))).name
        known_sources.add(source_name)
        candidates = payload.get("candidate_questions", [])
        sections = payload.get("sections", [])
        ambiguities = [
            clean_text(issue)
            for section in sections
            for issue in section.get("contradictions_or_ambiguities", [])
            if clean_text(issue)
        ]
        analyses.append(
            {
                "analysisFile": filename,
                "source": source_name,
                "topic": main_topic,
                "pagesOrUnitsRead": payload.get("pages_or_units_read"),
                "sectionCount": len(sections),
                "candidateCount": len(candidates),
                "extractionIssues": payload.get("extraction_issues", []),
                "contradictionsOrAmbiguities": ambiguities,
                "sections": sections,
            }
        )
        for candidate in candidates:
            questions.append(normalize_candidate(candidate, main_topic))

    # Remove exact and extremely close prompt duplicates while retaining the
    # first occurrence and documenting every omission.
    deduplicated: list[dict[str, Any]] = []
    removed: list[dict[str, str]] = []
    for question in questions:
        key = normalized_key(question["question"])
        duplicate_of: dict[str, Any] | None = None
        for existing in deduplicated:
            other = normalized_key(existing["question"])
            ratio = SequenceMatcher(None, key, other).ratio()
            if key == other or ratio >= 0.965:
                duplicate_of = existing
                break
        if duplicate_of:
            removed.append(
                {
                    "question": question["question"],
                    "source": question["source"],
                    "duplicateOf": duplicate_of["question"],
                    "duplicateSource": duplicate_of["source"],
                }
            )
        else:
            deduplicated.append(question)

    if set(AUDIT_TARGETS) != set(AUDIT_OVERRIDES):
        raise ValueError("Audit override targets and corrections must have identical keys")
    for correction_name, (source, prompt) in AUDIT_TARGETS.items():
        matches = [
            question
            for question in deduplicated
            if question["source"] == source and question["question"] == prompt
        ]
        if len(matches) != 1:
            raise ValueError(
                f"Audit correction {correction_name} expected one stable source/prompt match; found {len(matches)}"
            )
        matches[0].update(AUDIT_OVERRIDES[correction_name])

    for index, question in enumerate(deduplicated, start=1):
        question["id"] = f"Q{index:03d}"

    validation_errors: list[dict[str, Any]] = []
    for question in deduplicated:
        errors = validate_question(question, known_sources)
        if errors:
            validation_errors.append({"id": question["id"], "errors": errors})
    if validation_errors:
        raise ValueError(json.dumps(validation_errors, ensure_ascii=False, indent=2))

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    questions_path = DATA_DIR / "questions.json"
    questions_path.write_text(json.dumps(deduplicated, ensure_ascii=False, indent=2), encoding="utf-8")
    (PUBLIC_DIR / "questions.js").write_text(
        "window.EXAM_QUESTIONS = " + json.dumps(deduplicated, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )

    inventory = {
        "sources": analyses,
        "duplicatesRemoved": removed,
        "contradictionsAndAmbiguities": [
            {
                "source": item["source"],
                "issues": item["contradictionsOrAmbiguities"],
            }
            for item in analyses
        ],
        "coverage": {
            "total": len(deduplicated),
            "byType": dict(Counter(question["type"] for question in deduplicated)),
            "byDifficulty": dict(Counter(question["difficulty"] for question in deduplicated)),
            "byTopic": dict(Counter(question["topic"] for question in deduplicated)),
            "bySource": dict(Counter(question["source"] for question in deduplicated)),
            "bySubtopic": dict(Counter(question["subtopic"] for question in deduplicated)),
        },
    }
    (DATA_DIR / "inventory.json").write_text(
        json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return inventory


def main() -> None:
    parser = argparse.ArgumentParser(description="Normalize and validate the exam question bank.")
    parser.parse_args()
    inventory = build()
    print(json.dumps(inventory["coverage"], ensure_ascii=False, indent=2))
    print(f"Duplicates removed: {len(inventory['duplicatesRemoved'])}")


if __name__ == "__main__":
    main()
