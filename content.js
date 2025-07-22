// YouTube 플레이리스트 총 재생시간 계산 익스텐션

function detectLanguage() {
  // YouTube 페이지의 언어 감지
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
  // "4:14", "1:30:45" 형태의 시간을 초 단위로 변환
  const parts = timeString.split(":").map(Number);

  if (parts.length === 2) {
    // MM:SS 형태
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS 형태
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return 0;
}

function formatSecondsToTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // 언어별 단위 텍스트
  const lang = detectLanguage();
  const units = getTimeUnits(lang);

  if (hours > 0) {
    return `${hours}${units.hour} ${minutes}${units.minute} ${seconds}${units.second}`;
  } else {
    return `${minutes}${units.minute} ${seconds}${units.second}`;
  }
}

function displayTotalTimeInUI(totalSeconds) {
  // 기존 시간 표시 요소가 있으면 제거
  const existingElement = document.getElementById("playlist-total-time");
  if (existingElement) {
    existingElement.remove();
  }

  // 플레이리스트 메타데이터 영역 찾기 (스크린샷의 "동영상 14개" 부분)
  let targetContainer = null;

  // 다양한 선택자로 시도
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
      if (
        element.textContent.includes("동영상") &&
        element.textContent.includes("개")
      ) {
        targetContainer = element;
        break;
      }
    }
    if (targetContainer) break;
  }

  // 대안: "동영상 XX개" 텍스트가 포함된 요소 직접 검색
  if (!targetContainer) {
    const allElements = document.querySelectorAll("*");
    for (const element of allElements) {
      const text = element.textContent.trim();
      if (text.includes("동영상") && text.includes("개") && text.length < 50) {
        targetContainer = element;
        break;
      }
    }
  }

  if (targetContainer) {
    // 전체 재생시간 표시 요소 생성
    const timeElement = document.createElement("div");
    timeElement.id = "playlist-total-time";

    // 시블링 요소의 computed style 복사
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

    // 원본 클래스도 복사 (추가 스타일링을 위해)
    if (targetContainer.className) {
      timeElement.className = targetContainer.className;
    }

    const lang = detectLanguage();
    const localizedText = getLocalizedText(lang);
    timeElement.textContent = `${
      localizedText.totalPlaytime
    } ${formatSecondsToTime(totalSeconds)}`;

    // "동영상 XX개" 요소 아래에 새로운 줄로 추가
    targetContainer.parentNode.insertBefore(
      timeElement,
      targetContainer.nextSibling
    );
  } else {
    // 최후의 수단: 헤더 영역에 별도 div로 추가
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

  // H:MM:SS 형식으로 표시 (분과 초만 2자리 패딩)
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
  // 기존 시간 표시 요소가 있으면 제거
  const existingElement = document.getElementById("playlist-panel-time");
  if (existingElement) {
    existingElement.remove();
  }

  // "1 / 14" 형태의 텍스트를 포함하는 요소 찾기
  let targetElement = null;

  // 플레이리스트 패널 내에서 검색 - hidden이 아닌 실제 보이는 요소
  const playlistPanel = document.querySelector("ytd-playlist-panel-renderer");
  if (playlistPanel) {
    // .index-message-wrapper 내의 yt-formatted-string 요소 찾기
    const indexWrapper = playlistPanel.querySelector(".index-message-wrapper");
    if (indexWrapper) {
      const formattedStrings = indexWrapper.querySelectorAll(
        "yt-formatted-string"
      );
      for (const element of formattedStrings) {
        const text = element.textContent.trim();
        // "숫자 / 숫자" 패턴 매치하고 hidden 속성이 없는 요소
        if (text.match(/^\d+\s*\/\s*\d+$/) && !element.hasAttribute("hidden")) {
          targetElement = element;
          break;
        }
      }
    }
  }

  if (targetElement) {
    // 시간 표시 요소 생성
    const timeElement = document.createElement("span");
    timeElement.id = "playlist-panel-time";

    // 타겟 요소(시블링)의 스타일 상속
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

    // 시간 정보 표시 (시계 이모지 추가)
    timeElement.textContent = `🕒 ${formatSecondsToTimeDigital(totalSeconds)}`;

    // 타겟 요소 뒤에 추가 (같은 줄 오른쪽에 표시)
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
    // 플레이리스트 페이지에서 현재 재생 중인 비디오 찾기
    const playlistVideos = document.querySelectorAll(
      "ytd-playlist-video-renderer"
    );
    for (let i = 0; i < playlistVideos.length; i++) {
      const item = playlistVideos[i];
      // "지금 재생 중" 텍스트나 재생 상태 확인
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

  return 0; // 기본값으로 첫 번째 비디오
}

function findCurrentVideoIndexForPanel() {
  // 플레이리스트 패널에서 현재 재생 중인 비디오 찾기
  const playlistItems = document.querySelectorAll(
    "ytd-playlist-panel-video-renderer"
  );
  for (let i = 0; i < playlistItems.length; i++) {
    const item = playlistItems[i];
    // selected 속성이나 재생 표시기(▶) 확인
    if (
      item.hasAttribute("selected") ||
      item.querySelector("#index")?.textContent.includes("▶")
    ) {
      return i;
    }
  }

  return 0; // 기본값으로 첫 번째 비디오
}

function calculatePlaylistPanelTime() {
  // 플레이리스트 패널 (동영상 시청 중 오른쪽 패널)
  const playlistPanel = document.querySelector("ytd-playlist-panel-renderer");
  let timeElements;
  if (playlistPanel) {
    timeElements = playlistPanel.querySelectorAll(".badge-shape-wiz__text");
  } else {
    timeElements = document.querySelectorAll(".badge-shape-wiz__text");
  }

  if (timeElements.length === 0) {
    console.log("플레이리스트를 찾을 수 없습니다.");
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
    console.log("비디오 시간을 파싱할 수 없습니다.");
    return;
  }

  // 전체 재생시간 계산
  const totalSeconds = videoTimes.reduce((sum, time) => sum + time, 0);

  // 현재 비디오 인덱스 찾기 (플레이리스트 패널용)
  const currentIndex = findCurrentVideoIndexForPanel();

  // 시청한 시간 계산 (1~N번째 비디오의 시간 합, N은 현재 비디오 인덱스+1)
  const watchedSeconds = videoTimes
    .slice(0, currentIndex + 1)
    .reduce((sum, time) => sum + time, 0);

  // 남은 재생시간 계산 (전체시간 - 시청한 시간)
  const remainingSeconds = totalSeconds - watchedSeconds;

  // 진행률 계산 (시청한 시간 / 전체시간 * 100)
  const progressPercentage =
    totalSeconds > 0 ? ((watchedSeconds / totalSeconds) * 100).toFixed(1) : 0;

  // 결과 출력
  console.log("=== YouTube 플레이리스트 패널 정보 ===");
  console.log(`전체 재생시간: ${formatSecondsToTime(totalSeconds)}`);
  console.log(`남은 재생시간: ${formatSecondsToTime(remainingSeconds)}`);
  console.log(`진행률: ${progressPercentage}%`);
  console.log(`총 비디오 수: ${videoTimes.length}개`);
  console.log(`현재 비디오: ${currentIndex + 1}번째`);

  // 플레이리스트 패널 UI에 시간 정보 표시
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
    // 플레이리스트 페이지 (/playlist URL)
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
    // 플레이리스트 패널 (동영상 시청 중 오른쪽 패널)
    const playlistPanel = document.querySelector("ytd-playlist-panel-renderer");
    if (playlistPanel) {
      timeElements = playlistPanel.querySelectorAll(".badge-shape-wiz__text");
    } else {
      timeElements = document.querySelectorAll(".badge-shape-wiz__text");
    }
  }

  if (timeElements.length === 0) {
    console.log("플레이리스트를 찾을 수 없습니다.");
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
    console.log("비디오 시간을 파싱할 수 없습니다.");
    return;
  }

  // 전체 재생시간 계산
  const totalSeconds = videoTimes.reduce((sum, time) => sum + time, 0);

  // 현재 비디오 인덱스 찾기
  const currentIndex = findCurrentVideoIndex();

  // 시청한 시간 계산 (1~N번째 비디오의 시간 합, N은 현재 비디오 인덱스+1)
  const watchedSeconds = videoTimes
    .slice(0, currentIndex + 1)
    .reduce((sum, time) => sum + time, 0);

  // 남은 재생시간 계산 (전체시간 - 시청한 시간)
  const remainingSeconds = totalSeconds - watchedSeconds;

  // 진행률 계산 (시청한 시간 / 전체시간 * 100)
  const progressPercentage =
    totalSeconds > 0 ? ((watchedSeconds / totalSeconds) * 100).toFixed(1) : 0;

  // 결과 출력
  if (isPlaylistPage) {
    // 플레이리스트 페이지에서는 전체 재생시간을 UI에 표시
    console.log("=== YouTube 플레이리스트 정보 ===");
    console.log(`전체 재생시간: ${formatSecondsToTime(totalSeconds)}`);

    // UI에 전체 재생시간 표시
    displayTotalTimeInUI(totalSeconds);
  } else {
    // 플레이리스트 패널에서는 모든 정보 표시
    console.log("=== YouTube 플레이리스트 패널 정보 ===");
    console.log(`전체 재생시간: ${formatSecondsToTime(totalSeconds)}`);
    console.log(`남은 재생시간: ${formatSecondsToTime(remainingSeconds)}`);
    console.log(`진행률: ${progressPercentage}%`);
    console.log(`총 비디오 수: ${videoTimes.length}개`);
    console.log(`현재 비디오: ${currentIndex + 1}번째`);
  }
}

// 페이지 로드 완료 후 실행
function runWhenReady() {
  // YouTube 페이지인지 확인
  if (!window.location.hostname.includes("youtube.com")) {
    return;
  }

  // 플레이리스트 페이지인지 확인 (/playlist 경로)
  if (window.location.pathname.includes("/playlist")) {
    // DOM이 완전히 로드될 때까지 대기
    setTimeout(() => {
      calculatePlaylistTime();
    }, 2000);
  }
  // watch 페이지의 플레이리스트 패널인지 확인
  else if (
    window.location.search.includes("list=") &&
    document.querySelector("ytd-playlist-panel-renderer")
  ) {
    // DOM이 완전히 로드될 때까지 대기
    setTimeout(() => {
      calculatePlaylistPanelTime();
    }, 2000);
  }
}

// 페이지 변경 감지 (YouTube SPA 특성상 필요)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(runWhenReady, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// 초기 실행
runWhenReady();
