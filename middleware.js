export const config = {
  matcher: ["/pages/curso_de_ferias.html", "/pages/inscricao.html", "/api/inscricoes"]
};

function unauthorizedResponse() {
  return new Response("Acesso restrito.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Area Restrita - Inscricoes"'
    }
  });
}

export default function middleware(request) {
  const expectedUser = process.env.INSCRICAO_USER;
  const expectedPass = process.env.INSCRICAO_PASS;

  if (!expectedUser || !expectedPass) {
    return new Response("Protecao nao configurada no ambiente.", { status: 503 });
  }

  const authHeader = request.headers.get("authorization") || "";

  if (!authHeader.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  const encodedCredentials = authHeader.slice(6);
  let credentials = "";

  try {
    credentials = atob(encodedCredentials);
  } catch {
    return unauthorizedResponse();
  }

  const separator = credentials.indexOf(":");
  if (separator === -1) {
    return unauthorizedResponse();
  }

  const user = credentials.slice(0, separator);
  const pass = credentials.slice(separator + 1);

  if (user !== expectedUser || pass !== expectedPass) {
    return unauthorizedResponse();
  }

  return;
}
