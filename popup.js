const regionAreas = {
    "North": ["AB", "BD", "CA", "DD", "DE", "DG", "DH", "DL", "DN", "EH", "FK", "G", "HD", "HG", "HS", "HU", "HX", "IV", "KA", "KW", "KY", "LS", "ML", "NE", "PA", "PH", "S", "SR", "TD", "TS", "WF", "YO", "ZE"],
    "South": ["BA", "BH", "BN", "BS", "CT", "DT", "EX", "GL", "GU", "ME", "PL", "PO", "RG", "RH", "SL", "SN", "SO", "SP", "TA", "TN", "TQ", "TR"],
    "East": ["AL", "BR", "CB", "CM", "CO", "CR", "DA", "E", "EC", "EN", "HA", "IG", "IP", "KT", "N", "NR", "NW", "RM", "SE", "SG", "SM", "SS", "SW", "TW", "UB", "W", "WC", "WD", "HP", "LU"],
    "West": ["B", "BB", "BL", "CF", "CH", "CV", "CW", "DY", "FY", "HR", "L", "LA", "LD", "LE", "LL", "LN", "M", "MK", "NG", "NN", "NP", "OL", "PE", "PR", "SA", "SK", "ST", "SY", "TF", "WA", "WN", "WR", "WS", "WV", "OX"],
    "SE": ["BN", "BR", "CR", "CT", "DA", "KT", "ME", "RH", "SM", "TN", "TW" ]
};

function compareVersions(v1, v2) {
    const parseVersion = (version) => {
        const [major, minor = 0, patch = 0] = version.split('.').map(Number);
        return [major, minor, patch];
    };

    const [major1, minor1, patch1] = parseVersion(v1);
    const [major2, minor2, patch2] = parseVersion(v2);

    if (major1 !== major2) return major1 - major2;
    if (minor1 !== minor2) return minor1 - minor2;
    return patch1 - patch2;
}

document.addEventListener('DOMContentLoaded', function() {
    fetch('https://raw.githubusercontent.com/lewisvining/kf-scheduling-tools/refs/heads/main/manifest.json')
    .then(response => response.json())
    .then(remoteManifest => {
        const remoteVersion = remoteManifest.version;
        const currentVersion = chrome.runtime.getManifest().version;
        document.getElementById('versionsup').textContent = "v" + currentVersion;

        if (currentVersion !== remoteVersion) {
            const comparison = compareVersions(currentVersion, remoteVersion);
            if (comparison > 0) {
                document.getElementById('versionNotice').textContent = 'Experimental';
                document.getElementById('versionNotice').style.display = 'block';
            } else if (comparison < 0) {
                document.getElementById('versionNotice').style.display = 'block';
            }
            console.log(`Version mismatch: installed(${currentVersion}), remote(${remoteVersion})`);
        }
    })
    .catch(error => console.error('Error fetching remote manifest:', error));

    function checkPageUrl() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            const currentTab = tabs[0];
            const currentUrl = currentTab.url;

            const schedulingUrlPattern = /^https:\/\/field\.oes-prod\.energy\/scheduling.*/;

            if (schedulingUrlPattern.test(currentUrl)) {
                const modeDisplay = document.getElementById("kfstmodepill");
                modeDisplay.textContent = "Metering & EV Chargers";
                document.getElementById('schedulingpageM').style.display = 'block';
                document.getElementById('error').style.display = 'none';

                chrome.storage.local.get(['multiCopyMode', 'multiCopyData'], function (data) {
                    const multiCopyMode = data.multiCopyMode;
                    const multiCopyData = data.multiCopyData || {
                        rowCount: 0,
                        pageCount: 0,
                        type: ''
                    };
            
                    if (!multiCopyMode) {
                        document.getElementById("multiCopyOngoing").style.display = "none";
                    } else {
                        document.getElementById("multiCopyInitial").style.display = "none";
                        document.getElementById("multiCopyFooter").style.display = "none";
            
                        document.getElementById("multiCopyRowCount").textContent = multiCopyData.rowCount;
                        document.getElementById("multiCopyPageCount").textContent = multiCopyData.pageCount;
                        document.getElementById("multiCopyType").textContent = 
                        multiCopyData.type === "unattended" 
                            ? "Unattended Evening Chase" 
                            : multiCopyData.type + " chase";
            
                        const modalElement = document.getElementById('multiPageCopyModal');
                        const bootstrapModal = new bootstrap.Modal(modalElement);
                        bootstrapModal.show();
                    }
                });

            } else {
                document.getElementById('error').style.display = 'inline';
                document.getElementById('openSettings').style.display = 'none';
                document.getElementById('schedulingpage').style.display = 'none';
                document.querySelector('button[data-bs-target="#multiPageCopyModal"]').style.display = 'none';
            }
        });
    }
    checkPageUrl();

    const regionSelect = document.getElementById("regionSelect");
    const settingsModal = new bootstrap.Modal(document.getElementById("settingsModal"));

    regionSelect.addEventListener("change", function () {
        const selectedValue = regionSelect.value;
    
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0) return;
    
            const tab = tabs[0];
            const url = new URL(tab.url);
    
            url.searchParams.delete("areaCodes");
    
            if (selectedValue in regionAreas) {
                const sortedCodes = regionAreas[selectedValue].sort();
                const joinedCodes = sortedCodes.join(",");
                url.searchParams.set("areaCodes", joinedCodes);
            }

            if (!url.searchParams.has("companies")) {
                url.searchParams.append("companies", "OES");
            }
    
            chrome.tabs.update(tab.id, { url: url.toString() });
    
            settingsModal.hide();
        });
    });
    
    const utilSheetDataSwitchElement = document.getElementById("utilSheetDataSwitch");

    function updateStorage(value) {
        chrome.storage.local.set({ switch_gsheetdata: value }, () => {
            console.log("switch_gsheetdata updated:", value);
        });
    }

    chrome.storage.local.get("switch_gsheetdata", (data) => {
        if (data.switch_gsheetdata === undefined) {
            updateStorage(true);
            utilSheetDataSwitchElement.checked = true;
        } else {
            utilSheetDataSwitchElement.checked = data.switch_gsheetdata;
        }
    });

    utilSheetDataSwitchElement.addEventListener("change", () => {
        updateStorage(utilSheetDataSwitchElement.checked);
    });

    const now = new Date();
    const hours = now.getHours();
    //const minutes = now.getMinutes();

    if (hours <= 12) {
        document.getElementById("copyEngineerAM").classList.remove("btn-outline-secondary");
        document.getElementById("copyEngineerAM").classList.add("btn-outline-primary");
        document.getElementById('multiCopyAM').setAttribute('checked', 'true');
    } else if (hours <= 16) {
        document.getElementById("copyEngineerPM").classList.remove("btn-outline-secondary");
        document.getElementById("copyEngineerPM").classList.add("btn-outline-primary");
        document.getElementById('multiCopyPM').setAttribute('checked', 'true');
    } else {
        document.getElementById("copyEngineerPM").classList.remove("btn-outline-secondary");
        document.getElementById("copyEngineerPM").classList.add("btn-outline-primary");
        document.getElementById('multiCopyUnattended').setAttribute('checked', 'true');
    }

    const accountJobRefLookupInput = document.getElementById("accountJobRefLookup");
    const jobrefbuttonsContainer = document.getElementById("jobRefLookupBtns");
    const accbuttonsContainer = document.getElementById("accLookupBtns");

    accountJobRefLookupInput.addEventListener("input", () => {
        const value = accountJobRefLookupInput.value.trim().toUpperCase();
        
        const isPlainRef = /^[A-Z0-9]{8}$/.test(value); 
        const isPrefixedRef = /^J-[A-Z0-9]{8}$/.test(value);
        const isKrakenAcc = /^A-[A-Z0-9]{8}$/.test(value);

        if (isPlainRef || isPrefixedRef) {
            jobrefbuttonsContainer.style.display = "block";
        } else if (isKrakenAcc) {
            accbuttonsContainer.style.display = "block";
        } else {
            jobrefbuttonsContainer.style.display = "none";
            accbuttonsContainer.style.display = "none";
        }
    });

    const jobRefInput = document.getElementById("accountJobRefLookup");
    const openJobBtn = document.getElementById("openJobBtn");
    
    openJobBtn.addEventListener("click", () => {
        const input = jobRefInput.value.trim();
        quickLookup(input, "searchKF");
    });
    
});

