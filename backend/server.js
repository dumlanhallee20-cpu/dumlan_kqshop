/* =====================================================================
   KQ Store backend - zero dependencies (needs Node 18+).
   Run:  node server.js     ->  http://localhost:3000
   Single file: products are built in below. Users, sessions and orders
   are saved to db.json (created next to this file on first use).
   ===================================================================== */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "db.json");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_QTY = 10;

// ---------- Tiny JSON "database" ----------
function loadDb() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return { users: [], sessions: [], orders: [] };
  }
}
function saveDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
// ---------- Products (edit this list to change the shop) ----------
const PRODUCTS = [
  {
    "id": "kq63-neon-pink",
    "name": "Padidas Adizero Select 3.0 KQ63",
    "category": "men",
    "colorway": "Neon Pink / White / Lime Green",
    "price": 5800,
    "featured": true,
    "images": [
      "images/shoe-pink.png",
      "images/shoe-laces.png"
    ],
    "tint": "none",
    "sizes": [
      6,
      6.5,
      7,
      7.5,
      8,
      8.5,
      9,
      9.5,
      10,
      10.5,
      11,
      11.5
    ],
    "description": "Basketball shoe from the Kevin Quiambao × Quiccs collaboration, in a neon pink upper with white stripes and a lime green midsole."
  },
  {
    "id": "kq63-court-blue",
    "name": "Padidas Adizero Select 3.0 KQ63",
    "category": "men",
    "colorway": "Court Blue / White",
    "price": 5800,
    "salePrice": 4640,
    "featured": true,
    "images": [
      "images/shoe-pink.png"
    ],
    "tint": "hue-rotate(250deg)",
    "sizes": [
      6,
      6.5,
      7,
      7.5,
      8,
      8.5,
      9,
      9.5,
      10,
      10.5,
      11,
      11.5
    ],
    "description": "The KQ63 in a cool court-blue colorway. Same fit and feel, different look."
  },
  {
    "id": "kq63-solar-orange",
    "name": "Padidas Adizero Select 3.0 KQ63",
    "category": "men",
    "colorway": "Solar Orange / White",
    "price": 5800,
    "featured": true,
    "images": [
      "images/shoe-pink.png"
    ],
    "tint": "hue-rotate(50deg)",
    "sizes": [
      6,
      6.5,
      7,
      7.5,
      8,
      8.5,
      9,
      9.5,
      10,
      10.5,
      11,
      11.5
    ],
    "description": "A bold orange colorway of the KQ63 for players who like to stand out."
  },
  {
    "id": "kq63-wmns-pink",
    "name": "Padidas Adizero Select 3.0 KQ63 W",
    "category": "women",
    "colorway": "Neon Pink / White",
    "price": 5400,
    "featured": true,
    "images": [
      "images/shoes-pair.png",
      "images/shoe-pink.png"
    ],
    "tint": "none",
    "sizes": [
      5,
      5.5,
      6,
      6.5,
      7,
      7.5,
      8,
      8.5,
      9,
      9.5
    ],
    "description": "Women's fit of the KQ63 in the signature neon pink colorway."
  },
  {
    "id": "kq63-wmns-lime",
    "name": "Padidas Adizero Select 3.0 KQ63 W",
    "category": "women",
    "colorway": "Lime / White",
    "price": 5400,
    "images": [
      "images/shoe-pink.png"
    ],
    "tint": "hue-rotate(130deg)",
    "sizes": [
      5,
      5.5,
      6,
      6.5,
      7,
      7.5,
      8,
      8.5,
      9,
      9.5
    ],
    "description": "Women's fit of the KQ63 in a fresh lime colorway."
  },
  {
    "id": "kq63-wmns-violet",
    "name": "Padidas Adizero Select 3.0 KQ63 W",
    "category": "women",
    "colorway": "Violet / White",
    "price": 5400,
    "salePrice": 4320,
    "images": [
      "images/shoe-pink.png"
    ],
    "tint": "hue-rotate(290deg)",
    "sizes": [
      5,
      5.5,
      6,
      6.5,
      7,
      7.5,
      8,
      8.5,
      9,
      9.5
    ],
    "description": "Women's fit of the KQ63 in a deep violet colorway."
  },
  {
    "id": "kq63-kids-pink",
    "name": "Padidas Adizero Select 3.0 KQ63 Kids",
    "category": "kids",
    "colorway": "Neon Pink / White",
    "price": 3200,
    "images": [
      "images/shoe-pink.png"
    ],
    "tint": "none",
    "sizes": [
      3,
      3.5,
      4,
      4.5,
      5,
      5.5,
      6,
      6.5
    ],
    "description": "Kids' version of the KQ63 so the next generation can play in style."
  },
  {
    "id": "kq63-kids-sky",
    "name": "Padidas Adizero Select 3.0 KQ63 Kids",
    "category": "kids",
    "colorway": "Sky Blue / White",
    "price": 3200,
    "salePrice": 2560,
    "images": [
      "images/shoe-pink.png"
    ],
    "tint": "hue-rotate(250deg)",
    "sizes": [
      3,
      3.5,
      4,
      4.5,
      5,
      5.5,
      6,
      6.5
    ],
    "description": "Kids' KQ63 in a bright sky-blue colorway."
  }
];
const getProducts = () => PRODUCTS;
const currentPrice = (p) => p.salePrice || p.price;

