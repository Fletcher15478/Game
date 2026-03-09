// Step handling
const step1 = document.getElementById("step-1");
const step2 = document.getElementById("step-2");
const step3 = document.getElementById("step-3");

const step1Message = document.getElementById("step-1-message");
const scoopMessage = document.getElementById("scoop-message");

// Step 1: answer selection
document.querySelectorAll(".option-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const isCorrect = btn.dataset.correct === "true";
    if (isCorrect) {
      step1Message.textContent =
        "Correct answer. Obviously. Now let’s play a game.";
      step1Message.classList.remove("shake");
      step1Message.classList.add("success");
      // tiny delay for effect
      setTimeout(() => {
        step1.classList.remove("visible");
        step2.classList.add("visible");
      }, 900);
    } else {
      step1Message.textContent = "Wrong. Try again, my love. 💘";
      step1Message.classList.remove("success");
      step1Message.classList.add("shake");
      setTimeout(() => step1Message.classList.remove("shake"), 350);
    }
  });
});

// Step 2: ice cream catcher mini‑game
const fallingLayer = document.getElementById("falling-layer");
const player = document.getElementById("player");
const playfield = document.getElementById("playfield");
const scoopsCountEl = document.getElementById("scoops-count");
const livesEl = document.getElementById("lives-value");
const stackContainer = document.getElementById("stack-container");
const winOverlay = document.getElementById("win-overlay");
const countdownText = document.getElementById("countdown-text");
const reviveOverlay = document.getElementById("revive-overlay");
const reviveOkBtn = document.getElementById("revive-ok-btn");
const instructionsOverlay = document.getElementById("instructions-overlay");
const instructionsOkBtn = document.getElementById("instructions-ok-btn");
const statusToast = document.getElementById("status-toast");

const SCOOPS_TO_WIN = 10;
const LIVES_MAX = 3;
let caught = 0;
let gameRunning = false;
let playerX = 50; // percentage of playfield width
let activeScoops = [];
let stackCount = 0;
let countdownTimer = null;
let lives = LIVES_MAX;
let hasSeenInstructions = false;
let resumingFromDeath = false;

const SCOOP_COLORS = [
  "hue-rotate(0deg)", // strawberry
  "hue-rotate(40deg)", // peach
  "hue-rotate(90deg)", // pistachio
  "hue-rotate(200deg)", // blueberry
  "hue-rotate(310deg)", // blackberry
  "hue-rotate(150deg)", // mint
];

function updatePlayerPosition() {
  const clamped = Math.max(10, Math.min(90, playerX));
  player.style.left = `${clamped}%`;
}

function spawnScoop() {
  if (!gameRunning) return;

  const isBad = Math.random() < 0.25; // 25% chance to be a bad object

  const scoop = document.createElement("img");
  scoop.src = "images/Bottom Scoop Outline.svg";
  scoop.alt = isBad ? "Bad object" : "Falling scoop";
  scoop.className = "scoop";

  // Spawn from left or right side bands so they don't appear directly on top of her
  const fromLeft = Math.random() < 0.5;
  const startX = fromLeft ? Math.random() * 20 + 5 : Math.random() * 20 + 75;
  scoop.style.left = `${startX}%`;
  scoop.style.top = "-30px";

  const colorIndex = Math.floor(Math.random() * SCOOP_COLORS.length);
  if (isBad) {
    scoop.style.filter =
      "grayscale(1) brightness(0.9) hue-rotate(310deg) drop-shadow(0 6px 14px rgba(239,68,68,0.9))";
  } else {
    scoop.style.filter =
      SCOOP_COLORS[colorIndex] + " drop-shadow(0 6px 14px rgba(0,0,0,0.7))";
  }

  fallingLayer.appendChild(scoop);

  activeScoops.push({
    el: scoop,
    type: isBad ? "bad" : "good",
    x: startX,
    y: -30,
    speed: 1.4 + Math.random() * 0.9,
  });
}

