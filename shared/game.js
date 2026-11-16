let slowMode = true;
let score = 0;
let streak = 0;
let currentTarget = null;
let quizLocked = false;
let topicItems = [];
let questionSuffix = "là con gì?";

// State cho phần Khám phá từng từ & nhận diện giọng nói
let exploreIndex = 0;
let recognition = null;
let isListening = false;
let isTogglingMic = false;
let listenTimeoutTimer = null;
let autoStopTimer = null;
let teachTimeoutTimer = null;
let speechQueueToken = 0;
let currentMode = "explore";
let waitingForKid = false;
let speechSessionId = 0;

// 10 dạng câu khen ngợi đa dạng cho bé Đậu
const PRAISE_LIST = [
  "Đậu giỏi quá!",
  "Đậu xuất sắc quá!",
  "Đậu tuyệt vời mười điểm!",
  "Đậu siêu quá đi thôi!",
  "Hoan hô Đậu, đúng rồi nè!",
  "Đậu thông minh quá!",
  "Đậu đỉnh của chóp luôn!",
  "Chuẩn luôn, Đậu giỏi ghê!",
  "Cô khen Đậu đọc hay quá!",
  "Đậu phát âm chuẩn quá trời!"
];

let lastPraiseIndex = -1;
function getRandomPraise() {
  let idx;
  do {
    idx = Math.floor(Math.random() * PRAISE_LIST.length);
  } while (idx === lastPraiseIndex && PRAISE_LIST.length > 1);
  lastPraiseIndex = idx;
  return PRAISE_LIST[idx];
}

function initTopicGame(items, options = {}) {
  topicItems = items;
  questionSuffix = options.questionSuffix || "là con gì?";
  exploreIndex = 0;

  if ("speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }

  renderFlashcardView();
}

/* =========================================================
   HỆ THỐNG NHẬN DIỆN GIỌNG NÓI CHUYÊN BIỆT CHO IPAD
========================================================= */

function cleanupRecognition() {
  if (recognition) {
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.abort();
    } catch (e) { }
    recognition = null;
  }
  isListening = false;
}

function createFreshRecognition(sessionId) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("Trình duyệt không hỗ trợ Web Speech API.");
    return null;
  }

  try {
    const rec = new SpeechRecognition();
    // BẮT BUỘC continuous = false trên iOS Safari để onresult kích hoạt
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 5;
    rec.lang = "en-US";

    rec.onstart = () => {
      isListening = true;
      updateBigTalkBtn(true, "🎙️ ĐẬU ĐANG NÓI... (BẤM ĐỂ DỪNG)");
      updateMicUI(true, "🎙️ Đang lắng nghe Đậu nói...");
    };

    rec.onspeechstart = () => {
      const heardDiv = document.getElementById("heardText");
      if (heardDiv && !heardDiv.textContent) {
        heardDiv.textContent = "🎙️ Đã nhận tiếng Đậu, đang nghe...";
      }
    };

    rec.onresult = (event) => {
      clearTimeout(listenTimeoutTimer);
      console.log("Speech onresult event:", event);

      let matched = false;
      let recognizedText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        for (let alt = 0; alt < event.results[i].length; alt++) {
          const cand = event.results[i][alt].transcript.trim();
          if (!recognizedText) recognizedText = cand;
          if (isPronunciationAcceptable(cand, topicItems[exploreIndex].en)) {
            matched = true;
            recognizedText = cand;
            break;
          }
        }
        if (matched) break;
      }

      const heardDiv = document.getElementById("heardText");
      if (heardDiv && recognizedText) {
        heardDiv.textContent = `🎙️ Đậu vừa đọc: "${recognizedText}"`;
      }

      if (matched) {
        stopListening();
        handleKidSpeechResult(recognizedText, true);
      } else if (event.results[0] && event.results[0].isFinal) {
        stopListening();
        handleKidSpeechResult(recognizedText, false);
      }
    };

    rec.onerror = (event) => {
      console.warn("Speech error event:", event.error);
      if (event.error === "aborted" || event.error === "no-speech") {
        return;
      }

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        waitingForKid = false;
        clearTimeout(listenTimeoutTimer);
        updateMicUI(false, "⚠️ Cần cấp quyền micro: Bố kiểm tra Cài đặt -> Safari -> Micro nhé!");
        updateBigTalkBtn(false, "🎤 BẤM ĐỂ ĐẬU NÓI");
        const heardDiv = document.getElementById("heardText");
        if (heardDiv) {
          heardDiv.textContent = "⚠️ Bố kiểm tra Cài đặt -> Safari -> Micro để cho phép nhé!";
        }
      }
    };

    rec.onend = () => {
      isListening = false;
      clearTimeout(autoStopTimer);
      if (waitingForKid && currentMode === "explore") {
        updateMicUI(false, "💤 Micro tạm dừng. Đậu bấm nút đỏ để đọc tiếp nhé!");
        updateBigTalkBtn(false, "🎤 BẤM ĐỂ ĐẬU NÓI");
      } else {
        updateMicUI(false, "💤 Micro sẵn sàng");
        updateBigTalkBtn(false, "🎤 BẤM ĐỂ ĐẬU NÓI");
      }
    };

    return rec;
  } catch (e) {
    console.error("createFreshRecognition failed:", e);
    return null;
  }
}

