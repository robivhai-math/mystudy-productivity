"use strict";

/*
  ==========================================
  প্রোডাক্টিভিটি ড্যাশবোর্ড
  সব ডেটা localStorage-এ সংরক্ষিত হবে।
  ==========================================
*/

const STORAGE_KEY = "productivityDashboard_v1";

const TOTAL_BUBBLES_PER_DAY = 48;
const BUBBLES_PER_CYCLE = 4;

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

// ------------------------------------------
// DOM
// ------------------------------------------

const currentDateElement = document.getElementById("currentDate");
const currentTimeElement = document.getElementById("currentTime");

const totalBubblesElement = document.getElementById("totalBubbles");
const totalCyclesElement = document.getElementById("totalCycles");
const totalHoursElement = document.getElementById("totalHours");

const timerModeElement = document.getElementById("timerMode");
const timerDisplayElement = document.getElementById("timerDisplay");
const timerCaptionElement = document.getElementById("timerCaption");

const startButton = document.getElementById("startBtn");
const pauseButton = document.getElementById("pauseBtn");
const resetButton = document.getElementById("resetBtn");

const dailyBubbleCountElement = document.getElementById("dailyBubbleCount");
const dailyCycleCountElement = document.getElementById("dailyCycleCount");

const bubbleGridElement = document.getElementById("bubbleGrid");

const historyListElement = document.getElementById("historyList");
const emptyHistoryElement = document.getElementById("emptyHistory");

// ------------------------------------------
// অ্যাপ ডেটা
// ------------------------------------------

let appData = loadData();

let timerMode = "focus";
let timerRemaining = FOCUS_SECONDS;
let timerEndAt = null;
let timerInterval = null;

// ------------------------------------------
// বাংলা সংখ্যা
// ------------------------------------------

function toBanglaDigits(value) {
  const englishDigits = "0123456789";
  const banglaDigits = "০১২৩৪৫৬৭৮৯";

  return String(value).replace(/\d/g, (digit) => {
    return banglaDigits[englishDigits.indexOf(digit)];
  });
}

// ------------------------------------------
// আজকের তারিখের Key
// YYYY-MM-DD
// ------------------------------------------

function getTodayKey() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ------------------------------------------
// তারিখকে সুন্দর বাংলা ফরম্যাটে দেখানো
// ------------------------------------------

function formatBanglaDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("bn-BD", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

// ------------------------------------------
// localStorage থেকে ডেটা লোড
// ------------------------------------------

function getDefaultData() {
  return {
    lastVisitDate: getTodayKey(),
    bubbles: Array(TOTAL_BUBBLES_PER_DAY).fill(false),
    history: []
  };
}

function sanitizeData(data) {
  const safeData = getDefaultData();

  if (!data || typeof data !== "object") {
    return safeData;
  }

  if (
    typeof data.lastVisitDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.lastVisitDate)
  ) {
    safeData.lastVisitDate = data.lastVisitDate;
  }

  if (Array.isArray(data.bubbles)) {
    safeData.bubbles = Array.from(
      { length: TOTAL_BUBBLES_PER_DAY },
      (_, index) => Boolean(data.bubbles[index])
    );
  }

  if (Array.isArray(data.history)) {
    safeData.history = data.history
      .filter((record) => {
        return (
          record &&
          typeof record.date === "string" &&
          Number.isFinite(Number(record.bubbles))
        );
      })
      .map((record) => {
        const bubbles = Math.max(
          0,
          Math.min(TOTAL_BUBBLES_PER_DAY, Math.floor(Number(record.bubbles)))
        );

        return {
          date: record.date,
          bubbles,
          cycles: Math.floor(bubbles / BUBBLES_PER_CYCLE),
          hours: bubbles / 2
        };
      });
  }

  return safeData;
}

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      const initialData = getDefaultData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
      return initialData;
    }

    return sanitizeData(JSON.parse(stored));
  } catch (error) {
    console.error("localStorage ডেটা পড়া যায়নি:", error);

    return getDefaultData();
  }
}

