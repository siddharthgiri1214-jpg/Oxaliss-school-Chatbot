// ===== State =====
let voiceEnabled = true;
let currentTypingDiv = null;   // typing animation element
let currentController = null;  // lets the Stop button cancel a pending request

const LANGUAGE_CODES = {
    English: "en-IN",
    Tamil: "ta-IN",
    Hindi: "hi-IN",
    Telugu: "te-IN",
    Kannada: "kn-IN",
    Malayalam: "ml-IN"
};

// ===== Language helpers =====
function getSelectedLanguage() {
    const select = document.getElementById("languageSelect");
    return select ? select.value : "English";
}

function getLanguageCode() {
    return LANGUAGE_CODES[getSelectedLanguage()] || "en-IN";
}

// ===== Text to speech (in the selected language) =====
function speak(text) {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = getLanguageCode();
    window.speechSynthesis.speak(speech);
}

// ===== Chat UI =====
function addMessage(type, text, isTyping = false) {
    const chatBox = document.getElementById("chatBox");
    const div = document.createElement("div");
    div.className = `message ${type}`;
    if (isTyping) {
        div.classList.add("typing");
        div.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
    } else {
        div.textContent = text;
    }
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return div;
}

function clearTyping() {
    if (currentTypingDiv) {
        currentTypingDiv.remove();
        currentTypingDiv = null;
    }
}

// ===== Send question to backend =====
function sendQuestion() {
    const input = document.getElementById("userInput");
    const question = input.value.trim();
    if (!question) return;

    // Cancel any request still in progress
    if (currentController) currentController.abort();
    clearTyping();

    addMessage("user", question);
    input.value = "";
    input.focus();

    currentTypingDiv = addMessage("bot", "", true);
    const controller = new AbortController();
    currentController = controller;

    fetch("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question, language: getSelectedLanguage() }),
        signal: controller.signal
    })
    .then(res => res.json())
    .then(data => {
        if (controller !== currentController) return;
        clearTyping();
        currentController = null;
        addMessage("bot", data.answer);
        speak(data.answer);
    })
    .catch(err => {
        if (err.name === "AbortError") return; // cancelled by Stop or a newer question
        if (controller !== currentController) return;
        clearTyping();
        currentController = null;
        addMessage("bot", "Server error. Try again.");
        console.error(err);
    });
}

// ===== Voice recognition (in the selected language) =====
function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Speech recognition not supported in this browser");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = getLanguageCode();

    recognition.onresult = function (event) {
        document.getElementById("userInput").value = event.results[0][0].transcript;
        sendQuestion();
    };

    recognition.onerror = function (event) {
        console.error("Speech recognition error:", event.error);
    };

    recognition.start();
}

// ===== Wire everything up after the page has loaded =====
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("userInput");

    // Language selector (remember the choice)
    const languageSelect = document.getElementById("languageSelect");
    if (languageSelect) {
        const saved = localStorage.getItem("schoolChatbotLanguage");
        if (saved && LANGUAGE_CODES[saved]) languageSelect.value = saved;

        languageSelect.addEventListener("change", () => {
            localStorage.setItem("schoolChatbotLanguage", languageSelect.value);
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        });
    }

    // Enter key
    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") sendQuestion();
    });

    // Send + mic buttons
    document.getElementById("sendBtn").addEventListener("click", sendQuestion);
    document.getElementById("micBtn").addEventListener("click", startVoice);

    // Voice toggle (hidden button, kept for future use)
    const voiceBtn = document.getElementById("voiceToggle");
    if (voiceBtn) {
        voiceBtn.addEventListener("click", function () {
            voiceEnabled = !voiceEnabled;
            voiceBtn.textContent = voiceEnabled ? "🎤 ON" : "🎤 OFF";
        });
    }

    // Dark mode toggle
    const modeBtn = document.getElementById("modeToggle");
    if (modeBtn) {
        modeBtn.addEventListener("click", function () {
            document.body.classList.toggle("dark-mode");
            modeBtn.textContent = document.body.classList.contains("dark-mode") ? "☀️ Light" : "🌙 Dark";
        });
    }

    // Stop button: cancel pending answer, typing animation and speech
    const stopBtn = document.getElementById("stopBtn");
    if (stopBtn) {
        stopBtn.addEventListener("click", () => {
            if (currentController) {
                currentController.abort();
                currentController = null;
            }
            clearTyping();
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        });
    }
});
