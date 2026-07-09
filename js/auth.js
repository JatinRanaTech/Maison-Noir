// ============================================================================
// AUTHENTICATION
// Firebase Auth only natively supports email/password - there is no built-in
// "username" field. To let shoppers sign up/log in with a custom username
// (as requested), we keep a small Firestore lookup table:
//
//   usernames/{usernameLowercase} -> { email, uid }
//
// Sign-up: user picks a username -> we check it's free -> create the Firebase
// Auth account with their email -> write the username->email mapping ->
// write their public profile to users/{uid}.
//
// Login: user types EITHER their username OR their email. If it doesn't
// contain "@", we look it up in `usernames/` to resolve the real email,
// then sign in normally with signInWithEmailAndPassword.
// ============================================================================
import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, updateProfile, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { toast } from "./utils.js";
import { hydrateCartFromCloud } from "./cart.js";
import { hydrateWishlistFromCloud } from "./wishlist.js";

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function currentUser() {
  return auth.currentUser;
}

async function usernameTaken(username) {
  const snap = await getDoc(doc(db, "usernames", username.toLowerCase()));
  return snap.exists();
}

export async function signUp({ username, email, password, fullName }) {
  username = username.trim();
  if (!/^[a-zA-Z0-9_.]{3,20}$/.test(username)) {
    throw new Error("Username must be 3-20 characters (letters, numbers, _ or .)");
  }
  if (await usernameTaken(username)) {
    throw new Error("That username is already taken");
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: fullName || username });

  // Reserve the username -> email mapping (used to resolve logins by username)
  await setDoc(doc(db, "usernames", username.toLowerCase()), {
    email, uid: cred.user.uid,
  });

  // Public-ish profile document
  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid, username, email, fullName: fullName || "",
    createdAt: Date.now(), isVip: false, vipHandle: "",
  });

  return cred.user;
}

export async function logIn({ identifier, password }) {
  identifier = identifier.trim();
  let email = identifier;
  if (!identifier.includes("@")) {
    const snap = await getDoc(doc(db, "usernames", identifier.toLowerCase()));
    if (!snap.exists()) throw new Error("No account found with that username");
    email = snap.data().email;
  }
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await Promise.all([hydrateCartFromCloud(), hydrateWishlistFromCloud()]);
  return cred.user;
}

export async function logOut() {
  await signOut(auth);
  toast("Signed out");
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, "users", uid), data);
  if (data.fullName && auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: data.fullName });
  }
}

// Guards a page that requires a signed-in shopper. Redirects to login.html if not.
export function requireAuth(redirectTo = "login.html") {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (!user) { location.href = redirectTo; return; }
      resolve(user);
    });
  });
}
