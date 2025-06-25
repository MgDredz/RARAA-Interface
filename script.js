const proxyUrl = "http://193.136.11.169:3000/sparql";

let subtiposDisponiveis = [];

const queries = {
  sitios: `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX ao: <https://ariadne-infrastructure.eu/aocat/1.1/>
    PREFIX cidoc: <http://cidoc-crm.org/cidoc-crm/7.1.1/>
    PREFIX raraa: <https://doi.org/10.34622/datarepositorium/VVCF9M#>
    SELECT DISTINCT ?inventoryNumber
    WHERE {
      ?outcrop rdf:type cidoc:E27_Site .
      ?outcrop raraa:siteName ?inventoryNumber .
    }
    ORDER BY ?inventoryNumber
  `,
  afloramentosTodos: `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX ao: <https://ariadne-infrastructure.eu/aocat/1.1/>
    PREFIX cidoc: <http://cidoc-crm.org/cidoc-crm/7.1.1/>
    PREFIX raraa: <https://doi.org/10.34622/datarepositorium/VVCF9M#>
    SELECT DISTINCT ?inventoryNumber
    WHERE {
      ?outcrop rdf:type cidoc:E26_Physical_Feature ;
               ao:has_original_id ?inventoryNumber .
      FILTER(isLiteral(?inventoryNumber))
    }
    ORDER BY ?inventoryNumber
  `,
  cenas: `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX ao: <https://ariadne-infrastructure.eu/aocat/1.1/>
    PREFIX cidoc: <http://cidoc-crm.org/cidoc-crm/7.1.1/>
    PREFIX raraa: <https://doi.org/10.34622/datarepositorium/VVCF9M#>
    SELECT DISTINCT ?name
    WHERE {
      ?scene rdf:type raraa:Scene ;
             ao:has_original_id ?name .
    }
  `,
  tipos: `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX ao: <https://ariadne-infrastructure.eu/aocat/1.1/>
    PREFIX cidoc: <http://cidoc-crm.org/cidoc-crm/7.1.1/>
    PREFIX raraa: <https://doi.org/10.34622/datarepositorium/VVCF9M#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    SELECT DISTINCT ?label
    WHERE {
      ?motif rdf:type raraa:Motif ;
             raraa:graphicalType ?typeIRI .
      ?typeIRI skos:prefLabel ?label .
      FILTER(LANG(?label) = "pt")
    }
    ORDER BY ?label
  `,
  subtipos: `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX ao: <https://ariadne-infrastructure.eu/aocat/1.1/>
    PREFIX cidoc: <http://cidoc-crm.org/cidoc-crm/7.1.1/>
    PREFIX raraa: <https://doi.org/10.34622/datarepositorium/VVCF9M#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    SELECT DISTINCT ?label
    WHERE {
      ?motif rdf:type raraa:Motif ;
             raraa:graphicalSubType ?subtypeIRI .
      ?subtypeIRI skos:prefLabel ?label .
      FILTER(LANG(?label) = "pt")
    }
    ORDER BY ?label
  `,
  subtiposDeTipo: (tiposSelecionados) => {
    const filters = tiposSelecionados.map((t) => `"${t}"@pt`).join(", ");
    return `
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      SELECT DISTINCT ?narrowerLabel
      WHERE {
        ?tipo skos:prefLabel ?label ;
              skos:narrower ?narrower .
        ?narrower skos:prefLabel ?narrowerLabel .
        FILTER(LANG(?label) = "pt" && LANG(?narrowerLabel) = "pt")
        FILTER(?label IN (${filters}))
      }
    `;
  },
  partesRepresentadas: `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX ao: <https://ariadne-infrastructure.eu/aocat/1.1/>
    PREFIX cidoc: <http://cidoc-crm.org/cidoc-crm/7.1.1/>
    PREFIX raraa: <https://doi.org/10.34622/datarepositorium/VVCF9M#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    PREFIX dbp: <http://dbpedia.org/property/>
    SELECT DISTINCT ?Label
    WHERE {
      ?part rdf:type raraa:RepresentedPart ;
            raraa:representedPart ?id .
      ?id skos:prefLabel ?Label .
      FILTER(LANG(?Label) = "pt")
    }
  `,
  motivos: `
  PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX ao: <https://ariadne-infrastructure.eu/aocat/1.1/>
PREFIX raraa: <https://doi.org/10.34622/datarepositorium/VVCF9M#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT DISTINCT ?id ?description ?groupLabel ?typeLabel ?subtypeLabel ?sceneLabel
WHERE {
  ?s rdf:type raraa:Motif ;
     ao:has_description ?description ;
     ao:has_original_id ?id ;
     raraa:graphicalType ?typeIRI .

  OPTIONAL {
    ?s raraa:graphicalSubType ?subtypeIRI .
    OPTIONAL {
      ?subtypeIRI skos:prefLabel ?subtypeLabel .
      FILTER(LANG(?subtypeLabel) = "pt")
    }
  }

  OPTIONAL {
    ?s raraa:graphicalGroupType ?groupIRI .
    OPTIONAL {
      ?groupIRI skos:prefLabel ?groupLabel .
      FILTER(LANG(?groupLabel) = "pt")
    }
  }

  OPTIONAL {
    ?typeIRI skos:prefLabel ?typeLabel .
    FILTER(LANG(?typeLabel) = "pt")
  }

  OPTIONAL {
    ?scene rdf:type raraa:Scene ;
           ao:has_part ?s ;
           ao:has_original_id ?sceneLabel .
  }
}
ORDER BY ?id
`,
};

