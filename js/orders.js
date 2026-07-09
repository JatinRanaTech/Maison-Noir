import { db } from "./firebase-config.js";
import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function getOrdersForUser(uid) {
  try {
    const q = query(collection(db, "orders"), where("userId", "==", uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Order fetch failed (index may still be building):", err.message);
    return [];
  }
}

export function statusClass(status) {
  if (status === "delivered") return "delivered";
  if (status === "shipped") return "shipped";
  return "";
}
