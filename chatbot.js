/* ==========================================
   Chatbot Widget (Frontend)
   - Minimal UI + message handling
   - Calls a "chat provider" function
   - Later: swap provider to real /api/chat
========================================== */

/* ---------------------------
   1) Widget configuration
---------------------------- */
const CHATBOT_CONFIG = {
  botName: "Site Helper",
  botSubtitle: "Free demo (FAQ-based)",
  // Later, when backend exists, set useBackend = true
  useBackend: false,
  endpoint: "/api/chat",
};

/* ---------------------------
   2) Boot the widget
---------------------------- */
initChatbotWidget();

function initChatbotWidget() {
  const root = document.getElementById("chatbot-root");
  if (!root) {
    console.warn("Chatbot root element not found (#chatbot-root).");
    return;
  }

  // Build UI
  root.innerHTML = `
    <button class="chatbot-launcher" id="chatbot-launcher" aria-label="Open chat">
      Chat
    </button>

    <section class="chatbot-panel" id="chatbot-panel" aria-live="polite">
      <header class="chatbot-header">
        <div class="chatbot-title">
          <strong>${escapeHtml(CHATBOT_CONFIG.botName)}</strong>
          <span>${escapeHtml(CHATBOT_CONFIG.botSubtitle)}</span>
        </div>
        <button class="chatbot-close" id="chatbot-close" aria-label="Close chat">✕</button>
      </header>

      <div class="chatbot-messages" id="chatbot-messages"></div>

      <form class="chatbot-inputbar" id="chatbot-form">
        <input
          class="chatbot-input"
          id="chatbot-input"
          type="text"
          placeholder="Ask me something..."
          autocomplete="off"
        />
        <button class="chatbot-send" id="chatbot-send" type="submit">Send</button>
      </form>
    </section>
  `;

  // Wire up behavior
  const launcher = document.getElementById("chatbot-launcher");
  const panel = document.getElementById("chatbot-panel");
  const closeBtn = document.getElementById("chatbot-close");
  const form = document.getElementById("chatbot-form");
  const input = document.getElementById("chatbot-input");

  launcher.addEventListener("click", () => {
    panel.classList.add("is-open");
    input.focus();

    // First-time greeting
    if (!panel.dataset.greeted) {
      panel.dataset.greeted = "true";
      addBotMessage("Hey! Ask me about hours, pricing, booking, or services.");
    }
  });

  closeBtn.addEventListener("click", () => {
    panel.classList.remove("is-open");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    addUserMessage(text);

    // Optional typing indicator
    const typingId = addTypingIndicator();

    try {
      const reply = await chatProvider(text);
      removeTypingIndicator(typingId);
      addBotMessage(reply);
    } catch (err) {
      removeTypingIndicator(typingId);
      addBotMessage("Sorry — something went wrong. Try again.");
      console.error(err);
    }
  });
}

/* ---------------------------
   3) UI helpers
---------------------------- */
function addUserMessage(text) {
  addMessageRow("user", text);
}

function addBotMessage(text) {
  addMessageRow("bot", text);
}

function addMessageRow(role, text) {
  const messages = document.getElementById("chatbot-messages");
  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const row = document.createElement("div");
  row.className = `chatbot-row ${role}`;

  row.innerHTML = `
    <div>
      <div class="chatbot-bubble">${escapeHtml(text)}</div>
      <div class="chatbot-meta">${time}</div>
    </div>
  `;

  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
}

function addTypingIndicator() {
  const messages = document.getElementById("chatbot-messages");
  const id = `typing-${crypto.randomUUID()}`;

  const row = document.createElement("div");
  row.className = "chatbot-row bot";
  row.id = id;

  row.innerHTML = `
    <div class="chatbot-bubble">
      <span class="typing" aria-label="Bot is typing">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </span>
    </div>
  `;

  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------------------------
   4) Chat provider (architecture)
   - This is the key “professional” seam.
   - Today: use fakeApiChat() (free canned responses)
   - Later: use fetch("/api/chat") to a real backend
---------------------------- */
async function chatProvider(userText) {
  if (CHATBOT_CONFIG.useBackend) {
    return backendChat(userText);
  }
  return fakeApiChat(userText);
}

/* Frontend → backend (later) */
async function backendChat(userText) {
  const res = await fetch(CHATBOT_CONFIG.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: userText }),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.reply || "No reply field returned.";
}

/* Free “local engine” for now (we’ll improve this next step) */
async function fakeApiChat(userText) {
  // Simulate network delay
  await sleep(350);

  // For now: placeholder
  return `You said: "${userText}". Next step: we’ll add the FAQ JSON + matching logic.`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
