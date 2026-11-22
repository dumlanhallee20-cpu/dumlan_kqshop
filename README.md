# KQ Store (plain HTML, CSS and JavaScript)

A Nike-inspired shoe store. No React, no npm, no server. Accounts, the bag and orders are saved in your browser (`localStorage`).

## Run it

**Easiest:** open the folder in VS Code, right-click `index.html`, and choose **Open with Live Server** (install the "Live Server" extension first).

You can also double-click `index.html`. It works from a file too.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Home: hero banner and featured shoes |
| `shop.html` | All shoes, category tabs (Men / Women / Kids / Sale), sorting |
| `product.html` | One shoe: photos, sizes, Add to Bag |
| `checkout.html` | Delivery details, payment, order summary |
| `profile.html` | Your account and past orders |

Login and Register are a popup that opens from the navbar (Sign In / Join Us) on every page.

## Files

```
css/style.css     all the design
js/data.js        the sample products
js/store.js       saving data: products, accounts, bag, orders, validation
js/ui.js          navbar, footer, bag drawer, login/register popup (every page)
js/pages.js       code for each page
images/           product photos
```

## How login works

- Register checks the name, email format, password (8+ characters), matching confirm password, and duplicate emails.
- Sign in shows clear messages, a loading state, and a Show/Hide password button.
- The navbar updates right away after login or logout.
- Passwords are saved as salted hashes, never as plain text. It's still a demo, because real sites hash on a server.

## Change the products

Edit `js/data.js`, then raise `SEED_VERSION` by 1 so browsers load the new list.

## Reset everything

Open the browser console and run `localStorage.clear()`, then reload.

## Later: a real backend

Only `js/store.js` saves data. Replace its functions with `fetch()` calls to your server and the rest of the site keeps working.