// ------------------------------------------
// localStorage-এ ডেটা সংরক্ষণ
// ------------------------------------------

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (error) {
    console.error("localStorage-এ ডেটা সংরক্ষণ করা যায়নি:", error);
  }
}

// ------------------------------------------
// তারিখ পরিবর্তন হলে আগের দিনের ডেটা আর্কাইভ
// ------------------------------------------

function checkDateChange() {
  const today = getTodayKey();

  if (appData.lastVisitDate === today) {
    return;
  }

  /*
    আগের দিনের বর্তমান বাবল সংখ্যা ইতিহাসে যোগ করা হবে।
    নতুন দিন শুরু হলে ৪৮টি বাবল খালি করা হবে।
  */
  if (appData.lastVisitDate) {
    const completedBubbles = appData.bubbles.filter(Boolean).length;

    appData.history.unshift({
      date: appData.lastVisitDate,
      bubbles: completedBubbles,
      cycles: Math.floor(completedBubbles / BUBBLES_PER_CYCLE),
      hours: completedBubbles / 2
    });
  }

  appData.lastVisitDate = today;
  appData.bubbles = Array(TOTAL_BUBBLES_PER_DAY).fill(false);

  saveData();
}

// ------------------------------------------
// লাইভ ঘড়ি
// ------------------------------------------

function updateLiveClock() {
  const now = new Date();

  const dateText = new Intl.DateTimeFormat("bn-BD", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(now);

  const timeText = new Intl.DateTimeFormat("bn-BD", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(now);

  currentDateElement.textContent = dateText;
  currentTimeElement.textContent = timeText;
}

// ------------------------------------------
// আজকের বাবল সংখ্যা
// ------------------------------------------

function getDailyBubbleCount() {
  return appData.bubbles.filter(Boolean).length;
}

// ------------------------------------------
// লাইফটাইম পরিসংখ্যান
// ------------------------------------------

function getLifetimeBubbleCount() {
  const historyBubbles = appData.history.reduce((total, record) => {
    return total + Number(record.bubbles || 0);
  }, 0);

  return historyBubbles + getDailyBubbleCount();
}

function updateLifetimeStats() {
  const totalBubbles = getLifetimeBubbleCount();
  const totalCycles = Math.floor(totalBubbles / BUBBLES_PER_CYCLE);
  const totalHours = totalBubbles / 2;

  totalBubblesElement.textContent = new Intl.NumberFormat("bn-BD").format(
    totalBubbles
  );

  totalCyclesElement.textContent = new Intl.NumberFormat("bn-BD").format(
    totalCycles
  );

  totalHoursElement.textContent = new Intl.NumberFormat("bn-BD", {
    maximumFractionDigits: 1
  }).format(totalHours);
}

// ------------------------------------------
// দৈনিক স্ট্যাটস
// ------------------------------------------

function updateDailyStats() {
  const dailyBubbles = getDailyBubbleCount();
  const dailyCycles = Math.floor(dailyBubbles / BUBBLES_PER_CYCLE);

  dailyBubbleCountElement.textContent =
    `${toBanglaDigits(dailyBubbles)} / ${toBanglaDigits(TOTAL_BUBBLES_PER_DAY)}`;

  dailyCycleCountElement.textContent =
    `${toBanglaDigits(dailyCycles)} সাইকেল`;
}

// ------------------------------------------
// বাবল গ্রিড তৈরি
// ------------------------------------------

function renderBubbleGrid(animateIndex = -1) {
  bubbleGridElement.innerHTML = "";

  appData.bubbles.forEach((completed, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "bubble";

    if (completed) {
      button.classList.add("completed");
    }

    if (index === animateIndex) {
      // animation পুনরায় ট্রিগার করার জন্য
      requestAnimationFrame(() => {
        button.classList.remove("completed");

        requestAnimationFrame(() => {
          if (appData.bubbles[index]) {
            button.classList.add("completed");
          }
        });
      });
    }

    button.setAttribute(
      "aria-label",
      `বাবল ${toBanglaDigits(index + 1)} ${
        completed ? "সম্পন্ন" : "খালি"
      }`
    );

    button.setAttribute(
      "aria-pressed",
      String(completed)
    );

    button.dataset.index = String(index);

    bubbleGridElement.appendChild(button);
  });

  updateDailyStats();
  updateLifetimeStats();
}

// ------------------------------------------
// বাবল ক্লিক
// ------------------------------------------

function toggleBubble(index) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= TOTAL_BUBBLES_PER_DAY
  ) {
    return;
  }

  appData.bubbles[index] = !appData.bubbles[index];

  saveData();
  renderBubbleGrid(index);
}

