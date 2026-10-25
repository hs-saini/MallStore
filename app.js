(() => {
  "use strict";

  const KEYS = {
    cart: "mall-store-cart",
    wishlist: "mall-store-wishlist",
    profile: "mall-store-profile",
    orders: "mall-store-orders",
    sellerProducts: "mall-store-seller-products",
    addresses: "mall-store-addresses",
    users: "mall-store-users",
  };
  function readStored(key, fallback) {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error(`Unable to read Mall Store data (${key}).`, error);
      return fallback;
    }
  }
  const store = {
    cart: readStored(KEYS.cart, []),
    wishlist: readStored(KEYS.wishlist, []),
    profile: readStored(KEYS.profile, null),
    orders: readStored(KEYS.orders, []),
    sellerProducts: readStored(KEYS.sellerProducts, []),
    sellerOrders: [],
    addresses: readStored(KEYS.addresses, []),
  };
  const storeKeys = {
    [KEYS.cart]: "cart",
    [KEYS.wishlist]: "wishlist",
    [KEYS.profile]: "profile",
    [KEYS.orders]: "orders",
    [KEYS.sellerProducts]: "sellerProducts",
    [KEYS.addresses]: "addresses",
  };
  const read = (key, fallback) => store[storeKeys[key] || key] ?? fallback;
  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    const property = storeKeys[key];
    if (property) store[property] = value;
    return value;
  }
  function getUsers() {
    return readStored(KEYS.users, []);
  }
  function saveUsers(users) {
    localStorage.setItem(KEYS.users, JSON.stringify(users));
  }
  async function hashPassword(password, salt) {
    if (!window.crypto?.subtle) throw new Error("Secure password hashing is unavailable in this browser.");
    const encoder = new TextEncoder();
    const key = await window.crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const hash = await window.crypto.subtle.deriveBits({
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(salt),
      iterations: 120000,
    }, key, 256);
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const imagePlaceholder = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 720"><rect width="600" height="720" fill="#eeece6"/><path d="M0 520 180 340l120 120 110-150 190 210v200H0z" fill="#d8dbd0"/><circle cx="420" cy="190" r="56" fill="#d8dbd0"/><text x="300" y="650" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#68735e">Mall Store</text></svg>')}`;
  const money = (value) => `$${Number(value).toFixed(2)}`;
  const page = document.body.dataset.page || "home";
  let categories = window.MALL_CATEGORIES;
  let products = [...window.MALL_PRODUCTS];
  let activeCategory = new URLSearchParams(location.search).get("category") || "All";
  let activeSubcategory = new URLSearchParams(location.search).get("subcategory") || "";
  let searchTerm = new URLSearchParams(location.search).get("q") || "";
  let toastTimer;
  let mutationQueue = Promise.resolve();

  function getCart() { return read(KEYS.cart, []); }
  function getWishlist() { return read(KEYS.wishlist, []); }
  function getProfile() { return read(KEYS.profile, null); }
  function getOrders() { return read(KEYS.orders, []); }
  function getAddresses() { return read(KEYS.addresses, []); }
  function getSellerProducts() { return read(KEYS.sellerProducts, []); }
  function getSellerOrders() {
    const email = getProfile()?.email;
    if (!email) return [];
    return getOrders().map((order) => {
      const items = order.items.filter((item) => item.sellerEmail === email);
      return items.length ? {
        ...order,
        items,
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      } : null;
    }).filter(Boolean);
  }
  function customerOrders(profile = getProfile()) {
    return profile ? getOrders().filter((order) => order.customerEmail === profile.email) : [];
  }
  function cartCount() { return getCart().reduce((total, item) => total + item.quantity, 0); }
  function cartSubtotal() { return getCart().reduce((total, item) => total + item.price * item.quantity, 0); }
  function serializeMutation(action) {
    const request = mutationQueue.then(action);
    mutationQueue = request.catch(() => {});
    return request;
  }

  function header() {
    const profile = getProfile();
    return `
      <div class="announcement"><span>Demo delivery shown on orders over $75</span><span>Thoughtfully chosen. Happily delivered.</span></div>
      <header class="site-header mall-header">
        <button class="mobile-menu-toggle" aria-label="Open menu" aria-expanded="false">☰</button>
        <a class="mall-logo" href="index.html" aria-label="MallStore home"><span class="logo-mark">m</span><span>MALL<span class="logo-store">STORE</span></span></a>
        <form class="global-search" role="search">
          <label class="visually-hidden" for="global-search-input">Search MallStore</label>
          <input id="global-search-input" name="q" type="search" value="${escapeHtml(searchTerm)}" placeholder="Search for anything lovely..." />
          <button aria-label="Submit search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 4.5 4.5"></path></svg></button>
        </form>
        <div class="header-links">
          <a class="header-account" href="${profile ? "account.html" : "login.html"}" aria-label="Your account"><span class="header-icon">♙</span><span class="header-link-text">${profile ? `Hi, ${escapeHtml(profile.name.split(" ")[0])}` : "Sign in"}</span></a>
          <a class="header-wishlist" href="wishlist.html" aria-label="Wishlist"><span class="header-icon">♡</span><span class="header-link-text">Wishlist</span><span class="header-pill wishlist-count">${getWishlist().length}</span></a>
          <a class="header-bag" href="bag.html" aria-label="Shopping bag"><span class="header-icon">♧</span><span class="header-link-text">Bag</span><span class="header-pill cart-count">${cartCount()}</span></a>
        </div>
        <nav class="mall-nav" aria-label="Main navigation">
          <a class="${page === "home" ? "current" : ""}" href="index.html">Home</a>
          <div class="nav-category-wrap"><a class="${page === "categories" ? "current" : ""}" href="categories.html">Shop categories <span class="nav-chevron">⌄</span></a>
            <div class="mega-menu"><div class="mega-intro"><p class="eyebrow">A WORLD OF GOOD THINGS</p><h3>Find your<br /><em>kind of wonderful.</em></h3><a href="categories.html" class="text-link">Explore every category ↗</a></div>
              <div class="mega-category-list">${categories.map((category) => `<div><a class="mega-category-title" href="categories.html?category=${encodeURIComponent(category.name)}">${category.icon} &nbsp;${escapeHtml(category.name)}</a>${category.subcategories.slice(0, 4).map((sub) => `<a class="mega-subcategory" href="categories.html?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(sub)}">${escapeHtml(sub)}</a>`).join("")}</div>`).join("")}</div>
              <a class="mega-feature" href="categories.html"><span>THE MALL STORE EDIT</span><strong>A little more<br />lovely, every day.</strong><span class="mega-feature-link">Shop the edit ↗</span></a>
            </div>
          </div>
          <a href="categories.html?category=Fashion">Fashion</a><a href="categories.html?category=Home%20%26%20living">Home & living</a><a href="categories.html?category=Beauty">Beauty</a><a href="seller.html">Sell with us</a>
        </nav>
        <div class="mobile-nav-panel">${categories.map((category) => `<a href="categories.html?category=${encodeURIComponent(category.name)}">${escapeHtml(category.name)} <span>→</span></a>`).join("")}<a href="orders.html">My orders <span>→</span></a><a href="seller.html">Seller studio <span>→</span></a></div>
      </header>`;
  }

  function footer() {
    return `<footer class="mall-footer"><div class="footer-main"><div class="footer-brand"><a class="mall-logo" href="index.html"><span class="logo-mark">m</span><span>MALL<span class="logo-store">STORE</span></span></a><p>A little more lovely, every day.</p><span class="footer-social">Instagram &nbsp; Pinterest &nbsp; TikTok</span></div>
      <div><h3>Here to help</h3><a href="account.html">Your account</a><a href="orders.html">Track a demo order</a><a href="help.html">Delivery & returns</a><a href="help.html">Contact & help</a></div>
      <div><h3>Discover</h3><a href="categories.html">All categories</a><a href="wishlist.html">Your wishlist</a><a href="seller.html">Sell on MallStore</a><a href="help.html">How this demo works</a></div>
      <div class="footer-news"><h3>A good thing in your inbox.</h3><p>New finds and little notes, from us to you.</p><form class="footer-signup"><input type="email" required placeholder="Your email address" aria-label="Email address for newsletter" /><button aria-label="Subscribe">→</button></form><span class="footer-message" aria-live="polite"></span></div></div>
      <div class="footer-bottom"><span>© 2026 MallStore. Made with care.</span><a href="help.html">Help & demo details</a><span>Demo storefront · No real orders</span></div></footer><div class="toast" role="status" aria-live="polite"></div>`;
  }

  function productCard(product) {
    const saved = getWishlist().includes(product.id);
    return `<article class="product-card">
      <div class="product-image-wrap"><a href="categories.html?category=${encodeURIComponent(product.category)}&subcategory=${encodeURIComponent(product.subcategory)}" aria-label="Browse ${escapeHtml(product.subcategory)}"><img class="product-image" data-product-image src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt || product.name)}" loading="lazy" /></a>
        ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ""}
        <button class="favorite-toggle ${saved ? "is-saved" : ""}" data-favorite="${escapeHtml(product.id)}" aria-label="${saved ? "Remove from" : "Add to"} wishlist">${saved ? "♥" : "♡"}</button>
        <button class="add-button" data-add="${escapeHtml(product.id)}">Add to bag <span aria-hidden="true">＋</span></button>
      </div>
      <div class="product-info"><div><p class="product-category">${escapeHtml(product.subcategory)} · ${escapeHtml(product.category)}</p><h3 class="product-name">${escapeHtml(product.name)}</h3><div class="product-rating"><span>★</span> ${product.rating || "4.8"} <span class="review-count">(${product.reviews || 0})</span></div></div><p class="product-price">${money(product.price)}</p></div>
    </article>`;
  }

  function productGrid(items, extraClass = "") {
    return items.length ? `<div class="product-grid ${extraClass}">${items.map(productCard).join("")}</div>` : `<div class="empty-panel"><span>✳</span><h3>Nothing here just yet.</h3><p>Try another category or browse all of our good things.</p><a class="button button-dark" href="categories.html">Explore the shop <span>→</span></a></div>`;
  }

  function filteredProducts() {
    const sortBy = document.querySelector("#sort-products")?.value || "featured";
    let items = products.filter((product) =>
      (activeCategory === "All" || product.category === activeCategory) &&
      (!activeSubcategory || product.subcategory === activeSubcategory) &&
      (`${product.name} ${product.category} ${product.subcategory}`.toLowerCase().includes(searchTerm.toLowerCase())));
    if (sortBy === "low") items.sort((a, b) => a.price - b.price);
    if (sortBy === "high") items.sort((a, b) => b.price - a.price);
    if (sortBy === "rating") items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortBy === "name") items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }

  function renderHome() {
    const items = filteredProducts();
    return `<main>
      <section class="mall-hero"><img src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=2200&q=85" alt="Warm, sunlit home filled with thoughtfully chosen decor" /><div class="hero-wash"></div><div class="mall-hero-copy"><p class="eyebrow">THE GOOD THINGS MARKETPLACE</p><h1>Find your kind<br />of <em>wonderful.</em></h1><p>Little discoveries. Big everyday joy.</p><a class="button hero-button" href="#shop">Explore the collection <span>↗</span></a></div><span class="hero-caption">A MORE THOUGHTFUL WAY TO SHOP · EST. 2026</span><div class="hero-pagination"><span></span><span></span><span></span></div></section>
      <div class="benefit-strip"><span>✳ &nbsp;Independent makers</span><span>♧ &nbsp;Thoughtfully selected</span><span>↗ &nbsp;Demo delivery over $75</span><span>♡ &nbsp;Made for real life</span></div>
      <section class="category-shortcuts"><div class="section-heading"><div><p class="eyebrow">A LITTLE BIT OF EVERYTHING</p><h2>Where to today?</h2></div><a href="categories.html" class="text-link">All categories <span>↗</span></a></div><div class="category-bubbles">${categories.map((category, index) => `<a class="category-bubble bubble-${index + 1}" href="categories.html?category=${encodeURIComponent(category.name)}"><span class="bubble-icon">${category.icon}</span><span>${escapeHtml(category.name)}</span><span class="bubble-arrow">↗</span></a>`).join("")}</div></section>
      <section class="shop-section" id="shop"><div class="section-heading"><div><p class="eyebrow">A FEW THINGS WE LOVE</p><h2>${searchTerm ? `Search: “${escapeHtml(searchTerm)}”` : "Good things, gathered."}</h2></div><a href="categories.html" class="text-link">Shop the collection <span>↗</span></a></div>
        <div class="shop-controls"><div class="filter-list">${["All", ...categories.map((item) => item.name)].map((name) => `<button class="filter-chip ${activeCategory === name ? "active" : ""}" data-category="${escapeHtml(name)}">${name === "All" ? "Everything" : escapeHtml(name)}</button>`).join("")}</div><label class="sort-label" for="sort-products">Sort by <select id="sort-products"><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="rating">Top rated</option><option value="name">Name: A to Z</option></select></label></div>
        <p class="catalog-count">${items.length} thoughtful finds</p>${productGrid(items.slice(0, 8))}<div class="center-action"><a class="button button-outline" href="categories.html">Discover all the good things <span>→</span></a></div></section>
      <section class="editorial-banner"><img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=85" alt="A comfortable sunlit home" loading="lazy" /><div><p class="eyebrow">A MORE THOUGHTFUL WAY TO SHOP</p><h2>Good things.<br /><em>Good people.</em><br />Good feeling.</h2><a class="button hero-button" href="categories.html">Meet the marketplace <span>↗</span></a></div></section>
      <section class="newsletter-section"><span class="newsletter-spark">✳</span><p class="eyebrow">LETTERS FROM THE GOOD SIDE</p><h2>A good thing in your inbox.</h2><p>Fresh finds, maker stories, and little things to make your day.</p><form class="newsletter-form"><input type="email" required placeholder="Your email address" aria-label="Email address" /><button>Count me in <span>→</span></button></form><span class="newsletter-message" aria-live="polite"></span></section>
      </main>`;
  }

  function renderCategories() {
    const selected = categories.find((item) => item.name === activeCategory);
    const items = filteredProducts();
    return `<main class="page-main"><section class="page-intro"><p class="eyebrow">THE MALL STORE DIRECTORY</p><h1>Shop by <em>category.</em></h1><p>Find exactly what you’re looking for, or let something lovely find you.</p></section>
      <div class="category-layout"><aside class="category-sidebar"><h2>Browse departments</h2><a class="${activeCategory === "All" ? "selected" : ""}" href="categories.html">All departments <span>→</span></a>${categories.map((category) => `<div class="sidebar-department"><a class="${activeCategory === category.name ? "selected" : ""}" href="categories.html?category=${encodeURIComponent(category.name)}">${category.icon} &nbsp;${escapeHtml(category.name)} <span>›</span></a>${activeCategory === category.name ? category.subcategories.map((sub) => `<a class="sidebar-subcategory ${activeSubcategory === sub ? "selected" : ""}" href="categories.html?category=${encodeURIComponent(category.name)}&subcategory=${encodeURIComponent(sub)}">${escapeHtml(sub)}</a>`).join("") : ""}</div>`).join("")}</aside>
        <section class="category-results"><div class="category-cover"><img src="${selected ? selected.name === "Fashion" ? "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=85" : selected.name === "Beauty" ? "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1600&q=85" : selected.name === "Electronics" ? "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1600&q=85" : "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=85" : "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=85"}" alt="" /><div><p class="eyebrow">${selected ? escapeHtml(selected.name).toUpperCase() : "THE COMPLETE DIRECTORY"}</p><h2>${activeSubcategory ? escapeHtml(activeSubcategory) : selected ? `The good side of ${escapeHtml(selected.name.toLowerCase())}.` : "Something for every kind of day."}</h2><p>${selected ? "Discover thoughtful finds from independent makers and brands we love." : "Explore our departments, meet independent makers, and find a new everyday favorite."}</p></div></div>
          <div class="subcategory-chips">${(selected ? selected.subcategories : categories.map((item) => item.name)).map((sub) => `<a class="subcategory-chip ${activeSubcategory === sub ? "selected" : ""}" href="${selected ? `categories.html?category=${encodeURIComponent(selected.name)}&subcategory=${encodeURIComponent(sub)}` : `categories.html?category=${encodeURIComponent(sub)}`}">${escapeHtml(sub)} <span>↗</span></a>`).join("")}</div>
          <div class="section-heading category-product-heading"><div><p class="eyebrow">PICKED WITH CARE</p><h2>${selected ? escapeHtml(activeSubcategory || selected.name) : "Shop all departments"}</h2></div><label class="sort-label">Sort by <select id="sort-products"><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="rating">Top rated</option><option value="name">Name: A to Z</option></select></label></div>
          <p class="catalog-count">${items.length} finds to explore</p>${productGrid(items)}</section></div></main>`;
  }

  function renderBag() {
    const cart = getCart();
    const subtotal = cartSubtotal();
    const delivery = subtotal >= 75 || subtotal === 0 ? 0 : 6.95;
    const total = subtotal + delivery;
    return `<main class="page-main"><div class="breadcrumb"><a href="index.html">Home</a><span>/</span><span>Your bag</span></div><div class="section-heading page-title"><div><p class="eyebrow">YOUR VERY GOOD FINDS</p><h1>Your shopping bag <span class="title-count">(${cartCount()})</span></h1></div><a href="categories.html" class="text-link">Keep browsing <span>↗</span></a></div>
      ${cart.length ? `<div class="bag-layout"><section class="bag-list"><div class="bag-list-header"><span>Item</span><span>Quantity</span><span>Total</span></div>${cart.map((item) => `<article class="bag-item"><a href="categories.html?category=${encodeURIComponent(item.category)}"><img data-product-image src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" /></a><div class="bag-item-description"><p class="product-category">${escapeHtml(item.category)} · ${escapeHtml(item.subcategory)}</p><h2>${escapeHtml(item.name)}</h2><p>${money(item.price)}</p><button class="bag-remove" data-remove="${escapeHtml(item.id)}">Remove</button><button class="bag-move-wishlist" data-move-wishlist="${escapeHtml(item.id)}">♡ Save for later</button></div><div class="quantity-control"><button data-quantity="${escapeHtml(item.id)}" data-change="-1" aria-label="Decrease quantity">−</button><span>${item.quantity}</span><button data-quantity="${escapeHtml(item.id)}" data-change="1" aria-label="Increase quantity">＋</button></div><strong class="bag-line-total">${money(item.price * item.quantity)}</strong></article>`).join("")}<div class="delivery-progress"><span>✳</span><div><strong>${subtotal >= 75 ? "Lovely! Your delivery is on us." : `You’re ${money(75 - subtotal)} away from complimentary delivery.`}</strong><div class="progress-track"><span style="width:${Math.min(100, subtotal / 75 * 100)}%"></span></div></div></div></section>
        <aside class="order-summary"><p class="eyebrow">THE FINAL LITTLE DETAILS</p><h2>Order summary</h2><div class="summary-row"><span>Subtotal</span><span>${money(subtotal)}</span></div><div class="summary-row"><span>Delivery</span><span>${delivery === 0 ? "Complimentary" : money(delivery)}</span></div><div class="summary-row summary-total"><span>Total</span><strong>${money(total)}</strong></div><p class="tax-note">Taxes included where applicable. Delivery calculated at checkout.</p><a class="button checkout-cta" href="checkout.html">Continue to checkout <span>→</span></a><div class="secure-note">♧ &nbsp; Demo checkout · No payment collected</div></aside></div>` : `<div class="empty-bag-page"><span class="empty-bag-illustration">♧</span><p class="eyebrow">A LITTLE ROOM FOR SOMETHING LOVELY</p><h2>Your bag is taking a breather.</h2><p>When you find something you love, it’ll be right here waiting.</p><a class="button checkout-cta" href="categories.html">Explore the marketplace <span>→</span></a><a href="wishlist.html" class="text-link">Or visit your wishlist ♡</a></div>`}
      </main>`;
  }

  function renderWishlist() {
    const items = getWishlist().map((id) => products.find((product) => product.id === id)).filter(Boolean);
    return `<main class="page-main"><div class="breadcrumb"><a href="index.html">Home</a><span>/</span><span>Wishlist</span></div><div class="section-heading page-title"><div><p class="eyebrow">THE GOOD THINGS YOU SAVED</p><h1>Your wishlist <span class="title-count">(${items.length})</span></h1></div><a href="categories.html" class="text-link">Find more to love <span>↗</span></a></div>${items.length ? productGrid(items) : `<div class="empty-panel wishlist-empty"><span>♡</span><h3>Keep the things you love close.</h3><p>Tap the little heart on anything that catches your eye and it’ll be here.</p><a class="button button-dark" href="categories.html">Explore the marketplace <span>→</span></a></div>`}</main>`;
  }

  function renderHelp() {
    return `<main class="page-main help-page"><div class="breadcrumb"><a href="index.html">Home</a><span>/</span><span>Help & demo details</span></div><section class="page-intro"><p class="eyebrow">A NOTE BEFORE YOU SHOP</p><h1>Help & <em>demo details.</em></h1><p>MallStore is a storefront prototype. Here’s what works here, and what doesn’t.</p></section><section class="help-notice"><strong>This is not a live shop.</strong><p>Orders, seller listings, and accounts are demo-only. No payment is taken, no parcel is shipped, and no customer service inbox is connected.</p></section><div class="help-questions"><details><summary>Can I place a real order?</summary><p>No. Checkout only creates a sample order saved in this browser. Payment processing and shipping are not connected; the delivery message is illustrative.</p></details><details><summary>Are accounts, bags, and orders shared between devices?</summary><p>No. Demo data is kept in this browser’s local storage. It is not backed up to a server, and clearing browser storage removes it. Do not enter real personal, account, or payment information.</p></details><details><summary>Can other shoppers see my seller listings?</summary><p>No. Seller listings are only visible in the browser where they were created. This prototype has no shared product database or seller marketplace backend.</p></details><details><summary>Does newsletter signup save my email?</summary><p>No. The newsletter form is not connected to an email service and does not save or send your address.</p></details><details><summary>How can I contact the shop or request a return?</summary><p>This demo has no support team, contact inbox, or real purchases to return. Store policies and contact details must be added before MallStore can operate as a live business.</p></details></div><div class="help-next-step"><p class="eyebrow">READY TO EXPLORE?</p><h2>Find a little something lovely.</h2><a class="button checkout-cta" href="categories.html">Browse the demo shop <span>→</span></a></div></main>`;
  }

  function renderAuth(mode) {
    const registering = mode === "register";
    return `<main class="auth-main"><section class="auth-image"><img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85" alt="A welcoming home with warm natural textures" /><div><p class="eyebrow">GOOD THINGS START HERE</p><h2>A marketplace<br />with a little more<br /><em>heart.</em></h2></div></section>
      <section class="auth-panel"><a class="back-link" href="index.html">← &nbsp; Back to shopping</a><div class="auth-card"><p class="eyebrow">${registering ? "YOUR NEXT CHAPTER" : "WELCOME BACK"}</p><h1>${registering ? "Create your account." : "Lovely to see you."}</h1><p class="auth-subtitle">${registering ? "Join the good side of shopping." : "Sign in to pick up where you left off."}</p>
        <form class="auth-form" data-auth="${registering ? "register" : "login"}">
          ${registering ? `<div class="form-row"><label>First name<input name="firstName" required autocomplete="given-name" placeholder="Jamie" /></label><label>Last name<input name="lastName" required autocomplete="family-name" placeholder="Taylor" /></label></div>` : ""}
          <label>Email address<input name="email" type="email" required autocomplete="email" placeholder="you@example.com" /></label>
          <label>Password<input name="password" type="password" required minlength="10" autocomplete="${registering ? "new-password" : "current-password"}" placeholder="At least 10 characters" /></label>
          ${registering ? `<label class="role-label">I’m joining as<select name="role"><option value="customer">A customer — here to discover</option><option value="seller">A seller — here to grow my shop</option></select></label><label class="checkbox-row"><input type="checkbox" required /><span>I understand this demo account is saved only in this browser.</span></label>` : `<div class="auth-form-extras"><label class="checkbox-row"><input type="checkbox" name="rememberMe" /><span>Keep me signed in</span></label><a href="#" class="forgot-link" data-demo-forgot>Password help</a></div>`}
          <button class="button auth-submit" type="submit">${registering ? "Create my account" : "Sign in"} <span>→</span></button><p class="form-feedback" aria-live="polite"></p>
        </form><div class="auth-switch">${registering ? "Already part of the good side?" : "New around here?"} <a href="${registering ? "login.html" : "register.html"}">${registering ? "Sign in" : "Create an account"}</a></div><div class="auth-divider"><span>OR</span></div><a class="seller-auth-link" href="register.html?role=seller">Opening a shop? <strong>Join as a seller →</strong></a><p class="demo-disclaimer">Demo accounts are stored only in this browser. This prototype does not provide production-grade authentication or account recovery.</p></div></section></main>`;
  }

  function renderAccount() {
    const profile = getProfile();
    if (!profile) return `<main class="page-main"><div class="account-welcome"><p class="eyebrow">YOUR CORNER OF THE MARKET</p><h1>All your good things,<br /><em>in one place.</em></h1><p>Sign in to see your orders, wishlist, and account details.</p><div class="account-actions"><a class="button checkout-cta" href="login.html">Sign in <span>→</span></a><a class="button button-outline" href="register.html">Create an account</a></div><div class="account-role-cards"><a href="register.html?role=seller"><span>✳</span><strong>Have things to sell?</strong><small>Open your seller studio</small></a><a href="orders.html"><span>↗</span><strong>Track a delivery</strong><small>See your latest orders</small></a></div></div></main>`;
    return `<main class="page-main"><div class="breadcrumb"><a href="index.html">Home</a><span>/</span><span>Your account</span></div><section class="account-hero"><div><p class="eyebrow">${profile.role === "seller" ? "YOUR SELLER ACCOUNT" : "YOUR MALL STORE ACCOUNT"}</p><h1>Hello, <em>${escapeHtml(profile.name.split(" ")[0])}.</em></h1><p>Welcome back to your corner of the marketplace.</p></div><button class="button button-outline" data-logout>Sign out <span>↗</span></button></section>
      <div class="account-dashboard"><aside class="account-menu"><h2>My account</h2><a class="selected" href="account.html">Overview <span>→</span></a><a href="orders.html">Orders & tracking</a><a href="wishlist.html">My wishlist</a><a href="account.html#details">Personal details</a><a href="account.html#addresses">Saved addresses</a>${profile.role === "seller" ? `<a href="seller.html">Seller studio ↗</a>` : `<a href="seller.html">Become a seller ↗</a>`}</aside><section class="account-content"><div class="account-stats"><article><span>ORDERS PLACED</span><strong>${customerOrders(profile).length}</strong><a href="orders.html">View orders →</a></article><article><span>WISHLIST FINDS</span><strong>${getWishlist().length}</strong><a href="wishlist.html">Open wishlist →</a></article><article><span>ACCOUNT TYPE</span><strong>${profile.role === "seller" ? "Seller" : "Customer"}</strong><a href="${profile.role === "seller" ? "seller.html" : "register.html?role=seller"}">${profile.role === "seller" ? "Open studio →" : "Start selling →"}</a></article></div><div class="account-detail-card" id="details"><p class="eyebrow">YOUR DETAILS</p><h2>A little about you.</h2><form class="account-edit-form" data-profile><label>Full name<input name="name" required value="${escapeHtml(profile.name)}" /></label><label>Email address<input name="email" type="email" required value="${escapeHtml(profile.email)}" /></label><button class="button button-outline">Save your details <span>→</span></button><p class="form-feedback" aria-live="polite"></p></form><p class="demo-disclaimer">Profile details are saved in this browser for this demo.</p></div><div class="account-detail-card" id="addresses"><div class="saved-address-heading"><div><p class="eyebrow">DELIVERY DETAILS</p><h2>Saved addresses.</h2></div></div>${getAddresses().length ? getAddresses().map((address) => `<div class="saved-address"><div><strong>${escapeHtml(address.name)}</strong>${address.default ? `<span class="default-address-tag">DEFAULT</span>` : ""}<p>${escapeHtml(address.address)}<br />${escapeHtml(address.city)} ${escapeHtml(address.postcode)} · ${escapeHtml(address.country)}</p></div><button data-remove-address="${escapeHtml(address.id)}" aria-label="Remove saved address">Remove</button></div>`).join("") : `<p class="address-empty">No saved addresses yet. Add one for a quicker checkout next time.</p>`}<form class="address-form" data-address><h3>Add a delivery address</h3><div class="form-row"><label>Name<input name="name" required value="${escapeHtml(profile.name)}" /></label><label>Country<select name="country" required><option value="">Choose a country</option><option>United States</option><option>United Kingdom</option><option>Canada</option><option>Australia</option><option>India</option></select></label></div><label>Street address<input name="address" required autocomplete="street-address" /></label><div class="form-row"><label>Town / city<input name="city" required /></label><label>Postcode<input name="postcode" required /></label></div><label class="checkbox-row"><input type="checkbox" name="default" /><span>Make this my default address</span></label><button class="button button-outline">Save address <span>→</span></button><p class="form-feedback" aria-live="polite"></p></form></div><div class="account-help-card"><span>✳</span><div><h2>Need a hand?</h2><p>Our friendly team is here to help with orders, returns, or anything else.</p></div><a class="text-link" href="orders.html">Get help <span>→</span></a></div></section></div></main>`;
  }

  function renderOrders() {
    const profile = getProfile();
    const orders = customerOrders(profile);
    return `<main class="page-main"><div class="breadcrumb"><a href="index.html">Home</a><span>/</span><a href="account.html">My account</a><span>/</span><span>Orders</span></div><div class="section-heading page-title"><div><p class="eyebrow">FROM OUR DOOR TO YOURS</p><h1>Your orders.</h1></div><a class="text-link" href="categories.html">Keep exploring <span>↗</span></a></div>${!profile ? `<div class="notice-panel"><span>↗</span><div><strong>Sign in to see your order history.</strong><p>Your future Mall Store orders will be gathered here.</p></div><a class="button button-dark" href="login.html">Sign in</a></div>` : orders.length ? `<div class="orders-list">${orders.map((order) => `<article class="order-card"><div class="order-card-top"><div><span class="eyebrow">ORDER ${escapeHtml(order.id)}</span><p>Placed ${new Date(order.createdAt).toLocaleDateString()}</p></div><span class="order-status">${escapeHtml(order.status)}</span></div><div class="order-products">${order.items.map((item) => `<div><img data-product-image src="${escapeHtml(item.image)}" alt="" /><span>${escapeHtml(item.name)} <small>× ${item.quantity}</small></span></div>`).join("")}</div><div class="order-card-bottom"><span>${order.items.reduce((sum, item) => sum + item.quantity, 0)} items · ${money(order.total)}</span><button class="text-link" data-track="${escapeHtml(order.id)}">Track your order <span>→</span></button></div></article>`).join("")}</div>` : `<div class="empty-panel"><span>↗</span><h3>Your next good thing is out there.</h3><p>Once you place an order, we’ll keep all the details right here.</p><a class="button button-dark" href="categories.html">Explore the marketplace <span>→</span></a></div>`}</main>`;
  }

  function renderCheckout() {
    const cart = getCart();
    if (!cart.length) return `<main class="page-main"><div class="empty-panel"><span>♧</span><h3>Your bag is ready when you are.</h3><p>Add a few good things before heading to checkout.</p><a class="button button-dark" href="categories.html">Explore the marketplace <span>→</span></a></div></main>`;
    const profile = getProfile();
    if (!profile) return `<main class="page-main"><div class="notice-panel"><span>♙</span><div><strong>Sign in to continue to checkout.</strong><p>Your bag will be here after you sign in or create an account.</p></div><a class="button button-dark" href="login.html?next=checkout.html">Sign in</a></div></main>`;
    const subtotal = cartSubtotal();
    const delivery = subtotal >= 75 ? 0 : 6.95;
    const address = getAddresses().find((item) => item.default) || getAddresses()[0] || {};
    return `<main class="page-main checkout-page"><div class="breadcrumb"><a href="index.html">Home</a><span>/</span><a href="bag.html">Your bag</a><span>/</span><span>Checkout</span></div><div class="checkout-heading"><p class="eyebrow">ONE LAST LITTLE STEP</p><h1>Let’s get your good things <em>to you.</em></h1></div><form class="checkout-layout" data-checkout><section class="checkout-form"><div class="checkout-step"><span class="step-number">1</span><div class="step-body"><h2>Contact details</h2><label>Email address<input type="email" name="email" required readonly value="${escapeHtml(profile.email)}" autocomplete="email" /></label><label class="checkbox-row"><input type="checkbox" /><span>Send me the occasional lovely email</span></label></div></div><div class="checkout-step"><span class="step-number">2</span><div class="step-body"><h2>Delivery address</h2><div class="form-row"><label>First name<input name="firstName" required autocomplete="given-name" value="${escapeHtml(profile.name.split(" ")[0] || "")}" /></label><label>Last name<input name="lastName" required autocomplete="family-name" value="${escapeHtml(profile.name.split(" ").slice(1).join(" ") || "")}" /></label></div><label>Address<input name="address" required autocomplete="street-address" placeholder="House number and street" value="${escapeHtml(address.address || "")}" /></label><div class="form-row"><label>Town / city<input name="city" required autocomplete="address-level2" value="${escapeHtml(address.city || "")}" /></label><label>Postcode<input name="postcode" required autocomplete="postal-code" value="${escapeHtml(address.postcode || "")}" /></label></div><label>Country<select name="country" required><option value="">Choose your country</option>${["United States", "United Kingdom", "Canada", "Australia", "India"].map((country) => `<option ${address.country === country ? "selected" : ""}>${country}</option>`).join("")}</select></label><label class="checkbox-row"><input type="checkbox" name="saveAddress" checked /><span>Save this address to my account</span></label></div></div><div class="checkout-step"><span class="step-number">3</span><div class="step-body"><h2>Payment</h2><p class="payment-demo-note">Demo checkout · Payment details are not collected or processed</p><label class="payment-option"><input type="radio" name="payment" value="card" checked /><span>Credit or debit card</span><small>VISA · Mastercard · AMEX</small></label><label class="payment-option"><input type="radio" name="payment" value="paypal" /><span>PayPal</span></label><div class="form-row"><label>Card number<input inputmode="numeric" autocomplete="cc-number" placeholder="Not needed for this demo" /></label><label>Expiry<input autocomplete="cc-exp" placeholder="MM / YY" /></label></div><div class="form-row"><label>Name on card<input autocomplete="cc-name" /></label><label>Security code<input inputmode="numeric" autocomplete="cc-csc" placeholder="CVC" /></label></div></div></div><p class="form-feedback checkout-feedback" aria-live="polite"></p></section><aside class="order-summary checkout-summary"><p class="eyebrow">YOUR LOVELY LITTLE PARCEL</p><h2>In your bag (${cartCount()})</h2>${cart.map((item) => `<div class="checkout-item"><img src="${escapeHtml(item.image)}" alt="" /><div><strong>${escapeHtml(item.name)}</strong><small>Qty ${item.quantity}</small></div><span>${money(item.price * item.quantity)}</span></div>`).join("")}<div class="summary-row"><span>Subtotal</span><span>${money(subtotal)}</span></div><div class="summary-row"><span>Delivery</span><span>${delivery ? money(delivery) : "Complimentary"}</span></div><div class="summary-row summary-total"><span>Total</span><strong>${money(subtotal + delivery)}</strong></div><button type="submit" class="button checkout-cta">Place demo order <span>→</span></button><p class="tax-note">No real payment will be made. Orders are saved to your account.</p><a class="text-link" href="bag.html">← Back to your bag</a></aside></form></main>`;
  }

  function renderSeller() {
    const profile = getProfile();
    const sellerItems = getSellerProducts();
    const orders = getSellerOrders();
    if (!profile || profile.role !== "seller") return `<main class="seller-landing"><section class="seller-hero"><div><p class="eyebrow">SELL ON MALLSTORE</p><h1>Your craft.<br />Your community.<br /><em>Your next chapter.</em></h1><p>A thoughtful home for independent makers and big-hearted small businesses. Set up your shop, meet new customers, and grow at your own pace.</p><a class="button checkout-cta" href="register.html?role=seller">Become a seller <span>→</span></a><span class="seller-note">Demo seller listings are visible only in this browser.</span></div><img src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1400&q=85" alt="Independent maker working in a bright studio" /></section><section class="seller-perks"><article><span>✳</span><h2>Your own little shop</h2><p>Tell your story, list your products, and build a home for your brand.</p></article><article><span>↗</span><h2>Reach good people</h2><p>Put your products in front of a community that loves independent businesses.</p></article><article><span>♡</span><h2>Grow your way</h2><p>Simple tools to manage your listings, track orders, and find your feet.</p></article></section><div class="seller-cta-bottom"><p class="eyebrow">READY WHEN YOU ARE</p><h2>Let’s make a little room for your shop.</h2><a href="register.html?role=seller" class="button button-dark">Start your seller account <span>→</span></a></div></main>`;
    const revenue = orders.reduce((sum, order) => sum + order.total, 0);
    return `<main class="seller-dashboard"><aside class="seller-sidebar"><a class="seller-brand" href="seller.html"><span>m</span> Seller studio</a><p class="seller-menu-label">YOUR BUSINESS</p><a class="active" href="seller.html">⌂ &nbsp; Overview</a><a href="#seller-products">▦ &nbsp; Products <span>${sellerItems.length}</span></a><a href="#seller-orders">↗ &nbsp; Orders <span>${orders.length}</span></a><a href="account.html">♙ &nbsp; Store profile</a><a href="index.html">← &nbsp; Visit marketplace</a><div class="seller-sidebar-bottom"><div class="seller-profile-dot">${escapeHtml(profile.name.charAt(0).toUpperCase())}</div><div><strong>${escapeHtml(profile.name)}</strong><small>Your shop owner account</small></div></div></aside><section class="seller-workspace"><div class="seller-topbar"><div><p class="eyebrow">YOUR MALLSTORE STUDIO</p><h1>Good morning, ${escapeHtml(profile.name.split(" ")[0])}.</h1></div><a class="button button-outline" href="index.html">View marketplace ↗</a></div><div class="seller-stats"><article><span>PRODUCTS LISTED</span><strong>${sellerItems.length}</strong><small>In your shop</small></article><article><span>ORDERS RECEIVED</span><strong>${orders.length}</strong><small>Across the marketplace</small></article><article><span>DEMO SALES</span><strong>${money(revenue)}</strong><small>Before fees & delivery</small></article><article><span>DEMO VISIBILITY</span><strong class="shop-live"><i></i> Local only</strong><small>Visible in this browser</small></article></div>
      <div class="seller-section-heading" id="seller-products"><div><p class="eyebrow">YOUR CATALOG</p><h2>Products in your shop</h2></div><button class="button checkout-cta" data-show-product-form>＋ Add a product</button></div><form class="seller-add-form" data-seller-product hidden><h3>List something lovely</h3><div class="form-row"><label>Product name<input name="name" required maxlength="80" /></label><label>Price (USD)<input name="price" type="number" required min="0.01" step="0.01" /></label></div><div class="form-row"><label>Department<select name="category" required>${categories.map((category) => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`).join("")}</select></label><label>Subcategory<select name="subcategory" required>${categories[0].subcategories.map((subcategory) => `<option value="${escapeHtml(subcategory)}">${escapeHtml(subcategory)}</option>`).join("")}</select></label></div><div class="seller-image-fields"><div><label>Image URL<input name="image" type="url" placeholder="https://example.com/product.jpg" /></label><label>Or upload an image<input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp" /></label><small>Use a direct HTTPS image link or upload a JPG, PNG, or WebP (up to 8 MB).</small></div><div class="seller-image-preview"><img data-seller-image-preview src="${imagePlaceholder}" alt="Product image preview" /><span data-seller-image-status>Product image preview</span></div></div><div class="seller-form-actions"><button type="button" class="button button-outline" data-hide-product-form>Cancel</button><button class="button checkout-cta">Publish listing →</button></div><p class="form-feedback" aria-live="polite"></p></form>
      ${sellerItems.length ? `<div class="seller-product-list">${sellerItems.map((item) => `<article><button type="button" class="seller-product-image-button" data-preview-product="${escapeHtml(item.id)}" aria-label="Preview ${escapeHtml(item.name)}"><img data-product-image src="${escapeHtml(item.image)}" alt="" /></button><button type="button" class="seller-product-info-button" data-preview-product="${escapeHtml(item.id)}"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category)} · ${escapeHtml(item.subcategory)}</small><span>Preview listing →</span></button><strong>${money(item.price)}</strong><span class="listing-status">Local demo</span><button data-delete-product="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">Remove</button></article>`).join("")}</div>` : `<div class="seller-empty"><span>▦</span><p>Your shop is ready for its first listing.</p><small>Add a product to start building your catalog.</small></div>`}
      <div class="seller-section-heading seller-orders-heading" id="seller-orders"><div><p class="eyebrow">KEEP THINGS MOVING</p><h2>Recent orders</h2></div><a class="text-link" href="orders.html">All orders →</a></div>${orders.length ? `<div class="seller-orders-list">${orders.slice(0, 5).map((order) => `<div><span>${escapeHtml(order.id)}</span><span>${new Date(order.createdAt).toLocaleDateString()}</span><span>${order.items.length} items</span><strong>${money(order.total)}</strong><span class="order-status">${escapeHtml(order.status)}</span></div>`).join("")}</div>` : `<div class="seller-empty compact"><p>No orders yet. Your next customer could be just around the corner.</p></div>`}<p class="demo-disclaimer">Products, account details, and orders are stored in this browser only. Checkout is a demo and does not process payment or shipping.</p></section></main>`;
  }

  function renderPage() {
    const templates = { home: renderHome, categories: renderCategories, bag: renderBag, wishlist: renderWishlist, account: renderAccount, login: () => renderAuth("login"), register: () => renderAuth("register"), orders: renderOrders, checkout: renderCheckout, seller: renderSeller, help: renderHelp };
    document.querySelector("#page-content").innerHTML = (templates[page] || renderHome)();
    const accountDisclaimer = document.querySelector(".account-detail-card .demo-disclaimer");
    if (accountDisclaimer) accountDisclaimer.textContent = "Your profile and saved addresses are stored only in this browser.";
    const paymentNote = document.querySelector(".payment-demo-note");
    if (paymentNote) paymentNote.closest(".step-body").innerHTML = `<h2>Payment</h2><p class="payment-demo-note">Payment processing is not connected. This demo will not ask for or accept card details.</p>`;
  }

  function toast(message) {
    const element = document.querySelector(".toast");
    element.textContent = message;
    element.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => element.classList.remove("show"), 2600);
  }

  function refresh() {
    document.querySelector(".cart-count").textContent = cartCount();
    document.querySelector(".wishlist-count").textContent = getWishlist().length;
    renderPage();
  }

  async function updateQuantity(id, change) {
    await serializeMutation(async () => {
      const cart = getCart();
      const item = cart.find((entry) => entry.id === id);
      if (!item) return;
      item.quantity += change;
      await write(KEYS.cart, cart.filter((entry) => entry.quantity > 0));
      refresh();
    });
  }

  async function addToCart(product) {
    await serializeMutation(async () => {
      const cart = getCart();
      const existing = cart.find((item) => item.id === product.id);
      if (existing) existing.quantity += 1;
      else cart.push({ ...product, quantity: 1 });
      await write(KEYS.cart, cart);
      refresh();
      toast(`${product.name} added to your bag`);
    });
  }

  async function toggleFavorite(id) {
    await serializeMutation(async () => {
      const favorites = getWishlist();
      const product = products.find((item) => item.id === id);
      const isSaved = favorites.includes(id);
      await write(KEYS.wishlist, isSaved ? favorites.filter((item) => item !== id) : [...favorites, id]);
      refresh();
      toast(isSaved ? "Removed from your wishlist" : `${product?.name || "Find"} saved for later`);
    });
  }

  async function runAction(action, feedbackForm) {
    try {
      await action();
    } catch (error) {
      console.error("Mall Store request failed.", error);
      const feedback = feedbackForm?.querySelector(".form-feedback");
      if (feedback) feedback.textContent = error.message;
      else toast(error.message || "The request could not be completed. Please try again.");
    }
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("This image could not be loaded. Use a direct HTTPS image link or upload the image file."));
      image.src = source;
    });
  }

  async function prepareSellerImage(form) {
    const file = form.elements.imageFile.files[0];
    if (file) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Upload a JPG, PNG, or WebP image.");
      }
      if (file.size > 8 * 1024 * 1024) throw new Error("Image files must be 8 MB or smaller.");
      const source = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("The selected image file could not be read."));
        reader.readAsDataURL(file);
      });
      const loadedImage = await loadImage(source);
      const scale = Math.min(1, 1200 / Math.max(loadedImage.naturalWidth, loadedImage.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(loadedImage.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(loadedImage.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is not supported in this browser.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(loadedImage, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.82);
    }

    const value = form.elements.image.value.trim();
    if (!value) throw new Error("Add a direct HTTPS image URL or upload an image file.");
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error("Enter a valid, direct HTTPS image URL.");
    }
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("Use a secure HTTPS image URL, or upload the image file.");
    }
    await loadImage(url.href);
    return url.href;
  }

  function showProductPreview(product) {
    document.querySelector(".listing-preview-dialog")?.remove();
    const dialog = document.createElement("dialog");
    dialog.className = "listing-preview-dialog";
    dialog.setAttribute("aria-labelledby", "listing-preview-title");
    dialog.innerHTML = `<article class="listing-preview"><button type="button" class="listing-preview-close" data-close-preview aria-label="Close product preview">×</button><div class="listing-preview-image"><img data-product-image src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt || product.name)}" /></div><div class="listing-preview-copy"><p class="eyebrow">CUSTOMER LISTING PREVIEW</p><p class="product-category">${escapeHtml(product.category)} · ${escapeHtml(product.subcategory)}</p><h2 id="listing-preview-title">${escapeHtml(product.name)}</h2><div class="product-rating"><span>★</span> ${escapeHtml(product.rating || "5")} <span class="review-count">(${escapeHtml(product.reviews || 0)} reviews)</span></div><strong class="listing-preview-price">${money(product.price)}</strong><span class="listing-preview-badge">${escapeHtml(product.badge || "Independent maker")}</span><p>This listing is saved in this browser’s MallStore demo and isn’t visible to other shoppers.</p></div></article>`;
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector("[data-close-preview]").focus();
  }

  function listen() {
    document.addEventListener("load", (event) => {
      if (event.target.matches?.("[data-seller-image-preview]")) {
        const status = document.querySelector("[data-seller-image-status]");
        const form = document.querySelector("[data-seller-product]");
        if (status) status.textContent = form?.dataset.uploadedImage ? "Image ready to publish" : "Image preview ready";
      }
    }, true);

    document.addEventListener("error", (event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement)) return;
      if (image.dataset.productImage !== undefined) {
        image.src = imagePlaceholder;
        image.classList.add("image-unavailable");
      }
      if (image.matches("[data-seller-image-preview]")) {
        image.src = imagePlaceholder;
        image.dataset.failed = "true";
        const status = document.querySelector("[data-seller-image-status]");
        if (status) status.textContent = "Image could not load. Try a direct HTTPS image link or upload the file.";
      }
    }, true);

    document.addEventListener("input", (event) => {
      if (!event.target.matches(".seller-add-form [name=image]")) return;
      const form = event.target.form;
      delete form.dataset.uploadedImage;
      form.elements.imageFile.value = "";
      const preview = form.querySelector("[data-seller-image-preview]");
      const status = form.querySelector("[data-seller-image-status]");
      const value = event.target.value.trim();
      preview.dataset.failed = "";
      preview.src = value || imagePlaceholder;
      if (status) status.textContent = value ? "Loading image preview…" : "Product image preview";
    });

    document.addEventListener("click", (event) => {
      const preview = event.target.closest("[data-preview-product]");
      if (preview) {
        const product = products.find((item) => item.id === preview.dataset.previewProduct);
        if (product) showProductPreview(product);
        return;
      }
      if (event.target.closest("[data-close-preview]")) {
        event.target.closest("dialog")?.close();
        return;
      }
      if (event.target.matches(".listing-preview-dialog")) {
        event.target.close();
        return;
      }
      const add = event.target.closest("[data-add]");
      if (add) {
        const product = products.find((item) => item.id === add.dataset.add);
        if (product) void runAction(() => addToCart(product));
        return;
      }
      const favorite = event.target.closest("[data-favorite]");
      if (favorite) { void runAction(() => toggleFavorite(favorite.dataset.favorite)); return; }
      const filter = event.target.closest("[data-category]");
      if (filter) {
        activeCategory = filter.dataset.category;
        activeSubcategory = "";
        renderPage();
        return;
      }
      const quantity = event.target.closest("[data-quantity]");
      if (quantity) { void runAction(() => updateQuantity(quantity.dataset.quantity, Number(quantity.dataset.change))); return; }
      const remove = event.target.closest("[data-remove]");
      if (remove) {
        void runAction(async () => {
          await serializeMutation(async () => {
            await write(KEYS.cart, getCart().filter((item) => item.id !== remove.dataset.remove));
            refresh();
          });
        });
        return;
      }
      const move = event.target.closest("[data-move-wishlist]");
      if (move) {
        const id = move.dataset.moveWishlist;
        void runAction(() => serializeMutation(async () => {
          const item = getCart().find((entry) => entry.id === id);
          if (!item) return;
          const wishlist = getWishlist();
          if (!wishlist.includes(id)) write(KEYS.wishlist, [...wishlist, id]);
          write(KEYS.cart, getCart().filter((entry) => entry.id !== id));
          refresh();
          toast(`${item.name} saved for later`);
        }));
        return;
      }
      const logout = event.target.closest("[data-logout]");
      if (logout) {
        try {
          localStorage.removeItem(KEYS.profile);
          store.profile = null;
          location.href = "index.html";
        } catch (error) {
          console.error("Unable to sign out of Mall Store.", error);
          toast("Unable to sign out. Please check your browser storage settings.");
        }
        return;
      }
      const removeAddress = event.target.closest("[data-remove-address]");
      if (removeAddress) {
        void runAction(async () => {
          await write(KEYS.addresses, getAddresses().filter((address) => address.id !== removeAddress.dataset.removeAddress));
          renderPage();
        });
        return;
      }
      if (event.target.closest("[data-show-product-form]")) {
        const form = document.querySelector("[data-seller-product]");
        form.hidden = false;
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        form.querySelector("[name=name]").focus();
        return;
      }
      if (event.target.closest("[data-hide-product-form]")) { document.querySelector("[data-seller-product]").hidden = true; return; }
      const deleteProduct = event.target.closest("[data-delete-product]");
      if (deleteProduct) {
        const id = deleteProduct.dataset.deleteProduct;
        void runAction(() => {
          const saved = getSellerProducts().filter((item) =>
            item.id !== id || item.sellerEmail !== getProfile()?.email);
          write(KEYS.sellerProducts, saved);
          products = products.filter((item) => item.id !== id);
          renderPage();
          toast("Listing removed from your shop");
        });
        return;
      }
      const track = event.target.closest("[data-track]");
      if (track) toast("Shipping isn’t connected in this demo, so tracking isn’t available.");
      const forgot = event.target.closest("[data-demo-forgot]");
      if (forgot) { event.preventDefault(); toast("Password recovery isn’t available for demo accounts."); }
      const menuToggle = event.target.closest(".mobile-menu-toggle");
      if (menuToggle) {
        const panel = document.querySelector(".mobile-nav-panel");
        const open = panel.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", String(open));
        menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      }
    });

    document.addEventListener("change", (event) => {
      if (event.target.matches("#sort-products")) renderPage();
      if (event.target.matches(".seller-add-form [name=category]")) {
        const category = categories.find((item) => item.name === event.target.value);
        const subcategory = document.querySelector(".seller-add-form [name=subcategory]");
        if (category && subcategory) subcategory.innerHTML = category.subcategories.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("");
      }
      if (event.target.matches(".seller-add-form [name=imageFile]")) {
        const form = event.target.form;
        const file = event.target.files[0];
        if (!file) return;
        void runAction(async () => {
          const image = await prepareSellerImage(form);
          form.dataset.uploadedImage = image;
          const preview = form.querySelector("[data-seller-image-preview]");
          preview.dataset.failed = "";
          preview.src = image;
          form.querySelector("[data-seller-image-status]").textContent = "Image ready to publish";
          form.querySelector(".form-feedback").textContent = "";
        }, form);
      }
    });
    document.addEventListener("submit", (event) => {
      if (event.target.matches(".global-search")) {
        event.preventDefault();
        const query = new FormData(event.target).get("q").toString().trim();
        location.href = query ? `index.html?q=${encodeURIComponent(query)}#shop` : "categories.html";
        return;
      }
      if (event.target.matches(".newsletter-form, .footer-signup")) {
        event.preventDefault();
        const message = event.target.closest(".newsletter-section")?.querySelector(".newsletter-message") || event.target.parentElement.querySelector(".footer-message");
        if (message) message.textContent = "Newsletter signup isn’t connected in this demo; your email wasn’t saved.";
        event.target.reset();
        return;
      }
      const auth = event.target.closest("[data-auth]");
      if (auth) {
        event.preventDefault();
        if (!auth.reportValidity()) return;
        const values = new FormData(auth);
        const registering = auth.dataset.auth === "register";
        void runAction(async () => {
          const email = values.get("email").toString().trim().toLowerCase();
          const password = values.get("password").toString();
          const users = getUsers();
          let profile;
          if (registering) {
            if (users.some((user) => user.email === email)) throw new Error("An account with this email already exists. Sign in instead.");
            const salt = window.crypto.randomUUID();
            const user = {
              name: `${values.get("firstName")} ${values.get("lastName")}`.trim(),
              email,
              role: values.get("role").toString(),
              salt,
              passwordHash: await hashPassword(password, salt),
            };
            saveUsers([...users, user]);
            profile = { name: user.name, email: user.email, role: user.role };
          } else {
            const user = users.find((entry) => entry.email === email);
            if (!user || await hashPassword(password, user.salt) !== user.passwordHash) {
              throw new Error("Email or password is incorrect.");
            }
            profile = { name: user.name, email: user.email, role: user.role };
          }
          write(KEYS.profile, profile);
          const next = new URLSearchParams(location.search).get("next");
          location.href = profile.role === "seller" ? "seller.html" :
            ["checkout.html", "orders.html", "account.html"].includes(next) ? next : "account.html";
        }, auth);
        return;
      }
      const profileForm = event.target.closest("[data-profile]");
      if (profileForm) {
        event.preventDefault();
        if (!profileForm.reportValidity()) return;
        const form = new FormData(profileForm);
        void runAction(async () => {
          const previous = getProfile();
          const updated = {
            name: form.get("name").toString().trim(),
            email: form.get("email").toString().trim().toLowerCase(),
            role: previous.role,
          };
          const users = getUsers();
          if (users.some((user) => user.email === updated.email && user.email !== previous.email)) {
            throw new Error("That email address is already in use.");
          }
          saveUsers(users.map((user) => user.email === previous.email
            ? { ...user, name: updated.name, email: updated.email }
            : user));
          write(KEYS.sellerProducts, getSellerProducts().map((item) =>
            item.sellerEmail === previous.email ? { ...item, sellerEmail: updated.email } : item));
          write(KEYS.orders, getOrders().map((order) => ({
            ...order,
            customerEmail: order.customerEmail === previous.email ? updated.email : order.customerEmail,
            items: order.items.map((item) => item.sellerEmail === previous.email
              ? { ...item, sellerEmail: updated.email }
              : item),
          })));
          write(KEYS.profile, updated);
          refresh();
          toast("Your account details are saved");
        }, profileForm);
        return;
      }
      const addressForm = event.target.closest("[data-address]");
      if (addressForm) {
        event.preventDefault();
        if (!addressForm.reportValidity()) return;
        const form = new FormData(addressForm);
        const saved = getAddresses();
        const isDefault = form.has("default") || saved.length === 0;
        const address = {
          id: `address-${Date.now()}`,
          name: form.get("name").toString().trim(),
          address: form.get("address").toString().trim(),
          city: form.get("city").toString().trim(),
          postcode: form.get("postcode").toString().trim(),
          country: form.get("country").toString(),
          default: isDefault,
        };
        void runAction(async () => {
          await write(KEYS.addresses, [...(isDefault ? saved.map((item) => ({ ...item, default: false })) : saved), address]);
          renderPage();
          toast("Your delivery address is saved");
        }, addressForm);
        return;
      }
      const checkout = event.target.closest("[data-checkout]");
      if (checkout) {
        event.preventDefault();
        if (!checkout.reportValidity()) return;
        const cart = getCart();
        if (!cart.length) { location.href = "bag.html"; return; }
        const form = new FormData(checkout);
        const firstName = form.get("firstName").toString().trim();
        const lastName = form.get("lastName").toString().trim();
        void runAction(() => {
          const email = form.get("email").toString().trim().toLowerCase();
          const address = {
            name: `${firstName} ${lastName}`,
            address: form.get("address").toString().trim(),
            city: form.get("city").toString().trim(),
            postcode: form.get("postcode").toString().trim(),
            country: form.get("country").toString(),
          };
          const subtotal = Math.round(cart.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100;
          const delivery = subtotal >= 75 ? 0 : 6.95;
          const order = {
            id: `MS-${Date.now().toString().slice(-8)}`,
            createdAt: new Date().toISOString(),
            status: "Processing",
            items: cart.map((item) => ({ ...item })),
            subtotal,
            total: Math.round((subtotal + delivery) * 100) / 100,
            customerEmail: email,
            address: `${address.address}, ${address.city} ${address.postcode}, ${address.country}`,
          };
          const profile = getProfile();
          const updatedProfile = { name: `${firstName} ${lastName}`, email, role: profile?.role || "customer" };
          write(KEYS.profile, updatedProfile);
          write(KEYS.orders, [order, ...getOrders()]);
          write(KEYS.cart, []);
          if (profile && form.has("saveAddress")) {
            const saved = getAddresses();
            const existing = saved.find((item) => item.address === address.address && item.postcode === address.postcode);
            if (!existing) {
              const isDefault = saved.length === 0;
              write(KEYS.addresses, [
                ...(isDefault ? saved.map((item) => ({ ...item, default: false })) : saved),
                { ...address, id: `address-${Date.now()}`, default: isDefault },
              ]);
            }
          }
          location.href = `orders.html?placed=${encodeURIComponent(order.id)}`;
        }, checkout);
        return;
      }
      const sellerForm = event.target.closest("[data-seller-product]");
      if (sellerForm) {
        event.preventDefault();
        if (!sellerForm.reportValidity()) return;
        const form = new FormData(sellerForm);
        const name = form.get("name").toString().trim();
        const category = form.get("category").toString();
        const price = Number(form.get("price"));
        if (!Number.isFinite(price) || price <= 0) {
          sellerForm.querySelector(".form-feedback").textContent = "Enter a valid product price.";
          return;
        }
        void runAction(async () => {
          const image = await prepareSellerImage(sellerForm);
          if (sellerForm.querySelector("[data-seller-image-preview]").dataset.failed === "true") {
            throw new Error("This image could not be loaded. Try another HTTPS image URL or upload the image file.");
          }
          const product = {
            id: `seller-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            category,
            subcategory: form.get("subcategory").toString().trim(),
            price: Math.round(price * 100) / 100,
            image,
            alt: name,
            badge: "Independent maker",
            rating: 5,
            reviews: 0,
            sellerOwned: true,
            sellerEmail: getProfile()?.email,
          };
          write(KEYS.sellerProducts, [product, ...getSellerProducts()]);
          products = [product, ...products];
          renderPage();
          toast("Your listing was saved in this browser’s demo shop");
        }, sellerForm);
      }
    });
  }

  function init() {
    categories = window.MALL_CATEGORIES;
    products = [...window.MALL_PRODUCTS, ...getSellerProducts()];
    document.querySelector("#app").innerHTML = `${header()}<div id="page-content"></div>${footer()}`;
    renderPage();
    listen();
    const params = new URLSearchParams(location.search);
    if (params.has("role") && page === "register") {
      const select = document.querySelector('[name="role"]');
      if (select) select.value = params.get("role") === "seller" ? "seller" : "customer";
    }
    const placed = params.get("placed");
    if (placed) {
      const heading = document.querySelector(".page-title h1");
      if (heading) heading.insertAdjacentHTML("afterend", `<p class="order-success" role="status">Your demo order ${escapeHtml(placed)} is confirmed. Thank you for shopping with us!</p>`);
    }
  }

  init();
})();
