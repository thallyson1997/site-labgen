const form = document.getElementById("inscricao-form");
const statusBox = document.getElementById("inscricao-status");

if (form && statusBox) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    statusBox.textContent = "Enviando inscricao...";
    statusBox.className = "form-status is-loading";

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/inscricoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel enviar.");
      }

      form.reset();
      statusBox.textContent = "Inscricao enviada com sucesso.";
      statusBox.className = "form-status is-success";
    } catch (error) {
      statusBox.textContent = `Falha no envio: ${error.message}`;
      statusBox.className = "form-status is-error";
    }
  });
}
