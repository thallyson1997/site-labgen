function sendJson(res, status, data) {
  res.status(status).json(data);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Metodo nao permitido." });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const BUCKET_NAME = "comprovantes";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return sendJson(res, 500, {
      error: "Variáveis de ambiente não configuradas."
    });
  }

  if (SUPABASE_SERVICE_ROLE_KEY.startsWith("sb_publishable_")) {
    return sendJson(res, 500, {
      error: "SUPABASE_SERVICE_ROLE_KEY esta usando uma chave publishable. Configure a chave secreta sb_secret no Vercel."
    });
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

    // Validação
    if (!nome || !telefone || !email || !moduloId) {
      return sendJson(res, 400, { error: "Campos obrigatorios ausentes." });
    }

    if (!comprovanteBase64 || !comprovanteNome || !comprovanteTipo) {
      return sendJson(res, 400, { error: "Comprovante ausente." });
    }

    if (moduloId < 1 || moduloId > 3) {
      return sendJson(res, 400, { error: "Modulo invalido." });
    }

    console.log("Processando inscricao", {
      moduloId,
      supabaseHost: SUPABASE_URL
    });

    // Converte base64 para buffer
    const buffer = Buffer.from(comprovanteBase64, "base64");

    // Sanitiza nome do arquivo (remove caracteres especiais)
    const sanitizedName = comprovanteNome
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .toLowerCase();
    const timestamp = Date.now();
    const objectPath = `modulo_${moduloId}/${timestamp}_${sanitizedName}`;

    // Upload para Supabase Storage
    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${objectPath}`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": comprovanteTipo,
          "x-upsert": "false"
        },
        body: buffer
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Upload error:", errorText);
      return sendJson(res, 500, {
        error: "Falha ao enviar comprovante para armazenamento."
      });
    }

    // Chama função RPC para inscrever no banco
    const rpcResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/inscrever_aluno`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          p_nome: nome.trim(),
          p_telefone: telefone.trim(),
          p_email: email.trim().toLowerCase(),
          p_modulo_id: moduloId,
          p_comprovante_path: objectPath
        })
      }
    );

    const rpcData = await rpcResponse.json();

    if (!rpcResponse.ok) {
      console.error("RPC error:", rpcData);
      // Se deu erro, tenta deletar o arquivo que foi uploadado
      await fetch(
        `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${objectPath}`,
        {
          method: "DELETE",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          }
        }
      );
      return sendJson(res, 400, {
        error:
          rpcData.message ||
          "Nao foi possivel concluir sua inscricao."
      });
    }

    return sendJson(res, 201, {
      ok: true,
      message: "Inscricao realizada com sucesso!",
      inscricaoId: rpcData.inscricao_id,
      moduloId: rpcData.modulo_id
    });
  } catch (error) {
    console.error("Handler error:", error);
    return sendJson(res, 500, {
      error: "Erro ao processar inscricao."
    });
  }
}