function copyEngineerAppointments(mode) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabUrl = new URL(tabs[0].url);
      const companiesParam = tabUrl.searchParams.get("companies");

      fetch('https://raw.githubusercontent.com/lewisvining/kf-scheduling-tools/refs/heads/main/engineer_data.json')
        .then((response) => response.json())
        .then((engineerData) => {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (companiesParam, engineerData, mode) => {
              const bookedBackgroundCSS = "rgb(245, 239, 253)";
              const priorityBackgroundCSS = "rgb(249, 196, 251)";
              const abortedBackgroundCSS = "rgb(233, 233, 236)";
              const enrouteBackgroundCSS = "rgb(255, 249, 238)";
              const isEVMode = mode === "EV";
              const isPMMode = mode === "PM";
  
              const engineerEntries = [];
              const matchedManagers = new Set();
              let identifiedEngineersCount = 0;
  
              const engineers = document.querySelectorAll('li[data-engineer-row]');
              engineers.forEach((engineerElement) => {
                const engineerId = engineerElement.getAttribute("data-engineer-row");
                const engineerNameElement = engineerElement.querySelector('h6, [data-testid="engineer-name"]');
                const appointmentCards = engineerElement.querySelectorAll('div[aria-label="Clickable appointment card"]');
                const engName = engineerNameElement?.textContent.trim();
                const manager = ((companiesParam === "OES" || isEVMode === true) && engineerData[engineerId]?.manager) 
                    ? engineerData[engineerId].manager 
                    : "";
  
                if (!engName || appointmentCards.length === 0) return;
  
                if (isEVMode) {
                  appointmentCards.forEach((appointmentCard) => {
                    const cardBackgroundColor = window.getComputedStyle(appointmentCard).backgroundColor;
                    if (cardBackgroundColor !== priorityBackgroundCSS && cardBackgroundColor !== bookedBackgroundCSS && cardBackgroundColor !== enrouteBackgroundCSS) return;
                
                    const jobTitleElement = appointmentCard.querySelector('div > p:first-of-type');
                    const appointmentTimeSlot = appointmentCard.getAttribute('data-timeslot');
                    const jobTitle = jobTitleElement?.textContent.trim();
                    if (!jobTitle || !jobTitle.includes("EV")) return;
  
                    let status = (cardBackgroundColor === bookedBackgroundCSS || cardBackgroundColor === priorityBackgroundCSS) ? "Unattended" : "En Route";
                    let evType = "";
                    if (/Install/i.test(jobTitle)) evType = "Install";
                    else if (/Survey/i.test(jobTitle)) evType = "Survey";
                    else if (/Aftercare/i.test(jobTitle)) evType = "Aftercare";
                    else evType = "Other";
  
                    let jobReference = "";
                    const pElements = appointmentCard.querySelectorAll("p");
                    for (const p of pElements) {
                      const value = p.textContent.trim();
                      if (/^J-[A-Z0-9]{8}$/.test(value)) {
                        jobReference = value;
                        break;
                      }
                    }
  
                    const formatted = `${engName}${manager ? ` (${manager})` : ""} - ${status} EV ${evType} (${appointmentTimeSlot} - ${jobReference || ""})`;
                    engineerEntries.push({ output: formatted, manager: manager || "" });
                    identifiedEngineersCount++;
                  });
                } else {
                  let engineerAppointments = [];
                  appointmentCards.forEach((appointmentCard) => {
                    const jobTitleElement = appointmentCard.querySelector('div > p:first-of-type');
                    const cardBackgroundColor = window.getComputedStyle(appointmentCard).backgroundColor;
                    const appointmentTimeSlot = appointmentCard.getAttribute('data-timeslot');
                    const jobTitle = jobTitleElement?.textContent.trim();
  
                    if (engName && jobTitle) {
                      engineerAppointments.push({
                        job: jobTitle,
                        slot: appointmentTimeSlot,
                        attended: !(cardBackgroundColor === bookedBackgroundCSS || cardBackgroundColor === priorityBackgroundCSS),
                        aborted: cardBackgroundColor === abortedBackgroundCSS,
                        backgroundColor: cardBackgroundColor,
                      });
                    }
                  });
  
                  let excludedJobType = false;
                  let engineerNonStarter = true;
                  let hasUnattended = false;
                  let hasAbortedEV = false;
                  let onlyPM = true;
  
                  engineerAppointments.forEach((appt) => {
                    const isEV = appt.job.includes("EV ");
                    const isLCT = appt.job.includes("Solar ") || appt.job.includes("Heat Pump ") || appt.job.includes("EPC ") || appt.job.includes("Electrode ");
  
                    if (isLCT) {
                      excludedJobType = true;
                      return;
                    }
  
                    if (!appt.attended && (mode === "PM" ? ["AM", "AD", "PM"].includes(appt.slot) : appt.slot === mode)) {
                        hasUnattended = true;
                    }
  
                    if (appt.attended) {
                      engineerNonStarter = false;
                    }
  
                    if (!appt.attended && (appt.slot === "AM" || appt.slot === "AD")) {
                      onlyPM = false;
                    }
  
                    if (mode !== "PM" && isEV && appt.aborted && appt.backgroundColor === abortedBackgroundCSS) {
                      hasAbortedEV = true;
                      engineerNonStarter = false;
                    }
                  });                  
  
                  let label = "";
                  if (engineerNonStarter && !excludedJobType && !onlyPM) {
                    label = "[Non-starter]";
                  } else if (hasUnattended && !excludedJobType) {
                    const hasUnattendedEV = engineerAppointments.some(appt =>
                      !appt.attended &&
                      ["AM", "AD", "PM"].includes(appt.slot) &&
                      appt.job.includes("EV")
                    );
                    if (hasUnattendedEV) {
                      label = `[Unattended EV ${mode} appointment]`;
                    } else {
                      label = `[Unattended ${mode} appointment]`;
                    }
                  } else if (hasAbortedEV) {
                    label = "[Aborted EV install - available for jeopardy]";
                  }
                  
  
                  if (label) {
                    identifiedEngineersCount++;
                    const output = `${engName}  ${label}${manager ? ` (${manager})` : ""}`;
                    engineerEntries.push({ output, manager: manager || "" });
                  }
  
                  if (companiesParam === "OES" && engineerData[engineerId]?.manager) {
                    matchedManagers.add(engineerData[engineerId].manager);
                  }
                }
              });
  
              engineerEntries.sort((a, b) => a.manager.localeCompare(b.manager));
              const namesText = engineerEntries.map(entry => entry.output).join('\n');
  
              function copyToClipboardFallback(text) {
                const tempTextArea = document.createElement('textarea');
                tempTextArea.value = text;
                document.body.appendChild(tempTextArea);
                tempTextArea.select();
                document.execCommand('copy');
                document.body.removeChild(tempTextArea);
              }
  
              copyToClipboardFallback(namesText);
              alert(`${identifiedEngineersCount} ${isEVMode ? 'EV appointment(s)' : `engineer(s) with unattended ${mode} appointments`} copied to clipboard.`);
  
              if (companiesParam === "OES") {
                console.log("Matched OES Managers:", Array.from(matchedManagers));
              }
            },
            args: [companiesParam, engineerData, mode],
          });
        })
        .catch((error) => console.error("Failed to fetch engineer data:", error));
    });
}  

