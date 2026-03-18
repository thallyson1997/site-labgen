function sendJson(res, status, data) {
  res.status(status).json(data);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Metodo nao permitido." });
  }

  try {
    const { nome, telefone, email, moduloId } = req.body || {};

    // Validação básica dos campos obrigatórios
    if (!nome || !telefone || !email || !moduloId) {
      return sendJson(res, 400, { error: "Campos obrigatorios ausentes." });
    }

    // Simula processamento (pode adicionar delay se quiser)
    console.log("Dados recebidos:", { nome, telefone, email, moduloId });

    // Retorna sempre sucesso
    return sendJson(res, 201, {
      ok: true,
      message: "Inscricao realizada com sucesso!"
    });

  } catch (error) {
    return sendJson(res, 400, { error: "Erro ao processar inscricao." });
  }
}