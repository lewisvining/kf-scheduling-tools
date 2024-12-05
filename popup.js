document.addEventListener('DOMContentLoaded', function() {
    function checkPageUrl() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            const currentTab = tabs[0];
            const currentUrl = currentTab.url;

            const schedulingUrlPattern = /^https:\/\/field\.oes-prod\.energy\/scheduling.*/;

            if (schedulingUrlPattern.test(currentUrl)) {
                document.getElementById('schedulingpage').style.display = 'block';
                document.getElementById('error').style.display = 'none';
            } else {
                document.getElementById('error').style.display = 'block';
                document.getElementById('schedulingpage').style.display = 'none';
            }
        });
    }
    checkPageUrl();
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

function copyBookedEngineerNamesByTime(timePeriod) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (timePeriod) => {
                const bookedBackgroundCSS = "rgb(245, 239, 253)";
                const priorityBackgroundCSS = "rgb(249, 196, 251)";
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
                                engineerNameElement.textContent.trim() && jobTitle &&
                                (cardBackgroundColor === bookedBackgroundCSS || cardBackgroundColor === priorityBackgroundCSS)) {
                                engineerAppointments.push({
                                    eng: engineerNameElement.textContent.trim(),
                                    job: jobTitle,
                                    slot: appointmentTimeSlot,
                                    attended: false
                                });
                            } else {
                                engineerAppointments.push({
                                    eng: engineerNameElement.textContent.trim(),
                                    job: jobTitle,
                                    slot: appointmentTimeSlot,
                                    attended: true
                                });
                            }
                        });

                        let containsLCT = false;
                        let engineerNonStarter = true;
                        let hasUnattendedAM = false;
                        let onlyPM = true;
                        
                        engineerAppointments.forEach(appointment => {
                            if (appointment.job.includes("EV ") || appointment.job.includes("Solar ") || appointment.job.includes("Heat Pump ")) {
                                containsLCT = true;
                                return;  // Skip further checks for this appointment
                            }

                            engineerAppointments.forEach(appointment => {
                                if (appointment.attended === false && appointment.slot === timePeriod) {
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
                alert(`${identifiedEngineersCount} engineer(s) copied with unattended ${timePeriod} appointments.`);
                //console.log(`${identifiedEngineersCount} engineer(s) copied with unattended ${timePeriod} appointments.`);
            },
            args: [timePeriod]
        });
    });
}

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
                    alert("No jobs found matching the selected criteria.");
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
                const matchingPattern = /^J-[A-Z0-9]{8}$/; // Regex for "J-" followed by 8 alphanumeric characters
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

                        console.log("Card details:", { jobTitle, jobPostcode, cardBackgroundColor });

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
                                console.log(`Excluding postcode ${jobPostcode} due to title: "${jobTitle}"`);
                                excludedPostcodes.push(jobPostcode);
                            }
                            return; // Skip processing this card
                        }

                        // Skip cards with postcodes in the excluded list (nbsis & onsite reraises)
                        if (excludedPostcodes.includes(jobPostcode)) {
                            console.log(`Skipping job with postcode ${jobPostcode} as it's in the excluded list.`);
                            return;
                        }

                        // Process valid cards
                        if (cardBackgroundColor === bookedBackgroundCSS || cardBackgroundColor === priorityBackgroundCSS) {
                            pElements.forEach((pElement) => {
                                const textContent = pElement.textContent.trim();
                                if (matchingPattern.test(textContent)) {
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
                    alert("No matching job IDs found.");
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
document.getElementById("copyBookedEngineerNamesByTimeAM").addEventListener("click", () => {
    copyBookedEngineerNamesByTime('AM');
});


const myModal = document.getElementById('myModal')
const myInput = document.getElementById('myInput')