async function fetchSPARQL(query) {
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/sparql-query",
      Accept: "application/sparql-results+json",
    },
    body: query,
  });

  const data = await response.json();

  return data.results.bindings
    .map((b) => {
      // CASO: Query de motivos
      if (b.id && b.description) {
        return {
          id: b.id.value,
          description: b.description.value,
          groupLabel: b.groupLabel?.value || "",
          typeLabel: b.typeLabel?.value || "",
          subtypeLabel: b.subtypeLabel?.value || "",
          sceneLabel: b.sceneLabel?.value || "",
        };
      }

      // CASOS simples (label, inventoryNumber, etc.)
      if (b.label) return b.label.value;
      if (b.Label) return b.Label.value;
      if (b.inventoryNumber) return b.inventoryNumber.value;
      if (b.name) return b.name.value;
      if (b.narrowerLabel) return b.narrowerLabel.value;

      return null;
    })
    .filter((v) => v);
}

function renderCheckboxes(containerId, items, onChangeCallback = null) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  items.forEach((item) => {
    const checkbox = document.createElement("div");
    checkbox.classList.add("form-check");
    checkbox.innerHTML = `
      <input class="form-check-input" type="checkbox" id="${item}">
      <label class="form-check-label" for="${item}">${item}</label>
    `;
    container.appendChild(checkbox);

    if (onChangeCallback) {
      checkbox
        .querySelector("input")
        .addEventListener("change", onChangeCallback);
    }
  });
}

function getSelectedSites() {
  return Array.from(document.querySelectorAll(".site-checkbox:checked")).map(
    (cb) => cb.value.toLowerCase(),
  );
}
function getSelectedOutcrops() {
  return Array.from(
    document.querySelectorAll(
      "#afloramentoCheckboxes .form-check-input:checked",
    ),
  ).map((cb) => cb.id.toLowerCase());
}
function getSelectedTipos() {
  return Array.from(
    document.querySelectorAll("#tipoCheckboxes .form-check-input:checked"),
  ).map((cb) => cb.id.trim());
}
function getSelectedCenas() {
  return Array.from(
    document.querySelectorAll("#cenaCheckboxes .form-check-input:checked"),
  ).map((cb) => cb.id.toLowerCase());
}
function getSelectedSubtipos() {
  return Array.from(
    document.querySelectorAll("#subtipoCheckboxes .form-check-input:checked"),
  ).map((cb) => cb.id.trim());
}
function getSelectedPartesRepresentadas() {
  return Array.from(
    document.querySelectorAll("#parteCheckboxes .form-check-input:checked"),
  ).map((cb) => cb.id.trim());
}

function buildFilteredAfloramentosQuery(siteNames) {
  const filters = siteNames.map((n) => `"${n}"`).join(", ");
  return `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX ao: <https://ariadne-infrastructure.eu/aocat/1.1/>
    PREFIX cidoc: <http://cidoc-crm.org/cidoc-crm/7.1.1/>
    PREFIX raraa: <https://doi.org/10.34622/datarepositorium/VVCF9M#>
    SELECT DISTINCT ?inventoryNumber
    WHERE {
      ?site rdf:type cidoc:E27_Site ;
            raraa:siteName ?siteName ;
            ao:has_part ?outcrop .
      ?outcrop rdf:type cidoc:E26_Physical_Feature ;
               ao:has_original_id ?inventoryNumber .
      FILTER(isLiteral(?inventoryNumber) && LCASE(?siteName) IN (${filters}))
    }
    ORDER BY ?inventoryNumber
  `;
}

