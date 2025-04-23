const regionAreas = {
    "North": ["AB", "BD", "CA", "DD", "DE", "DG", "DH", "DL", "DN", "EH", "FK", "G", "HD", "HG", "HS", "HU", "HX", "IV", "KA", "KW", "KY", "LS", "ML", "NE", "PA", "PH", "S", "SR", "TD", "TS", "WF", "YO", "ZE"],
    "South": ["BA", "BH", "BN", "BS", "CT", "DT", "EX", "GL", "GU", "ME", "PL", "PO", "RG", "RH", "SL", "SN", "SO", "SP", "TA", "TN", "TQ", "TR"],
    "East": ["AL", "BR", "CB", "CM", "CO", "CR", "DA", "E", "EC", "EN", "HA", "IG", "IP", "KT", "N", "NR", "NW", "RM", "SE", "SG", "SM", "SS", "SW", "TW", "UB", "W", "WC", "WD", "HP", "LU"],
    "West": ["B", "BB", "BL", "CF", "CH", "CV", "CW", "DY", "FY", "HR", "L", "LA", "LD", "LE", "LL", "LN", "M", "MK", "NG", "NN", "NP", "OL", "PE", "PR", "SA", "SK", "ST", "SY", "TF", "WA", "WN", "WR", "WS", "WV", "OX"]
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

            } else {
                document.getElementById('error').style.display = 'inline';
                document.getElementById('openSettings').style.display = 'none';
                document.getElementById('schedulingpage').style.display = 'none';
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

            [...url.searchParams.keys()].forEach(param => {
                if (param === "areaCodes") {
                    url.searchParams.delete(param);
                }
            });

            if (selectedValue in regionAreas) {
                regionAreas[selectedValue].sort().forEach(code => {
                    url.searchParams.append("areaCodes", code);
                });
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
    } else {
        document.getElementById("copyEngineerPM").classList.remove("btn-outline-secondary");
        document.getElementById("copyEngineerPM").classList.add("btn-outline-primary");
    }

    const accountJobRefLookupInput = document.getElementById("accountJobRefLookup");
    const jobrefbuttonsContainer = document.getElementById("jobRefLookupBtns");
    const accbuttonsContainer = document.getElementById("accLookupBtns");

    // accountJobRefLookupInput.addEventListener("input", () => {
    //     const value = accountJobRefLookupInput.value.trim().toUpperCase();
        
    //     const isPlainRef = /^[A-Z0-9]{8}$/.test(value); 
    //     const isPrefixedRef = /^J-[A-Z0-9]{8}$/.test(value);
    //     const isKrakenAcc = /^A-[A-Z0-9]{8}$/.test(value);

    //     if (isPlainRef || isPrefixedRef) {
    //         jobrefbuttonsContainer.style.display = "block";
    //     } else if (isKrakenAcc) {
    //         accbuttonsContainer.style.display = "block";
    //     } else {
    //         jobrefbuttonsContainer.style.display = "none";
    //         accbuttonsContainer.style.display = "none";
    //     }
    // });

    const jobRefInput = document.getElementById("accountJobRefLookup");
    const openJobBtn = document.getElementById("openJobBtn");
    
    // openJobBtn.addEventListener("click", () => {
    //     const input = jobRefInput.value.trim();
    //     quickLookup(input, "searchKF");
    // });
    
});

