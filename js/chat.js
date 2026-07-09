// ============================================================================
// VIP PORTAL - REAL-TIME CHAT (Cloud Firestore + Firebase Storage)
//
// Firestore layout:
//   users/{uid}                          profile + presence (isVip, lastActive)
//   conversations/{convId}                { participants:[uidA,uidB], participantInfo, lastMessage, lastMessageAt, unread:{uid:n}, wallpaper }
//   conversations/{convId}/messages/{id}  { senderId, type, text, fileUrl, fileName, fileType, fileSize, createdAt, readBy:[uid], replyTo? }
//   conversations/{convId}/typing/{uid}   { isTyping, updatedAt }
//
// Presence: Firestore has no built-in "disconnect" hook like Realtime
// Database, so presence here is a lightweight heartbeat - each open tab
// touches users/{uid}.lastActive every 20s, and everyone else treats a
// member as "online" if their lastActive is under ~30s old. This is the
// standard Firestore-only approach; for pixel-perfect presence you'd add
// Realtime Database purely for onDisconnect(), but that's optional.
// ============================================================================
import { auth, db, storage, USE_BASE64_FALLBACK } from "./firebase-config.js";
import {
  doc, setDoc, updateDoc, getDoc, getDocs, addDoc, collection, query, where,
  orderBy, onSnapshot, serverTimestamp, limit, arrayUnion, increment, Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { readFileAsDataURL } from "./utils.js";

const ONLINE_WINDOW_MS = 30000;
let heartbeatTimer;

export function startPresenceHeartbeat() {
  const user = auth.currentUser;
  if (!user) return;
  const beat = () => updateDoc(doc(db, "users", user.uid), { lastActive: Date.now() }).catch(() => {});
  beat();
  heartbeatTimer = setInterval(beat, 20000);
  window.addEventListener("beforeunload", () => {
    updateDoc(doc(db, "users", user.uid), { lastActive: 0 }).catch(() => {});
  });
}
export function stopPresenceHeartbeat() { clearInterval(heartbeatTimer); }

export function isOnline(lastActive) {
  return lastActive && Date.now() - lastActive < ONLINE_WINDOW_MS;
}

export async function listVipMembers(excludeUid) {
  const q = query(collection(db, "users"), where("isVip", "==", true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data()).filter((u) => u.uid !== excludeUid);
}

function conversationId(uidA, uidB) {
  return [uidA, uidB].sort().join("__");
}

export async function createOrGetConversation(otherUid, otherProfile) {
  const me = auth.currentUser;
  const convId = conversationId(me.uid, otherUid);
  const ref = doc(db, "conversations", convId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const myProfile = await getDoc(doc(db, "users", me.uid));
    await setDoc(ref, {
      participants: [me.uid, otherUid],
      participantInfo: {
        [me.uid]: { username: myProfile.data()?.username || "Member", photoURL: myProfile.data()?.photoURL || "" },
        [otherUid]: { username: otherProfile.username || "Member", photoURL: otherProfile.photoURL || "" },
      },
      lastMessage: "", lastMessageAt: serverTimestamp(),
      unread: { [me.uid]: 0, [otherUid]: 0 },
      wallpaper: "", // default no wallpaper
    });
  }
  return convId;
}

export function listenConversations(uid, callback) {
  const q = query(collection(db, "conversations"), where("participants", "array-contains", uid), orderBy("lastMessageAt", "desc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => console.warn("conv listener:", err.message));
}

export function listenMessages(convId, callback) {
  const q = query(collection(db, "conversations", convId, "messages"), orderBy("createdAt", "asc"), limit(200));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), (err) => console.warn("msg listener:", err.message));
}

export function listenTyping(convId, otherUid, callback) {
  const ref = doc(db, "conversations", convId, "typing", otherUid);
  return onSnapshot(ref, (snap) => callback(snap.exists() && snap.data().isTyping));
}

export async function setTyping(convId, isTyping) {
  const me = auth.currentUser;
  await setDoc(doc(db, "conversations", convId, "typing", me.uid), { isTyping, updatedAt: Date.now() });
}

// Modified sendMessage: now accepts an optional replyTo { id, text }
export async function sendMessage(convId, otherUid, { type = "text", text = "", file = null, replyTo = null } = {}) {
  const me = auth.currentUser;
  const msg = { senderId: me.uid, type, text, createdAt: serverTimestamp(), readBy: [me.uid] };

  if (file) {
    Object.assign(msg, await attachFile(convId, file));
    msg.type = msg.type || type;
  }

  if (replyTo) {
    msg.replyTo = { id: replyTo.id, text: replyTo.text };
  }

  await addDoc(collection(db, "conversations", convId, "messages"), msg);
  await updateDoc(doc(db, "conversations", convId), {
    lastMessage: type === "text" ? text : `📎 ${file?.name || "Attachment"}`,
    lastMessageAt: serverTimestamp(),
    [`unread.${otherUid}`]: increment(1),
  });
  await setTyping(convId, false);
}

// Uploads to Firebase Storage, or falls back to base64-in-Firestore for
// small images if USE_BASE64_FALLBACK is enabled (Spark/no-Storage mode).
async function attachFile(convId, file, onProgress) {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");

  if (USE_BASE64_FALLBACK) {
    if (!isImage) throw new Error("This deployment is running without Firebase Storage (free-tier mode), which only supports image attachments. See README to enable Storage.");
    if (file.size > 700 * 1024) throw new Error("Image too large for base64 fallback mode (700KB max). Enable Firebase Storage for larger files.");
    const dataUrl = await readFileAsDataURL(file);
    return { fileUrl: dataUrl, fileName: file.name, fileType: file.type, fileSize: file.size, type: isImage ? "image" : "file" };
  }

  const { ref, uploadBytesResumable, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js");
  const path = `chat-uploads/${convId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);

  await new Promise((resolve, reject) => {
    task.on("state_changed",
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject, resolve);
  });
  const fileUrl = await getDownloadURL(storageRef);
  return {
    fileUrl, fileName: file.name, fileType: file.type, fileSize: file.size,
    type: isImage ? "image" : isVideo ? "video" : isAudio ? "audio" : "file",
  };
}

export { attachFile };

export async function markConversationRead(convId, uid) {
  await updateDoc(doc(db, "conversations", convId), { [`unread.${uid}`]: 0 });
}

export function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function notifyNewMessage(senderName, text) {
  if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
    new Notification(`${senderName} on MAISON NOIR VIP`, { body: text || "Sent an attachment", icon: "/assets/images/logo-mark.png" });
  }
}