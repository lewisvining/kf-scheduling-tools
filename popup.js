function compareVersions(v1, v2) {
    const parseVersion = (version) => version.split('.').map(Number);
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
                // Current version is newer
                document.getElementById('versionNotice').textContent = 'Experimental';
                versionNotice.style.fontStyle = 'italic';
                document.getElementById('versionNotice').style.display = 'block';
            } else if (comparison < 0) {
                // Current version is older
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
                const modeSelect = document.getElementById("modeSelect");
                const modeDisplay = document.getElementById("kfstmodepill");
                // Load saved mode from storage and update span
                chrome.storage.sync.get("kfstMode", (data) => {
                    const savedMode = data.kfstMode || "metering"; // Default to "Metering" if nothing is saved

                    modeSelect.value = savedMode;
                    if (savedMode === "metering") {
                        modeDisplay.textContent = "Metering";
                    } else if (savedMode === "ev_chargers") {
                        modeDisplay.textContent = "EV Chargers";
                    }

                    if (savedMode == "metering") {
                        document.getElementById('schedulingpageM').style.display = 'block';
                        document.getElementById('schedulingpageEV').style.display = 'none';
                    }   else if (savedMode == "ev_chargers") {
                        document.getElementById('schedulingpageM').style.display = 'none';
                        document.getElementById('schedulingpageEV').style.display = 'block';
                    }
                });
                
                document.getElementById('error').style.display = 'none';
                if (currentUrl.includes("companies=OES")) {
                    //NBSIbutton.classList.add("btn-outline-primary");
                    //NBSIbutton.classList.remove("btn-outline-secondary", "disabled");
                  } else {
                    //NBSIbutton.classList.add("btn-outline-secondary", "disabled");
                    //NBSIbutton.classList.remove("btn-outline-primary");
                    //const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
                    //const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
                  }
            } else {
                document.getElementById('error').style.display = 'block';
                document.getElementById('openSettings').style.display = 'none';
                document.getElementById('schedulingpage').style.display = 'none';
            }
        });
    }
    checkPageUrl();

    // Update storage and span when the mode is changed
    modeSelect.addEventListener("change", () => {
        const selectedMode = modeSelect.value;
        const modeDisplay = document.getElementById("kfstmodepill");
        chrome.storage.sync.set({ kfstMode: selectedMode }, () => {
            console.log(`Mode set to: ${selectedMode}`);
            if (selectedMode == "metering") {
                document.getElementById('schedulingpageM').style.display = 'block';
                document.getElementById('schedulingpageEV').style.display = 'none';
            }   else if (selectedMode == "ev_chargers") {
                document.getElementById('schedulingpageM').style.display = 'none';
                document.getElementById('schedulingpageEV').style.display = 'block';
            }
        });

        if (selectedMode === "metering") {
            modeDisplay.textContent = "Metering";
        } else if (selectedMode === "ev_chargers") {
            modeDisplay.textContent = "EV Chargers";
        }
    });
    
});

document.getElementById("copyAllBookedEngineerNames").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
                const bookedBackgroundCSS = "rgb(245, 239, 253)";
                const priorityBackgroundCSS = "rgb(249, 196, 251)";
                const engineerNamesSet = new Set();
                let identifiedEngineersCount = 0;

                const engineers = document.querySelectorAll('li[data-engineer-row]');
                engineers.forEach((engineerElement) => {
                    const engineerNameElement = engineerElement.querySelector('h6, [data-testid="engineer-name"]');
                    const appointmentCards = engineerElement.querySelectorAll('div[aria-label="Clickable appointment card"]');
                    let hasUnattended = false;

                    appointmentCards.forEach((appointmentCard) => {
                        const jobTitleElement = appointmentCard.querySelector('div > p:first-of-type');
                        const cardBackgroundColor = window.getComputedStyle(appointmentCard).backgroundColor;
                        const name = engineerNameElement?.textContent.trim();
                        const jobTitle = jobTitleElement?.textContent.trim();

                        if (
                            name && jobTitle &&
                            (cardBackgroundColor === bookedBackgroundCSS || cardBackgroundColor === priorityBackgroundCSS) &&
                            !jobTitle.includes('EV ') && !jobTitle.includes('Solar ') && !jobTitle.includes('Heat Pump ')
                        ) {
                            engineerNamesSet.add(name);
                            hasUnattended = true;
                        }
                    });
                    if (hasUnattended) {
                        identifiedEngineersCount++;
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
                alert(`${identifiedEngineersCount} engineer(s) copied.`);
            }
        });
    });
});

