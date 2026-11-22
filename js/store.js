/* =====================================================================
   store.js  -  helpers + "services" (products, accounts, bag, orders)
   Everything is saved in the browser's localStorage. No server needed.

   Want a real backend later? Only the functions in this file need to change.
   ===================================================================== */

// ---------- Small helpers ----------
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const emit = (eventName) => document.dispatchEvent(new Event(eventName)); // tell the page something changed

// Always escape text that came from a user before putting it inside HTML
function escapeHtml(value) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value).replace(/[&<>"']/g, (c) => map[c]);
}

const formatPrice = (n) => "₱" + Number(n).toLocaleString("en-PH");
const currentPrice = (product) => product.salePrice || product.price;

const CATEGORY_LABEL = {
  men: "Men's Basketball Shoes",
  women: "Women's Basketball Shoes",
  kids: "Kids' Basketball Shoes",
};

// ---------- localStorage wrappers (never crash if storage is blocked) ----------
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    /* storage full or blocked: ignore */
  }
}
function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    /* ignore */
  }
}

// ---------- Backend connection ----------
// Change this if your server runs on another port (for example 3001)
const API_URL = "http://localhost:3000/api";
const TOKEN_KEY = "kq_token";

// Talks to the server. Sends the login token automatically.
async function api(path, options = {}) {
  const token = load(TOKEN_KEY, null);
  let res;
  try {
    res = await fetch(API_URL + path, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new AuthError("Cannot reach the server. Is `node server.js` running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errors = data.errors || null;
    throw new AuthError(data.error || "Something went wrong.", errors ? Object.keys(errors)[0] : undefined, errors);
  }
  return data;
}

// ---------- Validation ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Each function returns an object like { email: "message" }. Empty object = all good.
function validateAuth(values, isRegister) {
  const errors = {};

  if (isRegister && values.name.trim().length < 2) {
    errors.name = "Enter your name (at least 2 characters).";
  }

  if (!values.email.trim()) errors.email = "Enter your email.";
  else if (!EMAIL_RE.test(values.email.trim())) errors.email = "Enter a valid email address.";

  if (!values.password) errors.password = "Enter your password.";
  else if (isRegister && values.password.length < 8) errors.password = "Password must be at least 8 characters.";

  if (isRegister) {
    if (!values.confirm) errors.confirm = "Confirm your password.";
    else if (values.confirm !== values.password) errors.confirm = "Passwords do not match.";
  }
  return errors;
}

function validateCheckout(v) {
  const errors = {};
  if (v.name.trim().length < 2) errors.name = "Enter your full name.";
  if (!EMAIL_RE.test(v.email.trim())) errors.email = "Enter a valid email address.";
  if (v.phone.replace(/\D/g, "").length < 7) errors.phone = "Enter a valid phone number.";
  if (v.address.trim().length < 5) errors.address = "Enter your full address.";
  if (v.payment === "card") {
    if (v.cardNumber.replace(/\D/g, "").length !== 16) errors.cardNumber = "Enter a 16-digit card number.";
    if (v.cardName.trim().length < 2) errors.cardName = "Enter the name on the card.";
  }
  return errors;
}

// ---------- Products ----------
// Starts with the sample list from data.js, then swaps in the real list from the server.
const PRODUCTS_KEY = "kq_products";
let productList = load(PRODUCTS_KEY, null) || SEED_PRODUCTS;

function getProducts() {
  return productList;
}

// pages.js waits for this before drawing the page. If the server is off, we keep the sample list.
const productsReady = api("/products")
  .then((data) => {
    productList = data.products;
    save(PRODUCTS_KEY, productList);
  })
  .catch(() => {});

function getProduct(id) {
  return getProducts().find((p) => p.id === id) || null;
}

// ---------- Accounts (login / register) ----------
const USERS_KEY = "kq_users";
const SESSION_KEY = "kq_session";

// An error that can point at one form field (for example "email")
class AuthError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

const wait = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

function startSession(user, token) {
  const session = { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
  save(TOKEN_KEY, token);
  save(SESSION_KEY, session);
  emit("auth:changed");
  return session;
}

const authService = {
  getSession() {
    return load(SESSION_KEY, null);
  },

  async register({ name, email, password, confirm }) {
    const data = await api("/auth/register", { method: "POST", body: { name, email, password, confirm } });
    return startSession(data.user, data.token);
  },

  async login({ email, password }) {
    const data = await api("/auth/login", { method: "POST", body: { email, password } });
    return startSession(data.user, data.token);
  },

  async logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch (error) {
      /* even if the server is off, sign out here */
    }
    remove(TOKEN_KEY);
    remove(SESSION_KEY);
    emit("auth:changed");
  },
};

// ---------- Shopping bag ----------
const CART_KEY = "kq_cart";
const MAX_QTY = 10;

// The bag only saves { productId, size, qty }. Names and prices come from the product list.
const cart = {
  lines() {
    return load(CART_KEY, []);
  },
  items() {
    const products = getProducts();
    return this.lines()
      .map((line) => ({ ...line, product: products.find((p) => p.id === line.productId) }))
      .filter((line) => line.product);
  },
  count() {
    return this.items().reduce((sum, l) => sum + l.qty, 0);
  },
  subtotal() {
    return this.items().reduce((sum, l) => sum + currentPrice(l.product) * l.qty, 0);
  },
  _save(lines) {
    save(CART_KEY, lines);
    emit("cart:changed");
  },
  add(productId, size, qty = 1) {
    const lines = this.lines();
    const found = lines.find((l) => l.productId === productId && l.size === size);
    if (found) found.qty = Math.min(found.qty + qty, MAX_QTY);
    else lines.push({ productId, size, qty });
    this._save(lines);
  },
  setQty(productId, size, qty) {
    const lines = this.lines()
      .map((l) => (l.productId === productId && l.size === size ? { ...l, qty: Math.min(qty, MAX_QTY) } : l))
      .filter((l) => l.qty > 0);
    this._save(lines);
  },
  remove(productId, size) {
    this._save(this.lines().filter((l) => !(l.productId === productId && l.size === size)));
  },
  clear() {
    this._save([]);
  },
};

// ---------- Orders ----------
// The server calculates prices and saves the order.
async function placeOrder(payload) {
  return api("/orders", { method: "POST", body: payload });
}
async function fetchMyOrders() {
  const data = await api("/orders");
  return data.orders;
}