function multiCopyEngineerAppointments(mode) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabUrl = new URL(tabs[0].url);
      const companiesParam = tabUrl.searchParams.get("companies");
  
      fetch("https://raw.githubusercontent.com/lewisvining/kf-scheduling-tools/refs/heads/main/engineer_data.json")
        .then((response) => {
          if (!response.ok) throw new Error("Network response was not ok");
          return response.json();
        })
        .then((engineerData) => {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (companiesParam, engineerData, mode) => {
                const bookedBackgroundCSS = "rgb(245, 239, 253)";
                const priorityBackgroundCSS = "rgb(249, 196, 251)";
                const abortedBackgroundCSS = "rgb(233, 233, 236)";
                const enrouteBackgroundCSS = "rgb(208, 242, 255)";
                //const postcodeRegex = /[A-Z]{1,2}[0-9][0-9A-Z]? [0-9][A-Z]{2}/i;
                const jobrefRegex = /^J-[A-Z0-9]{8}$/;
  
              if (mode === "unattended") {
                const jobIdsSet = new Set();
                const today = new Date();
                const formattedDate = today.toLocaleDateString("en-GB");
                const todayDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][today.getDay()];
                const tableRows = [];

                const appointmentCards = document.querySelectorAll('div[aria-label="Clickable appointment card"]');
                const excludedKeywords = ["heat pump ", "solar ", "electrode", "epc", "ev"];

                const companyMap = {
                  SMS_LTD: "SMS LTD",
                  ENERGISE: "ENG",
                  MOMENTUM: "MOM",
                  MPAAS: "MPS",
                  OES: "OES (Field)",
                  PROVIDOR: "PVD"
                };

                const companyLabel = companyMap[companiesParam] || companiesParam;

                appointmentCards.forEach((card) => {
                  const bgColor = window.getComputedStyle(card).backgroundColor;
                  if (bgColor !== bookedBackgroundCSS && bgColor !== priorityBackgroundCSS) return;

                  const jobTitleElement = card.querySelector('div > p:first-of-type');
                  const jobTitle = jobTitleElement?.textContent.trim().toLowerCase() || "";

                  if (excludedKeywords.some(keyword => jobTitle.includes(keyword))) return;

                  let jobId = "";
                  const pTags = card.querySelectorAll("p");
                  for (let p of pTags) {
                    const text = p.textContent.trim();
                    if (jobrefRegex.test(text)) jobId = text;
                  }

                  if (!jobId || jobIdsSet.has(jobId)) return;
                  jobIdsSet.add(jobId);

                  tableRows.push({
                    jobId,
                    companiesParam: companyLabel,
                    formattedDate,
                    todayDay
                  });
                });

                return tableRows;
              }             

              const isEVMode = mode === "EV";
              const engineerEntries = [];
              const engineers = document.querySelectorAll('li[data-engineer-row]');
  
              engineers.forEach((engineerElement) => {
                const engineerId = engineerElement.getAttribute("data-engineer-row");
                const engineerNameElement = engineerElement.querySelector('h6, [data-testid="engineer-name"]');
                const appointmentCards = engineerElement.querySelectorAll('div[aria-label="Clickable appointment card"]');
                const engName = engineerNameElement?.textContent.trim();
                const manager = ((companiesParam === "OES" || isEVMode === true) && engineerData[engineerId]?.manager)
                  ? engineerData[engineerId].manager
                  : "";
  
                if (!engName || appointmentCards.length === 0) return;
  
                if (isEVMode) {
                  appointmentCards.forEach((appointmentCard) => {
                    const cardBackgroundColor = window.getComputedStyle(appointmentCard).backgroundColor;
                    if (cardBackgroundColor !== priorityBackgroundCSS && cardBackgroundColor !== bookedBackgroundCSS && cardBackgroundColor !== enrouteBackgroundCSS) return;
  
                    const jobTitleElement = appointmentCard.querySelector('div > p:first-of-type');
                    const appointmentTimeSlot = appointmentCard.getAttribute('data-timeslot');
                    const jobTitle = jobTitleElement?.textContent.trim();
                    if (!jobTitle || !jobTitle.includes("EV")) return;
  
                    const status = (cardBackgroundColor === bookedBackgroundCSS || cardBackgroundColor === priorityBackgroundCSS) ? "Unattended" : "En Route";
                    const evType = /Install/i.test(jobTitle) ? "Install" :
                      /Survey/i.test(jobTitle) ? "Survey" :
                        /Aftercare/i.test(jobTitle) ? "Aftercare" : "Other";
  
                    let jobReference = "";
                    const pElements = appointmentCard.querySelectorAll("p");
                    for (const p of pElements) {
                      const value = p.textContent.trim();
                      if (/^J-[A-Z0-9]{8}$/.test(value)) {
                        jobReference = value;
                        break;
                      }
                    }
  
                    const label = `${status} EV ${evType} (${appointmentTimeSlot}${jobReference ? ` - ${jobReference}` : ""})`;
  
                    engineerEntries.push({
                      name: engName,
                      manager: manager || "",
                      label
                    });
                  });
                } else {
                let engineerAppointments = [];
                appointmentCards.forEach((appointmentCard) => {
                    const jobTitleElement = appointmentCard.querySelector('div > p:first-of-type');
                    const cardBackgroundColor = window.getComputedStyle(appointmentCard).backgroundColor;
                    const appointmentTimeSlot = appointmentCard.getAttribute('data-timeslot');
                    const jobTitle = jobTitleElement?.textContent.trim();
  
                    if (engName && jobTitle) {
                      engineerAppointments.push({
                        job: jobTitle,
                        slot: appointmentTimeSlot,
                        attended: !(cardBackgroundColor === bookedBackgroundCSS || cardBackgroundColor === priorityBackgroundCSS),
                        aborted: cardBackgroundColor === abortedBackgroundCSS,
                        backgroundColor: cardBackgroundColor,
                      });
                    }
                });

                  console.table(engineerAppointments);
  
                  const relevantSlots = (mode === "PM") ? ["AM", "AD", "PM"] : [mode];
                  const excludedJobType = engineerAppointments.some(appt =>
                    appt.job.includes("Solar ") || appt.job.includes("Heat Pump ") ||
                    appt.job.includes("EPC ") || appt.job.includes("Electrode ")
                  );
                  const engineerNonStarter = !engineerAppointments.some(appt => appt.attended);
                  const hasUnattended = engineerAppointments.some(appt =>
                    !appt.attended && relevantSlots.includes(appt.slot)
                  );
                  const hasUnattendedEV = engineerAppointments.some(appt =>
                    !appt.attended && relevantSlots.includes(appt.slot) && appt.job.includes("EV")
                  );
                  const hasAbortedEV = engineerAppointments.some(appt =>
                    appt.job.includes("EV") && appt.aborted && appt.backgroundColor === abortedBackgroundCSS
                  );
                  const onlyPM = false;
  
                  let label = "";
                  if (mode === "AM") {
                    // Remove all PM appointments first
                    engineerAppointments = engineerAppointments.filter(appt => appt.slot !== "PM");
                  
                    const hasAttended = engineerAppointments.some(appt => appt.attended);
                    const hasUnattendedAM = engineerAppointments.some(appt =>
                      !appt.attended && appt.slot === "AM"
                    );
                    const allUnattendedOrPriority = engineerAppointments.every(appt =>
                      !appt.attended && (appt.backgroundColor === bookedBackgroundCSS || appt.backgroundColor === priorityBackgroundCSS)
                    );
                  
                    if (allUnattendedOrPriority && !onlyPM && !excludedJobType) {
                      label = "Non-starter";
                    } else if (hasAttended && hasUnattendedAM && !excludedJobType) {
                      label = "Unattended AM";
                    }
                  
                    if (!label && hasAbortedEV && mode === "AM") {
                      label = "Aborted EV install";
                    }
                  }
                   else {
                    if (engineerNonStarter && !excludedJobType && !onlyPM) {
                      label = "Non-starter";
                    } else if (hasUnattended && !excludedJobType) {
                      label = hasUnattendedEV ? `Unattended EV ${mode}` : `Unattended ${mode}`;
                    }
                  }
  
                  if (label) {
                    engineerEntries.push({
                      name: engName,
                      manager: manager || "",
                      label,
                      mode
                    });
                  }
                }
              });
  
              return engineerEntries;
            },
            args: [companiesParam, engineerData, mode],
          }, (injectionResults) => {
            if (chrome.runtime.lastError || !injectionResults || !injectionResults[0].result) {
              console.error("Script injection failed or returned nothing.");
              return;
            }
  
            const newEntries = injectionResults[0].result;
            chrome.storage.local.get(['multiCopyData'], (result) => {
              const previousData = result.multiCopyData || {
                entries: [],
                rowCount: 0,
                pageCount: 0,
                type: mode
              };
  
              const updatedEntries = previousData.entries.concat(newEntries);
  
              const updatedObject = {
                multiCopyMode: true,
                multiCopyData: {
                  entries: updatedEntries,
                  rowCount: updatedEntries.length,
                  pageCount: previousData.pageCount + 1,
                  type: mode
                }
              };
  
              chrome.storage.local.set(updatedObject, () => {
                console.log(`${newEntries.length} entries added. Total: ${updatedEntries.length}, Pages: ${updatedObject.multiCopyData.pageCount}`);
  
                if (updatedObject.multiCopyData.pageCount === 1) {
                  const modalElement = document.getElementById('multiPageCopyModal');
                  const modalInstance = bootstrap.Modal.getInstance(modalElement);
                  if (modalInstance) modalInstance.hide();
                  document.querySelector('button[data-bs-target="#multiPageCopyModal"]').setAttribute('disabled', 'true');
                  showToast(`Multi-page selection created. ${newEntries.length} entries added.`, 'success');
                } else {
                  document.getElementById('multiCopyAddPage').setAttribute('disabled', 'true');
                  document.getElementById("multiCopyRowCount").textContent = updatedObject.multiCopyData.rowCount;
                  document.getElementById("multiCopyPageCount").textContent = updatedObject.multiCopyData.pageCount;
                  showToast(`${newEntries.length} new entries added (${updatedObject.multiCopyData.rowCount} in total).`);
                }
              });
            });
          });
        })
        .catch((error) => console.error("Failed to fetch engineer data:", error));
    });
}  

