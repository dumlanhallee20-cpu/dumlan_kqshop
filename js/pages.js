/* =====================================================================
   pages.js  -  the code for each page (home, shop, product, checkout, profile)
   Each <body> has data-page="..." which tells us which function to run.
   ===================================================================== */

// ---------- Shared: product cards ----------
function productCardHtml(p) {
  const price = p.salePrice
    ? `<span class="price-sale">${formatPrice(p.salePrice)}</span><span class="price-old">${formatPrice(p.price)}</span>`
    : formatPrice(p.price);

  return `
    <a class="card" href="product.html?id=${encodeURIComponent(p.id)}">
      <div class="card-media">
        <img src="${escapeHtml(p.images[0])}" alt="${escapeHtml(p.name)}" style="filter:${escapeHtml(p.tint)}" loading="lazy">
        ${p.salePrice ? '<span class="badge">Sale</span>' : ""}
      </div>
      <div class="card-body">
        <p class="card-name">${escapeHtml(p.name)}</p>
        <p class="card-meta">${CATEGORY_LABEL[p.category]}</p>
        <p class="card-meta">${escapeHtml(p.colorway)}</p>
        <p class="card-price">${price}</p>
      </div>
    </a>`;
}

function productGridHtml(list) {
  return list.length === 0 ? '<p class="empty">No products found.</p>' : list.map(productCardHtml).join("");
}

// ---------- HOME ----------
function initHome() {
  $("#featured-grid").innerHTML = productGridHtml(getProducts().filter((p) => p.featured));
}

// ---------- SHOP ----------
function initShop() {
  const TABS = [["all", "All"], ["men", "Men"], ["women", "Women"], ["kids", "Kids"], ["sale", "Sale"]];
  const TITLES = { all: "All Shoes", men: "Men's Shoes", women: "Women's Shoes", kids: "Kids' Shoes", sale: "Sale" };

  let category = new URLSearchParams(location.search).get("cat") || "all";
  if (!TITLES[category]) category = "all";

  $("#shop-title").textContent = TITLES[category];
  $("#shop-tabs").innerHTML = TABS.map(
    ([key, label]) =>
      `<a class="tab${key === category ? " active" : ""}" href="${key === "all" ? "shop.html" : "shop.html?cat=" + key}">${label}</a>`
  ).join("");

  function draw() {
    let list = getProducts().filter((p) => {
      if (category === "all") return true;
      if (category === "sale") return Boolean(p.salePrice);
      return p.category === category;
    });

    const sort = $("#sort").value;
    if (sort === "low") list.sort((a, b) => currentPrice(a) - currentPrice(b));
    if (sort === "high") list.sort((a, b) => currentPrice(b) - currentPrice(a));

    $("#shop-grid").innerHTML = productGridHtml(list);
  }

  $("#sort").addEventListener("change", draw);
  draw();
}

// ---------- PRODUCT ----------
function initProduct() {
  const root = $("#product");
  const product = getProduct(new URLSearchParams(location.search).get("id"));

  if (!product) {
    root.innerHTML = `
      <h1 class="display page-title">Product not found</h1>
      <p class="empty"><a class="more-link" href="shop.html">Back to shop</a></p>`;
    return;
  }

  document.title = `${product.name} | KQ Store`;
  const tint = escapeHtml(product.tint);
  let selectedSize = null;

  const discount = product.salePrice ? Math.round((1 - product.salePrice / product.price) * 100) : 0;
  const price = product.salePrice
    ? `<span class="price-sale">${formatPrice(product.salePrice)}</span><span class="price-old">${formatPrice(product.price)}</span><span class="discount">${discount}% off</span>`
    : formatPrice(product.price);

  const thumbs =
    product.images.length > 1
      ? `<div class="thumbs">${product.images
          .map(
            (img, i) =>
              `<button class="thumb${i === 0 ? " active" : ""}" data-src="${escapeHtml(img)}" aria-label="Show image ${i + 1}"><img src="${escapeHtml(img)}" alt="" style="filter:${tint}"></button>`
          )
          .join("")}</div>`
      : "";

  const sizes = product.sizes
    .map((s) => `<button class="size-btn" data-size="${s}" aria-pressed="false">${s}</button>`)
    .join("");

  root.innerHTML = `
    <div class="pdp">
      <div class="gallery">
        ${thumbs}
        <div class="stage"><img id="stage-img" src="${escapeHtml(product.images[0])}" alt="${escapeHtml(product.name)}" style="filter:${tint}"></div>
      </div>

      <div class="pdp-info">
        <p class="card-meta">${CATEGORY_LABEL[product.category]}</p>
        <h1 class="pdp-title">${escapeHtml(product.name)}</h1>
        <p class="card-meta">${escapeHtml(product.colorway)}</p>
        <p class="pdp-price">${price}</p>

        <p class="label">Select size</p>
        <div class="size-grid">${sizes}</div>
        <p class="form-error" id="size-error" role="alert"></p>

        <button class="pill pill-black pill-block" id="add-to-bag">Add to Bag</button>
        <p class="desc">${escapeHtml(product.description)}</p>
      </div>
    </div>`;

  root.addEventListener("click", (e) => {
    const thumb = e.target.closest(".thumb");
    if (thumb) {
      $("#stage-img").src = thumb.dataset.src;
      $$(".thumb", root).forEach((t) => t.classList.toggle("active", t === thumb));
    }

    const sizeBtn = e.target.closest(".size-btn");
    if (sizeBtn) {
      selectedSize = Number(sizeBtn.dataset.size);
      $$(".size-btn", root).forEach((b) => {
        b.classList.toggle("active", b === sizeBtn);
        b.setAttribute("aria-pressed", String(b === sizeBtn));
      });
      $("#size-error").textContent = "";
    }

    if (e.target.closest("#add-to-bag")) {
      if (selectedSize === null) {
        $("#size-error").textContent = "Please select a size.";
        return;
      }
      cart.add(product.id, selectedSize);
      showToast("Added to bag");
      openCart();
    }
  });
}