// ------------------------------------------
// পরবর্তী খালি বাবল পূরণ
// ------------------------------------------

function completeNextAvailableBubble() {
  const nextEmptyIndex = appData.bubbles.findIndex(
    (completed) => !completed
  );

  if (nextEmptyIndex === -1) {
    return false;
  }

  appData.bubbles[nextEmptyIndex] = true;

  saveData();
  renderBubbleGrid(nextEmptyIndex);

  return true;
}

// ------------------------------------------
// টাইমার ফরম্যাট
// ------------------------------------------

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));

  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  const displayMinutes = String(minutes).padStart(2, "0");
  const displaySeconds = String(remainingSeconds).padStart(2, "0");

  return `${toBanglaDigits(displayMinutes)}:${toBanglaDigits(
    displaySeconds
  )}`;
}

// ------------------------------------------
// টাইমার UI
// ------------------------------------------

function updateTimerDisplay() {
  timerDisplayElement.textContent = formatTimer(timerRemaining);

  if (timerMode === "focus") {
    timerModeElement.textContent = "ফোকাস";
    timerCaptionElement.textContent = "মনোযোগ দিয়ে কাজ করুন";
  } else {
    timerModeElement.textContent = "বিরতি";
    timerCaptionElement.textContent = "কিছুক্ষণ বিশ্রাম নিন";
  }

  pauseButton.disabled = !timerInterval;
}

// ------------------------------------------
// টাইমার চালু
// ------------------------------------------

function startTimer() {
  if (timerInterval) {
    return;
  }

  /*
    নির্দিষ্ট end timestamp ব্যবহার করা হয়েছে যাতে
    setInterval-এর সামান্য delay হলেও সময় সঠিক থাকে।
  */
  timerEndAt = Date.now() + timerRemaining * 1000;

  timerInterval = setInterval(() => {
    updateTimerFromClock();
  }, 200);

  updateTimerDisplay();
}

// ------------------------------------------
// বর্তমান সময় থেকে টাইমার আপডেট
// ------------------------------------------

function updateTimerFromClock() {
  if (!timerInterval || !timerEndAt) {
    return;
  }

  const remainingMilliseconds = timerEndAt - Date.now();

  timerRemaining = Math.max(
    0,
    Math.ceil(remainingMilliseconds / 1000)
  );

  updateTimerDisplay();

  if (remainingMilliseconds <= 0) {
    finishTimerPhase();
  }
}

// ------------------------------------------
// টাইমার থামানো
// ------------------------------------------

function pauseTimer() {
  if (!timerInterval) {
    return;
  }

  const remainingMilliseconds = timerEndAt
    ? timerEndAt - Date.now()
    : timerRemaining * 1000;

  timerRemaining = Math.max(
    0,
    Math.ceil(remainingMilliseconds / 1000)
  );

  clearInterval(timerInterval);
  timerInterval = null;
  timerEndAt = null;

  updateTimerDisplay();
}

// ------------------------------------------
// টাইমার রিসেট
// ------------------------------------------

