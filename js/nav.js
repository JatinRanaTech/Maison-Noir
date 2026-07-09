import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getCart } from "./cart.js";
import { getWishlist } from "./wishlist.js";

function updateBadges() {
  const cartCount = getCart().reduce((sum, i) => sum + i.qty, 0);
  const wishCount = getWishlist().length;
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = cartCount;
    el.classList.toggle("hidden", cartCount === 0);
  });
  document.querySelectorAll("[data-wishlist-count]").forEach((el) => {
    el.textContent = wishCount;
    el.classList.toggle("hidden", wishCount === 0);
  });
}

function wireMobileDrawer() {
  const openBtn = document.querySelector("[data-drawer-open]");
  const drawer = document.querySelector("[data-mobile-drawer]");
  if (!openBtn || !drawer) return;
  const close = () => drawer.classList.remove("open");
  openBtn.addEventListener("click", () => drawer.classList.add("open"));
  drawer.querySelector(".scrim")?.addEventListener("click", close);
  drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
}

function wireAuthAwareLinks() {
  onAuthStateChanged(auth, (user) => {
    document.querySelectorAll("[data-account-link]").forEach((el) => {
      el.href = user ? "account.html" : "login.html";
      el.title = user ? "My Account" : "Sign In";
    });
    document.querySelectorAll("[data-auth-only]").forEach((el) => el.classList.toggle("hidden", !user));
    document.querySelectorAll("[data-guest-only]").forEach((el) => el.classList.toggle("hidden", !!user));
  });
}

function highlightActiveLink() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a[href], .mobile-drawer a[href]").forEach((a) => {
    if (a.getAttribute("href") === path) a.classList.add("active");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  updateBadges();
  wireMobileDrawer();
  wireAuthAwareLinks();
  highlightActiveLink();
  window.addEventListener("storage", updateBadges);
  window.addEventListener("cart:updated", updateBadges);
  window.addEventListener("wishlist:updated", updateBadges);
});