function copyUnattendedRefs(product) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const companiesValue = getCompaniesFromUrl(tabs[0].url);

        chrome.storage.local.get("switch_gsheetdata", (data) => {
            const switchGSheetData = data.switch_gsheetdata ?? true;

            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (companiesValue, switchGSheetData) => {
                    const bookedBackgroundCSS = "rgb(245, 239, 253)";
                    const priorityBackgroundCSS = "rgb(249, 196, 251)";
                    const abortedBackgroundCSS = "rgb(233, 233, 236)";
                    const jobrefRegex = /^J-[A-Z0-9]{8}$/;
                    const postcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]? [0-9][A-Z]{2}$/i;
                    const excludedKeywords = ["heat pump ", "solar ", "electrode", "epc", "ev"]; // temp exclusion for EV
                    const jobIdsSet = new Set();
                    let identifiedJobCount = 0;

                    function copyToClipboardFallback(text) {
                        const tempTextArea = document.createElement('textarea');
                        tempTextArea.value = text;
                        document.body.appendChild(tempTextArea);
                        tempTextArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(tempTextArea);
                    }

                    const engineers = document.querySelectorAll('li[data-engineer-row]');
                    engineers.forEach((engineerElement) => {
                        const appointmentCards = engineerElement.querySelectorAll('div[aria-label="Clickable appointment card"]');
                        
                        const excludedPostcodes = [];

                        appointmentCards.forEach((appointmentCard) => {
                            const cardBackgroundColor = window.getComputedStyle(appointmentCard).backgroundColor;
                            const jobTitleElement = appointmentCard.querySelector('div > p:first-of-type');
                            const jobTitle = jobTitleElement?.textContent.trim().toLowerCase() || "";

                            let jobPostcode = "";
                            const pElements = appointmentCard.querySelectorAll('p');
                            
                            pElements.forEach((pElement) => {
                                const pText = pElement.textContent.trim();
                                if (postcodeRegex.test(pText)) {
                                    jobPostcode = pText;
                                }
                            });

                            if (cardBackgroundColor === abortedBackgroundCSS) {
                                if (jobPostcode) {
                                    excludedPostcodes.push(jobPostcode);
                                }
                                return;
                            }

                            if (excludedKeywords.some(keyword => jobTitle.includes(keyword))) {
                                if (jobPostcode) {
                                    excludedPostcodes.push(jobPostcode);
                                }
                                return;
                            }

                            if (excludedPostcodes.includes(jobPostcode)) {
                                //return; - temp stop exclusions for NBSI & on site reraises
                            }

                            if (cardBackgroundColor === bookedBackgroundCSS || cardBackgroundColor === priorityBackgroundCSS) {
                                pElements.forEach((pElement) => {
                                    const textContent = pElement.textContent.trim();
                                    if (jobrefRegex.test(textContent)) {
                                        jobIdsSet.add(textContent);
                                        identifiedJobCount++;
                                    }
                                });
                            }
                        });
                    });

                    const jobIdsArray = Array.from(jobIdsSet);
                    const jobIdsText = jobIdsArray.join('\n');

                    if (jobIdsArray.length === 0) {
                        alert("No unattended appointments found on this page.");
                        return;
                    }

                    if (switchGSheetData) {
                        const today = new Date();
                        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                        const formattedDate = today.toLocaleDateString("en-GB");
                        const todayDay = dayNames[today.getDay()];
                    
                        let tableData = "";
                        jobIdsArray.forEach((jobId) => {
                            const allCards = document.querySelectorAll('div[aria-label="Clickable appointment card"]');
                            let matchedTitle = "";
                            let matchedPostcode = "";
                    
                            allCards.forEach(card => {
                                const cardText = card.textContent;
                                if (cardText.includes(jobId)) {
                                    const jobTitleEl = card.querySelector('div > p:first-of-type');
                                    matchedTitle = jobTitleEl?.textContent.trim().toLowerCase() || "";
                    
                                    const postcodeRegex = /[A-Z]{1,2}[0-9][0-9A-Z]? [0-9][A-Z]{2}/i;
                                    const pTags = card.querySelectorAll("p");
                                    pTags.forEach(p => {
                                        const pText = p.textContent.trim();
                                        if (postcodeRegex.test(pText)) {
                                            matchedPostcode = pText;
                                        }
                                    });
                                }
                            });
                    
                            if (matchedTitle.includes("ev")) {
                                tableData += `${jobId}\t${matchedPostcode}\t${formattedDate}\t${todayDay}\t\t\tEV Appointment\n`;
                            } else {
                                tableData += `${jobId}\t${companiesValue}\t${formattedDate}\t${todayDay}\tPlease Confirm Attendance\tJob Status Not Updated\n`;
                            }
                        });
                    
                        copyToClipboardFallback(tableData);
                        alert(`${identifiedJobCount} job reference(s) with details formatted for the Utilisation sheet copied to clipboard.`);
                    } else {
                        copyToClipboardFallback(jobIdsText);
                        alert(`${identifiedJobCount} unattended job references copied.`);
                    }
                },
                args: [companiesValue, switchGSheetData],
            });
        });
    });

    function getCompaniesFromUrl(url) {
        const urlParams = new URLSearchParams(new URL(url).search);
        const companies = urlParams.get('companies');
        if (!companies || companies.split(',').length > 1) {
            return ''; 
        }

        const companyMap = {
            SMS_LTD: 'SMS LTD',
            ENERGISE: 'ENG',
            MOMENTUM: 'MOM',
            MPAAS: 'MPS',
            OES: 'OES (Field)',
            PROVIDOR: 'PVD',
        };

        return companyMap[companies] || companies;
    }
}