// ---------- Helpers ----------
class HttpError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors; // optional { field: "message" }
  }
}

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) reject(new HttpError(413, "Body too large."));
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new HttpError(400, "Body must be valid JSON."));
      }
    });
  });
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt });

// Reads "Authorization: Bearer <token>" and returns the user (or null)
function getUser(req, db) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const session = db.sessions.find((s) => s.token === token);
  return session ? db.users.find((u) => u.id === session.userId) || null : null;
}

function requireUser(user) {
  if (!user) throw new HttpError(401, "Sign in required. Send header: Authorization: Bearer <token>");
  return user;
}

// ---------- Validation (same rules as your store.js) ----------
function validateAuth(v, isRegister) {
  const e = {};
  const str = (x) => (typeof x === "string" ? x : "");
  if (isRegister && str(v.name).trim().length < 2) e.name = "Enter your name (at least 2 characters).";
  if (!str(v.email).trim()) e.email = "Enter your email.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (!str(v.password)) e.password = "Enter your password.";
  else if (isRegister && v.password.length < 8) e.password = "Password must be at least 8 characters.";
  if (isRegister && v.confirm !== undefined && v.confirm !== v.password) e.confirm = "Passwords do not match.";
  return e;
}

function validateCheckout(v) {
  const e = {};
  const str = (x) => (typeof x === "string" ? x : "");
  if (str(v.name).trim().length < 2) e.name = "Enter your full name.";
  if (!EMAIL_RE.test(str(v.email).trim())) e.email = "Enter a valid email address.";
  if (str(v.phone).replace(/\D/g, "").length < 7) e.phone = "Enter a valid phone number.";
  if (str(v.address).trim().length < 5) e.address = "Enter your full address.";
  if (!["cod", "card"].includes(v.payment)) e.payment = 'Payment must be "cod" or "card".';
  if (v.payment === "card") {
    if (str(v.cardNumber).replace(/\D/g, "").length !== 16) e.cardNumber = "Enter a 16-digit card number.";
    if (str(v.cardName).trim().length < 2) e.cardName = "Enter the name on the card.";
  }
  return e;
}

// ---------- Route handlers ----------
const routes = [];
const route = (method, pattern, handler) => {
  const regex = new RegExp("^" + pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "/?$");
  routes.push({ method, regex, handler });
};

route("GET", "/api/health", () => ({ status: 200, body: { ok: true, time: new Date().toISOString() } }));

// ----- Products -----
// GET /api/products?category=men|women|kids|sale&sort=low|high
route("GET", "/api/products", ({ query }) => {
  const cat = query.get("category") || "all";
  const sort = query.get("sort");
  let list = getProducts().filter((p) => {
    if (cat === "all") return true;
    if (cat === "sale") return Boolean(p.salePrice);
    return p.category === cat;
  });
  if (query.get("featured") === "true") list = list.filter((p) => p.featured);
  if (sort === "low") list.sort((a, b) => currentPrice(a) - currentPrice(b));
  if (sort === "high") list.sort((a, b) => currentPrice(b) - currentPrice(a));
  return { status: 200, body: { count: list.length, products: list } };
});

route("GET", "/api/products/:id", ({ params }) => {
  const product = getProducts().find((p) => p.id === params.id);
  if (!product) throw new HttpError(404, "Product not found.");
  return { status: 200, body: product };
});