// ---------- CHECKOUT ----------
function initCheckout() {
  const form = $("#checkout-form");
  let placed = false;

  // Show the right box: empty bag, or the form
  function refresh() {
    if (placed) return;
    const items = cart.items();
    $("#checkout-empty").hidden = items.length > 0;
    $("#checkout-form-wrap").hidden = items.length === 0;

    $("#summary-lines").innerHTML = items
      .map(
        ({ product, size, qty }) => `
        <li class="line">
          <div class="line-img"><img src="${escapeHtml(product.images[0])}" alt="" style="filter:${escapeHtml(product.tint)}"></div>
          <div class="line-info">
            <p class="card-name">${escapeHtml(product.name)}</p>
            <p class="card-meta">${escapeHtml(product.colorway)}</p>
            <p class="card-meta">Size ${size} · Qty ${qty}</p>
          </div>
          <p class="line-price">${formatPrice(currentPrice(product) * qty)}</p>
        </li>`
      )
      .join("");
    $("#summary-total").textContent = formatPrice(cart.subtotal());

    // Logged in? Fill in the name and email
    const user = authService.getSession();
    $("#guest-note").hidden = Boolean(user);
    if (user) {
      if (!form.elements.name.value) form.elements.name.value = user.name;
      if (!form.elements.email.value) form.elements.email.value = user.email;
    }
  }

  // Card fields only show when "Card" is chosen
  form.addEventListener("change", (e) => {
    if (e.target.name !== "payment") return;
    $("#card-fields").hidden = e.target.value !== "card";
    $$(".radio", form).forEach((label) => label.classList.toggle("active", $("input", label).checked));
  });

  form.addEventListener("input", (e) => {
    if (e.target.name === "cardNumber") {
      // Group the digits as 1234 5678 9012 3456
      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
    }
    if (e.target.closest(".field")) setFieldError(form, e.target.name, "");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    values.cardNumber = values.cardNumber || "";
    values.cardName = values.cardName || "";

    const errors = validateCheckout(values);
    showErrors(form, errors);
    if (Object.keys(errors).length > 0) {
      $(".has-error input", form)?.focus();
      return;
    }

    const button = $("#place-order");
    setButtonLoading(button, true, "Placing order…");
    await wait(700); // pretend to contact a payment service

    const user = authService.getSession();
    let order;
    try {
      order = await placeOrder({
        items: cart.lines().map(({ productId, size, qty }) => ({ productId, size, qty })),
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
        payment: values.payment,
        cardNumber: values.cardNumber,
        cardName: values.cardName,
      });
    } catch (err) {
      setButtonLoading(button, false, "Place order");
      if (err.errors) showErrors(form, err.errors);
      showToast(err.message);
      return;
    }

    placed = true;
    cart.clear();

    $("#checkout-form-wrap").hidden = true;
    $("#done-message").textContent = `Thank you, ${order.shipTo.name.split(" ")[0]}! Your order number is ${order.id}.`;
    $("#done-details").textContent = `Total ${formatPrice(order.total)} · ${order.payment}`;
    $("#done-profile-link").hidden = !user;
    $("#checkout-done").hidden = false;
  });

  document.addEventListener("cart:changed", refresh);
  document.addEventListener("auth:changed", refresh);
  refresh();
}

// ---------- PROFILE ----------
function initProfile() {
  let myOrders = [];

  function render() {
    const root = $("#profile-root");
    const user = authService.getSession();

    if (!user) {
      root.innerHTML = `
        <h1 class="display page-title">Profile</h1>
        <p class="empty">Sign in to see your profile and orders.</p>
        <button class="pill pill-black" data-action="open-login">Sign In</button>`;
      return;
    }

    const since = new Date(user.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
    const orders = myOrders;

    const ordersHtml =
      orders.length === 0
        ? '<p class="empty">No orders yet. <a class="more-link" href="shop.html">Start shopping</a></p>'
        : orders
            .map(
              (o) => `
          <div class="order">
            <p class="row"><strong>${escapeHtml(o.id)}</strong><span>${new Date(o.date).toLocaleDateString("en-PH")}</span></p>
            ${o.lines
              .map((l) => `<p class="card-meta">${l.qty} × ${escapeHtml(l.name)} (${escapeHtml(l.colorway)}), size ${l.size}</p>`)
              .join("")}
            <p class="row total"><span>${escapeHtml(o.payment)}</span><strong>${formatPrice(o.total)}</strong></p>
          </div>`
            )
            .join("");

    root.innerHTML = `
      <h1 class="display page-title">Hi, ${escapeHtml(user.name.split(" ")[0])}</h1>
      <p class="card-meta">${escapeHtml(user.name)} · ${escapeHtml(user.email)}</p>
      <p class="card-meta">Member since ${since}</p>
      <button class="pill pill-outline pill-sm profile-logout" data-action="logout">Logout</button>
      <h2 class="display section-title orders-title">Your orders</h2>
      ${ordersHtml}`;
  }

  async function loadOrders() {
    myOrders = authService.getSession() ? await fetchMyOrders().catch(() => []) : [];
    render();
  }

  document.addEventListener("auth:changed", loadOrders);
  render();
  loadOrders();
}

// ---------- Run the code for the current page ----------
const pageInits = { home: initHome, shop: initShop, product: initProduct, checkout: initCheckout, profile: initProfile };
const runPage = pageInits[document.body.dataset.page];
// Wait for the product list from the server, then draw the page
productsReady.then(() => {
  emit("cart:changed");
  if (runPage) runPage();
});