document.getElementById("jeopardyForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const selectedFilter = document.getElementById("jobFilter").value;
    const selectedFormat = document.querySelector('input[name="jeopFormatRadio"]:checked')?.id || null;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (filter, format) => {
                const jobsData = [];
                const dateRegex = /^\d{1,2} [A-Za-z]{3}/;

                const jobElements = document.querySelectorAll('div[data-testid="draggable-job-requirement"], [id^="accordion-"]');

                const processedAccordions = new Set();

                function copyToClipboardFallback(text) {
                    const tempTextArea = document.createElement('textarea');
                    tempTextArea.value = text;
                    document.body.appendChild(tempTextArea);
                    tempTextArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(tempTextArea);
                }

                jobElements.forEach((jobElement) => {
                    const id = jobElement.id;
                    if (id && id.startsWith("accordion-")) {
                        const uniqueKey = id.split("accordion-")[1]; 

                        if (processedAccordions.has(uniqueKey)) {
                            return;
                        }
                        processedAccordions.add(uniqueKey);
                    }

                    const removeClickToCopy = (text) => text.replace("Click to copy", "").trim();

                    const jobTitleElement = jobElement.querySelector('div > div > div:nth-of-type(1) > p:nth-of-type(1)');
                    const jobSkillsElement = jobElement.querySelector('div > div > div:nth-of-type(1) > p:nth-of-type(3)');
                    const jobRefElement = jobElement.querySelector('div > div > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(1)');
                    const jobPostcodeElement = jobElement.querySelector('div > div > div:nth-of-type(2) > div:nth-of-type(2) > p:nth-of-type(1)');
                    const jobTimeSlotElement = jobElement.querySelector('div > div > div:nth-of-type(2) > div:nth-of-type(3) > p:nth-of-type(1)');

                    const jobTitle = removeClickToCopy(jobTitleElement?.textContent.trim() || "");
                    const jobSkills = removeClickToCopy(jobSkillsElement?.textContent.trim() || "");
                    const jobRef = removeClickToCopy(jobRefElement?.textContent.trim() || "");
                    const jobPostcode = removeClickToCopy(jobPostcodeElement?.textContent.trim() || "");
                    const jobTimeSlot = removeClickToCopy(jobTimeSlotElement?.textContent.trim() || "");

                    let jobDate = "";
                    const pElements = jobElement.querySelectorAll("p");
                    pElements.forEach((pElement) => {
                        const text = pElement.textContent.trim();
                        if (dateRegex.test(text)) {
                            jobDate = text;
                        }
                    });

                    const includeJob = (filter === "all") || 
                        (filter === "metering" && !jobTitle.includes("EV ") && !jobTitle.includes("Heat Pump ") && !jobTitle.includes("Solar ")) ||
                        (filter === "metering_ev" && !jobTitle.includes("Heat Pump ") && !jobTitle.includes("Solar ")) ||
                        (filter === "ev" && jobTitle.includes("EV ")) ||
                        (filter === "hp" && jobTitle.includes("Heat Pump ")) ||
                        (filter === "solar" && jobTitle.includes("Solar "));

                    if (includeJob) {
                        jobsData.push({
                            postcode: jobPostcode,
                            reference: jobRef,
                            jobtype: jobTitle,
                            date: jobDate,
                            timeslot: jobTimeSlot,
                            datetime: jobDate + " " + jobTimeSlot,
                            skills: jobSkills || "",
                        });
                    }
                });

                if (jobsData.length === 0) {
                    alert("No jobs found in the scheduling window.");
                    return;
                }

                let jobDataText = "";

                if (format === "default") {
                    jobDataText = jobsData
                        .map(job => `${job.postcode}\t${job.reference}\t${job.jobtype}\t${job.datetime}\t${job.skills}`)
                        .join('\n');

                    copyToClipboardFallback(jobDataText);
                    alert(`${jobsData.length} job(s) copied to clipboard.`);

                } else if (format === "meteringAM") {
                    const today = new Date();
                    const todayFormatted = `${today.getDate()} ${today.toLocaleString('en-GB', { month: 'short' })}`;

                    const meteringAMJobs = jobsData.filter(job => 
                        job.date.startsWith(todayFormatted) && job.timeslot === ('AM') && !job.jobtype.includes('EV') && !job.jobtype.includes('solar') && !job.jobtype.includes('heat pump')
                    );

                    console.table(meteringAMJobs);

                    jobDataText = meteringAMJobs
                        .map(job => {
                            const todayFormattedDDMMYYYY = today.toLocaleDateString('en-GB');
                            const todayDayName = today.toLocaleDateString('en-GB', { weekday: 'long' });
                            return `${job.reference}\t\t${todayFormattedDDMMYYYY}\t${todayDayName}\tInstaller Cancellation`;
                        })
                        .join('\n');

                    copyToClipboardFallback(jobDataText);
                    alert(`${meteringAMJobs.length} AM job(s) copied for the metering GSOS sheet.`);

                } else if (format === "meteringAD"){
                    const today = new Date();
                    const todayFormatted = `${today.getDate()} ${today.toLocaleString('en-GB', { month: 'short' })}`;

                    const meteringADJobs = jobsData.filter(job => 
                        job.date.startsWith(todayFormatted) && !job.jobtype.includes('EV') && !job.jobtype.includes('solar') && !job.jobtype.includes('heat pump')
                    );

                    console.table(meteringADJobs);

                    jobDataText = meteringADJobs
                        .map(job => {
                            const todayFormattedDDMMYYYY = today.toLocaleDateString('en-GB');
                            const todayDayName = today.toLocaleDateString('en-GB', { weekday: 'long' });
                            return `${job.reference}\t\t${todayFormattedDDMMYYYY}\t${todayDayName}\tInstaller Cancellation`;
                        })
                        .join('\n');

                    copyToClipboardFallback(jobDataText);
                    alert(`Copied ${meteringADJobs.length} job(s) scheduled for today & formatted for the metering GSOS sheet.`);
                } else if (format === "ev"){
                    const today = new Date();
                    const todayFormatted = `${today.getDate()} ${today.toLocaleString('en-GB', { month: 'short' })}`;

                    const evJobs = jobsData.filter(job => 
                        job.date.startsWith(todayFormatted) && job.jobtype.includes('EV')
                    );

                    console.table(evJobs);

                    jobDataText = evJobs
                        .map(job => {
                            const todayFormattedDDMMYYYY = today.toLocaleDateString('en-GB');
                            const todayDayName = today.toLocaleDateString('en-GB', { weekday: 'long' });
                            return `${job.reference}\t${job.postcode}\t${todayFormattedDDMMYYYY}\t${todayDayName}`;
                        })
                        .join('\n');

                    copyToClipboardFallback(jobDataText);
                    alert(`Copied ${evJobs.length} job(s) scheduled for today & formatted for the EV GSOS sheet.`);
                }
            },
            args: [selectedFilter, selectedFormat]
        });
    });
});

