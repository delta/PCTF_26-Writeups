document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('multiplier-display');
    const logs = document.getElementById('log-content');
    const inputField = document.getElementById('input-multiplier');
    const btnOverclock = document.getElementById('btn-overclock');
    const btnReset = document.getElementById('btn-reset');
    const btnBe = document.getElementById('btn-be');

    function addLog(msg, color = '#0f0') {
        const time = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.innerHTML = `[${time}] <span style="color:${color}">${msg}</span>`;
        logs.appendChild(entry);
        logs.scrollTop = logs.scrollHeight;
    }

    async function handleResponse(response) {
        if (!response.ok) {
            addLog(`Error: Server responded with status ${response.status}`, "#f00");
            return;
        }
        const result = await response.json();
        
        display.innerText = result.displayValue || "30x";
        display.style.color = result.displayColor || "#0f0";
        addLog(result.message, result.logColor);

        if (result.showBe) {
            btnBe.style.display = "block";
        } else {
            btnBe.style.display = "none";
        }

        if (result.fetchConfig) {
             await fetch('/leConfig', { method: 'POST' });
        }
 
    }

    btnOverclock.addEventListener('click', async () => {
        const val = parseInt(inputField.value);
        if (isNaN(val)) {
            addLog("Invalid input. Please enter a number.", "#ff0");
            return;
        }
        const response = await fetch('/api/overclock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ multiplier: val })
        });
        await handleResponse(response);
    });

    btnReset.addEventListener('click', async () => {
        const response = await fetch('/api/reset', {
            method: 'POST',
        });
        display.innerText = "30x";
        display.style.color = "#0f0";
        inputField.value = 30;
        btnBe.style.display = "none";
        await handleResponse(response);
    });

    btnBe.addEventListener('click', async () => {
        const urlResponse = await fetch("/api/benchmark/url");
        if (!urlResponse.ok) {
            return;
        }
        const urlData = await urlResponse.json();
        const beUrl = urlData.url;
        await fetch(beUrl); 
  });
});
