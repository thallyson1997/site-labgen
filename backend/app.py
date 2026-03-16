import csv
import io
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, make_response, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent
DEFAULT_DATABASE_PATH = BASE_DIR / "instance" / "site_labgen.db"
REQUIRED_FIELDS = ["nome", "email"]
OPTIONAL_FIELDS = [
    "telefone",
    "responsavel",
    "idade",
    "modulo",
    "observacoes",
]


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["DATABASE_PATH"] = Path(
        os.getenv("DATABASE_PATH", str(DEFAULT_DATABASE_PATH))
    )
    app.config["ADMIN_TOKEN"] = os.getenv("ADMIN_TOKEN", "")
    app.config["ALLOWED_ORIGINS"] = _parse_allowed_origins(
        os.getenv("ALLOWED_ORIGINS", "")
    )

    _ensure_database(app.config["DATABASE_PATH"])

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        if _origin_is_allowed(origin, app.config["ALLOWED_ORIGINS"]):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Admin-Token"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response

    @app.get("/health")
    def healthcheck():
        return jsonify({"status": "ok"})

    @app.get("/")
    def index():
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.get("/<path:requested_path>")
    def serve_static_files(requested_path: str):
        target = FRONTEND_DIR / requested_path
        if target.is_file():
            return send_from_directory(FRONTEND_DIR, requested_path)
        return jsonify({"error": "Rota nao encontrada."}), 404

    @app.route("/api/inscricoes", methods=["POST", "OPTIONS"])
    def create_inscricao():
        if request.method == "OPTIONS":
            return ("", 204)

        payload = _get_payload()
        missing_fields = [field for field in REQUIRED_FIELDS if not payload.get(field)]
        if missing_fields:
            return (
                jsonify(
                    {
                        "error": "Campos obrigatorios ausentes.",
                        "missing_fields": missing_fields,
                    }
                ),
                400,
            )

        inscricao_id = _insert_registration(app.config["DATABASE_PATH"], payload)
        return (
            jsonify(
                {
                    "message": "Inscricao salva com sucesso.",
                    "id": inscricao_id,
                }
            ),
            201,
        )

    @app.get("/api/inscricoes")
    def list_inscricoes():
        auth_error = _require_admin_token(app.config["ADMIN_TOKEN"])
        if auth_error is not None:
            return auth_error

        registros = _fetch_registrations(app.config["DATABASE_PATH"])
        return jsonify(registros)

    @app.get("/api/inscricoes/export.csv")
    def export_inscricoes_csv():
        auth_error = _require_admin_token(app.config["ADMIN_TOKEN"])
        if auth_error is not None:
            return auth_error

        registros = _fetch_registrations(app.config["DATABASE_PATH"])
        csv_buffer = io.StringIO()
        writer = csv.DictWriter(
            csv_buffer,
            fieldnames=["id", "created_at", *REQUIRED_FIELDS, *OPTIONAL_FIELDS],
        )
        writer.writeheader()
        writer.writerows(registros)

        response = make_response(csv_buffer.getvalue())
        response.headers["Content-Type"] = "text/csv; charset=utf-8"
        response.headers["Content-Disposition"] = "attachment; filename=inscricoes.csv"
        return response

    return app


def _parse_allowed_origins(raw_value: str) -> set[str]:
    return {item.strip() for item in raw_value.split(",") if item.strip()}


def _origin_is_allowed(origin: str | None, allowed_origins: set[str]) -> bool:
    return bool(origin) and ("*" in allowed_origins or origin in allowed_origins)


def _get_payload() -> dict:
    if request.is_json:
        return request.get_json(silent=True) or {}
    return {key: value.strip() for key, value in request.form.items()}


def _ensure_database(database_path: Path) -> None:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path)
    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS inscricoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT NOT NULL,
                telefone TEXT,
                responsavel TEXT,
                idade TEXT,
                modulo TEXT,
                observacoes TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.commit()
    finally:
        connection.close()


def _insert_registration(database_path: Path, payload: dict) -> int:
    sanitized_payload = {
        field: str(payload.get(field, "")).strip()
        for field in [*REQUIRED_FIELDS, *OPTIONAL_FIELDS]
    }
    created_at = datetime.now(timezone.utc).isoformat()

    connection = sqlite3.connect(database_path)
    try:
        cursor = connection.execute(
            """
            INSERT INTO inscricoes (
                nome,
                email,
                telefone,
                responsavel,
                idade,
                modulo,
                observacoes,
                created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                sanitized_payload["nome"],
                sanitized_payload["email"],
                sanitized_payload["telefone"],
                sanitized_payload["responsavel"],
                sanitized_payload["idade"],
                sanitized_payload["modulo"],
                sanitized_payload["observacoes"],
                created_at,
            ),
        )
        connection.commit()
        return int(cursor.lastrowid)
    finally:
        connection.close()


def _fetch_registrations(database_path: Path) -> list[dict]:
    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    try:
        rows = connection.execute(
            """
            SELECT
                id,
                created_at,
                nome,
                email,
                telefone,
                responsavel,
                idade,
                modulo,
                observacoes
            FROM inscricoes
            ORDER BY created_at DESC
            """
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()


def _require_admin_token(configured_token: str):
    if not configured_token:
        return jsonify({"error": "ADMIN_TOKEN nao configurado no servidor."}), 500

    provided_token = request.headers.get("X-Admin-Token") or request.args.get("token", "")
    if provided_token != configured_token:
        return jsonify({"error": "Nao autorizado."}), 401
    return None


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