// BẬT / TẮT MICRO TRỰC TIẾP TỪ THAO TÁC BẤM NÚT ĐỎ CỦA BỐ VÀ ĐẬU
function toggleBigTalk() {
  if (isTogglingMic) return;
  isTogglingMic = true;
  setTimeout(() => { isTogglingMic = false; }, 350);

  // Khi đang nghe mà bấm lại -> Bắt buộc gọi finishKidSpeech để Safari xả buffer âm thanh ra onresult
  if (isListening) {
    finishKidSpeech();
    return;
  }

  // 1. Tắt hoàn toàn SpeechSynthesis để giải phóng Audio Session trên iPad
  if ("speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch (e) { }
  }

  clearTimeout(listenTimeoutTimer);
  clearTimeout(autoStopTimer);
  waitingForKid = true;
  speechSessionId++;
  const thisSession = speechSessionId;

  // 2. Dọn dẹp sạch sẽ instance cũ
  cleanupRecognition();

  // 3. KHỞI ĐỘNG ĐỒNG BỘ NGAY TRONG USER GESTURE CỦA CLICK EVENT (BẮT BUỘC CHO IPAD SAFARI)
  recognition = createFreshRecognition(thisSession);
  if (recognition) {
    try {
      recognition.start();
      isListening = true;
      updateBigTalkBtn(true, "🎙️ ĐẬU ĐANG NÓI... (ĐỌC XONG BẤM ĐÂY)");
      updateMicUI(true, "🎙️ Đậu đọc to rõ từ tiếng Anh nhé! (Tự động chấm sau 3.2s)");
    } catch (err) {
      console.warn("recognition.start direct warning:", err);
      updateMicUI(false, "⚠️ Đậu bấm lại nút đỏ lần nữa nhé!");
      return;
    }
  }

  // Tự động chốt âm thanh sau 3.2 giây để ép Safari xuất buffer sang onresult
  autoStopTimer = setTimeout(() => {
    if (thisSession === speechSessionId && isListening && waitingForKid) {
      console.log("Auto-stopping speech session to flush Safari audio buffer...");
      finishKidSpeech();
    }
  }, 3200);

  // Đếm ngược 10 giây nếu Đậu chưa phát âm
  listenTimeoutTimer = setTimeout(() => {
    if (thisSession === speechSessionId && waitingForKid && currentMode === "explore") {
      handleTimeoutPrompt();
    }
  }, 10000);
}

// Gọi .stop() để Safari flush buffer âm thanh sang onresult (KHÔNG abort làm mất dữ liệu)
function finishKidSpeech() {
  if (!isListening || !recognition) return;
  console.log("Finishing kid speech, calling recognition.stop() to flush buffer...");
  clearTimeout(autoStopTimer);
  updateMicUI(true, "⏳ Đang phân tích phát âm của Đậu...");
  try {
    recognition.stop();
  } catch (e) {
    console.warn("recognition.stop error:", e);
  }
}

function stopListening() {
  waitingForKid = false;
  clearTimeout(listenTimeoutTimer);
  clearTimeout(autoStopTimer);
  speechSessionId++;
  cleanupRecognition();
  updateMicUI(false, "💤 Micro sẵn sàng");
  updateBigTalkBtn(false, "🎤 BẤM ĐỂ ĐẬU NÓI");
}

function updateBigTalkBtn(active, text) {
  const btn = document.getElementById("btnBigTalk");
  if (!btn) return;
  btn.textContent = text;
  if (active) {
    btn.classList.add("active-listening");
  } else {
    btn.classList.remove("active-listening");
  }
}

