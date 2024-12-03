document.addEventListener('DOMContentLoaded', function() {
    // Function to unhide the correct element based on the current page's URL
    function checkPageUrl() {
        // Query the active tab in the current window
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            const currentTab = tabs[0];
            const currentUrl = currentTab.url;

            // The scheduling page URL to match
            const schedulingUrlPattern = /^https:\/\/field\.oes-prod\.energy\/scheduling.*/;

            // Check if the current URL matches the scheduling page pattern
            if (schedulingUrlPattern.test(currentUrl)) {
                // If the URL matches, unhide the scheduling page div
                document.getElementById('schedulingpage').style.display = 'block';
                document.getElementById('error').style.display = 'none';
            } else {
                // Otherwise, unhide the error div
                document.getElementById('error').style.display = 'block';
                document.getElementById('schedulingpage').style.display = 'none';
            }
        });
    }

    // Run the checkPageUrl function when the popup is loaded
    checkPageUrl();
});

// Function to trigger copying all booked engineers
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
                            //identifiedEngineersCount++;
                        }
                    });
                    if (hasUnattended) {
                        identifiedEngineersCount++;
                    }
                });

                const engineerNamesArray = Array.from(engineerNamesSet);
                const namesText = engineerNamesArray.join('\n');

                // Fallback mechanism for clipboard copy if navigator.clipboard.writeText fails
                function copyToClipboardFallback(text) {
                    const tempTextArea = document.createElement('textarea');
                    tempTextArea.value = text;
                    document.body.appendChild(tempTextArea);
                    tempTextArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(tempTextArea);
                }

                copyToClipboardFallback(namesText);  // Fallback in case of error
                alert(`${identifiedEngineersCount} engineer(s) copied.`);

                // Try navigator.clipboard.writeText; fallback to execCommand if it fails
                //navigator.clipboard.writeText(namesText)
                //    .then(() => {
                //        console.log('Engineer names copied:', engineerNamesArray);
                //        alert(`${identifiedEngineersCount} engineer(s) copied.`);
                //    })
                //    .catch((err) => {
                //        console.error('Failed to copy engineer names:', err);
                //        copyToClipboardFallback(namesText);  // Fallback in case of error
                //        alert(`${identifiedEngineersCount} engineer(s) copied (fallback).`);
                //    });
            }
        });
    });
});

// Function to trigger copying engineers based on time period (AM/PM)
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
                                //console.log(engineerNameElement.textContent.trim() + " excluded for LCT");  // If any LCT job is found, log "LCT" and return early
                                containsLCT = true;
                                return;  // Skip further checks for this appointment
                            }

                            // Loop through the appointment details to assess the "unattended" status and "slot" field
                            engineerAppointments.forEach(appointment => {
                                if (appointment.attended === false && appointment.slot === timePeriod) {
                                    hasUnattendedAM = true;  // Set flag if unattended and matches timePeriod
                                }
                                
                                if (appointment.attended === true) {
                                    engineerNonStarter = false;  // Mark that there are some true unattended appointments
                                }

                                if (appointment.attended === false && (appointment.slot === "AM" || appointment.slot === "AD")) {
                                    onlyPM = false;  // not a non starter if PM appointment is assigned
                                }
                            });
                        });

                        //console.table(engineerAppointments);

                        if (engineerNonStarter && !containsLCT && !onlyPM) {
                            identifiedEngineersCount++;
                            engineerNamesSet.add(engineerNameElement.textContent.trim() + " [NON STARTER]");
                            //console.log(engineerNameElement.textContent.trim() + " NON STARTER");
                        } else if (hasUnattendedAM && !containsLCT) {
                            identifiedEngineersCount++;
                            engineerNamesSet.add(engineerNameElement.textContent.trim());
                            //console.log(engineerNameElement.textContent.trim() + " Unattended AM");
                        }

                    } else{
                        //console.log(engineerNameElement.textContent.trim() + " has no jobs assigned.");
                    }
                });

                const engineerNamesArray = Array.from(engineerNamesSet);
                const namesText = engineerNamesArray.join('\n');

                // Fallback mechanism for clipboard copy if navigator.clipboard.writeText fails
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
                console.log(`${identifiedEngineersCount} engineer(s) copied with unattended ${timePeriod} appointments.`);

                // Try navigator.clipboard.writeText; fallback to execCommand if it fails
                //navigator.clipboard.writeText(namesText)
                //    .then(() => {
                //        console.log(`Engineer names for ${timePeriod} copied:`, engineerNamesArray);
                //        alert(`${identifiedEngineersCount} engineer(s) copied for ${timePeriod}.`);
                //    })
                //    .catch((err) => {
                //        console.error(`Failed to copy engineer names for ${timePeriod}:`, err);
                //        copyToClipboardFallback(namesText);  // Fallback in case of error
                //        alert(`${identifiedEngineersCount} engineer(s) copied for ${timePeriod} (fallback).`);
                //    });
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



// AM button event listener
document.getElementById("copyBookedEngineerNamesByTimeAM").addEventListener("click", () => {
    copyBookedEngineerNamesByTime('AM');
});


const myModal = document.getElementById('myModal')
const myInput = document.getElementById('myInput')

myModal.addEventListener('shown.bs.modal', () => {
  myInput.focus()
})
