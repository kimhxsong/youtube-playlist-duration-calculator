document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Check if it's a YouTube page
    if (!tab.url.includes('youtube.com')) {
      document.getElementById('popup-content').innerHTML = `
        <div class="no-data">
          <div>🚫</div>
          <div>Not a YouTube page</div>
          <div style="font-size: 12px; margin-top: 4px;">This extension only works on YouTube</div>
        </div>
      `;
      return;
    }
    
    // Execute content script to get playlist data
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getPlaylistData
    });
    
    const playlistData = results[0].result;
    displayPlaylistData(playlistData);
    
  } catch (error) {
    console.error('Popup error:', error);
    document.getElementById('popup-content').innerHTML = `
      <div class="no-data">
        <div>⚠️</div>
        <div>Error loading playlist data</div>
        <button class="refresh-btn" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
});

function getPlaylistData() {
  try {
    // Check if it's a playlist page or watch page with playlist
    const isPlaylistPage = window.location.pathname.includes('/playlist');
    const isWatchWithPlaylist = window.location.search.includes('list=') && 
                                document.querySelector('ytd-playlist-panel-renderer');
    
    if (!isPlaylistPage && !isWatchWithPlaylist) {
      return { type: 'none' };
    }
    
    // Parse time to seconds
    function parseTimeToSeconds(timeString) {
      const parts = timeString.split(':').map(Number);
      if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      return 0;
    }
    
    // Format seconds to readable time
    function formatTime(totalSeconds) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
      } else {
        return `${minutes}m ${seconds}s`;
      }
    }
    
    // Find current video index for watch page
    function findCurrentVideoIndex() {
      const playlistItems = document.querySelectorAll('ytd-playlist-panel-video-renderer');
      for (let i = 0; i < playlistItems.length; i++) {
        const item = playlistItems[i];
        if (item.hasAttribute('selected') || 
            item.querySelector('#index')?.textContent.includes('▶')) {
          return i;
        }
      }
      return 0;
    }
    
    // Get time elements based on page type
    let timeElements;
    if (isPlaylistPage) {
      timeElements = document.querySelectorAll('ytd-playlist-video-renderer .badge-shape-wiz__text');
    } else {
      const playlistPanel = document.querySelector('ytd-playlist-panel-renderer');
      timeElements = playlistPanel?.querySelectorAll('.badge-shape-wiz__text') || [];
    }
    
    if (timeElements.length === 0) {
      return { type: 'no-data' };
    }
    
    // Parse video times
    const videoTimes = [];
    timeElements.forEach(element => {
      const timeText = element.textContent.trim();
      const seconds = parseTimeToSeconds(timeText);
      if (seconds > 0) {
        videoTimes.push(seconds);
      }
    });
    
    if (videoTimes.length === 0) {
      return { type: 'no-data' };
    }
    
    // Calculate totals
    const totalSeconds = videoTimes.reduce((sum, time) => sum + time, 0);
    const currentIndex = isWatchWithPlaylist ? findCurrentVideoIndex() : 0;
    const watchedSeconds = videoTimes.slice(0, currentIndex + 1).reduce((sum, time) => sum + time, 0);
    const remainingSeconds = totalSeconds - watchedSeconds;
    const progressPercentage = totalSeconds > 0 ? ((watchedSeconds / totalSeconds) * 100).toFixed(1) : 0;
    
    return {
      type: isPlaylistPage ? 'playlist' : 'watch',
      totalDuration: formatTime(totalSeconds),
      totalVideos: videoTimes.length,
      currentVideo: currentIndex + 1,
      remainingTime: formatTime(remainingSeconds),
      progress: progressPercentage,
      totalSeconds,
      remainingSeconds
    };
    
  } catch (error) {
    return { type: 'error', message: error.message };
  }
}

function displayPlaylistData(data) {
  const content = document.getElementById('popup-content');
  
  if (data.type === 'none') {
    content.innerHTML = `
      <div class="no-data">
        <div>📺</div>
        <div>No playlist detected</div>
        <div style="font-size: 12px; margin-top: 4px;">Navigate to a YouTube playlist or watch a playlist video</div>
      </div>
    `;
    return;
  }
  
  if (data.type === 'no-data' || data.type === 'error') {
    content.innerHTML = `
      <div class="no-data">
        <div>⚠️</div>
        <div>Unable to load playlist data</div>
        <div style="font-size: 12px; margin-top: 4px;">Try refreshing the page</div>
      </div>
    `;
    return;
  }
  
  let html = '';
  
  if (data.type === 'playlist') {
    html = `
      <div class="header">
        <span>📊</span>
        <span>Playlist Info</span>
      </div>
      <div class="info-item">
        <span class="label">Total Duration:</span>
        <span class="value">${data.totalDuration}</span>
      </div>
      <div class="info-item">
        <span class="label">Total Videos:</span>
        <span class="value">${data.totalVideos}</span>
      </div>
    `;
  } else if (data.type === 'watch') {
    html = `
      <div class="header">
        <span>🕒</span>
        <span>Watch Progress</span>
      </div>
      <div class="info-item">
        <span class="label">Total Duration:</span>
        <span class="value">${data.totalDuration}</span>
      </div>
      <div class="info-item">
        <span class="label">Remaining Time:</span>
        <span class="value">${data.remainingTime}</span>
      </div>
      <div class="info-item">
        <span class="label">Progress:</span>
        <span class="value">${data.progress}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${data.progress}%"></div>
      </div>
      <div class="info-item" style="margin-top: 8px;">
        <span class="label">Current Video:</span>
        <span class="value">${data.currentVideo} / ${data.totalVideos}</span>
      </div>
    `;
  }
  
  content.innerHTML = html;
}