import { auth, db } from "./firebase-config.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const KEY = "maisonnoir_cart";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function write(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: cart }));
  syncToCloud(cart);
}

// Debounced cloud sync so signed-in users' carts persist across devices.
let syncTimer;
function syncToCloud(cart) {
  const user = auth.currentUser;
  if (!user) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    setDoc(doc(db, "carts", user.uid), { items: cart, updatedAt: Date.now() }).catch(() => {});
  }, 600);
}

// Call once after login to pull any cart saved from another device/session.
export async function hydrateCartFromCloud() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const snap = await getDoc(doc(db, "carts", user.uid));
    if (snap.exists()) {
      const cloudItems = snap.data().items || [];
      const local = read();
      if (cloudItems.length && local.length === 0) {
        localStorage.setItem(KEY, JSON.stringify(cloudItems));
        window.dispatchEvent(new CustomEvent("cart:updated"));
      }
    }
  } catch (err) { console.warn("Cart hydrate failed:", err.message); }
}

export function getCart() { return read(); }

export function addToCart(product, { size = null, color = null, qty = 1 } = {}) {
  const cart = read();
  const key = `${product.id}__${size}__${color}`;
  const existing = cart.find((i) => i.key === key);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      key, id: product.id, name: product.name, brand: product.brand,
      image: product.image, price: product.discount ? product.price * (1 - product.discount / 100) : product.price,
      size, color, qty,
    });
  }
  write(cart);
  return cart;
}

export function updateQty(key, qty) {
  let cart = read();
  if (qty <= 0) { cart = cart.filter((i) => i.key !== key); }
  else { const item = cart.find((i) => i.key === key); if (item) item.qty = qty; }
  write(cart);
  return cart;
}

export function removeFromCart(key) {
  const cart = read().filter((i) => i.key !== key);
  write(cart);
  return cart;
}

export function clearCart() { write([]); }

export function cartTotals(cart, couponPercent = 0) {
  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discount = subtotal * (couponPercent / 100);
  const shipping = subtotal === 0 || subtotal >= 150 ? 0 : 12;
  const taxable = subtotal - discount;
  const tax = taxable * 0.08;
  const total = taxable + tax + shipping;
  return { subtotal, discount, shipping, tax, total };
}

// Simple demo coupon codes
const COUPONS = { WELCOME10: 10, VIP20: 20, MAISON15: 15 };
export function applyCoupon(code) {
  return COUPONS[code.trim().toUpperCase()] || 0;
}
