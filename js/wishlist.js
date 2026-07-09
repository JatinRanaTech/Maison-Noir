import { auth, db } from "./firebase-config.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const KEY = "maisonnoir_wishlist";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("wishlist:updated", { detail: list }));
  const user = auth.currentUser;
  if (user) setDoc(doc(db, "wishlists", user.uid), { items: list, updatedAt: Date.now() }).catch(() => {});
}

export async function hydrateWishlistFromCloud() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const snap = await getDoc(doc(db, "wishlists", user.uid));
    if (snap.exists()) {
      const cloudItems = snap.data().items || [];
      if (cloudItems.length && read().length === 0) {
        localStorage.setItem(KEY, JSON.stringify(cloudItems));
        window.dispatchEvent(new CustomEvent("wishlist:updated"));
      }
    }
  } catch (err) { console.warn("Wishlist hydrate failed:", err.message); }
}

export function getWishlist() { return read(); }
export function isWishlisted(id) { return read().some((i) => i.id === id); }

export function toggleWishlist(product) {
  let list = read();
  if (list.some((i) => i.id === product.id)) {
    list = list.filter((i) => i.id !== product.id);
    write(list);
    return false;
  }
  list.push({ id: product.id, name: product.name, brand: product.brand, image: product.image, price: product.price, discount: product.discount || 0 });
  write(list);
  return true;
}

export function removeFromWishlist(id) {
  write(read().filter((i) => i.id !== id));
}