document.getElementById("copyEngineerAM").addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
                const bookedBackgroundCSS = "rgb(245, 239, 253)";
                const priorityBackgroundCSS = "rgb(249, 196, 251)";
                const abortedBackgroundCSS = "rgb(233, 233, 236)";
                const engineerNamesSet = new Set();
                let identifiedEngineersCount = 0;

                const engineers = document.querySelectorAll('li[data-engineer-row]');
                engineers.forEach((engineerElement) => {
                    const engineerNameElement = engineerElement.querySelector('h6, [data-testid="engineer-name"]');
                    const appointmentCards = engineerElement.querySelectorAll('div[aria-label="Clickable appointment card"]');
                    let engineerAppointments = [];

                    if (appointmentCards.length > 0) {
                        appointmentCards.forEach((appointmentCard) => {
                            const jobTitleElement = appointmentCard.querySelector('div > p:first-of-type');
                            const cardBackgroundColor = window.getComputedStyle(appointmentCard).backgroundColor;
                            const appointmentTimeSlot = appointmentCard.getAttribute('data-timeslot');
                            const jobTitle = jobTitleElement?.textContent.trim();
                        
                            if (
                                engineerNameElement.textContent.trim() &&
                                jobTitle &&
                                (cardBackgroundColor === bookedBackgroundCSS || cardBackgroundColor === priorityBackgroundCSS)
                            ) {
                                engineerAppointments.push({
                                    eng: engineerNameElement.textContent.trim(),
                                    job: jobTitle,
                                    slot: appointmentTimeSlot,
                                    attended: false,
                                    aborted: false,
                                });
                            } else if (cardBackgroundColor === abortedBackgroundCSS) {
                                engineerAppointments.push({
                                    eng: engineerNameElement.textContent.trim(),
                                    job: jobTitle,
                                    slot: appointmentTimeSlot,
                                    attended: true,
                                    aborted: true,
                                });
                            } else {
                                engineerAppointments.push({
                                    eng: engineerNameElement.textContent.trim(),
                                    job: jobTitle,
                                    slot: appointmentTimeSlot,
                                    attended: true,
                                    aborted: false,
                                });
                            }
                        });

                        let excludedJobType = false;
                        let engineerNonStarter = true;
                        let hasUnattendedAM = false;
                        let hasAbortedEV = false;
                        let onlyPM = true;

                        engineerAppointments.forEach(appointment => {
                            if (appointment.job.includes("Solar ") || appointment.job.includes("Heat Pump ") || appointment.job.includes("EPC ") || appointment.job.includes("Electrode ")) {
                                excludedJobType = true;
                                return; // skips entire engineer if sith slr/hp - issue if eng has slr/hp AND metering or EV
                            }
                    
                            if (appointment.attended === false && appointment.slot === "AM") {
                                hasUnattendedAM = true;
                            }
                    
                            if (appointment.attended === true) {
                                engineerNonStarter = false;
                            }
                    
                            if (appointment.attended === false && (appointment.slot === "AM" || appointment.slot === "AD")) {
                                onlyPM = false;
                            }

                            if (appointment.job.includes("Install") && appointment.job.includes("EV ") && appointment.aborted) {
                                hasAbortedEV = true;
                                engineerNonStarter = false;
                            }                                
                        });
                    
                        if (engineerNonStarter && !excludedJobType && !onlyPM) {
                            identifiedEngineersCount++;
                            engineerNamesSet.add(engineerNameElement.textContent.trim() + "  [Non-starter]");
                        } else if (hasUnattendedAM && !excludedJobType) {
                            identifiedEngineersCount++;
                            engineerNamesSet.add(engineerNameElement.textContent.trim() + "  [Unattended AM appointment]");
                        } else if (hasAbortedEV){
                            identifiedEngineersCount++;
                            engineerNamesSet.add(engineerNameElement.textContent.trim() + "  [Aborted EV install - available for jeopardy]");
                        }

                    } 
                });

                const engineerNamesArray = Array.from(engineerNamesSet);
                const namesText = engineerNamesArray.join('\n');

                function copyToClipboardFallback(text) {
                    const tempTextArea = document.createElement('textarea');
                    tempTextArea.value = text;
                    document.body.appendChild(tempTextArea);
                    tempTextArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(tempTextArea);
                }

                copyToClipboardFallback(namesText);  
                alert(`${identifiedEngineersCount} engineer(s) copied with unattended AM appointments.`);
            },
        });
    });
});

