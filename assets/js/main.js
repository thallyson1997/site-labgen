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

// ── Modal de Docentes ──────────────────────────────────
document.addEventListener("DOMContentLoaded", function() {
  const modal = document.getElementById("docente-modal");
  const closeBtn = modal?.querySelector(".close");
  const docenteBtns = document.querySelectorAll(".docente-btn");

  if (modal && modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  // Dados dos docentes (em uma aplicação real, viria de uma API)
  const docentesData = {
    1: {
      nome: "Leonardo Teixeira Dall'Agnol",
      titulo: "Professor Adjunto da UFMA",
      foto: "https://vnfwisvznpohrelernpi.supabase.co/storage/v1/object/public/docentes%20e%20dicentes/DOCENTE_01.jpeg",
      descricao: "Professor Adjunto da UFMA, líder do GB3 e LabGeM, docente dos programas de pós-graduação PPGSA e PPGCTAmb. Doutor em Química Sustentável pela Universidade Nova de Lisboa (bolsa Marie Curie, 2013), com pós-doutorado em biotecnologia de cianobactérias (UFPA). Pesquisa biodiversidade microbiana, bioinformática, liquens e ciência cidadã. Coordenador do curso de Ciências Biológicas, presidente do MCAA Brazil Chapter e membro do International Science Council."
    },
    2: {
      nome: "Silma Regina Ferreira Pereira Jasper",
      titulo: "Professora Titular da UFMA",
      foto: "https://vnfwisvznpohrelernpi.supabase.co/storage/v1/object/public/docentes%20e%20dicentes/DOCENTE_02.jpeg",
      descricao: "Professora Titular da UFMA, pós-doutorada em Genética Molecular de Câncer pela Georgetown University (EUA), com graduação, mestrado e doutorado em Genética. Pesquisadora em citogenética-molecular humana, oncogenética e mutagênese, bolsista FAPEMA e membro do INCT-TeraNano."
    },
    3: {
      nome: "Hivana Barbosa Dall'Agnol",
      titulo: "Professora Adjunta - Depto. Patologia",
      foto: "https://vnfwisvznpohrelernpi.supabase.co/storage/v1/object/public/docentes%20e%20dicentes/DOCENTE_03.jpeg",
      descricao: "Professora Adjunta do Departamento de Patologia da UFMA, doutora em Genética e Biologia Molecular (UFPA, 2012), com mestrado em Patologia das Doenças Tropicais (2006) e graduação em Biomedicina (2004). Pós-doutorado em Bioquímica de Proteínas Microbianas na Universidade Nova de Lisboa (2012-2013). Ministra Microbiologia para cursos de Ciências Biológicas e da Saúde, atuando também em programas de pós-graduação e especialização. Pesquisa em biologia molecular, genômica e transcriptômica microbiana, com passagem como pesquisadora no Instituto Tecnológico Vale."
    },
    4: {
      nome: "Silvio Gomes Monteiro",
      titulo: "Professor Titular - Depto. Biologia",
      foto: "https://vnfwisvznpohrelernpi.supabase.co/storage/v1/object/public/docentes%20e%20dicentes/DOCENTE_04.jpeg",
      descricao: "Professor Titular do Departamento de Biologia da UFMA e docente permanente do PPGCS, com doutorado (1997) e mestrado (1992) em Genética pela FMRP-USP e graduação em Ciências Biológicas (UFMA, 1988). Pesquisador em genética de populações, saúde coletiva e epidemiologia ambiental, com foco em ISTs/AIDS e doenças infecto-parasitárias em populações de risco e comunidades quilombolas do Maranhão. Prêmio FAPEMA Sérgio Ferretti 2018 (Pesquisador Sênior), consultor ad hoc da FAPEMA, revisor da Biosciences Journal e ex-coordenador do Ciências Sem Fronteiras UFMA/Coimbra."
    },
    5: {
      nome: "Mayara Ingrid Sousa Lima",
      titulo: "Professora Adjunta - Depto. Biologia",
      foto: "https://vnfwisvznpohrelernpi.supabase.co/storage/v1/object/public/docentes%20e%20dicentes/DOCENTE_05.jpeg",
      descricao: "Professora Adjunta do Departamento de Biologia da UFMA, doutora em Genética e Bioquímica (UFU, 2015), com mestrado em Biotecnologia (FIOCRUZ, 2011), graduação em Ciências Biológicas (UFMA, 2008) e pós-doutorado em Genômica Populacional Microbiana na Universidade de York (2020). Coordena o grupo BioGen/LabGeM-UFMA e é docente permanente dos programas de pós-graduação PPGCS e PPGSA. Pesquisa biotecnologia e genética molecular aplicadas à saúde, com ênfase em biomarcadores e diagnóstico de hanseníase e leishmaniose, além de estudos genômicos sobre susceptibilidade e resistência medicamentosa em Leishmania."
    }
  };

  // Função para abrir modal
  function openModal(docenteId) {
    const docente = docentesData[docenteId];
    if (!docente || !modal) return;

    document.getElementById("modal-foto").src = docente.foto;
    document.getElementById("modal-foto").alt = docente.nome;
    document.getElementById("modal-nome").textContent = docente.nome;
    document.getElementById("modal-titulo").textContent = docente.titulo;
    document.getElementById("modal-descricao").textContent = docente.descricao;

    modal.style.display = "grid";
    document.body.style.overflow = "hidden"; // Prevent background scroll
  }

  // Função para fechar modal
  function closeModal() {
    if (modal) {
      modal.style.display = "none";
      document.body.style.overflow = "auto"; // Restore scroll
    }
  }

  // Event listeners
  docenteBtns.forEach(btn => {
    btn.addEventListener("click", function() {
      const docenteCard = this.closest(".docente-card");
      const docenteId = docenteCard?.getAttribute("data-docente");
      if (docenteId) {
        openModal(docenteId);
      }
    });
  });

  // Fechar modal ao clicar no X
  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  // Fechar modal ao clicar fora dele
  if (modal) {
    modal.addEventListener("click", function(event) {
      if (event.target === modal) {
        closeModal();
      }
    });
  }

  // Fechar modal com tecla ESC
  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && modal && modal.style.display !== "none" && modal.style.display !== "") {
      closeModal();
    }
  });
});

