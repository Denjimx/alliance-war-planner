(function () {
  let currentConfig = null;

  function createActionSheet() {
    const existingSheet = document.getElementById("action-sheet");

    if (existingSheet) {
      return existingSheet;
    }

    const actionSheet = document.createElement("div");

    actionSheet.id = "action-sheet";
    actionSheet.className = "action-sheet";
    actionSheet.setAttribute("aria-hidden", "true");

    actionSheet.innerHTML = `
      <div
        class="action-sheet-backdrop"
        data-action-sheet-close
      ></div>

      <section
        class="action-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-sheet-title"
      >
        <header class="action-sheet-header">
          <img
            id="action-sheet-image"
            class="action-sheet-image"
            alt=""
          >

          <div>
            <p
              id="action-sheet-subtitle"
              class="action-sheet-subtitle"
            ></p>

            <h3 id="action-sheet-title"></h3>
          </div>
        </header>

        <div
          id="action-sheet-actions"
          class="action-sheet-actions"
        ></div>

        <button
          class="action-sheet-cancel"
          type="button"
          data-action-sheet-close
        >
          Cancelar
        </button>
      </section>
    `;

    document.body.appendChild(actionSheet);

    actionSheet.addEventListener("click", handleClick);

    return actionSheet;
  }

  function handleClick(event) {
    const closeElement = event.target.closest(
      "[data-action-sheet-close]"
    );

    if (closeElement) {
      close();
      return;
    }

    const actionButton = event.target.closest(
      "[data-action-index]"
    );

    if (!actionButton || !currentConfig) {
      return;
    }

    const actionIndex = Number(
      actionButton.dataset.actionIndex
    );

    const action = currentConfig.actions[actionIndex];

    close();

    if (action && typeof action.onClick === "function") {
      action.onClick();
    }
  }

  function render(config) {
    const actionSheet = createActionSheet();

    const titleElement = actionSheet.querySelector(
      "#action-sheet-title"
    );

    const subtitleElement = actionSheet.querySelector(
      "#action-sheet-subtitle"
    );

    const imageElement = actionSheet.querySelector(
      "#action-sheet-image"
    );

    const actionsContainer = actionSheet.querySelector(
      "#action-sheet-actions"
    );

    titleElement.textContent = config.title || "";
    subtitleElement.textContent = config.subtitle || "";

    if (config.image) {
      imageElement.src = config.image;
      imageElement.alt = config.title || "";
      imageElement.hidden = false;
    } else {
      imageElement.hidden = true;
      imageElement.removeAttribute("src");
      imageElement.alt = "";
    }

    actionsContainer.innerHTML = "";

    config.actions.forEach((action, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "action-sheet-action";
      button.dataset.actionIndex = index;

      if (action.danger) {
        button.classList.add("danger");
      }

      const icon = document.createElement("span");
      icon.className = "action-sheet-action-icon";
      icon.textContent = action.icon || "";

      const label = document.createElement("span");
      label.textContent = action.label || "";

      button.appendChild(icon);
      button.appendChild(label);

      actionsContainer.appendChild(button);
    });
  }

  function open(config) {
    if (
      !config ||
      !Array.isArray(config.actions) ||
      config.actions.length === 0
    ) {
      return;
    }

    currentConfig = config;

    const actionSheet = createActionSheet();

    render(config);

    actionSheet.classList.add("open");
    actionSheet.setAttribute("aria-hidden", "false");

    document.body.classList.add("action-sheet-open");
  }

  function close() {
    const actionSheet = document.getElementById("action-sheet");

    if (!actionSheet) {
      return;
    }

    actionSheet.classList.remove("open");
    actionSheet.setAttribute("aria-hidden", "true");

    document.body.classList.remove("action-sheet-open");

    currentConfig = null;
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
    }
  });

  window.ActionSheet = {
    open,
    close
  };
})();