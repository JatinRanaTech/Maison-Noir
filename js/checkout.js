// Checkout flow. Payment is SIMULATED - no real card processor is contacted.
// This is intentional per the project brief (dev/demo purposes). To go live,
// swap `simulatePayment()` for a real processor's client SDK (Stripe, etc.)
// and move any secret keys server-side (e.g. a Cloud Function) - never call
// a payment API with a secret key directly from the browser.
import { auth, db } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { uid } from "./utils.js";

export function simulatePayment({ cardNumber }) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Demo rule: card numbers ending in 0000 simulate a decline, for testing.
      if (cardNumber.replace(/\s/g, "").endsWith("0000")) {
        reject(new Error("Card declined. Please try a different card."));
      } else {
        resolve({ transactionId: uid("txn"), status: "succeeded" });
      }
    }, 1400);
  });
}

export async function createOrder({ cart, totals, shipping, payment }) {
  const user = auth.currentUser;
  const order = {
    orderNumber: uid("MN").toUpperCase(),
    userId: user ? user.uid : null,
    guestEmail: user ? null : shipping.email,
    items: cart,
    totals,
    shipping,
    payment: { method: payment.method, last4: payment.cardNumber.slice(-4), transactionId: payment.transactionId },
    status: "processing",
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, "orders"), order);
  return { id: ref.id, ...order };
}
