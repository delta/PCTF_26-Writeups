
const tiers = {
    vip:     { id: 'vip', name: 'VIP', price: 900, color: 'var(--seat-vip)' },
    premium: { id: 'premium', name: 'Premium', price: 350, color: 'var(--seat-premium)' },
    pro:     { id: 'pro', name: 'Pro', price: 150, color: 'var(--seat-pro)' },
    regular: { id: 'regular', name: 'Regular', price: 60, color: 'var(--seat-regular)' }
};

const addBtn = document.getElementById('add-btn');
const cartItemsEl = document.getElementById('cart-items');
const totalPriceEl = document.getElementById('total-price');
let cart = [];

async function initDropdowns() {
    try {
        const response = await fetch('/api/seats');
        if (!response.ok) throw new Error("Failed to load seats");
        const seats = await response.json();

        seats.forEach(seat => {
            let tierKey = seat.zone.toLowerCase(); 
            if (!tiers[tierKey]) return; 

            const tier = tiers[tierKey];
            const selectEl = document.getElementById(`select-${tierKey}`);
            
            const option = document.createElement('option');
            option.innerText = `${seat.id} - ${seat.status}`;
            

            if (seat.status === "Sold Out") {
                option.disabled = true;
                option.style.color = "#999"; 
            } else {
                option.value = JSON.stringify({ 
                    id: seat.id, 
                    tierId: tier.id,
                    tierName: tier.name, 
                    price: tier.price,
                    color: tier.color 
                });
                option.innerText = seat.id; 
            }
            
            selectEl.appendChild(option);
        });

    } catch (err) {
        console.error("Error fetching seats:", err);
        alert("Could not load seat map. Please refresh.");
    }
}

window.clearOthers = function(activeId) {
    Object.keys(tiers).forEach(key => {
        if (key !== activeId) {
            document.getElementById(`select-${key}`).value = "";
        }
    });
}
addBtn.addEventListener('click', () => {
    let selectedValue = null;
    let activeSelectEl = null;

    ['vip', 'premium', 'pro', 'regular'].forEach(id => {
        const el = document.getElementById(`select-${id}`);
        if (el.value) {
            selectedValue = el.value;
            activeSelectEl = el;
        }
    });

    if (!selectedValue) {
        alert("Please select a seat.");
        return;
    }

    const seatData = JSON.parse(selectedValue);
    cart.push(seatData);

    const optionToDisable = activeSelectEl.querySelector(`option[value='${selectedValue.replace(/"/g, '\\"')}']`); // Escape quotes for selector
    if (optionToDisable) {
        optionToDisable.disabled = true;
        optionToDisable.innerText += " (In Cart)";
    }

    activeSelectEl.value = "";
    renderCart();
});

window.removeFromCart = function(seatId, tierId) {
    cart = cart.filter(s => s.id !== seatId);
    const selectEl = document.getElementById(`select-${tierId}`);
    Array.from(selectEl.options).forEach(opt => {
        if (opt.value && opt.value.includes(`"id":"${seatId}"`)) {
            opt.disabled = false;
            opt.innerText = seatId; // Reset text
        }
    });

    renderCart();
}

function renderCart() {
    cartItemsEl.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsEl.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">No seats selected</p>';
    } else {
        cart.forEach(item => {
            total += item.price;
            const el = document.createElement('div');
            el.className = 'cart-item';
            el.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:10px; height:10px; border-radius:50%; background:${item.color};"></div>
                    <strong>${item.id}</strong> <span style="font-size:0.8em; color:#666;">(${item.tierName})</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span>$${item.price}</span>
                    <button onclick="removeFromCart('${item.id}', '${item.tierId}')" style="background:none; border:none; color:red; cursor:pointer;">✕</button>
                </div>
            `;
            cartItemsEl.appendChild(el);
        });
    }
    totalPriceEl.innerText = '$' + total;
}
window.checkout = async function() {
    if (cart.length === 0) {
        alert("Cart is empty!");
        return;
    }

    const btn = document.querySelector('.checkout-btn');
    const originalText = btn.innerText;
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        const resp = await fetch('/api/buy', { method: 'POST' });
    } catch (err) {
        alert(err.message);
    } finally {
      window.location.href = 'checkout.html';
    }
}

initDropdowns();