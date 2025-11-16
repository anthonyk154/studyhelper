// script.js – pure front-end app, no backend needed

const heroGetStarted = document.getElementById("heroGetStarted");
const builderSection = document.getElementById("builderSection");

const packTitle = document.getElementById("packTitle");
const packNotes = document.getElementById("packNotes");
const createPackBtn = document.getElementById("createPackBtn");
const generatePackBtn = document.getElementById("generatePackBtn");
const packError = document.getElementById("packError");
const packsList = document.getElementById("packsList");
const clearAllBtn = document.getElementById("clearAllBtn");

const STORAGE_KEY = "aiStudyNotes_packs_v2";

let packs = [];

// ---------- storage helpers ----------

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
  } catch (err) {
    console.error("Failed to save packs:", err);
  }
}

// ---------- fake AI generation (all local) ----------

function generateFromNotes(title, notes) {
  // basic summary: first 400 characters
  const trimmed = notes.trim();
  const summarySource =
    trimmed.length > 400 ? trimmed.slice(0, 400) + "..." : trimmed;
  const summary = "Summary (auto): " + summarySource;

  // sentences / lines → key points
  const sentences = trimmed
    .split(/[\.\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const keyPoints = sentences.slice(0, 6).map((s) => "• " + s);

  // simple flashcards: front is short question, back is sentence
  const flashcards = sentences.slice(0, 6).map((s, idx) => ({
    front: `Key idea #${idx + 1} about ${title}`,
    back: s,
  }));

  // simple quiz questions
  const quizQuestions = sentences.slice(0, 4).map((s, idx) => {
    const correct = s;
    const fake1 = "This option is incorrect but related.";
    const fake2 = "This is a random wrong answer.";
    const options = [correct, fake1, fake2].sort(() => Math.random() - 0.5);
    const correctIndex = options.indexOf(correct);
    return {
      question: `What is an important fact about ${title}?`,
      options,
      correctIndex,
      explanation: `The correct idea is: "${correct}".`,
    };
  });

  return {
    summary,
    keyPoints,
    flashcards,
    quizQuestions,
  };
}

// ---------- render UI ----------

function renderPacks() {
  if (!packs.length) {
    packsList.innerHTML = "<p>You don’t have any Study Packs yet.</p>";
    return;
  }

  packsList.innerHTML = "";
  packs
    .slice()
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .forEach((p) => {
      const div = document.createElement("div");
      div.className = "pack-item";
      const createdAt = new Date(p.createdAt).toLocaleString();
      const kpCount = (p.keyPoints || []).length;
      const fcCount = (p.flashcards || []).length;
      const qCount = (p.quizQuestions || []).length;

      div.innerHTML = `
        <div class="pack-item-header">
          <div>
            <h4>${p.title}</h4>
            <div class="pack-meta">Created: ${createdAt}</div>
          </div>
          <div>
            <button class="small-btn" data-id="${p.id}" data-action="toggle">
              Details
            </button>
            <button class="small-btn danger" data-id="${p.id}" data-action="delete">
              Delete
            </button>
          </div>
        </div>
        <div class="pack-summary">${
          p.summary || "No summary yet."
        }</div>
        <div class="pack-badges">
          <span class="badge">${kpCount} key points</span>
          <span class="badge">${fcCount} flashcards</span>
          <span class="badge">${qCount} quiz questions</span>
        </div>
        <div class="pack-details" data-id="${p.id}" style="display:none;">
          ${
            p.keyPoints && p.keyPoints.length
              ? `<strong>Key Points:</strong><br>${p.keyPoints
                  .map((kp) => kp)
                  .join("<br>")}`
              : "<em>No key points generated.</em>"
          }
          ${
            p.quizQuestions && p.quizQuestions.length
              ? `<br><br><strong>Example Question:</strong><br>${
                  p.quizQuestions[0].question
                }`
              : ""
          }
        </div>
      `;
      packsList.appendChild(div);
    });
}

// ---------- events ----------

if (heroGetStarted) {
  heroGetStarted.addEventListener("click", () => {
    builderSection.scrollIntoView({ behavior: "smooth" });
    packTitle.focus();
  });
}

createPackBtn.addEventListener("click", () => {
  packError.textContent = "";
  const title = packTitle.value.trim();
  const notes = packNotes.value.trim();

  if (!title) {
    packError.textContent = "Title is required.";
    return;
  }

  const pack = {
    id: Date.now().toString(),
    title,
    notes,
    summary:
      "Manual pack (no auto summary). You can later regenerate this topic with the AI button.",
    keyPoints: [],
    flashcards: [],
    quizQuestions: [],
    createdAt: new Date().toISOString(),
  };

  packs.push(pack);
  saveToStorage();
  renderPacks();

  packTitle.value = "";
  packNotes.value = "";
});

// Generate with local “AI”
generatePackBtn.addEventListener("click", () => {
  packError.textContent = "";
  const title = packTitle.value.trim();
  const notes = packNotes.value.trim();

  if (!title || !notes) {
    packError.textContent = "Title and notes are required for AI generation.";
    return;
  }

  const originalText = generatePackBtn.textContent;
  generatePackBtn.disabled = true;
  createPackBtn.disabled = true;
  generatePackBtn.textContent = "Generating...";

  try {
    const generated = generateFromNotes(title, notes);
    const pack = {
      id: Date.now().toString(),
      title,
      notes,
      ...generated,
      createdAt: new Date().toISOString(),
    };

    packs.push(pack);
    saveToStorage();
    renderPacks();

    packTitle.value = "";
    packNotes.value = "";
  } catch (err) {
    console.error(err);
    packError.textContent = "Something went wrong generating the pack.";
  } finally {
    generatePackBtn.disabled = false;
    createPackBtn.disabled = false;
    generatePackBtn.textContent = originalText;
  }
});

// Delete / toggle details (event delegation)
packsList.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if (!id || !action) return;

  if (action === "delete") {
    const confirmDelete = confirm("Delete this Study Pack?");
    if (!confirmDelete) return;
    packs = packs.filter((p) => p.id !== id);
    saveToStorage();
    renderPacks();
  } else if (action === "toggle") {
    const details = packsList.querySelector(
      `.pack-details[data-id="${id}"]`
    );
    if (!details) return;
    details.style.display =
      details.style.display === "none" ? "block" : "none";
  }
});

// Clear all packs
clearAllBtn.addEventListener("click", () => {
  if (!packs.length) return;
  const confirmDelete = confirm("Delete ALL Study Packs? This can’t be undone.");
  if (!confirmDelete) return;

  packs = [];
  saveToStorage();
  renderPacks();
});

// ---------- init ----------

packs = loadFromStorage();
renderPacks();
