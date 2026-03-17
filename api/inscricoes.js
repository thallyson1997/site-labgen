const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const BUCKET_NAME = "comprovantes";

function sendJson(res, status, data) {
  res.status(status).json(data);
}

function base64ToBuffer(base64Text) {
  return Buffer.from(base64Text, "base64");
}

function sanitizeFileName(fileName) {
  return (fileName || "comprovante")
    .normalize("NFD")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

function extensionFromMime(mimeType) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "application/pdf") return "pdf";
  return "bin";
}

async function uploadToStorage({ buffer, mimeType, fileName }) {
  const safeName = sanitizeFileName(fileName);
  const ext = extensionFromMime(mimeType);
  const objectPath = `${Date.now()}-${safeName}.${ext}`;

  const uploadResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${objectPath}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": mimeType,
        "x-upsert": "false"
      },
      body: buffer
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Falha ao enviar comprovante: ${errorText}`);
  }

  return objectPath;
}

async function createEnrollment({ nome, telefone, email, moduloId, comprovantePath }) {
  const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/inscrever_aluno`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      p_nome: nome,
      p_telefone: telefone,
      p_email: email,
      p_modulo_id: moduloId,
      p_comprovante_path: comprovantePath
    })
  });

  const rpcPayload = await rpcResponse.json().catch(() => null);

  if (!rpcResponse.ok) {
    const serverMessage =
      rpcPayload?.message ||
      rpcPayload?.error_description ||
      rpcPayload?.hint ||
      "Nao foi possivel gravar a inscricao.";
    throw new Error(serverMessage);
  }

  return rpcPayload;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Metodo nao permitido." });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return sendJson(res, 500, { error: "Variaveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nao configuradas." });
  }

  try {
    const {
      nome,
      telefone,
      email,
      moduloId,
      comprovanteNome,
      comprovanteTipo,
      comprovanteBase64
    } = req.body || {};

    if (!nome || !telefone || !email || !moduloId || !comprovanteTipo || !comprovanteBase64) {
      return sendJson(res, 400, { error: "Campos obrigatorios ausentes." });
    }

    if (!ALLOWED_TYPES.has(comprovanteTipo)) {
      return sendJson(res, 400, { error: "Tipo de comprovante invalido. Use JPG, PNG ou PDF." });
    }

    const numericModuloId = Number(moduloId);
    if (!Number.isInteger(numericModuloId) || numericModuloId < 1 || numericModuloId > 3) {
      return sendJson(res, 400, { error: "Modulo invalido." });
    }

    const fileBuffer = base64ToBuffer(comprovanteBase64);
    if (fileBuffer.length > MAX_SIZE_BYTES) {
      return sendJson(res, 400, { error: "Comprovante acima de 5 MB." });
    }

    const comprovantePath = await uploadToStorage({
      buffer: fileBuffer,
      mimeType: comprovanteTipo,
      fileName: comprovanteNome
    });

    await createEnrollment({
      nome: String(nome).trim(),
      telefone: String(telefone).trim(),
      email: String(email).trim().toLowerCase(),
      moduloId: numericModuloId,
      comprovantePath
    });

    return sendJson(res, 201, {
      ok: true,
      message: "Inscricao realizada com sucesso. Aguarde a confirmacao da organizacao."
    });
  } catch (error) {
    return sendJson(res, 400, { error: error.message || "Erro ao processar inscricao." });
  }
}