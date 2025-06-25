const proxyUrl = "http://193.136.11.169:3000/sparql";

// Mapeamento de predicados para nomes legíveis
const predicadoLabels = {
  has_identifier: "DOI",
  P32_used_general_technique: "Técnica Geral",
  graphicalGroupType: "Grupo",
  graphicalType: "Tipo",
  graphicalSubType: "Sub-Tipo",
  has_native_period: "Cronologia",
  P44_has_condition: "Conservação",
  style: "Estilo",
  technique: "Técnica",
  variantTechnique: "Técnica Variada",
  completeFigure: "Figura",
  invertedFigure: "Figura Invertida",
  inclination: "Inclinação",
  patina: "Pátina",
  perspective: "Perspetiva",
  relationWithRock: "Relação com Rocha",
  animationTechnique: "Técnica de Animação",
  
};

// Obter parâmetro da URL
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

async function fetchMotifDetails(id) {
  const query = `
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX ao: <https://ariadne-infrastructure.eu/aocat/1.1/>
    PREFIX raraa: <https://doi.org/10.34622/datarepositorium/VVCF9M#>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

    SELECT DISTINCT ?predicate ?value
    FROM <http://www.ontotext.com/explicit>
    WHERE {
      ?motif rdf:type raraa:Motif ;
             ao:has_original_id "${id}" ;
             ?predicate ?rawValue .

      OPTIONAL {
        ?rawValue skos:prefLabel ?label .
        FILTER(LANG(?label) = "pt")
      }

      BIND(COALESCE(?label, STR(?rawValue)) AS ?value)
    }
  `;

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/sparql-query",
      Accept: "application/sparql-results+json",
    },
    body: query,
  });

  const data = await response.json();
  return data.results.bindings.map((b) => ({
    predicate: b.predicate.value,
    value: b.value.value,
  }));
}

function renderMotif(data, id) {
  const list = document.getElementById("motifAttributes");
  const titleEl = document.getElementById("motifTitle");
  const descriptionEl = document.getElementById("motifDescription");
  const imageEl = document.getElementById("motifImage");

  titleEl.textContent = id;
  imageEl.src = `photos/${id}.jpg`;
  imageEl.onerror = () => {
    imageEl.src = "photos/noimage.jpg";
  };

  const descriptionObj = data.find(
    (d) => d.predicate.split(/[\/#]/).pop() === "has_description",
  );
  const description = descriptionObj ? descriptionObj.value : "";
  descriptionEl.textContent = description;

  list.innerHTML = "";

  const predicadosIgnorados = [
    "type",
    "has_original_id",
    "has_description",
  ];

  const dadosFiltrados = data.filter(({ predicate }) => {
    return !predicadosIgnorados.some((ignorado) =>
      predicate.includes(ignorado),
    );
  });

  const ordemDesejada = Object.keys(predicadoLabels);
  const dadosOrdenados = dadosFiltrados.sort((a, b) => {
    const keyA = a.predicate.split(/[\/#]/).pop();
    const keyB = b.predicate.split(/[\/#]/).pop();
    const indexA = ordemDesejada.indexOf(keyA);
    const indexB = ordemDesejada.indexOf(keyB);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  dadosOrdenados.forEach(({ predicate, value }) => {
    const key = predicate.split(/[\/#]/).pop();
    const label = predicadoLabels[key] || key;

    const item = document.createElement("li");
    let valueHtml = value;
      if (key === "has_identifier") {
        valueHtml = `<a href="${value}" target="_blank" rel="noopener noreferrer">${value}</a>`;
      }
      item.innerHTML = `<span class="label">${label}</span><span class="value">${valueHtml}</span>`;
    list.appendChild(item);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const motifId = getQueryParam("id");
  if (!motifId) return;

  const data = await fetchMotifDetails(motifId);
  renderMotif(data, motifId);
});

function abrirZoom() {
  const src = document.getElementById("motifImage").src;
  const zoomedImg = document.getElementById("zoomedImage");
  zoomedImg.src = src;

  const modal = new bootstrap.Modal(document.getElementById("zoomModal"));
  modal.show();

  setTimeout(() => {
    const elem = document.getElementById("zoomContainer");
    const panzoom = Panzoom(elem, {
      contain: "outside",
      maxScale: 5,
      minScale: 1,
      panOnlyWhenZoomed: true,
      zoomDoubleClickSpeed: 1,
      animate: true,
    });

    // Scroll para zoom
    elem.parentElement.addEventListener("wheel", (event) => {
      panzoom.zoomWithWheel(event);
    });
  }, 300);
}