function amChase(extensionMode) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (extensionMode) => {
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

                        let containsLCT = false;
                        let engineerNonStarter = true;
                        let hasUnattendedAM = false;
                        let hasAbortedEV = false;
                        let onlyPM = true;

                        if (extensionMode == "metering") {
                            engineerAppointments.forEach(appointment => {
                                if (appointment.job.includes("EV ") || appointment.job.includes("Solar ") || appointment.job.includes("Heat Pump ")) {
                                    containsLCT = true;
                                    return;  // Skip further checks for this appointment
                                }
                                
                                engineerAppointments.forEach(appointment => {
                                    if (appointment.attended === false && appointment.slot === "AM") {
                                        hasUnattendedAM = true;  
                                    }
                                    
                                    if (appointment.attended === true) {
                                        engineerNonStarter = false;  
                                    }
    
                                    if (appointment.attended === false && (appointment.slot === "AM" || appointment.slot === "AD")) {
                                        onlyPM = false;
                                    }
                                });
                            });
    
                            if (engineerNonStarter && !containsLCT && !onlyPM) {
                                identifiedEngineersCount++;
                                engineerNamesSet.add(engineerNameElement.textContent.trim() + " [NON STARTER]");
                            } else if (hasUnattendedAM && !containsLCT) {
                                identifiedEngineersCount++;
                                engineerNamesSet.add(engineerNameElement.textContent.trim());
                            }
                        } else if (extensionMode === "ev_chargers") {
                            for (let appointment of engineerAppointments) {
                                if (appointment.job.includes("Solar ") || appointment.job.includes("Heat Pump ")) {
                                    containsLCT = true;
                                    break; // contains HP or Solar, so exit the outer loop
                                }
                                //console.table(appointment);
                                for (let appointment of engineerAppointments) {
                                    if (appointment.job.includes("EV ") && appointment.attended && !appointment.aborted) {
                                        engineerNonStarter = false; // Engineer has started a second EV job on timeline
                                        break; // Exit the outer loop
                                    }

                                    if (appointment.attended && !appointment.aborted) {
                                        engineerNonStarter = false; // Has an attended job, exit
                                        break; // Exit the outer loop
                                    } else if (appointment.job.includes("EV ") && !appointment.attended && !appointment.aborted) {
                                        engineerNonStarter = true;
                                    } else if (!appointment.attended && appointment.slot === "AM") {
                                        hasUnattendedAM = true; // Unattended metering AM
                                    } else if (appointment.job.includes("EV ") && appointment.aborted){
                                        hasAbortedEV = true;
                                        engineerNonStarter = false;
                                    }
                                }
                            }                            
    
                            if (engineerNonStarter && !containsLCT) {
                                identifiedEngineersCount++;
                                engineerNamesSet.add(engineerNameElement.textContent.trim() + " [EV Non-Starter]");
                            } else if (hasUnattendedAM && !containsLCT) {
                                identifiedEngineersCount++;
                                engineerNamesSet.add(engineerNameElement.textContent.trim() + " [Outstanding AM]");
                            } else if (hasAbortedEV && !containsLCT) {
                                identifiedEngineersCount++;
                                engineerNamesSet.add(engineerNameElement.textContent.trim() + " [Aborted EV - Available for Jeopardy]");
                            }
                        }
                        
                        

                    } else{
                        //console.log(engineerNameElement.textContent.trim() + " has no jobs assigned.");
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

                copyToClipboardFallback(namesText);  // Fallback in case of error
                if (extensionMode == "metering") {
                    alert(`${identifiedEngineersCount} engineer(s) copied with unattended AM metering appointments.`);
                    //console.lo g(`${identifiedEngineersCount} engineer(s) copied with unattended ${extensionMode} appointments.`);
                } else if (extensionMode == "ev_chargers") {
                    alert(`${identifiedEngineersCount} EV engineer(s) copied with unattended or aborted appointments.`);
                }
            },
            args: [extensionMode]
        });
    });
}

