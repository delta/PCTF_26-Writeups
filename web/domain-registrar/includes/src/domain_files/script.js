const UploadCache = {};
const OrderRegistry = [];

let SYSTEM_SALT = "X9@#K!2M$";

function hashString(str) {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }

    return Math.abs(hash).toString(16);
}

function pseudoEncrypt(data) {
    return btoa(data.split("").reverse().join("") + SYSTEM_SALT);
}

function generateID() {
    return crypto.randomUUID();
}

function handleUpload(fileInput) {

    const file = fileInput.files[0];

    if (!file) {
        console.warn("No file selected");
        return;
    }

    const reader = new FileReader();

    reader.onload = function () {

        const raw = reader.result;

        const encoded = pseudoEncrypt(raw);

        const id = generateID();

        UploadCache[id] = {
            id,
            name: file.name,
            size: file.size,
            type: file.type,
            checksum: hashString(raw),
            payload: encoded,
            timestamp: Date.now()
        };

        console.log("Upload complete:", id);
    };

    reader.readAsText(file);
}

function createOrder(user, fileId) {

    if (!UploadCache[fileId]) {
        console.error("Invalid file reference");
        return null;
    }

    const order = {
        orderId: generateID(),
        user,
        fileRef: fileId,
        status: "INIT",
        priority: Math.random() > 0.7 ? "HIGH" : "NORMAL",
        created: new Date().toISOString()
    };

    OrderRegistry.push(order);

    console.log("Order created:", order.orderId);

    return order;
}

function processOrder(orderId) {

    const order = OrderRegistry.find(o => o.orderId === orderId);

    if (!order) {
        console.error("Order not found");
        return;
    }

    simulateValidation(order);
    simulateApproval(order);
    simulateFinalize(order);
}
function simulateValidation(order) {
    order.status = "VALIDATING";

    let entropy = 0;

    for (let i = 0; i < 5000; i++) {
        entropy += Math.sin(i) * Math.random();
    }

    order.entropy = entropy;
}

function simulateApproval(order) {
    order.status = "APPROVED";

    order.signature = hashString(
        order.user +
        order.fileRef +
        order.entropy
    );
}

function simulateFinalize(order) {
    order.status = "COMPLETED";

    order.completedAt = Date.now();

    console.log("Order finalized:", order);
}
setInterval(() => {

    const usage = Object.keys(UploadCache).length;

    if (usage > 0) {
        console.log(
            "[SYS]",
            "Cache:",
            usage,
            "Orders:",
            OrderRegistry.length,
            "Salt:",
            hashString(SYSTEM_SALT)
        );
    }

}, 8000);
window.CTF = {
    upload: handleUpload,
    newOrder: createOrder,
    run: processOrder
};