document.getElementById("regionPostcodeCheck").addEventListener("input", async function () {
    const input = this.value.trim().toUpperCase();

    const match = input.match(/^([A-Z]{1,2})\d?/);

    if (match) {
        const postcodeArea = match[1];
        const outputRegion = document.getElementById("regionPostcodeOut");
        const outputBorders = document.getElementById("borderPostcodeOut");

        const response = await fetch("postcode_borders.json");
        const postcodeAdjacency = await response.json();

        let foundRegion = null;
        for (const [region, codes] of Object.entries(regionAreas)) {
            if (codes.includes(postcodeArea)) {
                foundRegion = region;
                break;
            }
        }

        const neighbours = postcodeAdjacency[postcodeArea] || [];

        if (foundRegion) {
            outputRegion.style.display = "inline";
            outputRegion.textContent = `${foundRegion}`;
        } else {
            outputRegion.style.display = "none";
        }

        if (neighbours.length > 0) {
            outputBorders.style.display = "inline";
            outputBorders.textContent = `Nearby: ${neighbours.join(", ")}`;
        } else {
            outputBorders.style.display = "none";
        }
    } else {
        document.getElementById("regionPostcodeOut").style.display = "none";
        document.getElementById("borderPostcodeOut").style.display = "none";
    }
});