/* =========================================================
   HỆ THỐNG GIỌNG ĐỌC TỔNG HỢP (TTS)
========================================================= */

function pickBestVoice(synth, lang) {
  const voices = synth.getVoices();
  if (!voices || voices.length === 0) return null;

  const normTarget = (lang || "en-US").toLowerCase().replace("_", "-");
  const prefix = normTarget.split("-")[0];
  const matching = voices.filter((v) => {
    const vLang = (v.lang || "").toLowerCase().replace("_", "-");
    return vLang === normTarget || vLang.startsWith(prefix);
  });
  if (matching.length === 0) return null;

  const preferredKeywords =
    prefix === "vi"
      ? ["Linh", "HoaiMy", "Google tiếng Việt", "Natural", "Enhanced", "Premium", "Vietnamese", "An"]
      : ["Aria", "Jenny", "Samantha", "Google US English", "Natural", "Enhanced", "Premium", "Samantha (Enhanced)"];

  for (const kw of preferredKeywords) {
    const found = matching.find((v) => (v.name || "").toLowerCase().includes(kw.toLowerCase()));
    if (found) return found;
  }
  return matching.find((v) => (v.lang || "").toLowerCase().replace("_", "-") === normTarget) || matching[0];
}

function createUtterance(text, lang) {
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = slowMode ? (lang === "vi-VN" ? 0.95 : 0.78) : 1.0;
  utter.pitch = 1.08;
  utter.volume = 1.0;

  const bestVoice = pickBestVoice(synth, lang);
  if (bestVoice) {
    utter.voice = bestVoice;
  }
  return utter;
}

function speakSequence(parts, onAllEnd) {
  if (!("speechSynthesis" in window)) {
    if (onAllEnd) onAllEnd();
    return;
  }

  speechQueueToken++;
  const thisToken = speechQueueToken;

  const synth = window.speechSynthesis;
  try {
    synth.cancel();
  } catch (e) {}

  if (!parts || parts.length === 0) {
    if (onAllEnd) onAllEnd();
    return;
  }

  let index = 0;

  function speakNext() {
    if (thisToken !== speechQueueToken) return;

    if (index >= parts.length) {
      window._activeUtterance = null;
      if (onAllEnd) onAllEnd();
      return;
    }

    const part = parts[index];
    const utter = createUtterance(part.text, part.lang || "en-US");

    // Giữ tham chiếu mạnh toàn cục để tránh bị iOS Safari Garbage Collection dọn dẹp giữa chừng
    window._activeUtterance = utter;

    let advanced = false;
    const proceed = () => {
      if (advanced || thisToken !== speechQueueToken) return;
      advanced = true;
      index++;
      // Khoảng đệm 80ms giữa các câu để Audio Thread trên iOS đổi giọng nói mượt mà
      setTimeout(speakNext, 80);
    };

    utter.onend = proceed;
    utter.onerror = (e) => {
      console.warn("Speech utterance event ended:", e);
      proceed();
    };

    try {
      synth.speak(utter);
    } catch (err) {
      console.warn("synth.speak error:", err);
      proceed();
    }
  }

  // Bắt đầu câu đầu tiên sau 60ms để Safari hoàn tất cancel() sạch sẽ
  setTimeout(speakNext, 60);
}

function speak(text, onEnd, lang = "en-US") {
  speakSequence([{ text, lang }], onEnd);
}

function playChime(isCorrect) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = isCorrect ? "sine" : "triangle";
    osc.frequency.setValueAtTime(isCorrect ? 523.25 : 220, ctx.currentTime);
    if (isCorrect) {
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
    }
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) { }
}

function toggleSpeed() {
  slowMode = !slowMode;
  const btn = document.getElementById("btnSpeed");
  btn.textContent = slowMode ? "🐢 Tốc độ: Chậm cho Đậu" : "🐇 Tốc độ: Bình thường";
}

function renderMedia(item, className = "item-thumb") {
  if (item.image) {
    return `<img class="${className}" src="${item.image}" alt="${item.en}" loading="lazy" onerror="this.outerHTML='<div class=\\'flashcard-emoji\\'>${item.emoji || '🐾'}</div>'" />`;
  }
  return `<div class="flashcard-emoji">${item.emoji || '🐾'}</div>`;
}

/* =========================================================
   PHẦN KHÁM PHÁ TỪ VỰNG: DẠY TỪNG TỪ & LẮNG NGHE ĐẬU ĐỌC
========================================================= */

