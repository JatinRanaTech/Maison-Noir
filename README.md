# MAISON NOIR — Fashion E-Commerce + VIP Members Portal

A full-stack fashion e-commerce site built with **HTML5 / CSS3 / vanilla JavaScript (ES modules)** on the frontend and **Firebase** (Auth + Firestore + Storage) on the backend. No Node/Django/PHP server required — it's a static site that talks directly to Firebase, deployable on **Vercel** as-is.

---

## 1. What's actually in this project

```
fashion-ecommerce/
├── index.html                 Homepage
├── shop.html                  Catalog with filters/sort
├── product.html                Product detail page
├── cart.html
├── wishlist.html
├── checkout.html               Simulated payment
├── order-confirmation.html
├── login.html                  Sign in / sign up (shop accounts)
├── account.html                Profile + order history
├── vip-login.html              VIP-only sign-in / invite redemption
├── vip-portal.html             VIP real-time chat
├── admin-seed.html             Dev-only: push demo products / mint invites
├── css/
│   ├── tokens.css              Design tokens (colors, type, spacing)
│   ├── base.css                Reset, layout, nav, buttons, forms
│   └── components.css          Product cards, cart, chat, etc.
├── js/
│   ├── firebase-config.js      ⚠️ YOU edit this (your project keys)
│   ├── utils.js                 Shared helpers (toast, formatting, validation)
│   ├── theme.js                 Dark/light mode
│   ├── nav.js                   Shared nav interactivity
│   ├── products.js              Catalog + seed data + Firestore fetch
│   ├── cart.js / wishlist.js    localStorage + cloud sync
│   ├── auth.js                  Sign up / log in / reset password
│   ├── vip-auth.js              VIP authorization layer
│   ├── checkout.js              Simulated payment + order creation
│   ├── orders.js                Order history queries
│   └── chat.js                  Real-time messaging, presence, file upload
└── firebase/
    ├── firestore.rules          Security rules (paste into Firebase Console)
    └── storage.rules            Security rules for file uploads
```

**Honesty note on scope:** every feature in the brief is implemented — catalog, filters/sort, PDP with zoom/gallery, cart, checkout with simulated payment, wishlist, order history, auth, and a fully real-time VIP chat with typing indicators, presence, read receipts, and file sharing (images/video/audio/PDF/zip/docx/xlsx). A few things are intentionally simple rather than "enterprise": there's no server-side pagination (the demo catalog is small), reviews are static demo content rather than a full review-submission pipeline, and payment is explicitly simulated per your brief. All of these are easy to extend once you're on real infrastructure.

---

## 2. Firebase Setup (step by step)

### 2.1 Create the project
1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. Name it (e.g. `maison-noir`), disable Google Analytics if you don't need it (keeps things simpler), click **Create**.

