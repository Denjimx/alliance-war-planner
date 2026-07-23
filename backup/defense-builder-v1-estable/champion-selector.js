window.ChampionSelector = (() => {
  const modal = document.getElementById("champion-modal");
  const searchInput = document.getElementById("champion-search");
  const resultsContainer = document.getElementById(
    "champion-results"
  );

  let onSelectChampion = null;

  function getChampionDatabase() {
    return Array.isArray(window.ChampionDatabase)
      ? window.ChampionDatabase
      : [];
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function renderChampions(champions) {
    if (!resultsContainer) {
      return;
    }

    resultsContainer.innerHTML = "";

    if (!champions.length) {
      resultsContainer.innerHTML = `
        <p class="champion-empty-result">
          No se encontraron campeones.
        </p>
      `;

      return;
    }

    const fragment = document.createDocumentFragment();

    champions.forEach((champion) => {
      const button = document.createElement("button");

      button.className = "champion-result";
      button.type = "button";
      button.dataset.championId = champion.id;

      button.innerHTML = `
        <img
          src="${escapeHtml(champion.image)}"
          alt="${escapeHtml(champion.name)}"
          class="champion-result-image"
          loading="lazy"
        >

        <span class="champion-result-name">
          ${escapeHtml(champion.name)}
        </span>
      `;

      button.addEventListener("click", () => {
        if (typeof onSelectChampion === "function") {
          onSelectChampion(champion);
        }

        close();
      });

      fragment.appendChild(button);
    });

    resultsContainer.appendChild(fragment);
  }

  function filterChampions(searchTerm) {
    const champions = getChampionDatabase();

    const normalizedSearch = String(searchTerm)
      .trim()
      .toLowerCase();

    if (!normalizedSearch) {
      renderChampions(champions);
      return;
    }

    const filteredChampions = champions.filter(
      (champion) => {
        return champion.name
          .toLowerCase()
          .includes(normalizedSearch);
      }
    );

    renderChampions(filteredChampions);
  }

  function open(options = {}) {
    if (!modal || !searchInput || !resultsContainer) {
      console.error(
        "No se pudo abrir el selector: faltan elementos del modal."
      );

      return;
    }

    const champions = getChampionDatabase();

    if (!champions.length) {
      console.error(
        "ChampionDatabase no está disponible o está vacío."
      );

      return;
    }

    onSelectChampion =
      typeof options.onSelect === "function"
        ? options.onSelect
        : null;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");

    searchInput.value = "";
    renderChampions(champions);

    requestAnimationFrame(() => {
      searchInput.focus();
    });
  }

  function close() {
    if (!modal || !searchInput || !resultsContainer) {
      return;
    }

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");

    searchInput.value = "";
    resultsContainer.innerHTML = "";
    onSelectChampion = null;
  }

  searchInput?.addEventListener("input", () => {
    filterChampions(searchInput.value);
  });

  document.addEventListener("click", (event) => {
    const closeButton = event.target.closest(
      "[data-close-modal]"
    );

    if (closeButton) {
      close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      modal?.classList.contains("open")
    ) {
      close();
    }
  });

  return {
    open,
    close
  };
})();