document.getElementById("copyEngineerPM_ev").addEventListener("click", () => {
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
                            } 
                            else {
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
                        let hasIncompleteEV = false;
                        let hasUnattendedEV = false;

                        for (let appointment of engineerAppointments) {
                            if (appointment.job.includes("Solar ") || appointment.job.includes("Heat Pump ")) {
                                containsLCT = true;
                                break; // contains HP or Solar, so exit the outer loop
                            }
                            for (let appointment of engineerAppointments) {
                                if (appointment.job.includes("EV ") && appointment.status === "unattended") {
                                    hasUnattendedEV = true; // Has an unattended job, exit
                                    break; // Exit the outer loop
                                } else if (appointment.job.includes("EV ") && appointment.status === "incomplete") {
                                    hasIncompleteEV = true;
                                } else if (appointment.job.includes("EV ") && appointment.status === "enroute") {
                                    hasEnRouteEV = true;
                                }
                            }
                        }                            

                        if (hasUnattendedEV && !containsLCT) {
                            identifiedEngineersCount++;
                            engineerNamesSet.add(engineerNameElement.textContent.trim() + " [Unattended EV Job]");
                        } else if (hasIncompleteEV && !containsLCT) {
                            identifiedEngineersCount++;
                            engineerNamesSet.add(engineerNameElement.textContent.trim() + " [Incomplete EV Job]");
                        } else if (hasEnRouteEV && !containsLCT) {
                            identifiedEngineersCount++;
                            engineerNamesSet.add(engineerNameElement.textContent.trim() + " [En-Route EV Job]");
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

                copyToClipboardFallback(namesText);  // Fallback in case of error
                alert(`${identifiedEngineersCount} EV engineer(s) copied with incomplete or aborted appointments.`);
            },
        });
    });
});

document.getElementById("jeopardyForm").addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent form from refreshing page

    const selectedFilter = document.getElementById("jobFilter").value;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (filter) => {
                const jobsData = [];
                const dateRegex = /^\d{1,2} [A-Za-z]{3}$/;

                const jobElements = document.querySelectorAll('div[data-testid="draggable-job-requirement"]');

                jobElements.forEach((jobElement) => {
                    const jobTitleElement = jobElement.querySelector('div > div > div:nth-of-type(1) > p:nth-of-type(1)');
                    const jobSkillsElement = jobElement.querySelector('div > div > div:nth-of-type(1) > p:nth-of-type(3)');
                    const jobRefElement = jobElement.querySelector('div > div > div:nth-of-type(2) > div:nth-of-type(1) > p:nth-of-type(1)');
                    const jobPostcodeElement = jobElement.querySelector('div > div > div:nth-of-type(2) > div:nth-of-type(2) > p:nth-of-type(1)');
                    const jobTimeSlotElement = jobElement.querySelector('div > div > div:nth-of-type(2) > div:nth-of-type(3) > p:nth-of-type(1)');

                    const jobTitle = jobTitleElement?.textContent.trim() || "";
                    const jobSkills = jobSkillsElement?.textContent.trim() || "";
                    const jobRef = jobRefElement?.textContent.trim() || "";
                    const jobPostcode = jobPostcodeElement?.textContent.trim() || "";
                    const jobTimeSlot = jobTimeSlotElement?.textContent.trim() || "";

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
                        (filter === "ev" && jobTitle.includes("EV ")) ||
                        (filter === "hp" && jobTitle.includes("Heat Pump ")) ||
                        (filter === "solar" && jobTitle.includes("Solar "));

                    if (includeJob) {
                        jobsData.push({
                            postcode: jobPostcode,
                            reference: jobRef,
                            jobtype: jobTitle,
                            date: jobDate + " " + jobTimeSlot,
                            skills: jobSkills || "",
                        });
                    }
                });

                if (jobsData.length === 0) {
                    alert("No jobs found in the scheduling window.");
                    return;
                }

                console.table(jobsData);

                const jobDataText = jobsData
                    .map(job => `${job.postcode}\t${job.reference}\t${job.jobtype}\t${job.date}\t${job.skills}`)
                    .join('\n');

                function copyToClipboardFallback(text) {
                    const tempTextArea = document.createElement('textarea');
                    tempTextArea.value = text;
                    document.body.appendChild(tempTextArea);
                    tempTextArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(tempTextArea);
                }

                copyToClipboardFallback(jobDataText);
                alert(`${jobsData.length} job(s) copied to clipboard.`);
            },
            args: [selectedFilter]
        });
    });
});

