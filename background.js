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
    chrome.action.setBadgeBackgroundColor({ color: "#1e88e5" }); // blue
  } else {
    chrome.action.setBadgeText({ text: "" }); // clears badge
  }
}