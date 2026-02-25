/* 
 * script.js
 * Property of College
 * Users attempting malicious activities will be prosecuted.
 */


function showError(msg, elementId = "errorBox") {
    const errorBox = document.getElementById(elementId);
    if (errorBox) {
        errorBox.classList.remove("hidden");
        errorBox.textContent = msg;
    } else {
        alert(msg);
    }
}

window.onload = async function() {
    if (document.getElementById("profileCard")) {
        await fetchStatus();
    } else if (document.getElementById("queueCount")) {
        initPrintPage();
    }
};
let currentRollNumber = null;

async function fetchStatus() {
    try {
        const response = await fetch('/hallticket');
        const data = await response.json();

        if (data.error) {
            showError(data.error);
            return;
        }
        currentRollNumber = data.roll;
        updateDisplay(data);
    } catch (e) {
        showError("Failed to connect to server.");
    }
}

// User roll number attendance check
async function verifyEligibility() {
    if (!currentRollNumber) return;
    const btn = document.getElementById("verifyBtn");
    btn.disabled = true;
    btn.innerText = "Verifying...";

    try {
        const response = await fetch('/hallticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roll: currentRollNumber }) 
        });

        const data = await response.json();
        if (data.error) showError(data.error);
        else updateDisplay(data);

    } catch (e) {
        showError("Verification failed.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Verify Eligibility";
    }
}

function updateDisplay(data) {
    const card = document.getElementById("profileCard");
    const downloadBtn = document.getElementById("downloadBtn");
    const errorBox = document.getElementById("errorBox");
    
    errorBox.classList.add("hidden");
    card.classList.remove("hidden");

    document.getElementById("displayRoll").textContent = data.roll;
    document.getElementById("displayAttendance").textContent = data.attendance + "%";
    
    const statusSpan = document.getElementById("displayStatus");

    if (data.eligible) {
        statusSpan.textContent = "ELIGIBLE";
        statusSpan.className = "badge success";
        downloadBtn.classList.remove("hidden");
    } else {
        statusSpan.textContent = "NOT ELIGIBLE";
        statusSpan.className = "badge error";
        downloadBtn.classList.add("hidden");
    }
}

function downloadTicket() {
    window.location.href = "/download-ticket"; 
}

let queueInterval = null;

function initPrintPage() {
    checkQueue();
    queueInterval = setInterval(checkQueue, 5000);
}

async function checkQueue() {
    // postgres
    try {
        const qResponse = await fetch('/queue-status');
        const qData = await qResponse.json();
        
        const queueCard = document.querySelector(".queue-status-card");
        if (qData.count !== undefined) {
            queueCard.style.display = "block"; 
            document.getElementById("queueCount").innerText = qData.count;
            document.getElementById("queueMsg").innerText = qData.message;
            if (qData.msg) {
                document.getElementById("responseSection").classList.remove("hidden");
                document.getElementById("response").innerText = qData.msg;
                document.getElementById("uploadSection").classList.add("hidden");
                // 16.
                if (queueInterval) clearInterval(queueInterval);
            }
        } else if (qData.error !== undefined) {
            document.getElementById("responseSection").classList.remove("hidden");
            document.getElementById("response").innerText = qData.error;
        } else {
            queueCard.style.display = "none";
            // 4
        }
        
    } catch (e) {
        console.log("Printer error", e);
    }
}

async function uploadPDF() {
    const fileInput = document.getElementById("pdfInput");
    const statusDiv = document.getElementById("uploadStatus");
    const btn = document.getElementById("uploadBtn");

    if (fileInput.files.length === 0) {
        alert("Please select a PDF file.");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]); 

    btn.disabled = true;
    btn.innerText = "Uploading...";
    statusDiv.classList.remove("hidden");
    statusDiv.style.color = "#64748b";

    try {
        const response = await fetch('/print-upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            statusDiv.innerText = "✅ " + data.status; 
            statusDiv.style.color = "green";
        } else {
            statusDiv.innerText = "❌ " + data.error;
            statusDiv.style.color = "red";
        }

    } catch (e) {
        statusDiv.innerText = "❌ Upload Failed";
    } finally {
        btn.disabled = false;
        btn.innerText = "Upload & Print";
    }
}
