
// app.js

document.addEventListener("DOMContentLoaded", () => {
  
  //  retrieve domains
    const domainListContainer = document.querySelector('.domain-list');
    if (domainListContainer) {
        fetchDomains(domainListContainer);
    }
  // get kycform
    const kycForm = document.getElementById('kycForm');
    if (kycForm) {
        handleKycUpload(kycForm);
    }
});

function fetchDomains(container) {
    container.innerHTML = '<p style="text-align:center;">Loading domains...</p>';
  fetch('avlbl.php?action=get_domains')
      // get all the domains that the user owns 
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            data.forEach(item => {
                container.appendChild(createDomainCard(item));
            });
        })
      // const ep = "avlbl.php?list=
        .catch(err => {
            container.innerHTML = '<p style="color:red; text-align:center;">Error loading domains.</p>';
        });
  
}

function createDomainCard(item) {
    const card = document.createElement('div');
    card.className = 'domain-card';
    const isAvailable = item.status === 'Available';
    const statusColor = isAvailable ? 'green' : 'red';
    const statusText = isAvailable ? '✅ Available' : '❌ Taken';
    const btnClass = isAvailable ? 'btn-primary' : 'btn-primary disabled';
    const buyLink = isAvailable ? `kyc.html?domain=${item.domain}` : '#';
    
    card.innerHTML = `
        <span class="domain-name">${item.domain}</span>
        <div class="actions">
            <span style="color: ${statusColor}; margin-right: 15px; font-weight: bold;">
                ${statusText}
            </span>
            <a href="${buyLink}" class="${btnClass}">Buy Now</a>
        </div>
    `;
    return card;
}

function handleKycUpload(form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = "Verifying...";
        
      // upload image endpoint
        fetch('kyc.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "error") {
                alert(data.message);
                submitBtn.disabled = false;
                submitBtn.innerText = "Verify & Continue";
            } else {
                // Just redirect. No checking.
                const encodedMsg = encodeURIComponent(data.message);
                window.location.href = `checkout.html?msg=${encodedMsg}`;
            }
        })
        .catch(err => {
            alert("Upload failed.");
            submitBtn.disabled = false;
            submitBtn.innerText = "Verify & Continue";
        });
    });
}