function buildFilteredCenasQuery(outcropIds) {
  const filters = outcropIds.map((n) => `"${n}"`).join(", ");
  return `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX ao: <https://ariadne-infrastructure.eu/aocat/1.1/>
    PREFIX cidoc: <http://cidoc-crm.org/cidoc-crm/7.1.1/>
    PREFIX raraa: <https://doi.org/10.34622/datarepositorium/VVCF9M#>
    SELECT DISTINCT ?inventoryNumber
    WHERE {
      ?outcrop rdf:type cidoc:E26_Physical_Feature ;
               ao:has_original_id ?outcropId ;
               ao:has_part ?cena .
      ?cena rdf:type raraa:Scene ;
            ao:has_original_id ?inventoryNumber .
      FILTER(
        isLiteral(?inventoryNumber) &&
        LCASE(?outcropId) IN (${filters})
      )
    }
    ORDER BY ?inventoryNumber
  `;
}

async function updateOutcropsFromSites() {
  const selectedSites = getSelectedSites();
  if (selectedSites.length === 0) {
    const afloramentos = await fetchSPARQL(queries.afloramentosTodos);
    renderCheckboxes(
      "afloramentoCheckboxes",
      afloramentos,
      updateCenasFromOutcrops,
    );
  } else {
    const query = buildFilteredAfloramentosQuery(selectedSites);
    const afloramentos = await fetchSPARQL(query);
    renderCheckboxes(
      "afloramentoCheckboxes",
      afloramentos,
      updateCenasFromOutcrops,
    );
  }
}

async function updateCenasFromOutcrops() {
  const selectedOutcrops = getSelectedOutcrops();
  const cenaMsg = document.getElementById("cenaMensagem");

  // Esconde a mensagem por defeito (sempre antes de começar)
  cenaMsg.style.display = "none";

  let cenas = [];

  if (selectedOutcrops.length === 0) {
    // Sem afloramentos => carregar todas as cenas
    cenas = await fetchSPARQL(queries.cenas);
  } else {
    const query = buildFilteredCenasQuery(selectedOutcrops);
    cenas = await fetchSPARQL(query);
  }

  renderCheckboxes("cenaCheckboxes", cenas);

  // Mostrar a mensagem apenas se não houver cenas
  if (cenas.length === 0) {
    cenaMsg.style.display = "block";
  }
}



async function updateSubtiposFromTipos() {
  const tiposSelecionados = getSelectedTipos();

  if (tiposSelecionados.length === 0) {
    renderCheckboxes("subtipoCheckboxes", subtiposDisponiveis);
    return;
  }

  const query = queries.subtiposDeTipo(tiposSelecionados);
  const subtiposRelacionados = await fetchSPARQL(query);

  const subtiposFiltrados = subtiposDisponiveis.filter((sub) =>
    subtiposRelacionados.includes(sub),
  );
  renderCheckboxes("subtipoCheckboxes", subtiposFiltrados);
}

function renderMotivos(motivos) {
  motivosAtuais = motivos; // Atualiza a lista global
  const container = document.getElementById("cardsContainer");
  container.innerHTML = "";

  motivos.forEach((m) => {
    const card = document.createElement("div");
    card.classList.add("card", "mb-3");
    card.style.cursor = "pointer";
    card.onclick = () => {
      window.location.href = `motivo.html?id=${encodeURIComponent(m.id)}`;
    };

    let tipoText = "Sem informação";
    if (m.groupLabel && m.typeLabel) {
      tipoText = `${m.groupLabel} - ${m.typeLabel}`;
    } else if (m.groupLabel || m.typeLabel) {
      tipoText = m.groupLabel || m.typeLabel;
    }

    card.innerHTML = `
  <a href="motivo.html?id=${encodeURIComponent(m.id)}" class="text-decoration-none text-reset">
    <div class="row g-0">
      <div class="col-md-2">
        <div class="card-img-wrapper">
          <img src="photos/${m.id}.jpg" class="img-fluid" alt="Motivo" onerror="this.onerror=null; this.src='photos/noimage.jpg';">
        </div>
      </div>
      <div class="col-md-10 d-flex">
        <div class="card-body d-flex flex-column justify-content-between w-100">
          <div class="top-content">
            <div class="d-flex justify-content-between align-items-start">
              <h6 class="card-title mb-1 card-title-big">${m.id}</h6>
              ${m.sceneLabel ? `<span class="badge badge-cena">${m.sceneLabel}</span>` : ""}
            </div>
            <p class="card-text mb-2 text-truncate-multiline">${m.description}</p>
          </div>
          <div class="bottom-content">
            <p class="mb-0"><strong>Tipo:</strong> ${tipoText}</p>
            <p class="mb-0"><strong>Sub-Tipo:</strong> ${m.subtypeLabel || "Sem subtipo"}</p>
          </div>
        </div>
      </div>
    </div>
  </a>
`;

    container.appendChild(card);
  });

  document.querySelector(".motivos-listados").textContent =
    `${motivos.length} motivo${motivos.length !== 1 ? "s" : ""} listados`;
}

