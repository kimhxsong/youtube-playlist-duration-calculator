// YouTube Playlist Total Duration Calculator Extension

function detectLanguage() {
  // Detect YouTube page language
  const htmlLang = document.documentElement.lang;
  if (htmlLang && htmlLang.startsWith("ko")) {
    return "ko";
  }
  return "en";
}

function getTimeUnits(lang) {
  const units = {
    ko: {
      hour: "시간",
      minute: "분",
      second: "초",
    },
    en: {
      hour: "h",
      minute: "m",
      second: "s",
    },
  };
  return units[lang] || units.en;
}

function getLocalizedText(lang) {
  const texts = {
    ko: {
      totalPlaytime: "총 재생시간:",
    },
    en: {
      totalPlaytime: "Total duration:",
    },
  };
  return texts[lang] || texts.en;
}

function parseTimeToSeconds(timeString) {
  // Convert time format "4:14" or "1:30:45" to seconds
  const parts = timeString.split(":").map(Number);

  if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return 0;
}

function formatSecondsToTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const lang = detectLanguage();
  const units = getTimeUnits(lang);

  if (hours > 0) {
    return `${hours}${units.hour} ${minutes}${units.minute} ${seconds}${units.second}`;
  } else {
    return `${minutes}${units.minute} ${seconds}${units.second}`;
  }
}

function displayTotalTimeInUI(totalSeconds) {
  // Remove existing time display element
  const existingElement = document.getElementById("playlist-total-time");
  if (existingElement) {
    existingElement.remove();
  }

  // Find playlist metadata area
  let targetContainer = null;

  const possibleSelectors = [
    "ytd-playlist-header-renderer #stats",
    "ytd-playlist-header-renderer .metadata-stats",
    "#stats.ytd-playlist-header-renderer",
    "ytd-playlist-header-renderer yt-formatted-string",
    "#header ytd-playlist-header-renderer",
  ];

  for (const selector of possibleSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.textContent;
      if (
        (text.includes("동영상") && text.includes("개")) ||
        (text.includes("videos") && text.match(/\d+\s*videos?/)) ||
        text.match(/\d+\s*(videos?|동영상)/)
      ) {
        targetContainer = element;
        break;
      }
    }
    if (targetContainer) break;
  }

  // Fallback: Find elements containing video count text
  if (!targetContainer) {
    const allElements = document.querySelectorAll("*");
    for (const element of allElements) {
      const text = element.textContent.trim();
      if (
        ((text.includes("동영상") && text.includes("개")) ||
          text.match(/\d+\s*videos?/) ||
          text.includes("video")) &&
        text.length < 100
      ) {
        targetContainer = element;
        break;
      }
    }
  }

  if (targetContainer) {
    // Create total duration display element
    const timeElement = document.createElement("div");
    timeElement.id = "playlist-total-time";

    // Copy computed styles from sibling element
    const computedStyle = window.getComputedStyle(targetContainer);
    timeElement.style.cssText = `
      color: ${computedStyle.color};
      font-family: ${computedStyle.fontFamily};
      font-size: ${computedStyle.fontSize};
      font-weight: ${computedStyle.fontWeight};
      line-height: ${computedStyle.lineHeight};
      margin-top: 4px;
      display: block;
    `;

    if (targetContainer.className) {
      timeElement.className = targetContainer.className;
    }

    const lang = detectLanguage();
    const localizedText = getLocalizedText(lang);
    timeElement.textContent = `${
      localizedText.totalPlaytime
    } ${formatSecondsToTime(totalSeconds)}`;

    // Insert after the video count element
    targetContainer.parentNode.insertBefore(
      timeElement,
      targetContainer.nextSibling
    );
  } else {
    // Fallback: Add to header area
    const header =
      document.querySelector("ytd-playlist-header-renderer") ||
      document.querySelector("#header");
    if (header) {
      const timeElement = document.createElement("div");
      timeElement.id = "playlist-total-time";
      timeElement.style.cssText = `
        color: #030303;
        font-size: 14px;
        margin-top: 8px;
        padding-left: 24px;
        font-family: Roboto, Arial, sans-serif;
      `;
      timeElement.textContent = `${formatSecondsToTime(totalSeconds)}`;
      header.appendChild(timeElement);
    }
  }
}