function renderFlashcardView() {
  const panel = document.getElementById("explorePanel");
  if (!panel || topicItems.length === 0) return;

  const item = topicItems[exploreIndex];
  const total = topicItems.length;

  panel.className = "";
  panel.innerHTML = `
    <div class="flashcard-stage">
      <div class="flashcard-nav-top">
        <span>Từ ${exploreIndex + 1} / ${total}</span>
        <span>⭐ Đậu học cùng cô</span>
      </div>

      <div class="flashcard-img-wrap">
        ${item.image ? `<img class="flashcard-img" src="${item.image}" alt="${item.en}" />` : `<div class="flashcard-emoji">${item.emoji}</div>`}
      </div>

      <div class="flashcard-word-vi">${item.vi}</div>
      <div class="flashcard-word-en">${item.en}</div>

      <div class="teacher-prompt-box">
        👩‍🏫 "${item.vi} tiếng Anh là <b>${item.en}</b>, Đậu đọc theo cô nhé!"
      </div>

      <!-- Nút to ĐẬU NÓI -->
      <div class="big-talk-btn-wrap">
        <button id="btnBigTalk" class="btn-big-talk" type="button">
          🎤 BẤM ĐỂ ĐẬU NÓI
        </button>
      </div>

      <div>
        <div id="micStatusBadge" class="mic-status-badge mic-status-idle">
          <span id="micStatusText">⏳ Bấm nút đỏ phía trên để Đậu đọc nhé!</span>
        </div>
      </div>

      <div id="heardText" class="heard-text"></div>
      <div id="feedbackLive" class="feedback-live"></div>

      <div class="flashcard-actions">
        <button class="btn btn-kid-pass" type="button" onclick="approveKidPronunciation()">⭐ Đậu đọc chuẩn rồi!</button>
        <button class="btn btn-teacher-repeat" type="button" onclick="teachCurrentWord()">🔊 Cô đọc lại</button>
        <button class="btn btn-prev" type="button" onclick="prevWord()" ${exploreIndex === 0 ? 'disabled style="opacity:0.5"' : ''}>⬅️ Từ trước</button>
        <button class="btn btn-skip" type="button" onclick="skipToNextWord()">Bỏ qua ➡️</button>
      </div>
    </div>
  `;

  // Gắn sự kiện click duy nhất (tránh double firing trên Safari iOS)
  const talkBtn = document.getElementById("btnBigTalk");
  if (talkBtn) {
    talkBtn.onclick = (e) => {
      e.preventDefault();
      toggleBigTalk();
    };
  }

  clearTimeout(teachTimeoutTimer);
  teachTimeoutTimer = setTimeout(() => {
    teachCurrentWord();
  }, 400);
}

function approveKidPronunciation() {
  if (currentMode !== "explore" || topicItems.length === 0) return;
  stopListening();
  handleKidSpeechResult(topicItems[exploreIndex].en, true);
}

function updateMicUI(isRec, text) {
  const badge = document.getElementById("micStatusBadge");
  const txt = document.getElementById("micStatusText");
  if (!badge || !txt) return;

  txt.textContent = text;
  if (isRec) {
    badge.className = "mic-status-badge mic-status-listening";
  } else {
    badge.className = "mic-status-badge mic-status-idle";
  }
}

function teachCurrentWord() {
  if (currentMode !== "explore") return;
  stopListening();

  const item = topicItems[exploreIndex];
  const heardDiv = document.getElementById("heardText");
  const feedbackDiv = document.getElementById("feedbackLive");
  if (heardDiv) heardDiv.textContent = "";
  if (feedbackDiv) feedbackDiv.textContent = "";

  updateMicUI(false, "👩‍🏫 Cô đang đọc mẫu...");
  updateBigTalkBtn(false, "🎤 BẤM ĐỂ ĐẬU NÓI");

  speakSequence(
    [
      { text: `${item.vi} tiếng Anh là`, lang: "vi-VN" },
      { text: item.en, lang: "en-US" },
      { text: "Đậu đọc theo cô nhé!", lang: "vi-VN" }
    ],
    () => {
      if (currentMode === "explore") {
        updateMicUI(false, "👉 Bố hoặc Đậu bấm nút đỏ to để nói nhé!");
      }
    }
  );
}

