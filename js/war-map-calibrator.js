(() => {
  "use strict";

  const TOTAL_NODES = 50;

  const viewport = document.getElementById("viewport");
  const stage = document.getElementById("stage");
  const map = document.getElementById("map");

  const nodeCounter = document.getElementById("nodeCounter");
  const calibrationMessage = document.getElementById(
    "calibrationMessage"
  );

  const undoButton = document.getElementById("undoNode");
  const resetButton = document.getElementById("resetNodes");
  const fitButton = document.getElementById("fitMap");
  const generateButton = document.getElementById("generateNodes");

  const coordinatesOutput = document.getElementById(
    "coordinatesOutput"
  );

  const outputText = document.getElementById("outputText");
  const copyOutputButton = document.getElementById("copyOutput");
  const closeOutputButton = document.getElementById("closeOutput");
  const toast = document.getElementById("calibrationToast");

  const nodes = [];

  let scale = 1;
  let toastTimer = null;
  let initialized = false;

  function showToast(message) {
    window.clearTimeout(toastTimer);

    toast.textContent = message;
    toast.classList.add("show");

    toastTimer = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 1800);
  }

  function getMapSize() {
    return {
      width: map.naturalWidth || map.clientWidth,
      height: map.naturalHeight || map.clientHeight
    };
  }

  function setStageSize() {
    const { width, height } = getMapSize();

    if (!width || !height) {
      return;
    }

    stage.style.width = `${width}px`;
    stage.style.minWidth = `${width}px`;
    stage.style.height = `${height}px`;

    map.style.width = `${width}px`;
    map.style.height = `${height}px`;
  }

  function applyScale() {
    const { width, height } = getMapSize();

    stage.style.transform = `scale(${scale})`;
    stage.style.transformOrigin = "top left";

    /*
     * Como transform: scale() no modifica el espacio real ocupado
     * por el elemento, usamos márgenes para compensar la diferencia.
     */
    stage.style.marginRight = `${Math.max(
      0,
      width * scale - width
    )}px`;

    stage.style.marginBottom = `${Math.max(
      0,
      height * scale - height
    )}px`;
  }

  function fitMap() {
    const { width, height } = getMapSize();

    if (!width || !height) {
      return;
    }

    const availableWidth = Math.max(
      1,
      viewport.clientWidth - 20
    );

    const availableHeight = Math.max(
      1,
      viewport.clientHeight - 20
    );

    const widthScale = availableWidth / width;
    const heightScale = availableHeight / height;

    scale = Math.min(widthScale, heightScale, 1);

    applyScale();

    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;

    showToast("Mapa ajustado");
  }

  function updateInterface() {
    const nextNode = Math.min(
      nodes.length + 1,
      TOTAL_NODES
    );

    nodeCounter.textContent =
      nodes.length >= TOTAL_NODES
        ? `${TOTAL_NODES}/${TOTAL_NODES}`
        : `Nodo ${nextNode}/${TOTAL_NODES}`;

    undoButton.disabled = nodes.length === 0;
    resetButton.disabled = nodes.length === 0;
    generateButton.disabled =
      nodes.length !== TOTAL_NODES;

    if (nodes.length === 0) {
      calibrationMessage.textContent =
        "Toca el centro exacto del nodo número 1.";
      return;
    }

    if (nodes.length < TOTAL_NODES) {
      calibrationMessage.textContent =
        `Nodo ${nodes.length} registrado. ` +
        `Ahora toca el nodo ${nodes.length + 1}.`;
      return;
    }

    calibrationMessage.textContent =
      "Los 50 nodos están registrados. Presiona “Generar”.";
  }

  function createMarker(node) {
    const marker = document.createElement("div");

    marker.className = "node-marker";
    marker.dataset.nodeId = String(node.id);
    marker.textContent = String(node.id);

    /*
     * El marcador usa las coordenadas naturales del mapa.
     * Como está dentro del mismo stage, el escalado afecta
     * por igual al mapa y al marcador.
     */
    marker.style.left = `${node.x}px`;
    marker.style.top = `${node.y}px`;

    stage.appendChild(marker);
  }

  function removeMarker(nodeId) {
    const marker = stage.querySelector(
      `.node-marker[data-node-id="${nodeId}"]`
    );

    if (marker) {
      marker.remove();
    }
  }

  function clearMarkers() {
    stage
      .querySelectorAll(".node-marker")
      .forEach((marker) => marker.remove());
  }

  function registerNode(event) {
    if (nodes.length >= TOTAL_NODES) {
      showToast("Ya registraste los 50 nodos");
      return;
    }

    const rect = map.getBoundingClientRect();

    const naturalWidth = map.naturalWidth;
    const naturalHeight = map.naturalHeight;

    if (
      !rect.width ||
      !rect.height ||
      !naturalWidth ||
      !naturalHeight
    ) {
      return;
    }

    /*
     * Posición del clic dentro de la imagen tal como se ve
     * actualmente en pantalla.
     */
    const renderedX = event.clientX - rect.left;
    const renderedY = event.clientY - rect.top;

    if (
      renderedX < 0 ||
      renderedY < 0 ||
      renderedX > rect.width ||
      renderedY > rect.height
    ) {
      return;
    }

    /*
     * Convertimos la posición visual a las coordenadas
     * originales de map.png.
     */
    const x = Math.round(
      renderedX * (naturalWidth / rect.width)
    );

    const y = Math.round(
      renderedY * (naturalHeight / rect.height)
    );

    const node = {
      id: nodes.length + 1,
      x,
      y,
      xPercent: Number(
        ((x / naturalWidth) * 100).toFixed(6)
      ),
      yPercent: Number(
        ((y / naturalHeight) * 100).toFixed(6)
      )
    };

    nodes.push(node);
    createMarker(node);
    updateInterface();

    showToast(`Nodo ${node.id} guardado`);
  }

  function undoLastNode() {
    const removedNode = nodes.pop();

    if (!removedNode) {
      return;
    }

    removeMarker(removedNode.id);
    updateInterface();

    showToast(`Nodo ${removedNode.id} eliminado`);
  }

  function resetNodes() {
    if (nodes.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      "¿Quieres borrar todos los nodos registrados?"
    );

    if (!confirmed) {
      return;
    }

    nodes.length = 0;
    clearMarkers();
    updateInterface();

    showToast("Calibración reiniciada");
  }

  function generateCode() {
    if (nodes.length !== TOTAL_NODES) {
      showToast(
        `Faltan ${TOTAL_NODES - nodes.length} nodos`
      );
      return;
    }

    const exportNodes = nodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      xPercent: node.xPercent,
      yPercent: node.yPercent
    }));

    const code = [
      "/*",
      " * Coordenadas de nodos de Alliance War.",
      " * Generado con war-map-calibrator.js.",
      " */",
      "",
      `window.WarNodes = ${JSON.stringify(
        exportNodes,
        null,
        2
      )};`,
      ""
    ].join("\n");

    outputText.value = code;
    coordinatesOutput.classList.add("open");

    outputText.focus();
    outputText.select();
  }

  async function copyGeneratedCode() {
    const code = outputText.value;

    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      showToast("Código copiado");
    } catch (error) {
      outputText.focus();
      outputText.select();

      const copied = document.execCommand("copy");

      showToast(
        copied
          ? "Código copiado"
          : "Selecciona y copia el texto manualmente"
      );
    }
  }

  function closeGeneratedCode() {
    coordinatesOutput.classList.remove("open");
  }

  function initialize() {
    if (initialized) {
      return;
    }

    initialized = true;

    setStageSize();
    fitMap();
    updateInterface();

    map.addEventListener("click", registerNode);

    undoButton.addEventListener(
      "click",
      undoLastNode
    );

    resetButton.addEventListener(
      "click",
      resetNodes
    );

    fitButton.addEventListener(
      "click",
      fitMap
    );

    generateButton.addEventListener(
      "click",
      generateCode
    );

    copyOutputButton.addEventListener(
      "click",
      copyGeneratedCode
    );

    closeOutputButton.addEventListener(
      "click",
      closeGeneratedCode
    );

    window.addEventListener("resize", fitMap);
  }

  if (map.complete && map.naturalWidth > 0) {
      initialize();
  } else {
    map.addEventListener(
      "load",
      initialize,
      { once: true }
    );
  }
})();