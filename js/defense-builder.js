const playersContainer = document.getElementById("players-container");
const playerCountElement = document.getElementById("player-count");
const defenderCountElement = document.getElementById("defender-count");
const groupStatusElement = document.getElementById("group-status");
const officerNameInput = document.getElementById("officer-name");
const activeGroupLabel = document.getElementById("active-group-label");
const autosaveText = document.getElementById("autosave-text");

const resetGroupButton = document.getElementById("reset-group-button");
const continueWarMapButton = document.getElementById(
  "continue-war-map-button"
);

const confirmModal = document.getElementById("confirm-modal");
const cancelResetButton = document.getElementById(
  "cancel-reset-button"
);
const confirmResetButton = document.getElementById(
  "confirm-reset-button"
);

const MAX_PLAYERS = 10;
const DEFENDERS_PER_PLAYER = 5;
const TOTAL_GROUPS = 3;

const STORAGE_KEY = "aw-planner-defense-builder-v1";

let autosaveMessageTimeout = null;

const appState = loadState();

/* ==========================================
   1. CREACIÓN DEL ESTADO
========================================== */

function createInitialState() {
  return {
    activeGroup: 0,
    groups: createInitialGroups()
  };
}

function createInitialGroups() {
  return Array.from({ length: TOTAL_GROUPS }, () => ({
    officer: "",
    players: createInitialPlayers()
  }));
}

function createInitialPlayers() {
  return Array.from({ length: MAX_PLAYERS }, (_, index) => ({
    id: index,
    name: "",
    defenders: Array(DEFENDERS_PER_PLAYER).fill(null)
  }));
}

/* ==========================================
   2. GUARDADO Y RESTAURACIÓN
========================================== */

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(appState)
    );

    showAutosaveMessage(
      "Cambios guardados automáticamente"
    );
  } catch (error) {
    console.error(
      "No se pudo guardar la defensa:",
      error
    );

    showAutosaveMessage(
      "No se pudieron guardar los cambios"
    );
  }
}

function loadState() {
  const initialState = createInitialState();

  try {
    const storedState = localStorage.getItem(STORAGE_KEY);

    if (!storedState) {
      return initialState;
    }

    const parsedState = JSON.parse(storedState);

    return normalizeState(parsedState);
  } catch (error) {
    console.error(
      "Los datos guardados no pudieron recuperarse:",
      error
    );

    localStorage.removeItem(STORAGE_KEY);

    return initialState;
  }
}

function normalizeState(savedState) {
  const normalizedState = createInitialState();

  if (!savedState || typeof savedState !== "object") {
    return normalizedState;
  }

  const savedActiveGroup = Number(savedState.activeGroup);

  if (
    Number.isInteger(savedActiveGroup) &&
    savedActiveGroup >= 0 &&
    savedActiveGroup < TOTAL_GROUPS
  ) {
    normalizedState.activeGroup = savedActiveGroup;
  }

  if (!Array.isArray(savedState.groups)) {
    return normalizedState;
  }

  normalizedState.groups = normalizedState.groups.map(
    (defaultGroup, groupIndex) => {
      const savedGroup = savedState.groups[groupIndex];

      if (!savedGroup || typeof savedGroup !== "object") {
        return defaultGroup;
      }

      return {
        officer:
          typeof savedGroup.officer === "string"
            ? savedGroup.officer.slice(0, 40)
            : "",
        players: normalizePlayers(savedGroup.players)
      };
    }
  );

  return normalizedState;
}

function normalizePlayers(savedPlayers) {
  const defaultPlayers = createInitialPlayers();

  if (!Array.isArray(savedPlayers)) {
    return defaultPlayers;
  }

  return defaultPlayers.map(
    (defaultPlayer, playerIndex) => {
      const savedPlayer = savedPlayers[playerIndex];

      if (
        !savedPlayer ||
        typeof savedPlayer !== "object"
      ) {
        return defaultPlayer;
      }

      return {
        id: playerIndex,
        name:
          typeof savedPlayer.name === "string"
            ? savedPlayer.name.slice(0, 40)
            : "",
        defenders: normalizeDefenders(
          savedPlayer.defenders
        )
      };
    }
  );
}

function normalizeDefenders(savedDefenders) {
  const defenders =
    Array(DEFENDERS_PER_PLAYER).fill(null);

  if (!Array.isArray(savedDefenders)) {
    return defenders;
  }

  return defenders.map((_, index) => {
    const championId = savedDefenders[index];

    if (
      championId !== null &&
      championId !== undefined &&
      championId !== ""
    ) {
      return championId;
    }

    return null;
  });
}

