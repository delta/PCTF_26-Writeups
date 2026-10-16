# Shadow Fight XSS Challenge

## Note!
This chal had an many unintended solutions where any payload could just escape the validation functions. So shadow fight is an upgraded version of this challenge.

## Application Behavior

When an admin views a submitted profile, client-side JavaScript injects the flag into the page:

```js
const shadow = container.attachShadow({ mode: 'closed' });
shadow.innerHTML = `<p style="opacity:0">${flag}</p>`;
```

Non-admin users receive a redacted value instead.

## XSS Entry Point

User input is rendered using `innerHTML`:

```js
nameEl.innerHTML = name;
```

The validation logic attempts to block XSS but we can break our way through.

Another intersting fact is that name length is limited to 50 characters.
So we cannot use the Shadow DOM breaking code within this limit. We'll have to find another way.

Intended solution is to take advantage of another controlled variable avatar, so we can just `eval(avatar)`

## Execution Primitive

A minimal and reliable execution gadget:

```html
<img src=x onerror='eval(avatar)'>
```

## JavaScript Disguised as a URL

The avatar field must resemble a URL but is later evaluated as JavaScript.

This is valid JavaScript:

```js
https://picsum.photos/100#comment
```

Interpretation:
- `https:` → label
- `//picsum.photos/100#comment` → comment

To execute code after the comment, a **Unicode Line Separator (U+2028)** is inserted.  
The validator blocks `\n` and `\r`, but not U+2028.

```js
https://picsum.photos/100#<U+2028>payload
```

## Keyword Filter Bypasses

Blocked substrings include `fetch`, `window`, and `document`.

Bypasses used:
- `self` instead of `window`
- String concatenation to evade substring filters
- `Reflect.get()` instead of direct property access

Example:

```js
Reflect.get(self, 'fet'+'ch')
```

## Extracting Data from a Closed Shadow DOM

Closed shadow DOMs prevent direct access, but browser text search ignores this.

```js
self.find('p_ctf{');
```

`window.find()` searches all rendered text, including closed shadow DOMs, and creates a selection.

Extend the selection:

```js
Reflect.get(self,'getSe'+'lection')()
  .modify('extend','forward','line');
```

Read the selected text:

```js
Reflect.get(self,'getSe'+'lection')().toString()
```

This yields the full flag.

## Exploit Flow

1. Submit profile with crafted bio and avatar
2. Admin bot visits the profile
3. IMG `onerror` executes `eval(avatar)`
4. Unicode line separator escapes the URL comment
5. Payload runs in admin context
6. `window.find()` locates the flag inside closed shadow DOM
7. Selection API extracts the full flag
8. Flag is exfiltrated


## Final exploit
checkout exploid.md