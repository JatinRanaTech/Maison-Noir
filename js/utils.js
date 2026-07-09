// Shared, dependency-free helper functions used across the site.

export function formatCurrency(amount, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function formatDate(date) {
  const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d);
}

export function formatTime(date) {
  const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(d);
}

export function relativeTime(date) {
  const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(d);
}

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function escapeHtml(str = "") {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

export function slugify(str = "") {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function starString(rating = 0) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ----- Toast notifications -----
export function toast(message, type = "default", timeout = 3200) {
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = `toast ${type === "error" ? "toast-error" : type === "success" ? "toast-success" : ""}`;
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s, transform .3s";
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    setTimeout(() => el.remove(), 300);
  }, timeout);
}

// ----- Simple validation helpers -----
export const validators = {
  required: (v) => (v?.toString().trim().length > 0) || "This field is required",
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Enter a valid email address",
  minLength: (n) => (v) => (v?.length >= n) || `Must be at least ${n} characters`,
  phone: (v) => /^[+]?[\d\s()-]{7,16}$/.test(v) || "Enter a valid phone number",
  postal: (v) => /^[A-Za-z0-9\s-]{3,10}$/.test(v) || "Enter a valid postal code",
  cardNumber: (v) => /^\d{13,19}$/.test(v.replace(/\s/g, "")) || "Enter a valid card number",
  cardExpiry: (v) => /^(0[1-9]|1[0-2])\/\d{2}$/.test(v) || "Use MM/YY format",
  cvv: (v) => /^\d{3,4}$/.test(v) || "Enter a valid CVV",
};

// Validates a <form> against a rules map: { fieldName: [validatorFns] }
// Adds/removes `.has-error` + fills `.error` text next to each field.
export function validateForm(form, rules) {
  let valid = true;
  for (const [name, fns] of Object.entries(rules)) {
    const input = form.elements[name];
    if (!input) continue;
    const fieldWrap = input.closest(".field") || input.parentElement;
    const errorEl = fieldWrap.querySelector(".error");
    let message = "";
    for (const fn of fns) {
      const result = fn(input.value);
      if (result !== true) { message = result; break; }
    }
    if (message) {
      valid = false;
      fieldWrap.classList.add("has-error");
      if (errorEl) errorEl.textContent = message;
    } else {
      fieldWrap.classList.remove("has-error");
    }
  }
  return valid;
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function fileIcon(mimeOrName = "") {
  const s = mimeOrName.toLowerCase();
  if (s.includes("pdf")) return "📕";
  if (s.includes("zip") || s.includes("rar")) return "🗜️";
  if (s.includes("word") || s.includes("doc")) return "📄";
  if (s.includes("excel") || s.includes("sheet") || s.includes("csv")) return "📊";
  if (s.includes("audio") || s.includes("mp3")) return "🎵";
  return "📎";
}

export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
