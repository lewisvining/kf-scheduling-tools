(() => {

  function createCopyButton(textToCopy) {

    const button = document.createElement("button");

    button.textContent = "Copy";

    // Required so removeCopyButtons() can find them
    button.dataset.jobCopyButton = "true";

    Object.assign(button.style, {
      border: "0.1rem solid rgb(114, 28, 227)",
      backgroundColor: "rgb(255, 255, 255)",
      color: "rgb(114, 28, 227)",
      letterSpacing: "0.015rem",
      lineHeight: "1.25",
      position: "relative",
      padding: "0.8rem 1.6rem",
      borderRadius: "0.4rem",
      fontWeight: "400",
      fontSize: "14px",
      display: "inline",
      marginLeft: "10px",
      cursor: "pointer"
    });

    button.addEventListener("click", () => {
      navigator.clipboard.writeText(textToCopy);
    });

    return button;

  }

  function injectCopyButtons() {

    if (
      !window.location.href.startsWith(
        "https://field.oes-prod.energy/jobs-projects/jobs/"
      )
    ) {
      return;
    }

    const container = document.querySelector(
      '[data-testid="page-details"]'
    );

    if (!container) return;

    const links = container.querySelectorAll("a");

    links.forEach((link) => {

      if (
        link.dataset.copyButtonInjected === "true"
      ) {
        return;
      }

      link.dataset.copyButtonInjected = "true";

      const button = createCopyButton(
        link.textContent.trim()
      );

      link.insertAdjacentElement(
        "afterend",
        button
      );

    });

  }

  function removeCopyButtons() {

    document
      .querySelectorAll(
        'button[data-job-copy-button="true"]'
      )
      .forEach((button) => button.remove());

    document
      .querySelectorAll("a")
      .forEach((link) => {
        delete link.dataset.copyButtonInjected;
      });

  }

  function applyCopyButtonState(enabled) {

    if (enabled) {
      injectCopyButtons();
    } else {
      removeCopyButtons();
    }

  }

  // Initial load
  try {

    chrome.storage.local.get(
      "switch_injectCopyButtonsForJobs",
      (data) => {

        if (
          chrome.runtime?.id &&
          data.switch_injectCopyButtonsForJobs
        ) {

          injectCopyButtons();

        }

      }
    );

  } catch (err) {

    console.warn(
      "Extension context invalidated (initial load)"
    );

  }

  // Listen for popup toggle changes
  chrome.runtime.onMessage.addListener(
    (message) => {

      if (
        message.type ===
        "UPDATE_JOB_COPY_BUTTONS"
      ) {

        applyCopyButtonState(
          message.enabled
        );

      }

    }
  );

  // React SPA support
  const jobCopyButtonsObserver =
    new MutationObserver(() => {

      try {

        chrome.storage.local.get(
          "switch_injectCopyButtonsForJobs",
          (data) => {

            if (!chrome.runtime?.id) return;

            if (
              data.switch_injectCopyButtonsForJobs
            ) {

              injectCopyButtons();

            }

          }
        );

      } catch (err) {

        console.warn(
          "Extension context invalidated (observer)"
        );

      }

    });

  jobCopyButtonsObserver.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

})();