// ----- Auth -----
// POST /api/auth/register  { name, email, password, confirm? }
route("POST", "/api/auth/register", ({ body, db }) => {
  const errors = validateAuth(body, true);
  if (Object.keys(errors).length) throw new HttpError(400, "Validation failed.", errors);

  const email = body.email.trim().toLowerCase();
  if (db.users.some((u) => u.email === email)) {
    throw new HttpError(409, "An account with this email already exists.", { email: "Email already used." });
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const user = {
    id: crypto.randomBytes(8).toString("hex"),
    name: body.name.trim(),
    email,
    salt,
    passwordHash: hashPassword(body.password, salt),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  const token = crypto.randomBytes(24).toString("hex");
  db.sessions.push({ token, userId: user.id });
  return { status: 201, body: { token, user: publicUser(user) }, save: true };
});

// POST /api/auth/login  { email, password }
route("POST", "/api/auth/login", ({ body, db }) => {
  const errors = validateAuth(body, false);
  if (Object.keys(errors).length) throw new HttpError(400, "Validation failed.", errors);

  const user = db.users.find((u) => u.email === body.email.trim().toLowerCase());
  if (!user || hashPassword(body.password, user.salt) !== user.passwordHash) {
    throw new HttpError(401, "Incorrect email or password.");
  }
  const token = crypto.randomBytes(24).toString("hex");
  db.sessions.push({ token, userId: user.id });
  return { status: 200, body: { token, user: publicUser(user) }, save: true };
});

// GET /api/auth/me   (Bearer token)
route("GET", "/api/auth/me", ({ user }) => ({ status: 200, body: { user: publicUser(requireUser(user)) } }));

// POST /api/auth/logout   (Bearer token)
route("POST", "/api/auth/logout", ({ req, user, db }) => {
  requireUser(user);
  const token = req.headers.authorization.slice(7);
  db.sessions = db.sessions.filter((s) => s.token !== token);
  return { status: 200, body: { message: "Signed out." }, save: true };
});

// ----- Orders -----
// POST /api/orders   (Bearer token is optional: no token = guest order)
// { items:[{productId,size,qty}], name,email,phone,address, payment:"cod"|"card", cardNumber?, cardName? }
route("POST", "/api/orders", ({ body, user, db }) => {
  const errors = validateCheckout(body);
  if (!Array.isArray(body.items) || body.items.length === 0) errors.items = "Your bag is empty.";
  if (Object.keys(errors).length) throw new HttpError(400, "Validation failed.", errors);

  const products = getProducts();
  const lines = body.items.map((item, i) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new HttpError(400, `Item ${i + 1}: unknown productId "${item.productId}".`);
    const size = Number(item.size);
    if (!product.sizes.includes(size)) throw new HttpError(400, `Item ${i + 1}: size ${item.size} is not available.`);
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new HttpError(400, `Item ${i + 1}: qty must be a whole number from 1 to ${MAX_QTY}.`);
    }
    // Price comes from the server, never from the client
    return { productId: product.id, name: product.name, colorway: product.colorway, size, qty, price: currentPrice(product) };
  });

  const order = {
    id: "KQ-" + crypto.randomInt(10000, 100000),
    userId: user ? user.id : null,
    date: new Date().toISOString(),
    lines,
    total: lines.reduce((sum, l) => sum + l.price * l.qty, 0),
    // we never store the full card number
    payment: body.payment === "card" ? "Card ending " + body.cardNumber.replace(/\D/g, "").slice(-4) : "Cash on delivery",
    shipTo: { name: body.name.trim(), email: body.email.trim(), phone: body.phone.trim(), address: body.address.trim() },
  };
  db.orders.unshift(order);
  return { status: 201, body: order, save: true };
});

// GET /api/orders   (Bearer token) - your orders
route("GET", "/api/orders", ({ user, db }) => {
  requireUser(user);
  const orders = db.orders.filter((o) => o.userId === user.id);
  return { status: 200, body: { count: orders.length, orders } };
});

// GET /api/orders/:id   (Bearer token) - one of your orders
route("GET", "/api/orders/:id", ({ params, user, db }) => {
  requireUser(user);
  const order = db.orders.find((o) => o.id === params.id && o.userId === user.id);
  if (!order) throw new HttpError(404, "Order not found.");
  return { status: 200, body: order };
});

// ---------- Website files ----------
// Put server.js in a "backend" folder inside your project and the site is served from the folder above it.
const SITE_DIR = path.resolve(__dirname, "..");
const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".gif": "image/gif",
};

function serveSite(pathname, res) {
  const clean = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const file = path.resolve(SITE_DIR, "." + clean);
  const inSite = file.startsWith(SITE_DIR + path.sep);
  const inBackend = file.startsWith(__dirname + path.sep) || file === __dirname;
  const type = MIME[path.extname(file).toLowerCase()];
  if (!inSite || inBackend || !type || !fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  res.writeHead(200, { "Content-Type": type });
  fs.createReadStream(file).pipe(res);
  return true;
}

// ---------- Server ----------
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});

  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    for (const r of routes) {
      const match = r.regex.exec(url.pathname);
      if (r.method !== req.method || !match) continue;

      const db = loadDb();
      const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readBody(req) : {};
      const result = await r.handler({
        req, db, body,
        params: match.groups || {},
        query: url.searchParams,
        user: getUser(req, db),
      });
      if (result.save) saveDb(db);
      return send(res, result.status, result.body);
    }
    // Not an API route: serve the website files (the folder above backend/)
    if (req.method === "GET" && !url.pathname.startsWith("/api")) {
      if (serveSite(url.pathname, res)) return;
    }
    throw new HttpError(404, `No route for ${req.method} ${url.pathname}`);
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message, errors: err.errors });
    console.error(err);
    send(res, 500, { error: "Something went wrong on the server." });
  }
});

server.listen(PORT, () => console.log(`KQ Store running at http://localhost:${PORT}  (website + API)`));