document.getElementById("copyEngineerPM").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
                const bookedBackgroundCSS = "rgb(245, 239, 253)";
                const priorityBackgroundCSS = "rgb(249, 196, 251)";
                const inprogressBackgroundCSS = "rgb(229, 246, 254)";
                const enrouteBackgroundCSS = "rgb(255, 249, 238)";
                const engineerNamesSet = new Set();
                let identifiedEngineersCount = 0;

                const engineers = document.querySelectorAll('li[data-engineer-row]');
                engineers.forEach((engineerElement) => {
                    const engineerNameElement = engineerElement.querySelector('h6, [data-testid="engineer-name"]');
                    const appointmentCards = engineerElement.querySelectorAll('div[aria-label="Clickable appointment card"]');
                    let engineerAppointments = [];

                    if (appointmentCards.length > 0) {
                        appointmentCards.forEach((appointmentCard) => {
                            const jobTitleElement = appointmentCard.querySelector('div > p:first-of-type');
                            const cardBackgroundColor = window.getComputedStyle(appointmentCard).backgroundColor;
                            const appointmentTimeSlot = appointmentCard.getAttribute('data-timeslot');
                            const jobTitle = jobTitleElement?.textContent.trim();
                        
                            if (
                                engineerNameElement.textContent.trim() &&
                                jobTitle &&
                                (cardBackgroundColor === bookedBackgroundCSS || cardBackgroundColor === priorityBackgroundCSS)
                            ) {
                                engineerAppointments.push({
                                    eng: engineerNameElement.textContent.trim(),
                                    job: jobTitle,
                                    slot: appointmentTimeSlot,
                                    status: "unattended",
                                });
                            } else if (cardBackgroundColor === inprogressBackgroundCSS) {
                                engineerAppointments.push({
                                    eng: engineerNameElement.textContent.trim(),
                                    job: jobTitle,
                                    slot: appointmentTimeSlot,
                                    status: "incomplete",
                                });
                            } else if (cardBackgroundColor === enrouteBackgroundCSS) {
                                engineerAppointments.push({
                                    eng: engineerNameElement.textContent.trim(),
                                    job: jobTitle,
                                    slot: appointmentTimeSlot,
                                    status: "enroute",
                                });
                            } else {
                                engineerAppointments.push({
                                    eng: engineerNameElement.textContent.trim(),
                                    job: jobTitle,
                                    slot: appointmentTimeSlot,
                                    status: "complete",
                                });
                            }
                        });

                        let containsLCT = false;
                        let hasEnRouteEV = false;
                        //let hasIncompleteEV = false;
                        let hasUnattendedEV = false;
                        let hasUnattendedMetering = false;

                        for (let appointment of engineerAppointments) {
                            if (appointment.job.includes("Solar ") || appointment.job.includes("Heat Pump ") || appointment.job.includes("EPC ") || appointment.job.includes("Electrode ")) {
                                //containsLCT = true;
                                //break; - don't break so that engineers with slr/hp are still checked for EV & metering
                            } else if (appointment.job.includes("EV ") && appointment.status === "unattended") {
                                hasUnattendedEV = true;
                                break; // Unattended EV so no need to check any other appts
                            } else if (appointment.status === "unattended") {
                                hasUnattendedMetering = true;
                            } else if (appointment.job.includes("EV ") && appointment.status === "enroute") {
                                hasEnRouteEV = true;
                            }
                        }                            

                        if (hasUnattendedEV && !containsLCT) {
                            identifiedEngineersCount++;
                            engineerNamesSet.add(engineerNameElement.textContent.trim() + "  [Unattended EV work]");
                        } else if (hasUnattendedMetering && !containsLCT) {
                            identifiedEngineersCount++;
                            engineerNamesSet.add(engineerNameElement.textContent.trim() + "  [Unattended metering work]");
                        } else if (hasEnRouteEV && !containsLCT) {
                            identifiedEngineersCount++;
                            engineerNamesSet.add(engineerNameElement.textContent.trim() + "  [En-route EV job]");
                        }
                    }
                });

                const engineerNamesArray = Array.from(engineerNamesSet);
                const namesText = engineerNamesArray.join('\n');

                function copyToClipboardFallback(text) {
                    const tempTextArea = document.createElement('textarea');
                    tempTextArea.value = text;
                    document.body.appendChild(tempTextArea);
                    tempTextArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(tempTextArea);
                }

                copyToClipboardFallback(namesText);
                alert(`${identifiedEngineersCount} engineer(s) copied outstanding appointments.`);
            },
        });
    });
});

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
                    const excludedKeywords = ["heat pump ", "solar ", "ev ", "electrode", ];
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
                            tableData += `${jobId}\t${companiesValue}\t${formattedDate}\t${todayDay}\tPlease Confirm Attendance\tJob Status Not Updated\n`;
                        });

                        copyToClipboardFallback(tableData);
                        alert(`${identifiedJobCount} job references with details formatted for the Utilisation sheet copied to clipboard.`);
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
            OES: 'OES (Field)'
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

                const jobElements = document.querySelectorAll('div[data-testid="draggable-job-requirement"], [id^="accordion-:r"]');

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
                    if (id && id.startsWith("accordion-:r")) {
                        const uniqueKey = id.split("accordion-:r")[1]; 

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

document.getElementById("copyUnattendedRefs_metering").addEventListener("click", () => {
    copyUnattendedRefs('metering');
});

//document.getElementById("copyUnattendedRefs_ev").addEventListener("click", () => {
    //copyUnattendedRefs('ev');
//});

const myModal = document.getElementById('myModal')
const myInput = document.getElementById('myInput')