console.log("Adding submit buttons")
const q = new URLSearchParams(
    window.location.search.startsWith("?")
        ? window.location.search.slice(1)
        : window.location.search,
);
const uid = q.get("uid");

if (uid) {
    document.body.innerHTML += `
    <form id="vf"">
    <h1>
        Message for admin: do not verify anyone, just reject for now.
    </h1>
    <input type="checkbox" name="action" value="verify" />
    <input type="submit" />
    </form>
    `;
}

if (!window.config) {
    window.config = {
        adminCanVerify: false
    }
}

const form = document.getElementById("vf")
form.addEventListener("submit", handleSubmit)

function handleSubmit(e) {
    e.preventDefault()

    const adminAction = e.target.action.value
    let action = adminAction
    if (!window.config.canAdminVerify) {
        action = "reject"
    }

    console.log('adminAction', adminAction, action)

    const data = new URLSearchParams()
    data.set("action", action)

    fetch("/admin/reviews/"+uid, {
        method: "POST",
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        credentials: "include",
        body: data
    })
}
