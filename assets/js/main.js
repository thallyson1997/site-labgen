const copyBtn = document.getElementById("copy-pix-btn");
const pixKeyEl = document.getElementById("pix-key-value");
const pixCopyStatus = document.getElementById("pix-copy-status");

if (copyBtn && pixKeyEl) {
  copyBtn.addEventListener("click", () => {
    navigator.clipboard
      .writeText((pixKeyEl.textContent || "").trim())
      .then(() => {
        if (pixCopyStatus) {
          pixCopyStatus.textContent = "Chave copiada!";
          setTimeout(() => {
            pixCopyStatus.textContent = "";
          }, 2500);
        }
      })
      .catch(() => {
        if (pixCopyStatus) {
          pixCopyStatus.textContent = "Nao foi possivel copiar. Copie manualmente.";
        }
      });
  });
}

const form = document.getElementById("inscricao-form");
const statusBox = document.getElementById("inscricao-status");

if (form && statusBox) {
  const moduleRadios = Array.from(form.querySelectorAll('input[name="modulo"]'));
  const fileInput = form.querySelector('input[name="comprovante"]');
  const submitButton = form.querySelector('button[type="submit"]');

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
  const MAX_SIZE_BYTES = 5 * 1024 * 1024;

  const validateModule = () => {
    const selected = moduleRadios.some((radio) => radio.checked);
    if (moduleRadios.length > 0) {
      moduleRadios[0].setCustomValidity(selected ? "" : "Selecione um modulo para continuar.");
    }
    return selected;
  };

  const validateFile = () => {
    if (!fileInput) return false;
    const file = fileInput.files && fileInput.files[0];

    if (!file) {
      fileInput.setCustomValidity("Anexe o comprovante de pagamento.");
      return false;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      fileInput.setCustomValidity("Arquivo invalido. Envie JPG, PNG ou PDF.");
      return false;
    }

    if (file.size > MAX_SIZE_BYTES) {
      fileInput.setCustomValidity("O arquivo deve ter no maximo 5 MB.");
      return false;
    }

    fileInput.setCustomValidity("");
    return true;
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Falha ao ler o comprovante."));
      reader.readAsDataURL(file);
    });

  moduleRadios.forEach((radio) => radio.addEventListener("change", validateModule));
  if (fileInput) {
    fileInput.addEventListener("change", validateFile);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const moduleOk = validateModule();
    const fileOk = validateFile();

    if (!form.checkValidity() || !moduleOk || !fileOk) {
      form.reportValidity();
      statusBox.textContent = "Revise os campos obrigatorios do formulario.";
      statusBox.className = "form-status is-error";
      return;
    }

    const selectedModule = form.querySelector('input[name="modulo"]:checked');
    const file = fileInput.files[0];

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Enviando...";
      }

      statusBox.textContent = "Enviando inscricao...";
      statusBox.className = "form-status";

      const comprovanteBase64 = await fileToBase64(file);

      const payload = {
        nome: form.nome.value.trim(),
        telefone: form.telefone.value.trim(),
        email: form.email.value.trim(),
        moduloId: Number(selectedModule.value),
        comprovanteNome: file.name,
        comprovanteTipo: file.type,
        comprovanteBase64
      };

      const response = await fetch("/api/inscricoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel concluir sua inscricao.");
      }

      statusBox.textContent = data.message || "Inscricao enviada com sucesso!";
      statusBox.className = "form-status is-success";
      form.reset();
    } catch (error) {
      statusBox.textContent = error.message || "Erro ao enviar inscricao.";
      statusBox.className = "form-status is-error";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Enviar inscricao";
      }
    }
  });
}

