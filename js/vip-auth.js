// ============================================================================
// VIP MEMBERS AUTHENTICATION
//
// The VIP area reuses the SAME Firebase Auth account system as the shop
// (one username + password per person - nobody should have to remember two
// logins), but access to the VIP portal itself is gated by a second,
// independent check: users/{uid}.isVip === true in Firestore.
//
// This keeps the two areas "logically separated" as requested:
//   - Anyone can create a normal shopping account (auth.js / signUp()).
//   - Only accounts flagged isVip:true may enter vip-portal.html.
//   - Firestore Security Rules enforce this server-side too (see
//     firebase/firestore.rules) - the client-side check below is just for UX,
//     it is NOT what actually secures the chat data.
//
// Two ways to grant VIP status:
//   1. MANUALLY (simplest): open Firebase Console -> Firestore -> users/{uid}
//      -> set isVip = true and vipHandle = "their display name". Good for a
//      small, hand-picked community.
//   2. INVITE CODES: an admin creates documents in a `vipInvites` collection,
//      e.g. vipInvites/GOLD-4F2A = { used:false }. A member redeems one via
//      redeemVipInvite() below, which flips their profile to isVip:true and
//      marks the code used. See README "VIP setup" section.
// ============================================================================
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, getDoc, updateDoc, runTransaction } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { logIn } from "./auth.js";

// Logs in with the normal shop credentials, then checks the VIP flag.
// Throws a friendly error if the account isn't an authorized VIP member.
export async function vipLogIn({ identifier, password }) {
  const user = await logIn({ identifier, password });
  const profile = await getDoc(doc(db, "users", user.uid));
  if (!profile.exists() || profile.data().isVip !== true) {
    throw new Error("This account isn't an authorized VIP member yet. Ask an existing member for an invite code, or contact support.");
  }
  return { user, profile: profile.data() };
}

export async function redeemVipInvite(code) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first, then redeem your invite code.");
  const inviteRef = doc(db, "vipInvites", code.trim().toUpperCase());

  await runTransaction(db, async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    if (!inviteSnap.exists()) throw new Error("Invalid invite code");
    if (inviteSnap.data().used) throw new Error("This invite code has already been used");
    tx.update(inviteRef, { used: true, usedBy: user.uid, usedAt: Date.now() });
    // `redeemedCode` lets Firestore Security Rules verify (via get()) that this
    // exact invite exists and was unused before allowing isVip to flip to true -
    // see firebase/firestore.rules for the matching rule.
    tx.update(doc(db, "users", user.uid), {
      isVip: true, vipHandle: user.displayName || "Member", redeemedCode: code.trim().toUpperCase(),
    });
  });
}

// Guards a VIP-only page. Redirects non-members to vip-login.html.
export function requireVip(redirectTo = "vip-login.html") {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) { location.href = redirectTo; return; }
      const profile = await getDoc(doc(db, "users", user.uid));
      if (!profile.exists() || profile.data().isVip !== true) { location.href = redirectTo; return; }
      resolve({ user, profile: profile.data() });
    });
  });
}
