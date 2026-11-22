/* =====================================================================
   ui.js  -  the parts that appear on EVERY page:
   navbar, footer, bag drawer, login/register popup, and toast messages
   ===================================================================== */

// ---------- Toast (small message at the bottom) ----------
let toastTimer;
function showToast(text) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 2500);
}

// A message to show on the NEXT page (used after logout redirects)
function flash(text) {
  sessionStorage.setItem("kq_flash", text);
}

// ---------- Build the page shell ----------
function buildShell() {
  document.body.insertAdjacentHTML("afterbegin", '<header class="navbar" id="navbar"></header>');
  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <footer class="footer">
      <div class="container footer-inner">
        <span class="display footer-brand">KQ Store</span>
        <p>School project demo. No real payments are made.</p>
      </div>
    </footer>
    <div class="drawer-backdrop" id="drawer-backdrop" data-action="close-cart"></div>
    <aside class="drawer" id="drawer" aria-label="Shopping bag" aria-hidden="true"></aside>
    <div id="modal-root"></div>`
  );
}

// ---------- Navbar ----------
const NAV_LINKS = [
  ["Men", "men"],
  ["Women", "women"],
  ["Kids", "kids"],
  ["Sale", "sale"],
];

function renderNavbar() {
  const user = authService.getSession();
  const count = cart.count();
  const page = document.body.dataset.page;
  const category = new URLSearchParams(location.search).get("cat");

  const links = NAV_LINKS.map(
    ([label, key]) =>
      `<a href="shop.html?cat=${key}"${page === "shop" && category === key ? ' class="active"' : ""}>${label}</a>`
  ).join("");

  // Logged in: greeting + Logout.  Logged out: Sign In + Join Us.
  const account = user
    ? `<a href="profile.html" class="nav-greeting">Hi, ${escapeHtml(user.name.split(" ")[0])}</a>
       <button class="text-btn" data-action="logout">Logout</button>`
    : `<button class="text-btn" data-action="open-login">Sign In</button>
       <button class="pill pill-black pill-sm" data-action="open-register">Join Us</button>`;

  $("#navbar").innerHTML = `
    <div class="container navbar-inner">
      <a href="index.html" class="logo display" aria-label="KQ Store home">KQ Store</a>
      <nav class="nav-links" aria-label="Main">${links}</nav>
      <div class="nav-tools">
        ${account}
        <button class="bag-btn" data-action="open-cart" aria-label="Bag, ${count} items">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          ${count > 0 ? `<span class="bag-badge">${count}</span>` : ""}
        </button>
      </div>
    </div>`;
}

// ---------- Bag drawer ----------
function renderDrawer() {
  const items = cart.items();

  const lines = items
    .map(({ product, size, qty }) => {
      const ids = `data-id="${escapeHtml(product.id)}" data-size="${size}"`;
      return `
      <li class="line">
        <div class="line-img"><img src="${escapeHtml(product.images[0])}" alt="" style="filter:${escapeHtml(product.tint)}"></div>
        <div class="line-info">
          <p class="card-name">${escapeHtml(product.name)}</p>
          <p class="card-meta">${escapeHtml(product.colorway)}</p>
          <p class="card-meta">Size ${size}</p>
          <div class="qty">
            <button data-action="qty-down" ${ids} aria-label="Decrease quantity">−</button>
            <span aria-live="polite">${qty}</span>
            <button data-action="qty-up" ${ids} aria-label="Increase quantity">+</button>
            <button class="text-btn remove" data-action="remove-line" ${ids}>Remove</button>
          </div>
        </div>
        <p class="line-price">${formatPrice(currentPrice(product) * qty)}</p>
      </li>`;
    })
    .join("");

  $("#drawer").innerHTML = `
    <div class="drawer-head">
      <h2 class="display">Bag (${cart.count()})</h2>
      <button class="text-btn" data-action="close-cart" aria-label="Close bag">Close</button>
    </div>
    ${items.length === 0 ? '<p class="empty drawer-empty">Your bag is empty.</p>' : `<ul class="drawer-list">${lines}</ul>`}
    ${
      items.length === 0
        ? ""
        : `<div class="drawer-foot">
            <p class="row"><span>Subtotal</span><strong>${formatPrice(cart.subtotal())}</strong></p>
            <a class="pill pill-black pill-block" href="checkout.html">Checkout</a>
          </div>`
    }`;
}

function openCart() {
  $("#drawer").classList.add("open");
  $("#drawer-backdrop").classList.add("open");
  $("#drawer").setAttribute("aria-hidden", "false");
}
function closeCart() {
  $("#drawer").classList.remove("open");
  $("#drawer-backdrop").classList.remove("open");
  $("#drawer").setAttribute("aria-hidden", "true");
}

function changeQty(id, size, delta) {
  const line = cart.lines().find((l) => l.productId === id && l.size === size);
  if (line) cart.setQty(id, size, line.qty + delta);
}

// ---------- Form helpers (used by the popup AND the checkout page) ----------
// Shows (or clears) the red message under one input
function setFieldError(form, name, message) {
  const input = form.elements[name];
  if (!input) return;
  const field = input.closest(".field");
  field.querySelector(".input-wrap").classList.toggle("has-error", Boolean(message));
  field.querySelector(".field-error").textContent = message || "";
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

// Shows errors for every input inside a .field
function showErrors(form, errors) {
  $$(".field input", form).forEach((input) => setFieldError(form, input.name, errors[input.name] || ""));
}

function setButtonLoading(button, isLoading, text) {
  button.disabled = isLoading;
  button.innerHTML = isLoading ? `<span class="spinner" aria-hidden="true"></span>${text}` : text;
}

// ---------- Login / Register popup ----------
function fieldHtml({ label, name, type = "text", autocomplete = "off", toggle = false }) {
  return `
    <div class="field">
      <label for="auth-${name}">${label}</label>
      <div class="input-wrap">
        <input id="auth-${name}" name="${name}" type="${type}" autocomplete="${autocomplete}">
        ${toggle ? '<button type="button" class="toggle-btn" data-action="toggle-password" aria-pressed="false" aria-label="Show password">Show</button>' : ""}
      </div>
      <p class="field-error" role="alert"></p>
    </div>`;
}

function openAuth(mode) {
  const isRegister = mode === "register";

  $("#modal-root").innerHTML = `
    <div class="modal-backdrop" id="auth-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button class="modal-close" data-action="close-auth" aria-label="Close">×</button>
        <form id="auth-form" novalidate>
          <h2 id="auth-title" class="display modal-title">${isRegister ? "Become a member" : "Your account for everything KQ"}</h2>
          <p class="modal-sub">${isRegister ? "Create your free account to save your orders." : "Sign in to see your profile and orders."}</p>

          ${isRegister ? fieldHtml({ label: "Full name", name: "name", autocomplete: "name" }) : ""}
          ${fieldHtml({ label: "Email", name: "email", type: "email", autocomplete: "email" })}
          ${fieldHtml({ label: "Password", name: "password", type: "password", autocomplete: isRegister ? "new-password" : "current-password", toggle: true })}
          ${isRegister ? fieldHtml({ label: "Confirm password", name: "confirm", type: "password", autocomplete: "new-password", toggle: true }) : ""}

          <p class="form-error" id="auth-form-error" role="alert"></p>
          <button class="pill pill-black pill-block" type="submit" id="auth-submit">${isRegister ? "Join Us" : "Sign In"}</button>

          <p class="modal-switch">
            ${isRegister ? "Already a member?" : "Not a member?"}
            <button type="button" class="link-btn" data-action="${isRegister ? "open-login" : "open-register"}">${isRegister ? "Sign in" : "Join us"}</button>
          </p>
        </form>
      </div>
    </div>`;

  document.body.style.overflow = "hidden"; // stop the page behind from scrolling
  const form = $("#auth-form");
  $("input", form).focus();

  form.addEventListener("submit", (e) => submitAuth(e, isRegister));

  // Typing clears that field's error
  form.addEventListener("input", (e) => {
    setFieldError(form, e.target.name, "");
    $("#auth-form-error").textContent = "";
  });

  // Leaving a field checks it (only if the person typed something)
  form.addEventListener("focusout", (e) => {
    if (!e.target.name || !e.target.value) return;
    const found = validateAuth(Object.fromEntries(new FormData(form)), isRegister);
    setFieldError(form, e.target.name, found[e.target.name] || "");
  });
}

function closeAuth() {
  $("#modal-root").innerHTML = "";
  document.body.style.overflow = "";
}

async function submitAuth(e, isRegister) {
  e.preventDefault();
  const form = e.target;
  const values = { name: "", email: "", password: "", confirm: "", ...Object.fromEntries(new FormData(form)) };

  const errors = validateAuth(values, isRegister);
  showErrors(form, errors);
  if (Object.keys(errors).length > 0) {
    const firstBad = $(".has-error input", form);
    if (firstBad) firstBad.focus();
    return;
  }

  const button = $("#auth-submit");
  const idleText = button.textContent;
  setButtonLoading(button, true, isRegister ? "Creating account…" : "Signing in…");

  try {
    const session = isRegister ? await authService.register(values) : await authService.login(values);
    const firstName = session.name.split(" ")[0];
    closeAuth();
    showToast(isRegister ? `Welcome, ${firstName}! Your account is ready.` : `Welcome back, ${firstName}!`);
  } catch (err) {
    if (err.field) setFieldError(form, err.field, err.message);
    else $("#auth-form-error").textContent = err.message || "Something went wrong. Please try again.";
    setButtonLoading(button, false, idleText);
  }
}

// ---------- Click handling for every button with data-action ----------
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const { action, id } = el.dataset;
  const size = Number(el.dataset.size);

  if (action === "open-cart") openCart();
  if (action === "close-cart") closeCart();
  if (action === "open-login") openAuth("login");
  if (action === "open-register") openAuth("register");
  if (action === "close-auth") closeAuth();

  if (action === "toggle-password") {
    const input = el.previousElementSibling;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    el.textContent = show ? "Hide" : "Show";
    el.setAttribute("aria-pressed", String(show));
    el.setAttribute("aria-label", show ? "Hide password" : "Show password");
  }

  if (action === "qty-down" || action === "qty-up" || action === "remove-line") {
    if (action === "remove-line") cart.remove(id, size);
    else changeQty(id, size, action === "qty-up" ? 1 : -1);
    // Keep keyboard focus on the same button after the drawer redraws
    $(`[data-action="${action}"][data-id="${id}"][data-size="${size}"]`)?.focus();
  }

  if (action === "logout") {
    await authService.logout();
    if (document.body.dataset.page === "profile") {
      flash("You have been signed out.");
      location.href = "index.html";
    } else {
      showToast("You have been signed out.");
    }
  }
});

// Click on the dark area outside the popup closes it
document.addEventListener("mousedown", (e) => {
  if (e.target.id === "auth-backdrop") closeAuth();
});

// Escape closes the popup and the bag
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  closeAuth();
  closeCart();
});

// ---------- Keep the page up to date ----------
document.addEventListener("auth:changed", renderNavbar);
document.addEventListener("cart:changed", () => {
  renderNavbar();
  renderDrawer();
});

// Login/logout or bag changes made in another browser tab
window.addEventListener("storage", (e) => {
  if (e.key === SESSION_KEY) emit("auth:changed");
  if (e.key === CART_KEY) emit("cart:changed");
});

// ---------- Start ----------
buildShell();
renderNavbar();
renderDrawer();

const pendingMessage = sessionStorage.getItem("kq_flash");
if (pendingMessage) {
  showToast(pendingMessage);
  sessionStorage.removeItem("kq_flash");
}
