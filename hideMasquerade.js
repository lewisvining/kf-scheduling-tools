(() => {

  let hideMasqueradeBarEnabled = false;

  function applyMasqueradeBarState(
    hidden,
    animate = false
  ) {

    const masqueradeBar =
      document.querySelector(
        '[data-testid="masquerade-bar"]'
      );

    if (!masqueradeBar) return;

    if (hidden) {

      if (animate) {

        masqueradeBar.style.transition =
          "opacity 0.2s ease";

        masqueradeBar.style.opacity = "0";

        setTimeout(() => {
          masqueradeBar.style.display = "none";
        }, 200);

      } else {

        masqueradeBar.style.transition = "";
        masqueradeBar.style.opacity = "0";
        masqueradeBar.style.display = "none";

      }

    } else {

      masqueradeBar.style.display = "";

      if (animate) {

        masqueradeBar.style.transition =
          "opacity 0.2s ease";

        requestAnimationFrame(() => {
          masqueradeBar.style.opacity = "1";
        });

      } else {

        masqueradeBar.style.transition = "";
        masqueradeBar.style.opacity = "1";

      }

    }

  }

  // Initial load
  chrome.storage.local.get(
    "switch_hideMasqueradeBar",
    (data) => {

      hideMasqueradeBarEnabled =
        !!data.switch_hideMasqueradeBar;

      applyMasqueradeBarState(
        hideMasqueradeBarEnabled,
        false
      );

    }
  );

  // React/SPA navigation handling
  const masqueradeObserver =
    new MutationObserver(() => {

      applyMasqueradeBarState(
        hideMasqueradeBarEnabled,
        false
      );

    });

  masqueradeObserver.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );

  // Live toggle updates
  chrome.storage.onChanged.addListener(
    (changes, area) => {

      if (area !== "local") return;

      if (
        changes.switch_hideMasqueradeBar
      ) {

        hideMasqueradeBarEnabled =
          changes
            .switch_hideMasqueradeBar
            .newValue;

        applyMasqueradeBarState(
          hideMasqueradeBarEnabled,
          true
        );

      }

    }
  );

})();