function handleTimeoutPrompt() {
  stopListening();
  const feedbackDiv = document.getElementById("feedbackLive");
  if (feedbackDiv) {
    feedbackDiv.style.color = "#ea580c";
    feedbackDiv.textContent = "Đậu đọc lại cho cô nghe nhé!";
  }

  const item = topicItems[exploreIndex];
  speakSequence(
    [
      { text: "Đậu đọc lại cho cô nghe nhé!", lang: "vi-VN" },
      { text: item.en, lang: "en-US" }
    ],
    () => {
      if (currentMode === "explore") {
        updateMicUI(false, "👉 Đậu bấm nút đỏ để đọc lại nhé!");
      }
    }
  );
}

// Phân tích âm tiết theo tiêu chuẩn trẻ dưới 5 tuổi
function isPronunciationAcceptable(spoken, targetWord) {
  if (!spoken) return false;
  const cleanSpoken = spoken.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  const cleanTarget = targetWord.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

  if (!cleanSpoken || !cleanTarget) return false;

  // 1. Khớp hoàn toàn hoặc chứa từ mục tiêu
  if (cleanSpoken.includes(cleanTarget) || cleanTarget.includes(cleanSpoken)) {
    return true;
  }

  // 2. Khoảng cách Levenshtein cho trẻ nhỏ
  const dist = levenshteinDistance(cleanSpoken, cleanTarget);
  const maxAllowedDist = cleanTarget.length <= 4 ? 1 : (cleanTarget.length <= 7 ? 2 : 3);
  if (dist <= maxAllowedDist) {
    return true;
  }

  // 3. Đúng âm đầu và âm cuối
  if (cleanTarget.length >= 3) {
    const firstMatch = cleanSpoken[0] === cleanTarget[0];
    const lastMatch = cleanSpoken[cleanSpoken.length - 1] === cleanTarget[cleanTarget.length - 1];
    if (firstMatch && lastMatch && Math.abs(cleanSpoken.length - cleanTarget.length) <= 2) {
      return true;
    }
  }

  return false;
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function handleKidSpeechResult(transcript, forcedCorrect = null) {
  const item = topicItems[exploreIndex];
  const heardDiv = document.getElementById("heardText");
  const feedbackDiv = document.getElementById("feedbackLive");

  if (heardDiv && transcript) {
    heardDiv.textContent = `🎙️ Đậu vừa đọc: "${transcript}"`;
  }

  const isCorrect = forcedCorrect !== null ? forcedCorrect : isPronunciationAcceptable(transcript, item.en);

  if (isCorrect) {
    playChime(true);
    const praise = getRandomPraise();
    if (feedbackDiv) {
      feedbackDiv.style.color = "#16a34a";
      feedbackDiv.textContent = `🎉 Đúng rồi! ${praise}`;
    }

    speakSequence(
      [
        { text: "Đúng rồi!", lang: "vi-VN" },
        { text: praise, lang: "vi-VN" },
        { text: item.en, lang: "en-US" }
      ],
      () => {
        setTimeout(() => {
          skipToNextWord();
        }, 700);
      }
    );
  } else {
    playChime(false);
    if (feedbackDiv) {
      feedbackDiv.style.color = "#ea580c";
      feedbackDiv.textContent = `Gần đúng rồi! Đậu đọc lại cho cô nghe nhé!`;
    }

    speakSequence(
      [
        { text: "Đậu đọc lại cho cô nghe nhé!", lang: "vi-VN" },
        { text: item.en, lang: "en-US" }
      ],
      () => {
        if (currentMode === "explore") {
          updateMicUI(false, "👉 Đậu bấm nút đỏ để đọc lại nhé!");
        }
      }
    );
  }
}

function skipToNextWord() {
  clearTimeout(teachTimeoutTimer);
  stopListening();
  if (exploreIndex < topicItems.length - 1) {
    exploreIndex += 1;
    renderFlashcardView();
  } else {
    exploreIndex = 0;
    playChime(true);
    const feedbackDiv = document.getElementById("feedbackLive");
    if (feedbackDiv) {
      feedbackDiv.style.color = "#16a34a";
      feedbackDiv.textContent = "🌟 Đậu đã hoàn thành xuất sắc tất cả các từ trong chủ đề này! 10 điểm!";
    }
    speakSequence([
      { text: "Hoan hô! Đậu đã học xong tất cả các từ rồi. Đậu tuyệt vời mười điểm!", lang: "vi-VN" }
    ]);
  }
}

function prevWord() {
  clearTimeout(teachTimeoutTimer);
  stopListening();
  if (exploreIndex > 0) {
    exploreIndex -= 1;
    renderFlashcardView();
  }
}

/* =========================================================
   CHUYỂN ĐỔI CHẾ ĐỘ & PHẦN TRÒ CHƠI TÌM TỪ (CẢ ĐỘNG VẬT & PHƯƠNG TIỆN)
========================================================= */

function switchMode(mode) {
  clearTimeout(teachTimeoutTimer);
  currentMode = mode;
  stopListening();

  const explorePanel = document.getElementById("explorePanel");
  const quizPanel = document.getElementById("quizPanel");
  const btnExplore = document.getElementById("btnExplore");
  const btnQuiz = document.getElementById("btnQuiz");

  if (mode === "explore") {
    explorePanel.style.display = "block";
    quizPanel.classList.remove("active");
    btnExplore.classList.add("active");
    btnQuiz.classList.remove("active");
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    renderFlashcardView();
  } else {
    explorePanel.style.display = "none";
    quizPanel.classList.add("active");
    btnExplore.classList.remove("active");
    btnQuiz.classList.add("active");
    nextQuestion();
  }
}

function nextQuestion() {
  quizLocked = false;
  document.getElementById("quizFeedback").textContent = "";
  const shuffled = [...topicItems].sort(() => Math.random() - 0.5);
  const choices = shuffled.slice(0, Math.min(4, shuffled.length));
  currentTarget = choices[Math.floor(Math.random() * choices.length)];

  document.getElementById("quizPrompt").textContent = `${currentTarget.en} ${questionSuffix}`;
  const optionsDiv = document.getElementById("quizOptions");
  optionsDiv.innerHTML = "";

  choices.forEach((item) => {
    const opt = document.createElement("div");
    opt.className = "quiz-option";
    opt.innerHTML = `
      ${renderMedia(item, "quiz-thumb")}
      <div style="font-size: 1.1rem; font-weight: 700; color: #475569;">${item.vi}</div>
    `;
    opt.onclick = () => checkAnswer(opt, item);
    optionsDiv.appendChild(opt);
  });

  repeatQuestion();
}

function repeatQuestion() {
  if (currentTarget) {
    speakSequence([
      { text: currentTarget.en, lang: "en-US" },
      { text: questionSuffix, lang: "vi-VN" }
    ]);
  }
}

function checkAnswer(el, item) {
  if (quizLocked) return;
  const feedback = document.getElementById("quizFeedback");

  if (item.en === currentTarget.en) {
    quizLocked = true;
    el.classList.add("correct");
    score += 1;
    streak += 1;
    document.getElementById("scoreValue").textContent = score;

    let praiseSpoken = getRandomPraise();
    let displayBanner = `🎉 ${praiseSpoken} (${streak} câu liên tiếp)`;

    if (streak === 3) {
      praiseSpoken = "Đậu xuất sắc quá!";
      displayBanner = "🔥 Đậu xuất sắc quá! (3 câu đúng liên tiếp)";
    } else if (streak >= 4) {
      praiseSpoken = "Đậu tuyệt vời 10 điểm!";
      displayBanner = `🌟 Đậu tuyệt vời 10 điểm! (${streak} câu đúng liên tiếp)`;
    }

    document.getElementById("streakText").textContent = displayBanner;
    feedback.style.color = "#16a34a";
    feedback.textContent = `Đúng rồi! ${item.en} là ${item.vi}. ${praiseSpoken}`;
    playChime(true);

    speakSequence(
      [
        { text: "Đúng rồi!", lang: "vi-VN" },
        { text: item.en, lang: "en-US" },
        { text: `là ${item.vi}. ${praiseSpoken}`, lang: "vi-VN" }
      ],
      () => {
        setTimeout(nextQuestion, 900);
      }
    );
  } else {
    streak = 0;
    el.classList.add("wrong");
    document.getElementById("streakText").textContent = "Cố lên Đậu ơi!";
    feedback.style.color = "#dc2626";
    feedback.textContent = `Chưa đúng rồi! Đó là ${item.en} (${item.vi}). Đậu thử lại nhé!`;
    playChime(false);
    speakSequence([
      { text: "Chưa đúng rồi, đó là", lang: "vi-VN" },
      { text: item.en, lang: "en-US" },
      { text: `${item.vi}. Đậu thử lại nhé!`, lang: "vi-VN" }
    ]);
  }
}
