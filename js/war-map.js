"use strict";

(() => {
  const DEFENSE_STORAGE_KEY = "aw-planner-defense-builder-v1";
  const MAP_STORAGE_KEY = "aw-planner-war-map-v1";
  const MAP_WIDTH = 997;
  const MAP_HEIGHT = 1577;
  const TOTAL_GROUPS = 3;

  const elements = {
    groupSummary: document.getElementById("groupSummary"),
    groupTabs: [...document.querySelectorAll(".group-tab")],
    assignedCount: document.getElementById("assignedCount"),
    autosaveText: document.getElementById("autosaveText"),
    mapViewport: document.getElementById("mapViewport"),
    mapStage: document.getElementById("mapStage"),
    mapImage: document.getElementById("warMapImage"),
    nodesLayer: document.getElementById("nodesLayer"),
    defendersList: document.getElementById("defendersList"),
    defenderSearch: document.getElementById("defenderSearch"),
    defenderCountBadge: document.getElementById("defenderCountBadge"),
    emptyDefense: document.getElementById("emptyDefense"),
    selectedNodeLabel: document.getElementById("selectedNodeLabel"),
    removeAssignmentButton: document.getElementById("removeAssignmentButton"),
    zoomInButton: document.getElementById("zoomInButton"),
    zoomOutButton: document.getElementById("zoomOutButton"),
    fitButton: document.getElementById("fitButton"),
    clearMapButton: document.getElementById("clearMapButton"),
    confirmModal: document.getElementById("confirmModal"),
    cancelClearButton: document.getElementById("cancelClearButton"),
    confirmClearButton: document.getElementById("confirmClearButton"),
    toast: document.getElementById("toast"),
    exportMapButton: document.getElementById("exportMapButton"),
    defendersCard: document.getElementById("defendersCard"),
    defendersBackdrop: document.getElementById("defendersBackdrop"),
    openDefendersButton: document.getElementById("openDefendersButton"),
    closeDefendersButton: document.getElementById("closeDefendersButton"),
    playerChoiceModal: document.getElementById("playerChoiceModal"),
    playerChoiceDescription: document.getElementById("playerChoiceDescription"),
    playerChoiceList: document.getElementById("playerChoiceList"),
    cancelPlayerChoiceButton: document.getElementById("cancelPlayerChoiceButton")
  };

  const state = {
    defense: loadDefense(),
    map: loadMapState(),
    activeGroup: 0,
    selectedNodeId: null,
    defenders: [],
    scale: 0.35,
    panX: 0,
    panY: 0,
    pointers: new Map(),
    gesture: null,
    saveMessageTimer: null,
    toastTimer: null,
    popNodeId: null,
    popTimer: null,
    pendingChampion: null
  };

  function createEmptyMapState() {
    return {
      groups: Array.from({ length: TOTAL_GROUPS }, () => ({
        assignments: {}
      }))
    };
  }

  function loadDefense() {
    try {
      const raw = localStorage.getItem(DEFENSE_STORAGE_KEY);

      if (!raw) {
        return {
          activeGroup: 0,
          groups: Array.from({ length: TOTAL_GROUPS }, () => ({
            officer: "",
            players: []
          }))
        };
      }

      const parsed = JSON.parse(raw);

      if (!parsed || !Array.isArray(parsed.groups)) {
        throw new Error("Formato de defensa inválido");
      }

      return parsed;
    } catch (error) {
      console.error("No se pudo cargar Defense Builder:", error);

      return {
        activeGroup: 0,
        groups: Array.from({ length: TOTAL_GROUPS }, () => ({
          officer: "",
          players: []
        }))
      };
    }
  }

  function loadMapState() {
    const emptyState = createEmptyMapState();

    try {
      const raw = localStorage.getItem(MAP_STORAGE_KEY);

      if (!raw) {
        return emptyState;
      }

      const parsed = JSON.parse(raw);

      if (!parsed || !Array.isArray(parsed.groups)) {
        return emptyState;
      }

      emptyState.groups = emptyState.groups.map((defaultGroup, index) => {
        const savedGroup = parsed.groups[index];

        if (!savedGroup || typeof savedGroup.assignments !== "object") {
          return defaultGroup;
        }

        return {
          assignments: { ...savedGroup.assignments }
        };
      });

      return emptyState;
    } catch (error) {
      console.error("No se pudo cargar el mapa:", error);
      return emptyState;
    }
  }

  function saveMapState(message = "Cambios guardados") {
    try {
      localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(state.map));
      showSaveMessage(message);
    } catch (error) {
      console.error("No se pudo guardar el mapa:", error);
      showSaveMessage("No se pudo guardar");
    }
  }

  function showSaveMessage(message) {
    elements.autosaveText.textContent = message;
    window.clearTimeout(state.saveMessageTimer);

    state.saveMessageTimer = window.setTimeout(() => {
      elements.autosaveText.textContent = "Guardado automático";
    }, 1600);
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add("show");

    window.clearTimeout(state.toastTimer);

    state.toastTimer = window.setTimeout(() => {
      elements.toast.classList.remove("show");
    }, 1800);
  }

  function getChampion(championId) {
    if (!Array.isArray(window.ChampionDatabase)) {
      return null;
    }

    return (
      window.ChampionDatabase.find(
        (champion) => champion.id === championId
      ) || null
    );
  }

  function getActiveDefenseGroup() {
    return state.defense.groups?.[state.activeGroup] || {
      officer: "",
      players: []
    };
  }

  function getActiveMapGroup() {
    return state.map.groups[state.activeGroup];
  }

  function getAssignments() {
    return getActiveMapGroup().assignments;
  }

  function getGroupDefenders() {
    const group = getActiveDefenseGroup();
    const defenders = [];

    (group.players || []).forEach((player, playerIndex) => {
      (player.defenders || []).forEach((championId, slotIndex) => {
        if (!championId) {
          return;
        }

        const champion = getChampion(championId);

        if (!champion) {
          return;
        }

        defenders.push({
          key: `${playerIndex}:${slotIndex}`,
          championId,
          champion,
          playerIndex,
          slotIndex,
          playerName:
            typeof player.name === "string" && player.name.trim()
              ? player.name.trim()
              : `Jugador ${playerIndex + 1}`
        });
      });
    });

    return defenders;
  }

  function getAssignmentForNode(nodeId) {
    return getAssignments()[String(nodeId)] || null;
  }

  function findDefenderByKey(defenderKey) {
    return (
      state.defenders.find((defender) => defender.key === defenderKey) ||
      null
    );
  }

  function getNodeForDefender(defenderKey) {
    const assignments = getAssignments();

    for (const [nodeId, assignedKey] of Object.entries(assignments)) {
      if (assignedKey === defenderKey) {
        return Number(nodeId);
      }
    }

    return null;
  }

  function normalizeAssignments() {
    const assignments = getAssignments();
    const validDefenderKeys = new Set(
      state.defenders.map((defender) => defender.key)
    );
    const validNodeIds = new Set(
      (window.WarNodes || []).map((node) => String(node.id))
    );

    let changed = false;

    Object.keys(assignments).forEach((nodeId) => {
      if (
        !validNodeIds.has(nodeId) ||
        !validDefenderKeys.has(assignments[nodeId])
      ) {
        delete assignments[nodeId];
        changed = true;
      }
    });

    if (changed) {
      saveMapState("Mapa actualizado");
    }
  }

  function renderGroupTabs() {
    elements.groupTabs.forEach((tab) => {
      const groupIndex = Number(tab.dataset.group);
      tab.classList.toggle("active", groupIndex === state.activeGroup);
    });
  }

  function renderSummary() {
    const group = getActiveDefenseGroup();
    const officer =
      typeof group.officer === "string" && group.officer.trim()
        ? ` · Oficial: ${group.officer.trim()}`
        : "";

    elements.groupSummary.textContent =
      `Grupo ${state.activeGroup + 1}${officer}`;
  }

  function renderNodes() {
    if (!Array.isArray(window.WarNodes)) {
      elements.nodesLayer.innerHTML = "";
      showToast("No se encontró js/data/war-nodes.js");
      return;
    }

    const assignments = getAssignments();

    elements.nodesLayer.innerHTML = window.WarNodes.map((node) => {
      const defenderKey = assignments[String(node.id)];
      const defender = findDefenderByKey(defenderKey);
      const isSelected = state.selectedNodeId === node.id;

      const classes = [
        "war-node",
        defender ? "assigned" : "",
        isSelected ? "selected" : "",
        state.popNodeId === node.id ? "assigned-pop" : ""
      ]
        .filter(Boolean)
        .join(" ");

      const content = defender
        ? `
          <img
            class="node-portrait"
            src="${escapeAttribute(defender.champion.image)}"
            alt=""
          >
          <span class="node-number">${node.id}</span>
          <span class="node-player">${escapeHtml(defender.playerName)}</span>
        `
        : `<span class="node-number">${node.id}</span>`;

      const label = defender
        ? `Nodo ${node.id}: ${defender.champion.name}, ${defender.playerName}`
        : `Nodo ${node.id}: sin defensor`;

      return `
        <button
          class="${classes}"
          type="button"
          data-node-id="${node.id}"
          aria-label="${escapeAttribute(label)}"
          style="left:${node.xPercent}%;top:${node.yPercent}%"
        >
          ${content}
        </button>
      `;
    }).join("");

    elements.nodesLayer.querySelectorAll(".war-node").forEach((nodeButton) => {
      nodeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openNodeSelector(Number(nodeButton.dataset.nodeId));
      });
    });
  }

  function renderDefenders() {
    const query = normalizeText(elements.defenderSearch.value);
    const assignments = getAssignments();

    const filtered = state.defenders.filter((defender) => {
      if (!query) {
        return true;
      }

      return normalizeText(
        `${defender.champion.name} ${defender.playerName}`
      ).includes(query);
    });

    elements.defenderCountBadge.textContent = state.defenders.length;
    elements.emptyDefense.hidden = state.defenders.length > 0;
    elements.defendersList.hidden = state.defenders.length === 0;

    elements.defendersList.innerHTML = filtered.map((defender) => {
      const assignedNode = getNodeForDefender(defender.key);
      const isUsed = assignedNode !== null;

      return `
        <button
          class="defender-option${isUsed ? " used" : ""}"
          type="button"
          data-defender-key="${escapeAttribute(defender.key)}"
          title="${
            isUsed
              ? `Actualmente está en el nodo ${assignedNode}`
              : "Asignar al nodo seleccionado"
          }"
        >
          <img
            src="${escapeAttribute(defender.champion.image)}"
            alt=""
            loading="lazy"
            decoding="async"
          >

          <span class="defender-option-text">
            <strong>${escapeHtml(defender.champion.name)}</strong>
            <small>${escapeHtml(defender.playerName)}</small>
          </span>

          ${
            isUsed
              ? `<span class="used-label">Nodo ${assignedNode}</span>`
              : ""
          }
        </button>
      `;
    }).join("");

    elements.defendersList
      .querySelectorAll(".defender-option")
      .forEach((button) => {
        button.addEventListener("click", () => {
          assignDefender(button.dataset.defenderKey);
        });
      });
  }

  function renderSelectedNodePanel() {
    if (state.selectedNodeId === null) {
      elements.selectedNodeLabel.textContent = "Ninguno";
      elements.removeAssignmentButton.disabled = true;
      return;
    }

    const defenderKey = getAssignmentForNode(state.selectedNodeId);
    const defender = findDefenderByKey(defenderKey);

    elements.selectedNodeLabel.textContent = defender
      ? `Nodo ${state.selectedNodeId} · ${defender.champion.name}`
      : `Nodo ${state.selectedNodeId} · Vacío`;

    elements.removeAssignmentButton.disabled = !defender;
  }

  function renderProgress() {
    const assigned = Object.keys(getAssignments()).length;
    elements.assignedCount.textContent = `${assigned} / 50 nodos`;
  }

  function renderAll() {
    state.defenders = getGroupDefenders();
    normalizeAssignments();
    renderGroupTabs();
    renderSummary();
    renderNodes();
    renderDefenders();
    renderSelectedNodePanel();
    renderProgress();
  }


  function openNodeSelector(nodeId) {
    selectNode(nodeId);

    if (state.defenders.length === 0) {
      return;
    }

    if (
      !window.ChampionSelector ||
      typeof window.ChampionSelector.open !== "function"
    ) {
      showToast("El selector no cargó; usa la lista de defensores");
      return;
    }

    window.ChampionSelector.open({
      onSelect(champion) {
        handleChampionSelection(champion);
      }
    });
  }

  function handleChampionSelection(champion) {
    if (!champion || state.selectedNodeId === null) {
      return;
    }

    const matches = state.defenders.filter(
      (defender) => defender.championId === champion.id
    );

    if (matches.length === 0) {
      showToast(`${champion.name} no está registrado en este grupo`);
      return;
    }

    if (matches.length === 1) {
      assignDefender(matches[0].key);
      return;
    }

    openPlayerChoice(champion, matches);
  }

  function openPlayerChoice(champion, matches) {
    state.pendingChampion = champion;

    elements.playerChoiceDescription.textContent =
      `${champion.name} aparece ${matches.length} veces. Elige el jugador que quieres colocar en el nodo ${state.selectedNodeId}.`;

    elements.playerChoiceList.innerHTML = matches.map((defender) => {
      const assignedNode = getNodeForDefender(defender.key);

      return `
        <button
          class="player-choice-option${assignedNode !== null ? " used" : ""}"
          type="button"
          data-defender-key="${escapeAttribute(defender.key)}"
        >
          <img src="${escapeAttribute(defender.champion.image)}" alt="">
          <span>
            <strong>${escapeHtml(defender.playerName)}</strong>
            <small>${escapeHtml(defender.champion.name)}</small>
          </span>
          <em>${assignedNode !== null ? `Nodo ${assignedNode}` : "Disponible"}</em>
        </button>
      `;
    }).join("");

    elements.playerChoiceList
      .querySelectorAll(".player-choice-option")
      .forEach((button) => {
        button.addEventListener("click", () => {
          closePlayerChoice();
          assignDefender(button.dataset.defenderKey);
        });
      });

    elements.playerChoiceModal.classList.add("open");
    elements.playerChoiceModal.setAttribute("aria-hidden", "false");
  }

  function closePlayerChoice() {
    state.pendingChampion = null;
    elements.playerChoiceModal.classList.remove("open");
    elements.playerChoiceModal.setAttribute("aria-hidden", "true");
  }

  function selectNode(nodeId) {
    state.selectedNodeId = nodeId;
    renderNodes();
    renderSelectedNodePanel();

    if (state.defenders.length === 0) {
      showToast("Este grupo todavía no tiene defensores");
      return;
    }

    showToast(`Nodo ${nodeId} seleccionado`);
  }

  function assignDefender(defenderKey) {
    if (state.selectedNodeId === null) {
      showToast("Primero toca un nodo del mapa");
      return;
    }

    const defender = findDefenderByKey(defenderKey);

    if (!defender) {
      return;
    }

    const assignments = getAssignments();
    const previousNode = getNodeForDefender(defenderKey);

    if (
      previousNode !== null &&
      previousNode !== state.selectedNodeId
    ) {
      delete assignments[String(previousNode)];
    }

    assignments[String(state.selectedNodeId)] = defenderKey;

    state.popNodeId = state.selectedNodeId;
    window.clearTimeout(state.popTimer);
    state.popTimer = window.setTimeout(() => {
      state.popNodeId = null;
    }, 420);

    saveMapState(
      `${defender.champion.name} asignado al nodo ${state.selectedNodeId}`
    );

    renderNodes();
    renderDefenders();
    renderSelectedNodePanel();
    renderProgress();

    showToast(`${defender.champion.name} → nodo ${state.selectedNodeId}`);

    if (window.matchMedia("(max-width: 899px)").matches) {
      closeDefendersPanel();
    }
  }

  function removeSelectedAssignment() {
    if (state.selectedNodeId === null) {
      return;
    }

    const assignments = getAssignments();

    if (!assignments[String(state.selectedNodeId)]) {
      return;
    }

    delete assignments[String(state.selectedNodeId)];
    saveMapState(`Nodo ${state.selectedNodeId} liberado`);

    renderNodes();
    renderDefenders();
    renderSelectedNodePanel();
    renderProgress();

    showToast(`Nodo ${state.selectedNodeId} liberado`);
  }

  function changeGroup(groupIndex) {
    if (
      !Number.isInteger(groupIndex) ||
      groupIndex < 0 ||
      groupIndex >= TOTAL_GROUPS
    ) {
      return;
    }

    state.activeGroup = groupIndex;
    state.selectedNodeId = null;

    state.defense.activeGroup = groupIndex;

    try {
      localStorage.setItem(
        DEFENSE_STORAGE_KEY,
        JSON.stringify(state.defense)
      );
    } catch (error) {
      console.error("No se pudo actualizar el grupo activo:", error);
    }

    elements.defenderSearch.value = "";
    renderAll();
    requestAnimationFrame(focusMap);
  }


  function openDefendersPanel() {
    elements.defendersCard.classList.add("open");
    elements.defendersBackdrop.classList.add("open");
  }

  function closeDefendersPanel() {
    elements.defendersCard.classList.remove("open");
    elements.defendersBackdrop.classList.remove("open");
  }

  function loadImageForCanvas(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";

      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`No se pudo cargar: ${src}`));
      image.src = src;
    });
  }

  function roundedRectPath(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);

    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function drawCoverImage(context, image, x, y, width, height) {
    const imageRatio = image.width / image.height;
    const targetRatio = width / height;

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.width;
    let sourceHeight = image.height;

    if (imageRatio > targetRatio) {
      sourceWidth = image.height * targetRatio;
      sourceX = (image.width - sourceWidth) / 2;
    } else {
      sourceHeight = image.width / targetRatio;
      sourceY = (image.height - sourceHeight) / 2;
    }

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      x,
      y,
      width,
      height
    );
  }

  async function exportMapAsImage() {
    if (elements.exportMapButton.classList.contains("exporting")) {
      return;
    }

    elements.exportMapButton.classList.add("exporting");
    elements.exportMapButton.textContent = "Generando…";

    try {
      const headerHeight = 112;
      const canvas = document.createElement("canvas");
      canvas.width = MAP_WIDTH;
      canvas.height = MAP_HEIGHT + headerHeight;

      const context = canvas.getContext("2d");

      context.fillStyle = "#0b0b12";
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.fillStyle = "#171723";
      context.fillRect(0, 0, canvas.width, headerHeight);

      const group = getActiveDefenseGroup();
      const officer =
        typeof group.officer === "string" && group.officer.trim()
          ? ` · Oficial: ${group.officer.trim()}`
          : "";

      context.fillStyle = "#ffffff";
      context.font = "900 34px system-ui, sans-serif";
      context.fillText(
        `Alliance War · Grupo ${state.activeGroup + 1}`,
        34,
        48
      );

      context.fillStyle = "#b8b8c7";
      context.font = "600 19px system-ui, sans-serif";
      context.fillText(
        `${Object.keys(getAssignments()).length} defensores colocados${officer}`,
        34,
        82
      );

      const mapImage = await loadImageForCanvas(elements.mapImage.src);
      context.drawImage(
        mapImage,
        0,
        headerHeight,
        MAP_WIDTH,
        MAP_HEIGHT
      );

      const assignments = getAssignments();
      const portraitCache = new Map();

      for (const node of window.WarNodes || []) {
        const defenderKey = assignments[String(node.id)];
        const defender = findDefenderByKey(defenderKey);

        if (!defender) {
          continue;
        }

        let portrait = portraitCache.get(defender.champion.image);

        if (!portrait) {
          try {
            portrait = await loadImageForCanvas(defender.champion.image);
            portraitCache.set(defender.champion.image, portrait);
          } catch (error) {
            console.warn(error);
            portrait = null;
          }
        }

        const centerX =
          Number.isFinite(node.x) ? node.x : (node.xPercent / 100) * MAP_WIDTH;
        const centerY =
          headerHeight +
          (Number.isFinite(node.y)
            ? node.y
            : (node.yPercent / 100) * MAP_HEIGHT);

        const radius = 28;

        context.save();
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.clip();

        if (portrait) {
          drawCoverImage(
            context,
            portrait,
            centerX - radius,
            centerY - radius,
            radius * 2,
            radius * 2
          );
        } else {
          context.fillStyle = "#2b2142";
          context.fillRect(
            centerX - radius,
            centerY - radius,
            radius * 2,
            radius * 2
          );
        }

        context.restore();

        context.beginPath();
        context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        context.lineWidth = 4;
        context.strokeStyle = "#ffffff";
        context.stroke();

        context.beginPath();
        context.arc(centerX + 21, centerY + 22, 14, 0, Math.PI * 2);
        context.fillStyle = "#7c3aed";
        context.fill();
        context.lineWidth = 3;
        context.strokeStyle = "#ffffff";
        context.stroke();

        context.fillStyle = "#ffffff";
        context.font = "900 14px system-ui, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(String(node.id), centerX + 21, centerY + 22);

        context.font = "800 13px system-ui, sans-serif";
        const playerText = defender.playerName.slice(0, 16);
        const textWidth = Math.min(
          150,
          Math.max(64, context.measureText(playerText).width + 22)
        );
        const labelX = centerX - textWidth / 2;
        const labelY = centerY + 35;

        roundedRectPath(context, labelX, labelY, textWidth, 27, 13.5);
        context.fillStyle = "rgba(8, 8, 13, 0.88)";
        context.fill();
        context.lineWidth = 1.5;
        context.strokeStyle = "rgba(255,255,255,0.35)";
        context.stroke();

        context.fillStyle = "#ffffff";
        context.font = "800 12px system-ui, sans-serif";
        context.fillText(playerText, centerX, labelY + 14);

        context.textAlign = "start";
        context.textBaseline = "alphabetic";
      }

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/png", 1);
      });

      if (!blob) {
        throw new Error("No se pudo generar el archivo PNG");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `alliance-war-grupo-${state.activeGroup + 1}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("Mapa exportado como PNG");
    } catch (error) {
      console.error("Error al exportar el mapa:", error);
      showToast("No se pudo exportar. Revisa la consola.");
    } finally {
      elements.exportMapButton.classList.remove("exporting");
      elements.exportMapButton.textContent = "Exportar";
    }
  }

  function openClearModal() {
    elements.confirmModal.classList.add("open");
    elements.confirmModal.setAttribute("aria-hidden", "false");
  }

  function closeClearModal() {
    elements.confirmModal.classList.remove("open");
    elements.confirmModal.setAttribute("aria-hidden", "true");
  }

  function clearActiveMap() {
    getActiveMapGroup().assignments = {};
    state.selectedNodeId = null;
    saveMapState(`Mapa del grupo ${state.activeGroup + 1} limpiado`);
    closeClearModal();
    renderAll();
    showToast(`Mapa del grupo ${state.activeGroup + 1} limpiado`);
  }

  function applyTransform() {
    const screenNodeSize = Math.max(
      38,
      Math.min(58, 44 + (state.scale - 0.35) * 18)
    );

    elements.mapStage.style.setProperty(
      "--node-stage-size",
      `${screenNodeSize / state.scale}px`
    );

    elements.mapStage.style.transform =
      `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
  }

  function fitMap() {
    const width = elements.mapViewport.clientWidth;
    const height = elements.mapViewport.clientHeight;

    if (!width || !height) {
      return;
    }

    state.scale = Math.min(
      (width - 18) / MAP_WIDTH,
      (height - 18) / MAP_HEIGHT,
      1
    );

    state.panX = (width - MAP_WIDTH * state.scale) / 2;
    state.panY = (height - MAP_HEIGHT * state.scale) / 2;

    applyTransform();
  }

  function focusMap() {
    fitMap();

    const multiplier =
      window.matchMedia("(min-width: 900px)").matches ? 1.48 : 1.22;

    const nextScale = Math.min(1.15, state.scale * multiplier);

    zoomAt(
      nextScale,
      elements.mapViewport.clientWidth / 2,
      elements.mapViewport.clientHeight / 2
    );
  }

  function zoomAt(nextScale, viewportX, viewportY) {
    const clamped = Math.max(0.18, Math.min(2.2, nextScale));
    const stageX = (viewportX - state.panX) / state.scale;
    const stageY = (viewportY - state.panY) / state.scale;

    state.panX = viewportX - stageX * clamped;
    state.panY = viewportY - stageY * clamped;
    state.scale = clamped;

    applyTransform();
  }

  function endPointer(event) {
    if (!state.pointers.has(event.pointerId)) {
      return;
    }

    state.pointers.delete(event.pointerId);

    if (state.pointers.size === 1) {
      const remaining = [...state.pointers.values()][0];

      state.gesture = {
        type: "pan",
        startX: remaining.x,
        startY: remaining.y,
        panX: state.panX,
        panY: state.panY
      };
    } else if (state.pointers.size === 0) {
      state.gesture = null;
      elements.mapViewport.classList.remove("dragging");
    }
  }

  function initializeGestures() {
    elements.mapViewport.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".war-node")) {
        return;
      }

      elements.mapViewport.setPointerCapture(event.pointerId);
      state.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY
      });

      if (state.pointers.size === 1) {
        state.gesture = {
          type: "pan",
          startX: event.clientX,
          startY: event.clientY,
          panX: state.panX,
          panY: state.panY
        };

        elements.mapViewport.classList.add("dragging");
      } else if (state.pointers.size === 2) {
        const points = [...state.pointers.values()];
        const rect = elements.mapViewport.getBoundingClientRect();

        state.gesture = {
          type: "pinch",
          distance: Math.hypot(
            points[0].x - points[1].x,
            points[0].y - points[1].y
          ),
          scale: state.scale,
          panX: state.panX,
          panY: state.panY,
          midpointX:
            (points[0].x + points[1].x) / 2 - rect.left,
          midpointY:
            (points[0].y + points[1].y) / 2 - rect.top
        };
      }
    });

    elements.mapViewport.addEventListener("pointermove", (event) => {
      if (!state.pointers.has(event.pointerId)) {
        return;
      }

      state.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY
      });

      if (state.gesture?.type === "pan" && state.pointers.size === 1) {
        state.panX =
          state.gesture.panX + event.clientX - state.gesture.startX;
        state.panY =
          state.gesture.panY + event.clientY - state.gesture.startY;

        applyTransform();
      } else if (
        state.gesture?.type === "pinch" &&
        state.pointers.size === 2
      ) {
        const points = [...state.pointers.values()];
        const distance = Math.hypot(
          points[0].x - points[1].x,
          points[0].y - points[1].y
        );

        const nextScale = Math.max(
          0.18,
          Math.min(
            2.2,
            state.gesture.scale *
              (distance / state.gesture.distance)
          )
        );

        const stageX =
          (state.gesture.midpointX - state.gesture.panX) /
          state.gesture.scale;
        const stageY =
          (state.gesture.midpointY - state.gesture.panY) /
          state.gesture.scale;

        state.panX =
          state.gesture.midpointX - stageX * nextScale;
        state.panY =
          state.gesture.midpointY - stageY * nextScale;
        state.scale = nextScale;

        applyTransform();
      }
    });

    elements.mapViewport.addEventListener("pointerup", endPointer);
    elements.mapViewport.addEventListener("pointercancel", endPointer);

    elements.mapViewport.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();

        const rect = elements.mapViewport.getBoundingClientRect();
        const viewportX = event.clientX - rect.left;
        const viewportY = event.clientY - rect.top;

        zoomAt(
          state.scale * (event.deltaY < 0 ? 1.12 : 0.89),
          viewportX,
          viewportY
        );
      },
      { passive: false }
    );
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  function initializeEvents() {
    elements.groupTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        changeGroup(Number(tab.dataset.group));
      });
    });

    elements.defenderSearch.addEventListener("input", renderDefenders);
    elements.removeAssignmentButton.addEventListener(
      "click",
      removeSelectedAssignment
    );

    elements.zoomInButton.addEventListener("click", () => {
      zoomAt(
        state.scale * 1.2,
        elements.mapViewport.clientWidth / 2,
        elements.mapViewport.clientHeight / 2
      );
    });

    elements.zoomOutButton.addEventListener("click", () => {
      zoomAt(
        state.scale * 0.82,
        elements.mapViewport.clientWidth / 2,
        elements.mapViewport.clientHeight / 2
      );
    });

    elements.fitButton.addEventListener("click", fitMap);
    elements.exportMapButton.addEventListener("click", exportMapAsImage);
    elements.openDefendersButton.addEventListener("click", openDefendersPanel);
    elements.closeDefendersButton.addEventListener("click", closeDefendersPanel);
    elements.defendersBackdrop.addEventListener("click", closeDefendersPanel);
    elements.clearMapButton.addEventListener("click", openClearModal);
    elements.cancelClearButton.addEventListener("click", closeClearModal);
    elements.confirmClearButton.addEventListener("click", clearActiveMap);
    elements.cancelPlayerChoiceButton.addEventListener("click", closePlayerChoice);

    document.querySelectorAll("[data-close-player-modal]").forEach((element) => {
      element.addEventListener("click", closePlayerChoice);
    });

    document.querySelectorAll("[data-close-modal]").forEach((element) => {
      element.addEventListener("click", closeClearModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeClearModal();
        closePlayerChoice();
        closeDefendersPanel();
      }
    });

    let resizeTimer = null;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(focusMap, 120);
    });

    window.addEventListener("storage", (event) => {
      if (event.key === DEFENSE_STORAGE_KEY) {
        state.defense = loadDefense();
        state.activeGroup = Number.isInteger(state.defense.activeGroup)
          ? state.defense.activeGroup
          : 0;
        state.selectedNodeId = null;
        renderAll();
      }
    });
  }

  function initialize() {
    if (!Array.isArray(window.ChampionDatabase)) {
      showToast("No se encontró js/data/champions.js");
    }

    if (!Array.isArray(window.WarNodes)) {
      showToast("No se encontró js/data/war-nodes.js");
    }

    const savedActiveGroup = Number(state.defense.activeGroup);

    state.activeGroup =
      Number.isInteger(savedActiveGroup) &&
      savedActiveGroup >= 0 &&
      savedActiveGroup < TOTAL_GROUPS
        ? savedActiveGroup
        : 0;

    initializeEvents();
    initializeGestures();
    renderAll();

    if (elements.mapImage.complete) {
      requestAnimationFrame(focusMap);
    } else {
      elements.mapImage.addEventListener("load", fitMap, { once: true });
    }
  }

  initialize();
})();
