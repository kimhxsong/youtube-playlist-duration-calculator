// YouTube 플레이리스트 총 재생시간 계산 익스텐션

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

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${seconds}초`;
  } else {
    return `${minutes}분 ${seconds}초`;
  }
}

function findCurrentVideoIndex() {
  let isPlaylistPage = window.location.pathname.includes('/playlist');

  if (isPlaylistPage) {
    // 플레이리스트 페이지에서 현재 재생 중인 비디오 찾기
    const playlistVideos = document.querySelectorAll("ytd-playlist-video-renderer");
    for (let i = 0; i < playlistVideos.length; i++) {
      const item = playlistVideos[i];
      // "지금 재생 중" 텍스트나 재생 상태 확인
      if (
        item.querySelector("ytd-thumbnail-overlay-now-playing-renderer:not([hidden])") ||
        item.querySelector('[aria-label*="지금 재생"]') ||
        item.querySelector('yt-formatted-string:contains("지금 재생 중")') ||
        item.querySelector('#overlay-text')?.textContent.includes('지금 재생 중')
      ) {
        return i;
      }
    }
  } else {
    // 플레이리스트 패널에서 현재 재생 중인 비디오 찾기
    const playlistItems = document.querySelectorAll("ytd-playlist-panel-video-renderer");
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
  }

  return 0; // 기본값으로 첫 번째 비디오
}

function calculatePlaylistTime() {
  let timeElements;
  let isPlaylistPage = window.location.pathname.includes('/playlist');

  if (isPlaylistPage) {
    // 플레이리스트 페이지 (/playlist URL)
    const playlistContainer = document.querySelector('#contents') || 
                             document.querySelector('ytd-playlist-video-list-renderer');
    if (playlistContainer) {
      timeElements = playlistContainer.querySelectorAll('.badge-shape-wiz__text');
    } else {
      timeElements = document.querySelectorAll('ytd-playlist-video-renderer .badge-shape-wiz__text');
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
    // 플레이리스트 페이지에서는 전체 재생시간만 표시
    console.log("=== YouTube 플레이리스트 정보 ===");
    console.log(`전체 재생시간: ${formatSecondsToTime(totalSeconds)}`);
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

  // 플레이리스트 페이지인지 확인
  if (
    window.location.pathname.includes("/playlist") ||
    window.location.search.includes("list=") ||
    document.querySelector("ytd-playlist-panel-renderer")
  ) {
    // DOM이 완전히 로드될 때까지 대기
    setTimeout(() => {
      calculatePlaylistTime();
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