function quickLookup(input, action) {
    if (!input || !action) return;
  
    if (action === "searchKF") {
      let formattedInput = input.trim();
      
      if (!formattedInput.startsWith("J-") && !formattedInput.startsWith("j-")) {
        formattedInput = `J-${formattedInput}`;
      }
  
      const url = `https://field.oes-prod.energy/jobs-projects/jobs/${encodeURIComponent(formattedInput)}`;
      chrome.tabs.create({ url });
    }
  
}

document.getElementById("copyJeop").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
                const jobsData = [];
                const dateRegex = /^\d{1,2} [A-Za-z]{3}/;
                const today = new Date();
                const todayFormatted = `${today.getDate()} ${today.toLocaleString('en-GB', { month: 'short' })}`;
            
                const jobElements = document.querySelectorAll('div[data-testid="draggable-job-requirement"], [id^="accordion-:r"]');
                const processedAccordions = new Set();
            
                jobElements.forEach((jobElement) => {
                    const id = jobElement.id;
                    if (id && id.startsWith("accordion-:r")) {
                        const uniqueKey = id.split("accordion-:r")[1];
                        if (processedAccordions.has(uniqueKey)) return;
                        processedAccordions.add(uniqueKey);
                    }
            
                    const removeClickToCopy = (text) => text.replace("Click to copy", "").trim();
                    const jobTitle = removeClickToCopy(jobElement.querySelector('div > div > div:nth-of-type(1) > p:nth-of-type(1)')?.textContent || "");
                    const jobTimeSlot = removeClickToCopy(jobElement.querySelector('div > div > div:nth-of-type(2) > div:nth-of-type(3) > p:nth-of-type(1)')?.textContent || "");
            
                    let jobDate = "";
                    jobElement.querySelectorAll("p").forEach((p) => {
                        const text = p.textContent.trim();
                        if (dateRegex.test(text)) jobDate = text;
                    });
            
                    jobsData.push({
                        jobtype: jobTitle,
                        date: jobDate,
                        timeslot: jobTimeSlot
                    });
                });
            
                const allToday = jobsData.filter(job => job.date.startsWith(todayFormatted));
                const evToday = allToday.filter(job => job.jobtype.toLowerCase().includes("ev"));
            
                return {
                    all: allToday.length,
                    ev: evToday.length,
                    jobs: jobsData,
                    todayFormatted: todayFormatted
                };
            }            
        }, (injectionResults) => {
            const result = injectionResults[0]?.result;
            if (!result) {
                console.error("No data returned from script.");
                return;
            }
        
            document.getElementById("jeopCountALL").textContent = result.all;
            document.getElementById("jeopCountEV").textContent = result.ev;
        
            const excludeKeywords = ["heat pump ", "solar ", "ev ", "electrode", "epc"];
            const isExcluded = (title) =>
                excludeKeywords.some(keyword => title.toLowerCase().includes(keyword));
        
            const meteringJobs = result.jobs.filter(job =>
                job.date.startsWith(result.todayFormatted) && !isExcluded(job.jobtype)
            );
            const meteringAMJobs = meteringJobs.filter(job => job.timeslot === 'AM');
        
            document.getElementById("jeopCountAM").textContent =
                `${meteringJobs.length} (${meteringAMJobs.length} AMs)`;
        });
    });
});

