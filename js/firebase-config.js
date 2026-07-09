// ============================================================================
// FIREBASE CONFIGURATION
// Replace the values below with YOUR Firebase project's config object.
// Firebase Console -> Project settings -> General -> "Your apps" -> Web app -> SDK config
// These values are NOT secret (they identify your project, not authenticate
// requests) - real security comes from Firestore/Storage Security Rules,
// which is why this file is safe to ship to the browser / commit to a public
// repo. See README.md "Firebase Setup" section for the full walkthrough.
// ============================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, connectFirestoreEmulator
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getStorage, connectStorageEmulator
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCvxhBpJfWnAKM6tK6dhDHY8jT7DiGiO-E",
  authDomain: "netflix-clone-cf2b0.firebaseapp.com",
  projectId: "netflix-clone-cf2b0",
  storageBucket: "netflix-clone-cf2b0.firebasestorage.app",
  messagingSenderId: "938735833553",
  appId: "1:938735833553:web:b72b306e86d5c0a4cc90f0",
  measurementId: "G-VGJBVSKPDB"
}
// ----------------------------------------------------------------------------
// FEATURE FLAG: Cloud Storage now requires the Blaze (pay-as-you-go) plan on
// Firebase (this changed in 2024-2026 - the free Spark plan no longer
// provisions Storage buckets). Blaze still has a generous free-forever quota,
// so most small projects pay $0 - but it does require adding a billing card.
//
// If you want to stay on the pure no-card Spark plan, set this to true and
// the app will store chat images as base64 strings directly inside Firestore
// documents instead of using Firebase Storage. This works fine for small
// images/avatars but Firestore caps a single document at 1MB, and it will
// NOT work for video/audio/zip/docx attachments (those require Storage).
// See README.md for the full explanation.
// ----------------------------------------------------------------------------
export const USE_BASE64_FALLBACK = true;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = USE_BASE64_FALLBACK ? null : getStorage(app);

// ----------------------------------------------------------------------------
// LOCAL EMULATOR SUPPORT (optional, for local dev without touching prod data)
// Uncomment if you run `firebase emulators:start`
// ----------------------------------------------------------------------------
// if (location.hostname === "localhost") {
//   connectAuthEmulator(auth, "http://localhost:9099");
//   connectFirestoreEmulator(db, "localhost", 8080);
//   if (storage) connectStorageEmulator(storage, "localhost", 9199);
// }


// rules_version = '2';

// service cloud.firestore {
//   match /databases/{database}/documents {

    // This rule allows anyone with your Firestore database reference to view, edit,
    // and delete all data in your Firestore database. It is useful for getting
    // started, but it is configured to expire after 30 days because it
    // leaves your app open to attackers. At that time, all client
    // requests to your Firestore database will be denied.
    //
    // Make sure to write security rules for your app before that time, or else
    // all client requests to your Firestore database will be denied until you Update
    // your rules
//     match /{document=**} {
//       allow read, write: if request.time < timestamp.date(2025, 8, 29);
//     }
//   }
// }
