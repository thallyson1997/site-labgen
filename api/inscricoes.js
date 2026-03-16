const REQUIRED_FIELDS = ["nome", "email"];

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

function withCors(req, res) {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function saveOnSupabase(data) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY nao configurados.");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/inscricoes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseServiceKey,
      "Authorization": `Bearer ${supabaseServiceKey}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify([data]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Falha no Supabase: ${errorText}`);
  }

  const rows = await response.json();
  return rows?.[0] || null;
}

module.exports = async function handler(req, res) {
  withCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Metodo nao permitido." });
  }

  try {
    const payload = req.body || {};
    const missingFields = REQUIRED_FIELDS.filter((field) => {
      const value = payload[field];
      return !value || String(value).trim() === "";
    });

    if (missingFields.length > 0) {
      return sendJson(res, 400, {
        error: "Campos obrigatorios ausentes.",
        missing_fields: missingFields,
      });
    }

    const row = {
      nome: String(payload.nome || "").trim(),
      email: String(payload.email || "").trim(),
      telefone: String(payload.telefone || "").trim(),
      responsavel: String(payload.responsavel || "").trim(),
      idade: String(payload.idade || "").trim(),
      modulo: String(payload.modulo || "").trim(),
      observacoes: String(payload.observacoes || "").trim(),
      created_at: new Date().toISOString(),
    };

    const saved = await saveOnSupabase(row);

    return sendJson(res, 201, {
      message: "Inscricao salva com sucesso.",
      data: saved,
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: "Erro ao salvar inscricao.",
      detail: error instanceof Error ? error.message : "Erro interno.",
    });
  }
};
