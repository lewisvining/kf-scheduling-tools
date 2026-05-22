let noSleepEnabled = false;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SET_NO_SLEEP") {

    if (msg.enabled && !noSleepEnabled) {
      chrome.power.requestKeepAwake("display");
      noSleepEnabled = true;
      console.log("NS enabled");
    }

    if (!msg.enabled && noSleepEnabled) {
      chrome.power.releaseKeepAwake();
      noSleepEnabled = false;
      console.log("NS disabled");
    }

  }
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get("switch_nosleep", (data) => {

    if (data.switch_nosleep === true) {
      chrome.power.requestKeepAwake("display");
      noSleepEnabled = true;
      console.log("Restored NS on startup");
    }

  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get("noSleepEnabled", ({ noSleepEnabled }) => {

    if (noSleepEnabled) {
      chrome.power.requestKeepAwake("display");
      setNoSleepBadge(true);
    } else {
      setNoSleepBadge(false);
    }

  });
});

function setNoSleepBadge(enabled) {

  if (enabled) {
    chrome.action.setBadgeText({ text: "●" });
    chrome.action.setBadgeBackgroundColor({
      color: "#1e88e5"
    });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }

}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

  if (
    changeInfo.status === "complete" &&
    tab.url?.startsWith("https://field.oes-prod.energy")
  ) {

    console.log("url matched");

    chrome.storage.local.get(
      "switch_hideMasqueradeBar",
      (data) => {

        if (!data.switch_hideMasqueradeBar) return;

        chrome.scripting.executeScript({
          target: { tabId },
          func: () => {

            const masqueradeBar = document.querySelector(
              '[data-testid="masquerade-bar"]'
            );

            if (!masqueradeBar) return;

            masqueradeBar.style.opacity = "0";
            masqueradeBar.style.display = "none";

          }
        });

      }
    );

  } else {
    console.log("url not matched");
  }

});