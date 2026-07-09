import { db } from "./firebase-config.js";
import {
  collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { formatCurrency, starString, escapeHtml } from "./utils.js";
export { formatCurrency };

// ----------------------------------------------------------------------------
// SEED DATA
// Used automatically whenever the "products" Firestore collection is empty
// (e.g. brand new project) so the site is never blank. Once you seed real
// products via /pages/admin-seed.html (see README), Firestore data takes over.
// Images are placeholder photography (picsum.photos) - swap `image`/`imageAlt`
// with real Firebase Storage / CDN URLs for production.
// ----------------------------------------------------------------------------
const SEED_PRODUCTS = [
  mk("Wool Overcoat", "MAISON NOIR", "men", "outerwear", 348, 0, 4.7, 812, 12),
  mk("Silk Slip Dress", "Atelier Rue", "women", "dresses", 210, 15, 4.5, 356, 8),
  mk("Selvedge Denim Jacket", "Foundry Co.", "men", "outerwear", 265, 0, 4.6, 421, 20),
  mk("Cashmere Turtleneck", "MAISON NOIR", "women", "knitwear", 190, 0, 4.8, 903, 15),
  mk("Tailored Trousers", "Foundry Co.", "men", "bottoms", 145, 10, 4.3, 210, 30),
  mk("Pleated Midi Skirt", "Atelier Rue", "women", "bottoms", 128, 0, 4.4, 178, 18),
  mk("Leather Chelsea Boots", "Foundry Co.", "men", "footwear", 320, 0, 4.9, 640, 9),
  mk("Strappy Block Heels", "Atelier Rue", "women", "footwear", 175, 20, 4.2, 132, 0),
  mk("Merino Crewneck Sweater", "MAISON NOIR", "men", "knitwear", 138, 0, 4.5, 298, 40),
  mk("Oversized Blazer", "Atelier Rue", "women", "outerwear", 289, 0, 4.6, 245, 11),
  mk("Relaxed Fit Chinos", "Foundry Co.", "men", "bottoms", 98, 0, 4.1, 156, 55),
  mk("Satin Wrap Blouse", "Atelier Rue", "women", "tops", 112, 0, 4.4, 187, 26),
  mk("Linen Shirt", "Foundry Co.", "men", "tops", 89, 0, 4.3, 302, 60),
  mk("High-Rise Straight Jeans", "MAISON NOIR", "women", "bottoms", 158, 0, 4.7, 512, 33),
  mk("Quilted Puffer Vest", "Foundry Co.", "men", "outerwear", 168, 25, 4.0, 98, 5),
  mk("Ribbed Bodysuit", "Atelier Rue", "women", "tops", 68, 0, 4.2, 210, 44),
  mk("Suede Loafers", "MAISON NOIR", "men", "footwear", 245, 0, 4.6, 388, 14),
  mk("Trench Coat", "Atelier Rue", "women", "outerwear", 310, 0, 4.8, 470, 7),
  mk("Graphic Cotton Tee", "Foundry Co.", "men", "tops", 45, 0, 4.0, 640, 90),
  mk("Cropped Cardigan", "MAISON NOIR", "women", "knitwear", 118, 12, 4.3, 165, 22),
  mk("Track Pants", "Foundry Co.", "men", "bottoms", 78, 0, 4.1, 220, 48),
  mk("Sequin Mini Dress", "Atelier Rue", "women", "dresses", 198, 30, 4.5, 143, 3),
  mk("Canvas Sneakers", "Foundry Co.", "men", "footwear", 95, 0, 4.4, 502, 70),
  mk("Wide-Leg Palazzo Pants", "MAISON NOIR", "women", "bottoms", 132, 0, 4.2, 96, 19),
];

function mk(name, brand, gender, category, price, discount, rating, reviews, stock) {
  const seed = name.toLowerCase().replace(/\s+/g, "-");
  const colors = [["#1a1a1a", "Black"], ["#c9c3b8", "Bone"], ["#5c4433", "Cognac"]];
  return {
    id: seed,
    name, brand, gender, category, price, discount, rating, reviews, stock,
    isNew: reviews < 150,
    image: `https://picsum.photos/seed/${seed}/700/900`,
    imageAlt: `https://picsum.photos/seed/${seed}-alt/700/900`,
    gallery: [1, 2, 3].map((n) => `https://picsum.photos/seed/${seed}-${n}/900/1100`),
    sizes: category === "footwear" ? ["6", "7", "8", "9", "10", "11"] : ["XS", "S", "M", "L", "XL"],
    colors: colors.map(([hex, label]) => ({ hex, label })),
    description: `A ${category.slice(0, -1) || category} staple from ${brand}, cut for a considered wardrobe. Made with premium materials and finished with clean, minimal detailing designed to move seamlessly from studio to street.`,
    specs: ["Material: Premium blend", "Fit: True to size", "Care: See label", `Origin: Designed in-house, ${brand}`],
  };
}

let _cache = null;

export async function getAllProducts() {
  if (_cache) return _cache;
  try {
    const snap = await getDocs(collection(db, "products"));
    if (!snap.empty) {
      _cache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return _cache;
    }
  } catch (err) {
    console.warn("Firestore product fetch failed, using seed data:", err.message);
  }
  _cache = SEED_PRODUCTS;
  return _cache;
}

export async function getProductById(id) {
  const all = await getAllProducts();
  return all.find((p) => p.id === id) || null;
}

export function filterAndSort(products, { gender, categories = [], brands = [], colors = [], sizes = [], minRating, priceMax, sort } = {}) {
  let list = [...products];
  if (gender && gender !== "all") list = list.filter((p) => p.gender === gender);
  if (categories.length) list = list.filter((p) => categories.includes(p.category));
  if (brands.length) list = list.filter((p) => brands.includes(p.brand));
  if (colors.length) list = list.filter((p) => p.colors.some((c) => colors.includes(c.label)));
  if (sizes.length) list = list.filter((p) => p.sizes.some((s) => sizes.includes(s)));
  if (minRating) list = list.filter((p) => p.rating >= minRating);
  if (priceMax) list = list.filter((p) => p.price <= priceMax);

  switch (sort) {
    case "price-asc": list.sort((a, b) => a.price - b.price); break;
    case "price-desc": list.sort((a, b) => b.price - a.price); break;
    case "rating": list.sort((a, b) => b.rating - a.rating); break;
    case "newest": list.sort((a, b) => (b.isNew === a.isNew ? 0 : b.isNew ? 1 : -1)); break;
    default: list.sort((a, b) => b.reviews - a.reviews); // popularity
  }
  return list;
}

export function productCardHTML(p) {
  const finalPrice = p.discount ? p.price * (1 - p.discount / 100) : p.price;
  return `
  <article class="product-card" data-id="${p.id}">
    <a href="product.html?id=${p.id}" class="product-media-link">
      <div class="product-media">
        ${p.stock === 0 ? '<div class="stock-overlay">Sold Out</div>' : ""}
        <div class="product-tags">
          ${p.discount ? `<span class="tag tag-sale">-${p.discount}%</span>` : ""}
          ${p.isNew ? `<span class="tag tag-new">New</span>` : ""}
        </div>
        <img class="img-main" src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy">
        <img class="img-alt" src="${p.imageAlt}" alt="" loading="lazy">
      </div>
    </a>
    <div class="product-quick-actions">
      <button class="qa-btn" data-wishlist-toggle="${p.id}" aria-label="Add to wishlist" title="Add to wishlist">♡</button>
      <button class="qa-btn" data-quickview="${p.id}" aria-label="Quick view" title="Quick view">⌕</button>
    </div>
    <div class="product-atc">
      <button class="btn btn-primary btn-block btn-sm" data-quick-add="${p.id}" ${p.stock === 0 ? "disabled" : ""}>
        ${p.stock === 0 ? "Sold Out" : "Quick Add"}
      </button>
    </div>
    <div class="product-info">
      <div class="product-brand">${escapeHtml(p.brand)}</div>
      <a href="product.html?id=${p.id}"><div class="product-name">${escapeHtml(p.name)}</div></a>
      <div class="product-price-row">
        <span class="price">${formatCurrency(finalPrice)}</span>
        ${p.discount ? `<span class="price-strike price">${formatCurrency(p.price)}</span>` : ""}
      </div>
      <div class="rating-row"><span class="stars">${starString(p.rating)}</span> (${p.reviews})</div>
      <div class="swatch-row">
        ${p.colors.map((c) => `<span class="swatch" style="background:${c.hex}" title="${c.label}"></span>`).join("")}
      </div>
    </div>
  </article>`;
}

export function skeletonCardHTML() {
  return `<div class="product-card">
    <div class="skel" style="aspect-ratio:3/4;border-radius:10px;"></div>
    <div class="skel" style="height:14px;width:60%;margin-top:12px;"></div>
    <div class="skel" style="height:14px;width:40%;margin-top:8px;"></div>
  </div>`;
}
