(() => {

  let c2cSchedulingEnabled = false;

function handleC2CCopy(event) {

  const element = event.currentTarget;

  let textToCopy =
    element.textContent.trim();

  // Engineer detail labels:
  if (
    element.dataset.c2cType ===
    "postcode"
  ) {

    textToCopy =
      textToCopy.split("|")[0].trim();

  }

  navigator.clipboard.writeText(
    textToCopy
  );

  element.setAttribute(
    "data-tooltip-content",
    "Copied!"
  );

  setTimeout(() => {

    if (
      element.dataset.c2cInjected ===
      "true"
    ) {

      element.setAttribute(
        "data-tooltip-content",
        "Click to copy"
      );

    }

  }, 1000);

}

function applyC2CScheduling(enabled) {

  if (
    !window.location.href.startsWith(
      "https://field.oes-prod.energy/scheduling"
    )
  ) {
    return;
  }

  const containerElements =
    document.querySelectorAll(
      'div[class*="EngineersOverview"]'
    );

  containerElements.forEach(
    (container) => {

      // -------------------------
      // Engineer names (H6)
      // -------------------------

      const headings =
        container.querySelectorAll(
          'h6[data-tooltip-place="top"]'
        );

      headings.forEach((heading) => {

        const headingText =
          heading.textContent.trim();

        if (enabled) {

          if (
            heading.dataset.c2cInjected ===
            "true"
          ) {
            return;
          }

          heading.dataset.c2cInjected =
            "true";

          heading.dataset.c2cType =
            "engineer";

          heading.style.cursor =
            "pointer";

          heading.style.userSelect =
            "none";

          heading.style.textDecorationLine =
            "grammar-error";

          heading.setAttribute(
            "data-tooltip-content",
            "Click to copy"
          );

          heading.addEventListener(
            "click",
            handleC2CCopy
          );

        } else {

          if (
            heading.dataset.c2cInjected !==
            "true"
          ) {
            return;
          }

          heading.removeEventListener(
            "click",
            handleC2CCopy
          );

          heading.style.cursor = "";

          heading.style.userSelect =
            "";

          heading.style.textDecorationLine =
            "";

          heading.setAttribute(
            "data-tooltip-content",
            headingText
          );

          delete heading.dataset.c2cInjected;
          delete heading.dataset.c2cType;

        }

      });

      // -------------------------
      // Engineer detail labels
      // -------------------------

      const labels =
        container.querySelectorAll(
          'span[data-testid="engineer-details-label"]'
        );

      labels.forEach((label) => {

        const originalText =
          label.textContent.trim();

        if (enabled) {

          if (
            label.dataset.c2cInjected ===
            "true"
          ) {
            return;
          }

          label.dataset.c2cInjected =
            "true";

          label.dataset.c2cType =
            "postcode";

          label.style.cursor =
            "pointer";

          label.style.userSelect =
            "none";

          label.style.textDecorationLine =
            "grammar-error";

          label.setAttribute(
            "data-tooltip-content",
            "Click to copy"
          );

          label.addEventListener(
            "click",
            handleC2CCopy
          );

        } else {

          if (
            label.dataset.c2cInjected !==
            "true"
          ) {
            return;
          }

          label.removeEventListener(
            "click",
            handleC2CCopy
          );

          label.style.cursor = "";

          label.style.userSelect =
            "";

          label.style.textDecorationLine =
            "";

          label.setAttribute(
            "data-tooltip-content",
            originalText
          );

          delete label.dataset.c2cInjected;
          delete label.dataset.c2cType;

        }

      });

    }
  );

}

  // Initial load
  try {

    chrome.storage.local.get(
      "switch_injectC2CScheduling",
      (data) => {

        applyC2CScheduling(
          !!data.switch_injectC2CScheduling
        );

      }
    );

  } catch (err) {

    console.warn(
      "Extension context unavailable during initial load",
      err
    );

  }

  // Listen for popup toggle changes
  chrome.storage.onChanged.addListener(
    (changes, area) => {

        if (area !== "local") return;

        if (
        changes.switch_injectC2CScheduling
        ) {

        applyC2CScheduling(
            changes.switch_injectC2CScheduling.newValue
        );

        }

    }
    );

  // SPA/react navigation watcher
  const c2cSchedulingMutationObserver =
    new MutationObserver(() => {

      if (c2cSchedulingEnabled) {

        applyC2CScheduling(true);

      }

    });

  c2cSchedulingMutationObserver.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

})();