function showAutosaveMessage(message) {
  if (!autosaveText) {
    return;
  }

  autosaveText.textContent = message;

  window.clearTimeout(autosaveMessageTimeout);

  autosaveMessageTimeout = window.setTimeout(() => {
    autosaveText.textContent =
      "Los cambios se guardan automáticamente";
  }, 1800);
}

/* ==========================================
   3. UTILIDADES
========================================== */

function escapeHtmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getChampionById(championId) {
  if (
    !championId ||
    !Array.isArray(window.ChampionDatabase)
  ) {
    return null;
  }

  return (
    window.ChampionDatabase.find(
      (champion) => champion.id === championId
    ) || null
  );
}

function getGroupDefenderCount(group) {
  return group.players.reduce((total, player) => {
    return (
      total +
      player.defenders.filter(Boolean).length
    );
  }, 0);
}

/* ==========================================
   4. TARJETAS DE JUGADORES
========================================== */

function createDefenderSlots(player) {
  return player.defenders
    .map((championId, slotIndex) => {
      const champion = getChampionById(championId);

      if (!champion) {
        return `
          <button
            class="defender-slot"
            type="button"
            data-slot="${slotIndex}"
            aria-label="Seleccionar defensor ${slotIndex + 1}"
          >
            <span class="slot-plus">+</span>
            <span>Defensor ${slotIndex + 1}</span>
          </button>
        `;
      }

      return `
        <button
          class="defender-slot defender-slot-selected"
          type="button"
          data-slot="${slotIndex}"
          aria-label="Cambiar a ${escapeHtmlAttribute(
            champion.name
          )}"
        >
          <img
            class="defender-slot-image"
            src="${escapeHtmlAttribute(champion.image)}"
            alt="${escapeHtmlAttribute(champion.name)}"
          >

          <span class="defender-slot-name">
            ${champion.name}
          </span>
        </button>
      `;
    })
    .join("");
}

function createPlayerCard(player, playerIndex) {
  const playerCard =
    document.createElement("article");

  const assignedDefenders =
    player.defenders.filter(Boolean).length;

  const isComplete =
    assignedDefenders === DEFENDERS_PER_PLAYER;

  playerCard.className = "player-card";
  playerCard.dataset.playerIndex = playerIndex;

  playerCard.innerHTML = `
    <div class="player-card-header">
      <div class="player-title">
        <span class="player-number">
          P${playerIndex + 1}
        </span>

        <span class="player-separator">-</span>

        <input
          class="player-name-input player-name-inline"
          type="text"
          maxlength="40"
          placeholder="Jugador"
          autocomplete="off"
          value="${escapeHtmlAttribute(player.name)}"
          aria-label="Nombre del jugador P${playerIndex + 1}"
        >

        <span
          class="player-edit-icon"
          aria-hidden="true"
        >
          ✎
        </span>
      </div>
    </div>

    <div class="defender-slots">
      ${createDefenderSlots(player)}
    </div>

    <div class="player-card-footer">
      <span>
        ${assignedDefenders} / 5 defensores
      </span>

      <strong class="${isComplete ? "complete" : ""}">
        ${isComplete ? "Completo" : "Incompleto"}
      </strong>
    </div>
  `;

  const playerNameInput =
    playerCard.querySelector(".player-name-input");

  playerNameInput.addEventListener("input", () => {
    player.name = playerNameInput.value;
    saveState();
  });

  return playerCard;
}

/* ==========================================
   5. RENDERIZADO
========================================== */

function renderPlayers() {
  playersContainer.innerHTML = "";

  const currentGroup =
    appState.groups[appState.activeGroup];

  currentGroup.players.forEach((player, index) => {
    const playerCard =
      createPlayerCard(player, index);

    playersContainer.appendChild(playerCard);
  });

  if (playerCountElement) {
    playerCountElement.textContent =
      currentGroup.players.length;
  }
}

function renderOfficer() {
  const currentGroup =
    appState.groups[appState.activeGroup];

  officerNameInput.value = currentGroup.officer;
}

function renderActiveGroupLabel() {
  activeGroupLabel.textContent =
    `Grupo ${appState.activeGroup + 1}`;
}

function renderActiveGroupTab() {
  document
    .querySelectorAll(".group-tab")
    .forEach((tab) => {
      const groupIndex = Number(tab.dataset.group);

      tab.classList.toggle(
        "active",
        groupIndex === appState.activeGroup
      );
    });
}

function renderProgress() {
  const currentGroup =
    appState.groups[appState.activeGroup];

  const currentDefenderCount =
    getGroupDefenderCount(currentGroup);

  if (defenderCountElement) {
    defenderCountElement.textContent =
      currentDefenderCount;
  }

  if (groupStatusElement) {
    if (currentDefenderCount === 0) {
      groupStatusElement.textContent =
        "Sin comenzar";
    } else if (currentDefenderCount === 50) {
      groupStatusElement.textContent =
        "Completo";
    } else {
      groupStatusElement.textContent =
        "En progreso";
    }
  }

  appState.groups.forEach((group, index) => {
    const progressElement =
      document.getElementById(
        `group${index + 1}-progress`
      );

    if (progressElement) {
      progressElement.textContent =
        `${getGroupDefenderCount(group)} / 50`;
    }
  });
}

