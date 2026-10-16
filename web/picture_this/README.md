# Picture This Challenge

## Given files:
- Entire source code
- Hint: Is the CDN endpoint perfect? Does it serve all images well?
- Hint: What happens if the page already defines things the admin bot (and helper script) expects to create?

## Goal:

- Looking through the code, the flag is rendered server-side in the profile page if the profile is rendered.
- So the goal is to get verified.
- Players can send verification review by clicking a button which will cause an admin bot to check for profanity/violence/nsfw in avatar (atleast as mentioned in the comments)
- The bot goes to `/_image/uuid.png?uid=1` and inserts a helper script which injects a form so it can easily click submit button to review
- The bot is programmed to always reject any verifications

## Exploit Summary

The challenge exploits a chain of subtle but realistic mistakes:

- Parser differences between image validation and content delivery.
- A JPEG polyglot that is valid as an image but rendered as HTML.
- DOM clobbering to influence privileged client-side logic (the website has strict CSP rules, so XSS is not an option)
- An admin bot that blindly trusts the DOM and auto-submits forms.

By abusing these together, an attacker can trick the admin bot into performing a privileged action (verification) without executing JavaScript or bypassing CSP.

## Core Bug: JPEG + HTML Parsing

### JPEG decoders:

Parse until the FFD9 (EOI) marker.
Ignore any trailing bytes.
This means a file like below is totally valid:
`[valid JPEG][arbitrary data]`

### HTML parsers:

Are tolerant of leading garbage.
Will happily parse valid markup appearing later in the file.

### Consequence

If a JPEG is:
Accepted as an image by upload validation
Served as text/html by the CDN
Then any HTML appended after the JPEG will be parsed into the DOM.

## Admin Bot behaviour

```
const uid = new URLSearchParams(location.search).get("uid");

if (uid) {
    document.body.innerHTML += `
    <form id="vf">
      <input type="checkbox" name="action" value="verify" />
      <input type="submit" />
    </form>`;
}

if (!window.config) {
    window.config = { adminCanVerify: false }
}

const form = document.getElementById("vf")
form.addEventListener("submit", handleSubmit)

// handleSubmit will check if window.config.adminCanVerify is true and form.action is checked and then POST the request
```

## Observations

- `document.getElementById("vf")` form is retrived using `getElementById` which generally selects the first element with matching ID. So this can be manipulated by HTML
- `window.config` only initialised if it doesn't exist already. i.e. DOM clobbering is possible

## Final exploit
checkout exploid.md