### 2.2 Register a Web App
1. In your new project, click the **`</>`** (web) icon on the project overview page.
2. Give it a nickname, **do not** check "Firebase Hosting" (you're deploying to Vercel instead).
3. Firebase shows you a `firebaseConfig` object. Copy it.
4. Open `js/firebase-config.js` in this project and paste your values in, replacing the placeholders:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "maison-noir.firebaseapp.com",
  projectId: "maison-noir",
  storageBucket: "maison-noir.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

These values are safe to ship to the browser / commit publicly — they identify your project, they don't authenticate anything. Real security lives in the **Security Rules** (step 2.6).

### 2.3 Enable Authentication
1. Firebase Console → **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. That's it — no other provider is needed. (See section 4 for how "usernames" work on top of this.)

### 2.4 Enable Firestore (free, Spark plan)
1. **Build → Firestore Database → Create database**.
2. Choose **Start in production mode** (we're supplying our own rules).
3. Pick a region close to your users.
4. Firestore's free (Spark) quota: 1 GiB stored, 50k reads/day, 20k writes/day, 20k deletes/day — plenty for a demo/small store.

### 2.5 Storage & the Blaze plan (important — read this)
This is the part that affects your "free tier" plan directly:

> As of Feb 2026, Firebase **requires the Blaze (pay-as-you-go) plan to provision or use Cloud Storage at all** — the old no-card Spark plan can no longer create Storage buckets. This is a real policy change from Google, not something this project can work around.

Blaze is still **free for small usage** — you only pay if you exceed the generous no-cost quota (5 GB stored, 1 GB/day downloaded on the default bucket), but Google does require you add a billing card to enable it. If you go over quota, you're billed per-GB (a few dollars, and you can set budget alerts).

You have two options:

**Option A — Recommended: enable Blaze.**
1. Console → ⚙️ **Project settings → Usage and billing → Modify plan → Blaze**.
2. Add a billing account (a card). You won't be charged unless you exceed the free quota.
3. **Build → Storage → Get started** to provision your bucket.
4. Copy `firebase/storage.rules` into Console → Storage → Rules → Publish.
5. Leave `USE_BASE64_FALLBACK = false` in `js/firebase-config.js` (the default). File sharing in VIP chat (images, video, audio, PDF, zip, docx, xlsx) will work exactly as built.

**Option B — Stay card-free (Spark only), reduced chat features.**
1. Leave Storage disabled in the console.
2. In `js/firebase-config.js`, set `export const USE_BASE64_FALLBACK = true;`
3. The chat will store **small images only** (≤700KB, encoded as base64 directly inside Firestore messages — Firestore's 1MB/document limit is the ceiling here). Video/audio/PDF/zip/docx attachments will show a friendly error telling the sender to ask you to enable Storage.
4. Everything else (shop, auth, cart, checkout, text chat, presence, typing, read receipts) works identically either way.

### 2.6 Apply Security Rules (this is what actually secures your data)
1. Console → **Firestore Database → Rules** tab → delete the default content → paste in the entire contents of `firebase/firestore.rules` from this project → **Publish**.
2. Open `firebase/firestore.rules` in your editor first and replace `"REPLACE_WITH_YOUR_ADMIN_UID"` with your own UID (Console → Authentication → Users → copy the UID after you've signed up once through `login.html`).
3. If you enabled Storage (Option A above): Console → **Storage → Rules** → paste `firebase/storage.rules` → **Publish**.

### 2.7 Composite index (order history)
The first time you view `account.html`'s Order History, Firestore may show a console error with a link like *"This query requires an index — click here to create it."* Click that link once (it's free, takes ~1 minute to build), or manually create a composite index on the `orders` collection: `userId` (Ascending) + `createdAt` (Descending).

### 2.8 Seed sample products
Open `admin-seed.html` in your browser (locally or after deploying), sign in with your admin account, and click **"Seed Products to Firestore."** Until you do this, the site automatically falls back to an in-memory demo catalog defined in `js/products.js`, so it's never blank — but Firestore-backed products are what let filtering/sorting reflect real inventory changes across sessions.

**Remove or password-protect `admin-seed.html` before a public launch** — it's a developer tool, not a customer-facing page.

---

## 3. Deploying to Vercel

1. Push this folder to a GitHub repo.
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Framework preset: **Other** (it's static HTML — no build step needed).
4. Output directory: leave as root (`.`) since these are plain `.html` files at the project root.
5. Deploy. Because `js/firebase-config.js` already contains your Firebase keys as plain values (not env vars — this is normal and safe for Firebase web config, see 2.2), there's nothing else to configure.
6. In Firebase Console → Authentication → Settings → **Authorized domains**, add your Vercel domain (e.g. `maison-noir.vercel.app`) so sign-in works there too.

---

## 4. How the custom username/password login works

Firebase Authentication is natively email + password only — there's no built-in "username" field. To give you the username-based login you asked for (for both the shop and VIP area, since they share one account system), the app keeps a small lookup table in Firestore:

```
usernames/{usernameLowercase} → { email, uid }
```

**Sign-up (`login.html` → Create Account tab):**
1. Shopper picks a username, email, password.
2. `js/auth.js` checks `usernames/{username}` doesn't already exist.
3. Creates the real Firebase Auth account with their email/password.
4. Writes the `usernames/{username} → email` mapping and a `users/{uid}` profile document.

**Sign-in (`login.html` → Sign In tab):**
1. Shopper types either their **username or email** into one field.
2. If it doesn't contain `@`, `js/auth.js` looks it up in `usernames/` to resolve the real email.
3. Signs in normally via `signInWithEmailAndPassword`.

This means **one account, one password**, usable to log into both the shop and (if authorized) the VIP portal — you don't need two separate credential systems.

### VIP area authentication specifically
The VIP portal deliberately reuses the same login system (nobody wants two passwords), but gates the *portal itself* behind a second, independent flag: `users/{uid}.isVip === true` in Firestore. Two ways to grant VIP status:

- **Manual (simplest, best for a small hand-picked community):** Firebase Console → Firestore → `users/{their-uid}` → set `isVip: true`. Done — they can now sign in at `vip-login.html`.
- **Invite codes:** generate a code from `admin-seed.html` ("Mint a VIP Invite Code"), give it to the member, they redeem it under the "Redeem Invite" tab on `vip-login.html` after signing into their shop account. This flips `isVip` to `true` for them automatically, validated by `firestore.rules` so a code can't be reused or forged.

Security note: the invite-code path is enforced by Firestore Security Rules (a client can't just fake `isVip: true` — the rule cross-checks that a real, unused invite code exists), which is solid for a small community. If you later need airtight, tamper-proof VIP provisioning at scale (e.g. paid memberships), the more bulletproof approach is a Cloud Function using the Admin SDK — outside the scope of this card-free/serverless setup, but straightforward to add later.

---

## 5. Local development

No build step or bundler is required — it's plain ES modules loaded via `<script type="module">`. You do need to serve the files over HTTP (not `file://`) for ES module imports to work. Any static server works, e.g.:

```bash
npx serve .
# or
python3 -m http.server 5500
```

Then visit `http://localhost:5500`.

---

## 6. Extending this for a real launch

- **Payments:** swap `js/checkout.js`'s `simulatePayment()` for a real processor (Stripe Elements, etc.). Keep any secret key server-side — never call a processor's secret-key endpoints from this browser code. That likely means adding one small serverless function (Vercel Functions or a Firebase Cloud Function) purely for the payment step.
- **Admin/back-office:** right now inventory and order-status changes happen via the Firebase Console or `admin-seed.html`. A real back office would be a separate authenticated app using the Admin SDK.
- **Search:** filtering is client-side, fine for hundreds of products; for thousands, add Algolia or Firestore's newer full-text search extensions.
- **Presence:** chat presence uses a lightweight Firestore heartbeat (good enough for a members' chat). For instant offline-detection, add Realtime Database purely for its `onDisconnect()` hook alongside Firestore.