function resetTimer() {
  clearInterval(timerInterval);

  timerInterval = null;
  timerEndAt = null;

  timerMode = "focus";
  timerRemaining = FOCUS_SECONDS;

  updateTimerDisplay();
}

// ------------------------------------------
// একটি ফেজ শেষ হলে
// ------------------------------------------

function finishTimerPhase() {
  clearInterval(timerInterval);

  timerInterval = null;
  timerEndAt = null;
  timerRemaining = 0;

  if (timerMode === "focus") {
    /*
      ২৫ মিনিট ফোকাস সফলভাবে শেষ হয়েছে।
      তাই পরবর্তী খালি বাবল পূরণ করা হবে।
    */
    completeNextAvailableBubble();

    // এরপর ৫ মিনিটের বিরতি স্বয়ংক্রিয়ভাবে শুরু হবে
    timerMode = "break";
    timerRemaining = BREAK_SECONDS;

    updateTimerDisplay();

    startTimer();
    return;
  }

  /*
    ৫ মিনিটের বিরতি শেষ হয়েছে।
    এখন পরবর্তী ২৫ মিনিটের ফোকাসের জন্য প্রস্তুত।
  */
  timerMode = "focus";
  timerRemaining = FOCUS_SECONDS;

  updateTimerDisplay();
}

// ------------------------------------------
// ইতিহাস রেন্ডার
// ------------------------------------------

function renderHistory() {
  historyListElement.innerHTML = "";

  if (!appData.history.length) {
    emptyHistoryElement.hidden = false;
    return;
  }

  emptyHistoryElement.hidden = true;

  appData.history.forEach((record) => {
    const row = document.createElement("div");
    row.className = "history-row";

    const dateCell = document.createElement("span");
    dateCell.className = "date-cell";
    dateCell.textContent = formatBanglaDate(record.date);

    const bubbleCell = document.createElement("span");
    bubbleCell.className = "bubble-value";
    bubbleCell.textContent = toBanglaDigits(record.bubbles);

    const cycleCell = document.createElement("span");
    cycleCell.textContent = toBanglaDigits(record.cycles);

    const hourCell = document.createElement("span");
    hourCell.textContent = formatHistoryHours(record.hours);

    row.append(
      dateCell,
      bubbleCell,
      cycleCell,
      hourCell
    );

    historyListElement.appendChild(row);
  });
}

// ------------------------------------------
// ইতিহাসের ঘণ্টার ফরম্যাট
// ------------------------------------------

function formatHistoryHours(hours) {
  const numericHours = Number(hours);

  if (Number.isInteger(numericHours)) {
    return toBanglaDigits(numericHours);
  }

  return new Intl.NumberFormat("bn-BD", {
    maximumFractionDigits: 1
  }).format(numericHours);
}

// ------------------------------------------
// বাবল গ্রিড ইভেন্ট
// ------------------------------------------

bubbleGridElement.addEventListener("click", (event) => {
  const bubble = event.target.closest(".bubble");

  if (!bubble) {
    return;
  }

  const index = Number(bubble.dataset.index);

  toggleBubble(index);
});

// ------------------------------------------
// টাইমার বাটন ইভেন্ট
// ------------------------------------------

startButton.addEventListener("click", startTimer);
pauseButton.addEventListener("click", pauseTimer);
resetButton.addEventListener("click", resetTimer);

// ------------------------------------------
// অন্য ট্যাব থেকে localStorage পরিবর্তন হলে
// ------------------------------------------

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) {
    return;
  }

  try {
    appData = sanitizeData(JSON.parse(event.newValue));
  } catch {
    appData = getDefaultData();
  }

  checkDateChange();
  renderBubbleGrid();
  renderHistory();
});

// ------------------------------------------
// অ্যাপ শুরু
// ------------------------------------------

function initializeApp() {
  checkDateChange();

  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  renderBubbleGrid();
  renderHistory();
  updateLifetimeStats();
  updateDailyStats();
  updateTimerDisplay();
}

initializeApp();
