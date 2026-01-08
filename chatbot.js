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
/* ------------------------------------------
   FREE FAQ "response engine" (front-end only)
   - Small JSON knowledge base
   - Keyword matching with scoring
   - Basic multi-turn memory (lastTopic)
------------------------------------------- */

// A tiny FAQ knowledge base (edit this anytime)
const FAQ_KB = [
  {
    topic: "hours",
    keywords: [
      "hours",
      "open",
      "close",
      "closing",
      "schedule",
      "weekdays",
      "weekends",
    ],
    answer: "We’re open Mon–Fri 9am–6pm, Sat 10am–4pm, and closed Sundays.",
  },
  {
    topic: "pricing",
    keywords: ["price", "pricing", "cost", "rates", "how much", "fee"],
    answer:
      "Pricing depends on the service. Tell me what you’re looking for and I’ll point you in the right direction.",
  },
  {
    topic: "booking",
    keywords: [
      "book",
      "booking",
      "appointment",
      "schedule",
      "reserve",
      "availability",
    ],
    answer:
      "You can book by using our contact form. If you tell me the service + day, I’ll suggest next steps.",
  },
  {
    topic: "services",
    keywords: [
      "services",
      "offer",
      "do you do",
      "tattoo",
      "hair",
      "nails",
      "esthetician",
      "facial",
    ],
    answer:
      "We offer hair, nails, skincare, and tattoo services. What service are you interested in?",
  },
];

// Basic “memory” for multi-turn feel
const CHAT_MEMORY = {
  lastTopic: null,
};

async function fakeApiChat(userText) {
  // Simulate network delay (keeps the UI feeling realistic)
  await sleep(350);

  const input = normalize(userText);

  // 1) If user gives a super short follow-up, try using lastTopic
  // Example: user asks about pricing, bot answers, user says "what about weekends?"
  if (isShortFollowUp(input) && CHAT_MEMORY.lastTopic) {
    const follow = answerFromTopic(CHAT_MEMORY.lastTopic, input);
    if (follow) return follow;
  }

  // 2) Score each FAQ by keyword matches
  const best = findBestFaqMatch(input);

  // 3) If we found a confident match, return it
  if (best && best.score >= 1) {
    CHAT_MEMORY.lastTopic = best.faq.topic;

    // Optional: add a tiny “clarifying question” behavior for certain topics
    if (best.faq.topic === "pricing") {
      return `${best.faq.answer} For example: hair, nails, skincare, or tattoo?`;
    }

    return best.faq.answer;
  }

  // 4) Fallback
  return "I’m not totally sure yet — can you rephrase that, or choose one: hours, pricing, booking, services?";
}

/* ---------------------------
   Matching helpers
---------------------------- */

function findBestFaqMatch(input) {
  let best = null;

  for (const faq of FAQ_KB) {
    let score = 0;

    for (const kw of faq.keywords) {
      const kwNorm = normalize(kw);

      // If the keyword is a phrase, we check substring match
      if (kwNorm.includes(" ")) {
        if (input.includes(kwNorm)) score += 2;
      } else {
        // Word match (simple but solid)
        if (hasWord(input, kwNorm)) score += 1;
      }
    }

    if (!best || score > best.score) {
      best = { faq, score };
    }
  }

  return best;
}

function answerFromTopic(topic, input) {
  // Let a follow-up get routed to the same topic if user still mentions related words
  const faq = FAQ_KB.find((f) => f.topic === topic);
  if (!faq) return null;

  // If user mentions any keyword from the same topic, answer
  for (const kw of faq.keywords) {
    const kwNorm = normalize(kw);
    if (kwNorm.includes(" ")) {
      if (input.includes(kwNorm)) return faq.answer;
    } else {
      if (hasWord(input, kwNorm)) return faq.answer;
    }
  }

  // If it’s short AND doesn’t match keywords, we can still give a gentle prompt
  if (isShortFollowUp(input)) {
    return `When you say "${input}", are you asking about ${topic}? If yes, here’s the info: ${faq.answer}`;
  }

  return null;
}

function normalize(str) {
  return String(str).toLowerCase().trim();
}

function hasWord(text, word) {
  // Avoid matching "book" inside "facebook" etc.
  const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, "i");
  return pattern.test(text);
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isShortFollowUp(input) {
  // Very basic: short message = likely follow-up
  // (You can tune this later)
  const wordCount = input.split(/\s+/).filter(Boolean).length;
  return wordCount <= 4;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