document.getElementById("copyEngineerAM").addEventListener("click", () => {
    copyEngineerAppointments("AM");
});

document.getElementById("copyEngineerPM").addEventListener("click", () => {
    copyEngineerAppointments("PM");
});

document.getElementById("copyEngineerEV").addEventListener("click", () => {
    copyEngineerAppointments("EV");
});

document.getElementById("copyUnattendedRefs_metering").addEventListener("click", () => {
    copyUnattendedRefs('metering');
});

document.getElementById("multiCopySubmit").addEventListener("click", () => {
    let mode = null;
  
    if (document.getElementById("multiCopyAM").checked) {
      mode = "AM";
    } else if (document.getElementById("multiCopyPM").checked) {
      mode = "PM";
    } else if (document.getElementById("multiCopyEV").checked) {
      mode = "EV";
    }  else if (document.getElementById("multiCopyUnattended").checked) {
        mode = "unattended";
    }
  
    if (!mode) {
      alert("Please select a mode (AM, PM, or EV).");
      return;
    }
    multiCopyEngineerAppointments(mode);
});
  
document.getElementById('multiCopyFinish').addEventListener('click', () => {
    chrome.storage.local.get(['multiCopyData'], (data) => {
        const multiCopyData = data.multiCopyData;
        const entries = multiCopyData?.entries || [];

        if (entries.length === 0) {
            showToast(`The list contains no data`, 'danger');
            return;
        }

        let formatted;

        if (multiCopyData.type === 'unattended') {
            formatted = entries.map(e => {
              const jobId = e.jobId || '';
              const companies = e.companiesParam || '';
              const date = e.formattedDate || '';
              const day = e.todayDay || '';
              return `${jobId}\t${companies}\t${date}\t${day}\tPlease Confirm Attendance\tJob Status Not Updated`;
            }).join('\n');
          } else {
            const sortedEntries = entries.sort((a, b) => {
                const managerA = a.manager?.toLowerCase() || 'zzz';
                const managerB = b.manager?.toLowerCase() || 'zzz';
                return managerA.localeCompare(managerB);
            });

            formatted = sortedEntries.map(e => {
                const name = e.name;
                const managerPart = e.manager ? ` (${e.manager})` : '';
                const label = e.label || '';
                return `${name}${managerPart}\t[${label}]`;
            }).join('\n');
        }

        navigator.clipboard.writeText(formatted).then(() => {
            chrome.storage.local.remove(['multiCopyData', 'multiCopyMode', 'multiCopyPageCount', 'multiCopyType'], () => {
                showToast(`List copied to clipboard`, 'success');
                setTimeout(() => {
                    location.reload();
                }, 1500);
            });
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Copy failed. Try again.');
        });
    });
});

document.getElementById('multiCopyAddPage').addEventListener('click', () => {
    chrome.storage.local.get(['multiCopyData'], (data) => {
      const copyData = data.multiCopyData || {};
      const mode = copyData.type;
  
      if (!mode) {
        alert('No copy mode found in stored data.');
        return;
      }
      multiCopyEngineerAppointments(mode);
    });
});

document.getElementById('multiCopyCancel').addEventListener('click', () => {
    if (!confirm('Are you sure you want to cancel and clear all copied data?')) return;

    document.getElementById('multiCopyCancel').setAttribute('disabled', 'true');
    document.getElementById('multiCopyAddPage').setAttribute('disabled', 'true');
    document.getElementById('multiCopyFinish').setAttribute('disabled', 'true');
  
    chrome.storage.local.remove(['multiCopyData', 'multiCopyMode', 'multiCopyPageCount', 'multiCopyType'], () => {
      showToast(`Clearing list...`, 'danger');
      setTimeout(() => {
        location.reload();
      }, 2000);
    });
});

function showToast(message, type = 'primary') {
    const toastEl = document.getElementById('toast-container');
    const toastContent = document.getElementById('toast-content');
  
    if (!toastEl || !toastContent) {
      console.error('Toast element(s) not found');
      return;
    }
  
    toastContent.textContent = message;
  
    toastEl.className = `k-text toast align-items-center border-0 text-bg-${type}`;
  
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}