// Guardar motivos carregados
let motivosAtuais = [];

function ordenarMotivos(motivos, criterio) {
  const comparador = {
    "Número de Inventário": (a, b) =>
      a.id.localeCompare(b.id, "pt", { numeric: true }),

    Tipo: (a, b) => (a.typeLabel || "").localeCompare(b.typeLabel || "", "pt"),

    Cena: (a, b) => {
      const cenaA = a.sceneLabel || "ZZZ"; // vazios vão para o fim
      const cenaB = b.sceneLabel || "ZZZ";
      return cenaA.localeCompare(cenaB, "pt");
    },
  }[criterio];

  return [...motivos].sort(comparador);
}

// Listener do dropdown
document.getElementById("ordenar").addEventListener("change", () => {
  const criterio = document.getElementById("ordenar").value;
  const ordenados = ordenarMotivos(motivosAtuais, criterio);
  renderMotivos(ordenados);
});

function generateMotifQuery() {
  const selectedSites = Array.from(
    document.querySelectorAll("#siteCheckboxes .form-check-input:checked"),
  ).map((cb) => cb.id);
  const selectedOutcrops = Array.from(
    document.querySelectorAll(
      "#afloramentoCheckboxes .form-check-input:checked",
    ),
  ).map((cb) => cb.id);
  const selectedScenes = Array.from(
    document.querySelectorAll("#cenaCheckboxes .form-check-input:checked"),
  ).map((cb) => cb.id);
  const selectedTypes = Array.from(
    document.querySelectorAll("#tipoCheckboxes .form-check-input:checked"),
  ).map((cb) => `"${cb.id}"@pt`);
  const selectedSubtypes = Array.from(
    document.querySelectorAll("#subtipoCheckboxes .form-check-input:checked"),
  ).map((cb) => `"${cb.id}"@pt`);
  const selectedParts = Array.from(
    document.querySelectorAll("#parteCheckboxes .form-check-input:checked"),
  ).map((cb) => `"${cb.id}"@pt`);

  const filterLines = [];

  if (selectedSites.length > 0) {
    const siteValues = selectedSites.map((v) => `"${v}"`).join(", ");
    filterLines.push(`FILTER(?siteLabel IN (${siteValues}))`);
  }

  if (selectedOutcrops.length > 0) {
    const outcropValues = selectedOutcrops.map((v) => `"${v}"`).join(", ");
    filterLines.push(`FILTER(?outcropLabel IN (${outcropValues}))`);
  }

  let cenaBlock = `
  OPTIONAL {
    ?scene rdf:type raraa:Scene ;
           ao:has_part ?motif ;
           ao:has_original_id ?sceneLabel .
  }
`;

if (selectedScenes.length > 0) {
  const sceneValues = selectedScenes.map((v) => `"${v}"`).join(", ");
  filterLines.push(`FILTER(?sceneLabel IN (${sceneValues}))`);

  // Agora torna a cena obrigatória (sem OPTIONAL)
  cenaBlock = `
    ?scene rdf:type raraa:Scene ;
           ao:has_part ?motif ;
           ao:has_original_id ?sceneLabel .
  `;
}

  if (selectedTypes.length > 0) {
    filterLines.push(`FILTER(?typeLabel IN (${selectedTypes.join(", ")}))`);
  }

  if (selectedSubtypes.length > 0) {
    filterLines.push(
      `FILTER(?subtypeLabel IN (${selectedSubtypes.join(", ")}))`,
    );
  }

  if (selectedParts.length > 0) {
    filterLines.push(
      `FILTER(?representedPartLabel IN (${selectedParts.join(", ")}))`,
    );
  }

  return `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX ao: <https://ariadne-infrastructure.eu/aocat/1.1/>
    PREFIX cidoc: <http://cidoc-crm.org/cidoc-crm/7.1.1/>
    PREFIX raraa: <https://doi.org/10.34622/datarepositorium/VVCF9M#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

    SELECT DISTINCT ?id ?description ?groupLabel ?typeLabel ?subtypeLabel ?sceneLabel
    WHERE {
      ?motif rdf:type raraa:Motif ;
             ao:has_original_id ?id .

      OPTIONAL {
        ?site ao:has_part ?outcrop .
        ?site ao:has_original_id ?siteLabel .
        ?outcrop ao:has_part ?motif .
      }

      OPTIONAL {
        ?outcrop ao:has_part ?motif .
        ?outcrop ao:has_original_id ?outcropLabel .
      }

      OPTIONAL {
        ?scene rdf:type raraa:Scene ;
         ao:has_part ?motif ;
         ao:has_original_id ?sceneLabel .
      }


      OPTIONAL {
        ?motif raraa:graphicalType ?typeIRI .
        ?typeIRI skos:prefLabel ?typeLabel .
        FILTER(LANG(?typeLabel) = "pt")
      }

      OPTIONAL {
        ?motif raraa:graphicalSubType ?subtypeIRI .
        ?subtypeIRI skos:prefLabel ?subtypeLabel .
        FILTER(LANG(?subtypeLabel) = "pt")
      }

      OPTIONAL {
        ?part rdf:type raraa:RepresentedPart ;
              ao:is_part_of ?motif ;
              raraa:representedPart ?partIRI .
        ?partIRI skos:prefLabel ?representedPartLabel .
        FILTER(LANG(?representedPartLabel) = "pt")
      }

      OPTIONAL {
        ?motif raraa:graphicalGroupType ?groupIRI .
        ?groupIRI skos:prefLabel ?groupLabel .
        FILTER(LANG(?groupLabel) = "pt")
      }

      OPTIONAL {
        ?motif ao:has_description ?description .
      }
      ${cenaBlock}
      ${filterLines.join("\n")}
    }
    ORDER BY ?id
  `;
}