function formatSecondsToTimeDigital(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Display in H:MM:SS format (pad minutes and seconds to 2 digits)
  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${formattedMinutes}:${formattedSeconds}`;
  } else {
    return `${formattedMinutes}:${formattedSeconds}`;
  }
}

function displayPlaylistPanelTimeInUI(
  totalSeconds,
  remainingSeconds,
  currentIndex,
  totalCount
) {
  // Remove existing time display element
  const existingElement = document.getElementById("playlist-panel-time");
  if (existingElement) {
    existingElement.remove();
  }

  // Find element containing "1 / 14" format text
  let targetElement = null;

  const playlistPanel = document.querySelector("ytd-playlist-panel-renderer");
  if (playlistPanel) {
    const indexWrapper = playlistPanel.querySelector(".index-message-wrapper");
    if (indexWrapper) {
      const formattedStrings = indexWrapper.querySelectorAll(
        "yt-formatted-string"
      );
      for (const element of formattedStrings) {
        const text = element.textContent.trim();
        // Match "number / number" pattern without hidden attribute
        if (text.match(/^\d+\s*\/\s*\d+$/) && !element.hasAttribute("hidden")) {
          targetElement = element;
          break;
        }
      }
    }
  }

  if (targetElement) {
    // Create time display element
    const timeElement = document.createElement("span");
    timeElement.id = "playlist-panel-time";

    // Inherit styles from target element
    const computedStyle = window.getComputedStyle(targetElement);
    timeElement.style.cssText = `
      color: ${computedStyle.color};
      font-family: ${computedStyle.fontFamily};
      font-size: ${computedStyle.fontSize};
      font-weight: ${computedStyle.fontWeight};
      line-height: ${computedStyle.lineHeight};
      margin-left: auto;
      padding-left: 8px;
      float: right;
    `;

    // Display time with clock emoji
    timeElement.textContent = `🕒 ${formatSecondsToTimeDigital(totalSeconds)}`;

    // Add after target element (on same line, right side)
    if (targetElement.nextSibling) {
      targetElement.parentNode.insertBefore(
        timeElement,
        targetElement.nextSibling
      );
    } else {
      targetElement.parentNode.appendChild(timeElement);
    }
  }
}

function findCurrentVideoIndex() {
  let isPlaylistPage = window.location.pathname.includes("/playlist");

  if (isPlaylistPage) {
    // Find currently playing video in playlist page
    const playlistVideos = document.querySelectorAll(
      "ytd-playlist-video-renderer"
    );
    for (let i = 0; i < playlistVideos.length; i++) {
      const item = playlistVideos[i];
      if (
        item.querySelector(
          "ytd-thumbnail-overlay-now-playing-renderer:not([hidden])"
        ) ||
        item.querySelector('[aria-label*="지금 재생"]') ||
        item.querySelector('yt-formatted-string:contains("지금 재생 중")') ||
        item
          .querySelector("#overlay-text")
          ?.textContent.includes("지금 재생 중")
      ) {
        return i;
      }
    }
  }

  return 0;
}

function findCurrentVideoIndexForPanel() {
  // Find currently playing video in playlist panel
  const playlistItems = document.querySelectorAll(
    "ytd-playlist-panel-video-renderer"
  );
  for (let i = 0; i < playlistItems.length; i++) {
    const item = playlistItems[i];
    // Check for selected attribute or play indicator (▶)
    if (
      item.hasAttribute("selected") ||
      item.querySelector("#index")?.textContent.includes("▶")
    ) {
      return i;
    }
  }

  return 0;
}

function calculatePlaylistPanelTime() {
  // Playlist panel (right panel during video watching)
  const playlistPanel = document.querySelector("ytd-playlist-panel-renderer");
  let timeElements;
  if (playlistPanel) {
    timeElements = playlistPanel.querySelectorAll(".badge-shape-wiz__text");
  } else {
    timeElements = document.querySelectorAll(".badge-shape-wiz__text");
  }

  if (timeElements.length === 0) {
    return;
  }

  const videoTimes = [];
  timeElements.forEach((element) => {
    const timeText = element.textContent.trim();
    const seconds = parseTimeToSeconds(timeText);
    if (seconds > 0) {
      videoTimes.push(seconds);
    }
  });

  if (videoTimes.length === 0) {
    return;
  }

  const totalSeconds = videoTimes.reduce((sum, time) => sum + time, 0);

  // Find current video index for playlist panel
  const currentIndex = findCurrentVideoIndexForPanel();

  // Calculate watched time (sum of videos 1~N, where N is current video index+1)
  const watchedSeconds = videoTimes
    .slice(0, currentIndex + 1)
    .reduce((sum, time) => sum + time, 0);

  // Calculate remaining time (total time - watched time)
  const remainingSeconds = totalSeconds - watchedSeconds;

  // Calculate progress percentage (watched time / total time * 100)
  const progressPercentage =
    totalSeconds > 0 ? ((watchedSeconds / totalSeconds) * 100).toFixed(1) : 0;

  // Display time information in playlist panel UI
  displayPlaylistPanelTimeInUI(
    totalSeconds,
    remainingSeconds,
    currentIndex + 1,
    videoTimes.length
  );
}

function calculatePlaylistTime() {
  let timeElements;
  let isPlaylistPage = window.location.pathname.includes("/playlist");

  if (isPlaylistPage) {
    // Playlist page (/playlist URL)
    const playlistContainer =
      document.querySelector("#contents") ||
      document.querySelector("ytd-playlist-video-list-renderer");
    if (playlistContainer) {
      timeElements = playlistContainer.querySelectorAll(
        ".badge-shape-wiz__text"
      );
    } else {
      timeElements = document.querySelectorAll(
        "ytd-playlist-video-renderer .badge-shape-wiz__text"
      );
    }
  } else {
    // Playlist panel (right panel during video watching)
    const playlistPanel = document.querySelector("ytd-playlist-panel-renderer");
    if (playlistPanel) {
      timeElements = playlistPanel.querySelectorAll(".badge-shape-wiz__text");
    } else {
      timeElements = document.querySelectorAll(".badge-shape-wiz__text");
    }
  }

  if (timeElements.length === 0) {
    return;
  }

  const videoTimes = [];
  timeElements.forEach((element) => {
    const timeText = element.textContent.trim();
    const seconds = parseTimeToSeconds(timeText);
    if (seconds > 0) {
      videoTimes.push(seconds);
    }
  });

  if (videoTimes.length === 0) {
    return;
  }

  const totalSeconds = videoTimes.reduce((sum, time) => sum + time, 0);

  // Find current video index
  const currentIndex = findCurrentVideoIndex();

  // Calculate watched time (sum of videos 1~N, where N is current video index+1)
  const watchedSeconds = videoTimes
    .slice(0, currentIndex + 1)
    .reduce((sum, time) => sum + time, 0);

  // Calculate remaining time (total time - watched time)
  const remainingSeconds = totalSeconds - watchedSeconds;

  // Calculate progress percentage (watched time / total time * 100)
  const progressPercentage =
    totalSeconds > 0 ? ((watchedSeconds / totalSeconds) * 100).toFixed(1) : 0;

  if (isPlaylistPage) {
    // Display total duration in UI for playlist page
    displayTotalTimeInUI(totalSeconds);
  }
}

// Execute after page load completion
function runWhenReady() {
  // Check if it's YouTube page
  if (!window.location.hostname.includes("youtube.com")) {
    return;
  }

  // Check if it's playlist page (/playlist path)
  if (window.location.pathname.includes("/playlist")) {
    // Wait until DOM is fully loaded
    setTimeout(() => {
      calculatePlaylistTime();
    }, 2000);
  }
  // Check if it's watch page with playlist panel
  else if (
    window.location.search.includes("list=") &&
    document.querySelector("ytd-playlist-panel-renderer")
  ) {
    // Wait until DOM is fully loaded
    setTimeout(() => {
      calculatePlaylistPanelTime();
    }, 2000);
  }
}

// Detect page changes (necessary for YouTube SPA)
let lastUrl = location.href;
let updateTimer = null;

const observer = new MutationObserver(() => {
  const url = location.href;

  // Detect URL changes
  if (url !== lastUrl) {
    lastUrl = url;
    clearTimeout(updateTimer);
    updateTimer = setTimeout(runWhenReady, 1000);
    return;
  }

  // Detect dynamic content changes on playlist pages
  if (
    url.includes("/playlist") ||
    (url.includes("list=") && url.includes("/watch"))
  ) {
    // Cancel existing timer and set new timer (debouncing)
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
      // Additional wait for DOM stabilization
      setTimeout(runWhenReady, 500);
    }, 1000);
  }
});

observer.observe(document, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["class", "style", "hidden"],
});

// Periodic update (last resort)
let periodicUpdateInterval = null;

function startPeriodicUpdate() {
  if (periodicUpdateInterval) {
    clearInterval(periodicUpdateInterval);
  }

  if (
    location.href.includes("/playlist") ||
    (location.href.includes("list=") && location.href.includes("/watch"))
  ) {
    let checkCount = 0;
    const maxFastChecks = 10;

    function createInterval(interval) {
      return setInterval(() => {
        const hasTimeDisplay =
          document.getElementById("playlist-total-time") ||
          document.getElementById("playlist-panel-time");

        if (!hasTimeDisplay) {
          runWhenReady();
        }

        checkCount++;

        if (hasTimeDisplay && checkCount < maxFastChecks) {
          clearInterval(periodicUpdateInterval);
          periodicUpdateInterval = createInterval(10000);
        } else if (
          checkCount >= maxFastChecks &&
          periodicUpdateInterval &&
          interval === 1000
        ) {
          clearInterval(periodicUpdateInterval);
          periodicUpdateInterval = createInterval(10000);
        }
      }, interval);
    }

    periodicUpdateInterval = createInterval(1000);
  }
}

// Initial execution
runWhenReady();
startPeriodicUpdate();

// Restart periodic update when URL changes
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function (...args) {
  originalPushState.apply(history, args);
  setTimeout(() => {
    runWhenReady();
    startPeriodicUpdate();
  }, 1000);
};

history.replaceState = function (...args) {
  originalReplaceState.apply(history, args);
  setTimeout(() => {
    runWhenReady();
    startPeriodicUpdate();
  }, 1000);
};

// Handle popstate events (back/forward navigation)
window.addEventListener("popstate", () => {
  setTimeout(() => {
    runWhenReady();
    startPeriodicUpdate();
  }, 1000);
});