function renderCurrentGroup() {
  renderActiveGroupLabel();
  renderActiveGroupTab();
  renderOfficer();
  renderPlayers();
  renderProgress();
}

/* ==========================================
   6. ACCIONES
========================================== */

function changeGroup(groupIndex) {
  if (
    !Number.isInteger(groupIndex) ||
    groupIndex < 0 ||
    groupIndex >= TOTAL_GROUPS
  ) {
    return;
  }

  appState.activeGroup = groupIndex;

  saveState();
  renderCurrentGroup();
}

function assignChampion(
  playerIndex,
  slotIndex,
  champion
) {
  const currentGroup =
    appState.groups[appState.activeGroup];

  const player =
    currentGroup.players[playerIndex];

  if (
    !player ||
    !champion ||
    !Number.isInteger(slotIndex) ||
    slotIndex < 0 ||
    slotIndex >= DEFENDERS_PER_PLAYER
  ) {
    return;
  }

  player.defenders[slotIndex] = champion.id;

  saveState();
  renderPlayers();
  renderProgress();
}

function openChampionSelector(
  playerIndex,
  slotIndex
) {
  if (
    !window.ChampionSelector ||
    typeof window.ChampionSelector.open !== "function"
  ) {
    console.error(
      "ChampionSelector no está disponible."
    );

    return;
  }

  window.ChampionSelector.open({
    onSelect(champion) {
      assignChampion(
        playerIndex,
        slotIndex,
        champion
      );
    }
  });
}

function openResetConfirmation() {
  if (!confirmModal) {
    return;
  }

  confirmModal.classList.add("open");
  confirmModal.setAttribute(
    "aria-hidden",
    "false"
  );
}

function closeResetConfirmation() {
  if (!confirmModal) {
    return;
  }

  confirmModal.classList.remove("open");
  confirmModal.setAttribute(
    "aria-hidden",
    "true"
  );
}

function resetCurrentGroup() {
  appState.groups[appState.activeGroup] = {
    officer: "",
    players: createInitialPlayers()
  };

  saveState();
  closeResetConfirmation();
  renderCurrentGroup();
}

/* ==========================================
   7. EVENTOS
========================================== */

function handleDocumentClick(event) {
  const closeConfirmElement =
    event.target.closest("[data-close-confirm]");

  if (closeConfirmElement) {
    closeResetConfirmation();
    return;
  }

  const defenderSlot =
    event.target.closest(".defender-slot");

  if (defenderSlot) {
    const playerCard =
      defenderSlot.closest(".player-card");

    if (!playerCard) {
      return;
    }

    const playerIndex =
      Number(playerCard.dataset.playerIndex);

    const slotIndex =
      Number(defenderSlot.dataset.slot);

    if (
      !Number.isInteger(playerIndex) ||
      !Number.isInteger(slotIndex)
    ) {
      return;
    }

    openChampionSelector(
      playerIndex,
      slotIndex
    );

    return;
  }

  const groupTab =
    event.target.closest(".group-tab");

  if (groupTab) {
    changeGroup(
      Number(groupTab.dataset.group)
    );
  }
}

function handleKeydown(event) {
  if (
    event.key === "Escape" &&
    confirmModal?.classList.contains("open")
  ) {
    closeResetConfirmation();
  }
}

/* ==========================================
   8. INICIALIZACIÓN
========================================== */

function initializeDefenseBuilder() {
  if (
    !playersContainer ||
    !officerNameInput ||
    !activeGroupLabel
  ) {
    console.error(
      "No se pudo inicializar Defense Builder: faltan elementos del HTML."
    );

    return;
  }

  renderCurrentGroup();

  officerNameInput.addEventListener(
    "input",
    () => {
      const currentGroup =
        appState.groups[appState.activeGroup];

      currentGroup.officer =
        officerNameInput.value;

      saveState();
    }
  );

  resetGroupButton?.addEventListener(
    "click",
    openResetConfirmation
  );

  cancelResetButton?.addEventListener(
    "click",
    closeResetConfirmation
  );

  confirmResetButton?.addEventListener(
    "click",
    resetCurrentGroup
  );

  continueWarMapButton?.addEventListener(
    "click",
    () => {
      window.location.href = "war-map.html";
    }
  );

  document.addEventListener(
    "click",
    handleDocumentClick
  );

  document.addEventListener(
    "keydown",
    handleKeydown
  );
}

initializeDefenseBuilder();