//Código desabilitado (Header desaparecer ao dar scroll)
/*
let lastScrollTop = 0;
const header = document.getElementById("mainHeader");

window.addEventListener("scroll", () => {
  const currentScroll = window.scrollY;

  if (currentScroll > lastScrollTop && currentScroll > 60) {
    header.style.top = "-60px"; // esconder
  } else {
    header.style.top = "0"; // mostrar
  }

  lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
});
*/

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [sitios, afloramentos, cenas, tipos, subtipos, partes] =
      await Promise.all([
        fetchSPARQL(queries.sitios),
        fetchSPARQL(queries.afloramentosTodos),
        fetchSPARQL(queries.cenas),
        fetchSPARQL(queries.tipos),
        fetchSPARQL(queries.subtipos),
        fetchSPARQL(queries.partesRepresentadas),
      ]);

    subtiposDisponiveis = subtipos;

    renderCheckboxes("siteCheckboxes", sitios, updateOutcropsFromSites);
    renderCheckboxes(
      "afloramentoCheckboxes",
      afloramentos,
      updateCenasFromOutcrops,
    );
    renderCheckboxes("cenaCheckboxes", cenas);
    renderCheckboxes("tipoCheckboxes", tipos, updateSubtiposFromTipos);
    renderCheckboxes("subtipoCheckboxes", subtiposDisponiveis);
    renderCheckboxes("parteCheckboxes", partes);

    const motivos = await fetchSPARQL(queries.motivos);
    renderMotivos(motivos);
  } catch (err) {
    console.error("Erro ao carregar dados iniciais:", err);
  }

  // Botão de pesquisa
  document
    .getElementById("botaoPesquisar")
    .addEventListener("click", async () => {
      try {
        const query = generateMotifQuery();
        const motivosFiltrados = await fetchSPARQL(query);
        document.getElementById("ordenar").value = "Número de Inventário";
        const ordenados = ordenarMotivos(motivosFiltrados, "Número de Inventário");
        renderMotivos(ordenados);
      } catch (err) {
        console.error("Erro ao filtrar motivos:", err);
      }
    });

  // Setas dropdown
  document.querySelectorAll(".toggle-arrow").forEach((button) => {
    const targetId = button.getAttribute("data-bs-target");
    const collapseEl = document.querySelector(targetId);
    collapseEl.addEventListener("hide.bs.collapse", () => {
      button.classList.add("collapsed");
    });
    collapseEl.addEventListener("show.bs.collapse", () => {
      button.classList.remove("collapsed");
    });
  });

  document.getElementById("limparFiltros").addEventListener("click", () => {
    document
      .querySelectorAll(".form-check-input")
      .forEach((cb) => (cb.checked = false));

    // Atualizar filtros dependentes
    updateOutcropsFromSites();
    updateCenasFromOutcrops();
    updateSubtiposFromTipos();
  });
});