function startCatcherGame() {
  if (gameRunning) return;
  gameRunning = true;

  if (!resumingFromDeath) {
    caught = 0;
    if (stackContainer) {
      stackContainer.innerHTML = "";
      stackContainer.style.opacity = "0";
    }
    stackCount = 0;
  }
  resumingFromDeath = false;

  activeScoops = [];
  fallingLayer.innerHTML = "";
  lives = LIVES_MAX;
  scoopsCountEl.textContent = `${caught} / ${SCOOPS_TO_WIN}`;
  if (livesEl) livesEl.textContent = "♥".repeat(lives);
  scoopMessage.textContent = "Catch them in your cone and ignore the grey scoops.";
  scoopMessage.classList.remove("success");

  updatePlayerPosition();

  const spawnInterval = setInterval(() => {
    if (!gameRunning) {
      clearInterval(spawnInterval);
      return;
    }
    spawnScoop();
  }, 850);

  let lastTime = performance.now();

  function loop(now) {
    if (!gameRunning) return;
    const delta = now - lastTime;
    lastTime = now;

    const playfieldRect = fallingLayer.getBoundingClientRect();
    const playerRect = player.getBoundingClientRect();

    activeScoops.forEach((scoop) => {
      scoop.y += scoop.speed * (delta / 16);
      scoop.el.style.top = `${scoop.y}px`;
    });

    // collision + removal
    activeScoops = activeScoops.filter((scoop) => {
      const scoopRect = scoop.el.getBoundingClientRect();

      const overlapX =
        scoopRect.right > playerRect.left + 20 &&
        scoopRect.left < playerRect.right - 20;
      const overlapY = scoopRect.bottom > playerRect.top + 30;

      if (overlapX && overlapY) {
        if (scoop.type === "good") {
          caught += 1;
          scoopsCountEl.textContent = `${caught} / ${SCOOPS_TO_WIN}`;
          scoop.el.remove();

          // Add to visual stack at the bottom
          addToStack();

          if (caught >= SCOOPS_TO_WIN) {
            gameRunning = false;
            scoopMessage.textContent = "";
            scoopMessage.classList.add("success");
            startWinSequence();
          } else {
            scoopMessage.textContent = "Nice catch!";
          }
        } else {
          // bad object hit
          scoop.el.remove();
          if (lives > 0) {
            lives -= 1;
            if (livesEl) livesEl.textContent = "♥".repeat(lives) + "♡".repeat(LIVES_MAX - lives);
          }

          if (lives <= 0) {
            gameRunning = false;
            if (reviveOverlay) reviveOverlay.classList.add("visible");
          } else {
            scoopMessage.textContent = "Ouch! Dodge the grey scoops.";
          }
        }

        return false;
      }

      if (scoopRect.top > playfieldRect.bottom) {
        scoop.el.remove();
        return false;
      }

      return true;
    });

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

// Keyboard controls
window.addEventListener("keydown", (e) => {
  if (!step2.classList.contains("visible")) return;
  if (!hasSeenInstructions) return;
  const key = e.key.toLowerCase();
  if (key === "arrowleft" || key === "a") {
    playerX -= 5;
    updatePlayerPosition();
  } else if (key === "arrowright" || key === "d") {
    playerX += 5;
    updatePlayerPosition();
  } else {
    return;
  }

  if (!gameRunning) {
    startCatcherGame();
  }
});

// Touch / swipe controls
function handlePointerMove(clientX) {
  const rect = playfield.getBoundingClientRect();
  const percent = ((clientX - rect.left) / rect.width) * 100;
  playerX = percent;
  updatePlayerPosition();
}

playfield.addEventListener("touchstart", (e) => {
  if (!step2.classList.contains("visible")) return;
  if (!hasSeenInstructions) return;
  const touch = e.touches[0];
  if (!touch) return;
  handlePointerMove(touch.clientX);
  if (!gameRunning) startCatcherGame();
});

playfield.addEventListener("touchmove", (e) => {
  if (!step2.classList.contains("visible")) return;
  if (!hasSeenInstructions) return;
  const touch = e.touches[0];
  if (!touch) return;
  handlePointerMove(touch.clientX);
});

playfield.addEventListener("mousedown", (e) => {
  if (!step2.classList.contains("visible")) return;
  if (!hasSeenInstructions) return;
  handlePointerMove(e.clientX);
  if (!gameRunning) startCatcherGame();

  function onMove(ev) {
    handlePointerMove(ev.clientX);
  }

  function onUp() {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }

  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
});

function addToStack() {
  if (!stackContainer) return;
  stackCount += 1;
  stackContainer.style.opacity = "1";

  const stacked = document.createElement("img");
  stacked.src = "images/Bottom Scoop Outline.svg";
  stacked.alt = "Stacked scoop";
  stacked.className = "stack-scoop";

  const colorIndex = (stackCount - 1) % SCOOP_COLORS.length;
  stacked.style.filter =
    SCOOP_COLORS[colorIndex] + " drop-shadow(0 6px 14px rgba(0,0,0,0.25))";

  const verticalOffset = (stackCount - 1) * 18;
  stacked.style.bottom = `${verticalOffset}px`;

  stackContainer.appendChild(stacked);
}

// Revive overlay button handler
if (reviveOkBtn && reviveOverlay) {
  reviveOkBtn.addEventListener("click", () => {
    reviveOverlay.classList.remove("visible");
    resumingFromDeath = true;
    lives = LIVES_MAX;
    if (livesEl) livesEl.textContent = "♥".repeat(lives);
    scoopsCountEl.textContent = `${caught} / ${SCOOPS_TO_WIN}`;
    scoopMessage.textContent =
      "Oh my goodness I love that sexy man. Catch your scoops for a prize.";
    scoopMessage.classList.remove("success");
    gameRunning = false;
    startCatcherGame(false);
  });
}

// Instructions overlay handler
if (instructionsOkBtn && instructionsOverlay) {
  instructionsOkBtn.addEventListener("click", () => {
    instructionsOverlay.style.display = "none";
    hasSeenInstructions = true;
    startCatcherGame(true);
  });
}

function startWinSequence() {
  if (!winOverlay) {
    step2.classList.remove("visible");
    step3.classList.add("visible");
    return;
  }

  winOverlay.classList.add("visible");

  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  function updateCountdown() {
    const now = new Date();
    const diff = startDate - now;
    if (diff <= 0) {
      countdownText.textContent = "It's dinner time!";
      clearInterval(countdownTimer);
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    parts.push(String(hours).padStart(2, "0") + "h");
    parts.push(String(minutes).padStart(2, "0") + "m");
    parts.push(String(seconds).padStart(2, "0") + "s");

    countdownText.textContent = `Dinner with him in ${parts.join(" ")}`;
  }

  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);

  setTimeout(() => {
    winOverlay.classList.remove("visible");
    step2.classList.remove("visible");
    step3.classList.add("visible");
  }, 5500);
}

// Step 3: Google Calendar link
const calendarBtn = document.getElementById("calendar-btn");
const dinnerTimeText = document.getElementById("dinner-time-text");

function getNextFridayAtSix() {
  const now = new Date();
  const result = new Date(now);

  const currentDay = now.getDay(); // 0 = Sun ... 5 = Fri
  const daysUntilFriday = (5 - currentDay + 7) % 7 || 7;

  result.setDate(now.getDate() + daysUntilFriday);
  result.setHours(18, 0, 0, 0); // 6:00 PM
  return result;
}

function formatDisplay(date) {
  return date.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatForCalendar(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = "00";
  return `${year}${month}${day}T${hour}${minute}${second}`;
}

const startDate = getNextFridayAtSix();
const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2‑hour dinner

dinnerTimeText.textContent = `${formatDisplay(startDate)} at 6:00 PM`;

calendarBtn.addEventListener("click", () => {
  const text = encodeURIComponent("Romantic dinner with the sexiest man in the world");
  const details = encodeURIComponent(
    "A special dinner date for Rachel. Bring your cutest smile. 💕"
  );

  const datesParam = `${formatForCalendar(startDate)}/${formatForCalendar(endDate)}`;

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&dates=${datesParam}`;

  window.open(url, "_blank", "noopener");
});

// Final-page photo slideshow
window.addEventListener("DOMContentLoaded", () => {
  const photos = Array.from(document.querySelectorAll(".slideshow-photo"));
  if (photos.length <= 1) return;

  let current = 0;
  photos.forEach((p, i) => {
    p.classList.toggle("slideshow-photo--active", i === 0);
  });

  setInterval(() => {
    photos[current].classList.remove("slideshow-photo--active");
    current = (current + 1) % photos.length;
    photos[current].classList.add("slideshow-photo--active");
  }, 3500);
});