document.getElementById("copyUnattendedRefs").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
                const bookedBackgroundCSS = "rgb(245, 239, 253)";
                const priorityBackgroundCSS = "rgb(249, 196, 251)";
                const abortedBackgroundCSS = "rgb(233, 233, 236)";
                const jobrefRegex = /^J-[A-Z0-9]{8}$/; // Regex for "J-" followed by 8 alphanumeric characters
                const postcodeRegex = /^[A-Z]{1,2}[0-9][0-9A-Z]? [0-9][A-Z]{2}$/i; // Strict regex for UK postcodes
                const excludedKeywords = ["heat pump ", "solar ", "ev "];
                const jobIdsSet = new Set();
                let identifiedJobCount = 0;

                const engineers = document.querySelectorAll('li[data-engineer-row]');
                engineers.forEach((engineerElement) => {
                    const appointmentCards = engineerElement.querySelectorAll('div[aria-label="Clickable appointment card"]');
                    
                    const excludedPostcodes = [];
                    //console.log("Processing engineer...");

                    appointmentCards.forEach((appointmentCard) => {
                        const cardBackgroundColor = window.getComputedStyle(appointmentCard).backgroundColor;
                        const jobTitleElement = appointmentCard.querySelector('div > p:first-of-type');
                        const jobTitle = jobTitleElement?.textContent.trim().toLowerCase() || "";

                        let jobPostcode = "";
                        const pElements = appointmentCard.querySelectorAll('p');
                        
                        // Find the postcode in <p> elements
                        pElements.forEach((pElement) => {
                            const pText = pElement.textContent.trim();
                            if (postcodeRegex.test(pText)) {
                                jobPostcode = pText; // Save the strictly matched postcode
                                //console.log(`Found postcode: ${jobPostcode}`);
                            }
                        });

                        //console.log("Card details:", { jobTitle, jobPostcode, cardBackgroundColor });

                        // Exclusion for on site reraises - assumed when an aborted appointment matches postcode of booked
                        if (cardBackgroundColor === abortedBackgroundCSS) {
                            if (jobPostcode) {
                                //console.log(`Adding postcode ${jobPostcode} to excluded list due to aborted status.`);
                                excludedPostcodes.push(jobPostcode);
                            }
                            return; // Skip processing this card
                        }

                        // Exclusion for LCT jobs & log postcode to ignore NBSI's and on site raises
                        if (excludedKeywords.some(keyword => jobTitle.includes(keyword))) {
                            if (jobPostcode) {
                                //console.log(`Excluding postcode ${jobPostcode} due to title: "${jobTitle}"`);
                                excludedPostcodes.push(jobPostcode);
                            }
                            return; // Skip processing this card
                        }

                        // Skip cards with postcodes in the excluded list (nbsis & onsite reraises)
                        if (excludedPostcodes.includes(jobPostcode)) {
                            //console.log(`Skipping job with postcode ${jobPostcode} as it's in the excluded list.`);
                            return;
                        }

                        // Process valid cards
                        if (cardBackgroundColor === bookedBackgroundCSS || cardBackgroundColor === priorityBackgroundCSS) {
                            pElements.forEach((pElement) => {
                                const textContent = pElement.textContent.trim();
                                if (jobrefRegex.test(textContent)) {
                                    console.log(`Adding job ID: ${textContent}`);
                                    jobIdsSet.add(textContent);
                                    identifiedJobCount++;
                                }
                            });
                        }
                    });

                    console.log("Excluded postcodes for this engineer:", excludedPostcodes);
                });

                const jobIdsArray = Array.from(jobIdsSet);
                const jobIdsText = jobIdsArray.join('\n');

                if (jobIdsArray.length === 0) {
                    alert("No unattended appointments found on this page.");
                    return;
                }

                function copyToClipboardFallback(text) {
                    const tempTextArea = document.createElement('textarea');
                    tempTextArea.value = text;
                    document.body.appendChild(tempTextArea);
                    tempTextArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(tempTextArea);
                }

                copyToClipboardFallback(jobIdsText);
                alert(`${identifiedJobCount} unattended job references copied.`);
            }
        });
    });
});


// AM button event listener
document.getElementById("copyEngineerAM_metering").addEventListener("click", () => {
    amChase('metering');
});

document.getElementById("copyEngineerAM_ev").addEventListener("click", () => {
    amChase('ev_chargers');
});


const myModal = document.getElementById('myModal')
const myInput = document.getElementById('myInput')