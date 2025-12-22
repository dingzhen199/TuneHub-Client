// API 基础 URL
const API_BASE = window.location.origin;

// 标签页切换
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // 更新按钮状态
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 更新内容显示
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // 如果是历史标签页，加载历史记录
        if (tabName === 'history') {
            loadPlayHistory();
        }
    });
});

// 高级功能子标签页切换
document.querySelectorAll('.advanced-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.advancedTab;
        
        // 更新按钮状态
        document.querySelectorAll('.advanced-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 更新内容显示
        document.querySelectorAll('.advanced-tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`advanced-${tabName}`).classList.add('active');
        
        // 如果是统计标签页，加载统计数据
        if (tabName === 'stats') {
            loadAllStats();
        }
    });
});

// 搜索功能
const searchBtn = document.getElementById('search-btn');
const searchKeyword = document.getElementById('search-keyword');
const searchPlatform = document.getElementById('search-platform');
const searchResults = document.getElementById('search-results');
const searchSuggestions = document.getElementById('search-suggestions');

// 搜索历史管理
const SEARCH_HISTORY_KEY = 'tunehub_search_history';
const MAX_SEARCH_HISTORY = 10;

function getSearchHistory() {
    try {
        const history = localStorage.getItem(SEARCH_HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('读取搜索历史失败:', error);
        return [];
    }
}

function saveSearchHistory(keyword) {
    if (!keyword || !keyword.trim()) return;
    
    try {
        let history = getSearchHistory();
        // 移除重复项
        history = history.filter(item => item.toLowerCase() !== keyword.toLowerCase());
        // 添加到开头
        history.unshift(keyword.trim());
        // 限制数量
        if (history.length > MAX_SEARCH_HISTORY) {
            history = history.slice(0, MAX_SEARCH_HISTORY);
        }
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error('保存搜索历史失败:', error);
    }
}

function clearSearchHistory() {
    try {
        localStorage.removeItem(SEARCH_HISTORY_KEY);
        hideSearchSuggestions();
    } catch (error) {
        console.error('清除搜索历史失败:', error);
    }
}

function showSearchSuggestions() {
    const history = getSearchHistory();
    if (history.length === 0) {
        hideSearchSuggestions();
        return;
    }
    
    if (searchSuggestions) {
        searchSuggestions.innerHTML = `
            <div class="suggestions-header">
                <span>搜索历史</span>
                <button class="clear-history-btn-small" onclick="clearSearchHistory()">清除</button>
            </div>
            ${history.map(keyword => `
                <div class="suggestion-item" onclick="selectSearchSuggestion('${escapeHtml(keyword)}')">
                    <span class="suggestion-icon">🔍</span>
                    <span>${escapeHtml(keyword)}</span>
                </div>
            `).join('')}
        `;
        searchSuggestions.style.display = 'block';
    }
}

function hideSearchSuggestions() {
    if (searchSuggestions) {
        searchSuggestions.style.display = 'none';
    }
}

function selectSearchSuggestion(keyword) {
    searchKeyword.value = keyword;
    hideSearchSuggestions();
    searchBtn.click();
}

// 将函数暴露到全局作用域（用于搜索建议）
window.clearSearchHistory = clearSearchHistory;
window.selectSearchSuggestion = selectSearchSuggestion;

searchBtn.addEventListener('click', async () => {
    const keyword = searchKeyword.value.trim();
    if (!keyword) {
        showError(searchResults, '请输入搜索关键词');
        return;
    }
    
    // 保存搜索历史
    saveSearchHistory(keyword);
    hideSearchSuggestions();
    
    searchResults.innerHTML = '<div class="loading">搜索中...</div>';
    
    try {
        let data;
        if (searchPlatform.value === 'aggregateSearch') {
            // 聚合搜索
            data = await safeFetch(`${API_BASE}/api/proxy/aggregateSearch?keyword=${encodeURIComponent(keyword)}`);
        } else {
            // 单平台搜索
            data = await safeFetch(`${API_BASE}/api/proxy/search?source=${searchPlatform.value}&keyword=${encodeURIComponent(keyword)}&limit=20`);
        }
        
        if (data.code === 200 && data.data) {
            displaySearchResults(data.data.results || []);
        } else {
            showError(searchResults, data.message || '搜索失败');
        }
    } catch (error) {
        showError(searchResults, getUserFriendlyError(error));
    }
});

searchKeyword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

// 搜索框聚焦时显示建议
searchKeyword.addEventListener('focus', () => {
    showSearchSuggestions();
});

// 点击外部时隐藏建议
document.addEventListener('click', (e) => {
    if (!searchKeyword.contains(e.target) && !searchSuggestions?.contains(e.target)) {
        hideSearchSuggestions();
    }
});

// 执行搜索功能（可被其他地方调用）
function performSearch(keyword) {
    if (!keyword || !keyword.trim()) {
        return;
    }
    
    // 切换到搜索标签页
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === 'search') {
            btn.click();
        }
    });
    
    // 填充搜索关键词
    searchKeyword.value = keyword.trim();
    
    // 执行搜索
    searchBtn.click();
}

function displaySearchResults(results) {
    if (results.length === 0) {
        searchResults.innerHTML = '<div class="error">未找到相关结果</div>';
        currentSongList = [];
        return;
    }
    
    // 保存当前歌曲列表
    currentSongList = results;
    
    searchResults.innerHTML = results.map((song, index) => {
        const songName = escapeHtml(song.name);
        const artist = escapeHtml(song.artist || '未知');
        const album = escapeHtml(song.album || '未知');
        
        return `
        <div class="song-card" data-platform="${song.platform || 'netease'}" data-id="${song.id}" data-name="${songName}" data-artist="${artist}">
            <h3>${songName}</h3>
            <p>歌手: <span class="clickable-text" data-keyword="${artist}">${artist}</span></p>
            <p>专辑: <span class="clickable-text" data-keyword="${album}">${album}</span></p>
            <span class="platform-badge">${getPlatformName(song.platform || 'netease')}</span>
            <button class="add-to-queue-btn" data-platform="${song.platform || 'netease'}" data-id="${song.id}" data-name="${songName}" data-artist="${artist}" title="添加到队列">+</button>
        </div>
    `;
    }).join('');
    
    // 事件委托已在 DOMContentLoaded 中设置，无需重复绑定
}

// 歌单功能
const loadPlaylistBtn = document.getElementById('load-playlist-btn');
const playlistPlatform = document.getElementById('playlist-platform');
const playlistId = document.getElementById('playlist-id');
const playlistInfo = document.getElementById('playlist-info');
const playlistResults = document.getElementById('playlist-results');
const playlistActions = document.getElementById('playlist-actions');
const saveAllSongsBtn = document.getElementById('save-all-songs-btn');
const saveProgress = document.getElementById('save-progress');

// 当前加载的歌单数据
let currentPlaylistSongs = [];

loadPlaylistBtn.addEventListener('click', async () => {
    const id = playlistId.value.trim();
    if (!id) {
        showError(playlistInfo, '请输入歌单ID');
        return;
    }
    
    playlistInfo.innerHTML = '<div class="loading">加载中...</div>';
    playlistResults.innerHTML = '';
    playlistActions.style.display = 'none';
    currentPlaylistSongs = [];
    
    try {
        const data = await safeFetch(`${API_BASE}/api/proxy/playlist?source=${playlistPlatform.value}&id=${id}`);
        
        if (data.code === 200 && data.data) {
            if (data.data.info) {
                playlistInfo.innerHTML = `
                    <div class="success">
                        <h3>${escapeHtml(data.data.info.name || '未知歌单')}</h3>
                        <p>创建者: ${escapeHtml(data.data.info.author || '未知')}</p>
                    </div>
                `;
            }
            
            if (data.data.list && data.data.list.length > 0) {
                // 保存歌单数据
                currentPlaylistSongs = data.data.list;
                
                // 显示保存全部按钮
                playlistActions.style.display = 'block';
                
                // 保存当前歌曲列表
                currentSongList = data.data.list.map(song => ({
                    platform: playlistPlatform.value,
                    id: song.id,
                    name: song.name,
                    artist: ''
                }));
                
                playlistResults.innerHTML = data.data.list.map(song => {
                    const songName = escapeHtml(song.name);
                    return `
                    <div class="song-card" data-platform="${playlistPlatform.value}" data-id="${song.id}" data-name="${songName}" data-artist="">
                        <h3>${songName}</h3>
                        <p>可用音质: ${song.types ? song.types.join(', ') : '未知'}</p>
                        <button class="add-to-queue-btn" data-platform="${playlistPlatform.value}" data-id="${song.id}" data-name="${songName}" data-artist="" title="添加到队列">+</button>
                    </div>
                `;
                }).join('');
                
                // 事件委托已在 DOMContentLoaded 中设置，无需重复绑定
            } else {
                playlistResults.innerHTML = '<div class="error">歌单为空</div>';
                playlistActions.style.display = 'none';
                currentPlaylistSongs = [];
            }
        } else {
            showError(playlistInfo, data.message || '加载失败');
        }
    } catch (error) {
        showError(playlistInfo, getUserFriendlyError(error));
    }
});

// 排行榜功能
const loadToplistsBtn = document.getElementById('load-toplists-btn');
const toplistPlatform = document.getElementById('toplist-platform');
const toplistsList = document.getElementById('toplists-list');
const toplistResults = document.getElementById('toplist-results');

loadToplistsBtn.addEventListener('click', async () => {
    toplistsList.innerHTML = '<div class="loading">加载中...</div>';
    toplistResults.innerHTML = '';
    
    try {
        const data = await safeFetch(`${API_BASE}/api/proxy/toplists?source=${toplistPlatform.value}`);
        
        if (data.code === 200 && data.data && data.data.list) {
            toplistsList.innerHTML = data.data.list.map(toplist => `
                <div class="toplist-item" data-platform="${escapeHtml(toplistPlatform.value)}" data-id="${escapeHtml(toplist.id)}" data-name="${escapeHtml(toplist.name)}">
                    <strong>${escapeHtml(toplist.name)}</strong>
                    <span style="float: right; color: #666;">${toplist.updateFrequency || ''}</span>
                </div>
            `).join('');
            
            // 绑定点击事件（使用事件委托）
            toplistsList.querySelectorAll('.toplist-item').forEach(item => {
                item.addEventListener('click', () => {
                    loadToplist(
                        item.dataset.platform,
                        item.dataset.id,
                        item.dataset.name
                    );
                });
            });
        } else {
            showError(toplistsList, data.message || '加载失败');
        }
    } catch (error) {
        showError(toplistsList, getUserFriendlyError(error));
    }
});

async function loadToplist(platform, id, name) {
    toplistResults.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        const data = await safeFetch(`${API_BASE}/api/proxy/toplist?source=${platform}&id=${id}`);
        
        if (data.code === 200 && data.data && data.data.list) {
            // 保存当前歌曲列表
            currentSongList = data.data.list.map(song => ({
                platform: platform,
                id: song.id,
                name: song.name,
                artist: ''
            }));
            
            toplistResults.innerHTML = `
                <h3 style="margin-bottom: 15px;">${escapeHtml(name)}</h3>
                ${data.data.list.map(song => {
                    const songName = escapeHtml(song.name);
                    return `
                    <div class="song-card" data-platform="${platform}" data-id="${song.id}" data-name="${songName}" data-artist="">
                        <h3>${songName}</h3>
                        <button class="add-to-queue-btn" data-platform="${platform}" data-id="${song.id}" data-name="${songName}" data-artist="" title="添加到队列">+</button>
                    </div>
                `;
                }).join('')}
            `;
            
            // 事件委托已在 DOMContentLoaded 中设置，无需重复绑定
        } else {
            showError(toplistResults, data.message || '加载失败');
        }
    } catch (error) {
        showError(toplistResults, getUserFriendlyError(error));
    }
}

// 底部播放器元素
const bottomAudioPlayer = document.getElementById('audio-player');
const playerCover = document.getElementById('player-cover');
const playerSongName = document.getElementById('player-song-name');
const playerSongArtist = document.getElementById('player-song-artist');
const playerQuality = document.getElementById('player-quality');
const playerLyricsBtn = document.getElementById('player-lyrics-btn');
const playerLyricsPanel = document.getElementById('player-lyrics-panel');
const playerLyricsDisplay = document.getElementById('player-lyrics-display');
const closeLyricsBtn = document.getElementById('close-lyrics-btn');

// 当前播放的歌曲信息
let currentSong = {
    platform: null,
    id: null,
    name: null,
    artist: null
};

// 播放队列管理
let playQueue = [];
let currentQueueIndex = -1;
let currentSongList = []; // 当前显示的歌曲列表（搜索结果/歌单/排行榜）

// 播放模式
const PlayMode = {
    SEQUENCE: 'sequence',      // 顺序播放
    LOOP: 'loop',              // 列表循环
    RANDOM: 'random',          // 随机播放
    SINGLE: 'single'           // 单曲循环
};

let playMode = PlayMode.SEQUENCE;

// LRC 歌词数据
let lyricsData = [];

// 播放器控制按钮
const playPauseBtn = document.getElementById('play-pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const playModeBtn = document.getElementById('play-mode-btn');
const volumeBtn = document.getElementById('volume-btn');
const volumeSlider = document.getElementById('volume-slider');
const playerQueueBtn = document.getElementById('player-queue-btn');
const playerQueuePanel = document.getElementById('player-queue-panel');
const closeQueueBtn = document.getElementById('close-queue-btn');
const clearQueueBtn = document.getElementById('clear-queue-btn');

// 播放/暂停按钮控制
bottomAudioPlayer.addEventListener('play', () => {
    if (playPauseBtn) {
        playPauseBtn.textContent = '⏸';
        playPauseBtn.title = '暂停 (空格)';
    }
});

bottomAudioPlayer.addEventListener('pause', () => {
    if (playPauseBtn) {
        playPauseBtn.textContent = '▶';
        playPauseBtn.title = '播放 (空格)';
    }
});

if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
        if (bottomAudioPlayer.paused) {
            bottomAudioPlayer.play();
        } else {
            bottomAudioPlayer.pause();
        }
    });
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        playPrevious();
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        playNext();
    });
}

if (playModeBtn) {
    playModeBtn.addEventListener('click', () => {
        switchPlayMode();
    });
    
    // 加载保存的播放模式
    try {
        const savedMode = localStorage.getItem('tunehub_play_mode');
        if (savedMode) {
            playMode = savedMode;
        }
        togglePlayMode(); // 更新显示
    } catch (error) {
        console.error('加载播放模式失败:', error);
        togglePlayMode(); // 使用默认模式
    }
}

// 音量控制
if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
        setVolume(e.target.value / 100);
    });
    
    // 加载保存的音量设置
    try {
        const savedVolume = localStorage.getItem('tunehub_volume');
        if (savedVolume) {
            setVolume(parseFloat(savedVolume));
        } else {
            setVolume(0.5); // 默认50%
        }
    } catch (error) {
        console.error('加载音量设置失败:', error);
        setVolume(0.5);
    }
}

if (volumeBtn) {
    volumeBtn.addEventListener('click', () => {
        toggleMute();
    });
}

// 队列面板控制
if (playerQueueBtn) {
    playerQueueBtn.addEventListener('click', () => {
        playerQueuePanel.classList.toggle('show');
        if (playerQueuePanel.classList.contains('show')) {
            updateQueueDisplay();
        }
    });
}

if (closeQueueBtn) {
    closeQueueBtn.addEventListener('click', () => {
        playerQueuePanel.classList.remove('show');
    });
}

if (clearQueueBtn) {
    clearQueueBtn.addEventListener('click', () => {
        if (confirm('确定要清空播放队列吗？')) {
            clearQueue();
        }
    });
}

// 歌词面板控制
playerLyricsBtn.addEventListener('click', () => {
    playerLyricsPanel.classList.toggle('show');
    // 如果队列面板打开，关闭它
    if (playerQueuePanel.classList.contains('show')) {
        playerQueuePanel.classList.remove('show');
    }
});

closeLyricsBtn.addEventListener('click', () => {
    playerLyricsPanel.classList.remove('show');
});

// 播放历史管理（服务器端存储）
async function addToHistory(platform, id, name, artist) {
    try {
        const data = await safeFetch(`${API_BASE}/api/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                platform,
                id,
                name,
                artist
            })
        });
        if (data.code !== 200) {
            console.error('保存播放历史失败:', data.message);
        }
    } catch (error) {
        console.error('保存播放历史失败:', getUserFriendlyError(error));
    }
}

async function getPlayHistory() {
    try {
        const data = await safeFetch(`${API_BASE}/api/history`);
        if (data.code === 200) {
            return data.data || [];
        }
        return [];
    } catch (error) {
        console.error('读取播放历史失败:', getUserFriendlyError(error));
        return [];
    }
}

async function clearPlayHistory() {
    try {
        const data = await safeFetch(`${API_BASE}/api/history`, {
            method: 'DELETE'
        });
        if (data.code === 200) {
            await loadPlayHistory();
        } else {
            alert('清空失败: ' + data.message);
        }
    } catch (error) {
        console.error('清空播放历史失败:', getUserFriendlyError(error));
        alert('清空失败: ' + getUserFriendlyError(error));
    }
}

async function loadPlayHistory() {
    const historyResults = document.getElementById('history-results');
    if (!historyResults) return;
    
    historyResults.innerHTML = '<div class="loading">加载中...</div>';
    
    const history = await getPlayHistory();
    
    if (history.length === 0) {
        historyResults.innerHTML = '<div class="error" style="text-align: center; padding: 40px;">暂无播放历史</div>';
        return;
    }
    
    historyResults.innerHTML = history.map(item => {
        const songName = escapeHtml(item.name);
        const artist = escapeHtml(item.artist || '未知');
        return `
        <div class="song-card" data-platform="${item.platform}" data-id="${item.id}" data-name="${songName}" data-artist="${artist}">
            <h3>${songName}</h3>
            <p>歌手: <span class="clickable-text" data-keyword="${artist}">${artist}</span></p>
            <p>平台: ${getPlatformName(item.platform)}</p>
            <p style="font-size: 0.8em; color: #999;">${formatHistoryTime(item.timestamp)}</p>
        </div>
    `;
    }).join('');
    
    // 事件委托已在 DOMContentLoaded 中设置，无需重复绑定
}

function formatHistoryTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1分钟内
        return '刚刚播放';
    } else if (diff < 3600000) { // 1小时内
        const minutes = Math.floor(diff / 60000);
        return `${minutes}分钟前`;
    } else if (diff < 86400000) { // 24小时内
        const hours = Math.floor(diff / 3600000);
        return `${hours}小时前`;
    } else {
        const days = Math.floor(diff / 86400000);
        return `${days}天前`;
    }
}

// 添加到播放队列
function addToQueue(platform, id, name, artist) {
    // 检查是否已存在
    const exists = playQueue.some(song => song.platform === platform && song.id === id);
    if (exists) {
        return;
    }
    
    playQueue.push({ platform, id, name, artist });
    updateQueueDisplay();
}

// 从队列移除
function removeFromQueue(index) {
    if (index >= 0 && index < playQueue.length) {
        playQueue.splice(index, 1);
        if (currentQueueIndex >= index) {
            currentQueueIndex--;
        }
        updateQueueDisplay();
    }
}

// 清空队列
function clearQueue() {
    playQueue = [];
    currentQueueIndex = -1;
    updateQueueDisplay();
}

// 更新队列显示
function updateQueueDisplay() {
    const queueList = document.getElementById('queue-list');
    if (!queueList) return;
    
    if (playQueue.length === 0) {
        queueList.innerHTML = '<div class="empty-queue">队列为空</div>';
        return;
    }
    
    queueList.innerHTML = playQueue.map((song, index) => {
        const songName = escapeHtml(song.name);
        const artist = escapeHtml(song.artist || '未知');
        const isCurrent = index === currentQueueIndex;
        return `
            <div class="queue-item ${isCurrent ? 'current' : ''}" draggable="true" data-index="${index}">
                <span class="queue-index">${index + 1}</span>
                <span class="queue-song-name">${songName}</span>
                <span class="queue-artist">${artist}</span>
                <button class="remove-from-queue-btn" onclick="removeFromQueue(${index})" title="移除">×</button>
            </div>
        `;
    }).join('');
    
    // 添加拖拽功能
    setupQueueDragDrop();
}

// 设置队列拖拽排序
function setupQueueDragDrop() {
    const queueItems = document.querySelectorAll('.queue-item');
    let draggedIndex = null;
    
    queueItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedIndex = parseInt(item.dataset.index);
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        item.addEventListener('dragend', (e) => {
            item.classList.remove('dragging');
            // 重新设置所有项的索引
            document.querySelectorAll('.queue-item').forEach((el, idx) => {
                el.dataset.index = idx;
            });
        });
        
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const afterElement = getDragAfterElement(item.parentNode, e.clientY);
            const dragging = document.querySelector('.dragging');
            
            if (afterElement == null) {
                item.parentNode.appendChild(dragging);
            } else {
                item.parentNode.insertBefore(dragging, afterElement);
            }
        });
        
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            const dropIndex = parseInt(item.dataset.index);
            
            if (draggedIndex !== null && draggedIndex !== dropIndex) {
                const draggedSong = playQueue[draggedIndex];
                playQueue.splice(draggedIndex, 1);
                const newIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
                playQueue.splice(newIndex, 0, draggedSong);
                
                // 更新当前播放索引
                if (currentQueueIndex === draggedIndex) {
                    currentQueueIndex = newIndex;
                } else if (currentQueueIndex > draggedIndex && currentQueueIndex <= dropIndex) {
                    currentQueueIndex--;
                } else if (currentQueueIndex < draggedIndex && currentQueueIndex >= newIndex) {
                    currentQueueIndex++;
                }
                
                updateQueueDisplay();
            }
        });
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.queue-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 将函数暴露到全局作用域（用于队列面板）
window.clearQueue = clearQueue;

// 播放歌曲（从搜索结果、歌单、排行榜调用）
async function playSong(platform, id, name, artist) {
    currentSong = { platform, id, name, artist };
    
    // 更新队列索引
    const queueIndex = playQueue.findIndex(song => song.platform === platform && song.id === id);
    if (queueIndex >= 0) {
        // 如果已经在队列中，直接使用队列索引
        currentQueueIndex = queueIndex;
    } else {
        // 如果不在队列中，只添加这一首到队列
        addToQueue(platform, id, name, artist);
        currentQueueIndex = playQueue.length - 1;
    }
    
    // 添加到播放历史
    addToHistory(platform, id, name, artist);
    
    try {
        // 获取歌曲信息
        const infoData = await safeFetch(`${API_BASE}/api/proxy/info?source=${platform}&id=${id}`);
        
        if (infoData.code === 200 && infoData.data) {
            const song = infoData.data;
            
            // 更新播放器显示（添加可点击搜索功能）
            const displayName = name || song.name || '未知';
            const displayArtist = artist || song.artist || '未知';
            
            if (displayName !== '未知') {
                playerSongName.innerHTML = `<span class="clickable-text" data-keyword="${escapeHtml(displayName)}">${escapeHtml(displayName)}</span>`;
                playerSongName.querySelector('.clickable-text').addEventListener('click', (e) => {
                    e.stopPropagation();
                    performSearch(displayName);
                });
            } else {
                playerSongName.textContent = displayName;
            }
            
            if (displayArtist !== '未知') {
                playerSongArtist.innerHTML = `<span class="clickable-text" data-keyword="${escapeHtml(displayArtist)}">${escapeHtml(displayArtist)}</span>`;
                playerSongArtist.querySelector('.clickable-text').addEventListener('click', (e) => {
                    e.stopPropagation();
                    performSearch(displayArtist);
                });
            } else {
                playerSongArtist.textContent = displayArtist;
            }
            
            // 加载封面
            if (song.pic) {
                playerCover.src = `${API_BASE}/api/proxy/pic?source=${platform}&id=${id}`;
                playerCover.style.display = 'block';
            } else {
                playerCover.style.display = 'none';
            }
            
            // 加载音频（默认使用 flac24bit）
            const quality = playerQuality.value;
            const audioUrl = `${API_BASE}/api/proxy/url?source=${platform}&id=${id}&br=${quality}`;
            bottomAudioPlayer.src = audioUrl;
            
            // 加载歌词
            await loadLyrics(platform, id);
            
            // 自动播放
            bottomAudioPlayer.play().catch(e => {
                console.log('自动播放被阻止:', e);
            });
            
            // 更新播放/暂停按钮状态
            if (playPauseBtn) {
                playPauseBtn.textContent = '⏸';
                playPauseBtn.title = '暂停 (空格)';
            }
        } else {
            alert('加载失败: ' + (infoData.message || '未知错误'));
        }
    } catch (error) {
        alert('加载出错: ' + getUserFriendlyError(error));
    }
}

// 加载歌词
async function loadLyrics(platform, id) {
    try {
        const lrcText = await safeFetch(`${API_BASE}/api/proxy/lrc?source=${platform}&id=${id}`);
        
        if (lrcText && lrcText.trim()) {
            lyricsData = parseLRC(lrcText);
            renderLyrics();
        } else {
            lyricsData = [];
            playerLyricsDisplay.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">暂无歌词</div>';
        }
    } catch (error) {
        lyricsData = [];
        playerLyricsDisplay.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">歌词加载失败: ' + escapeHtml(getUserFriendlyError(error)) + '</div>';
    }
}

// 解析 LRC 格式歌词
function parseLRC(lrcText) {
    const lines = lrcText.split('\n');
    const lyrics = [];
    
    // LRC 时间格式: [mm:ss.xx] 或 [mm:ss]
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
    
    lines.forEach(line => {
        const times = [];
        let match;
        let text = line;
        
        // 提取所有时间标签
        while ((match = timeRegex.exec(line)) !== null) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
            const time = minutes * 60 + seconds + milliseconds / 1000;
            times.push(time);
            text = text.replace(match[0], '');
        }
        
        // 移除时间标签后的文本
        text = text.trim();
        
        // 如果有时间标签和文本，添加到歌词数组
        if (times.length > 0 && text) {
            times.forEach(time => {
                lyrics.push({ time, text });
            });
        }
    });
    
    // 按时间排序
    lyrics.sort((a, b) => a.time - b.time);
    
    return lyrics;
}

// 渲染歌词
function renderLyrics() {
    if (lyricsData.length === 0) {
        playerLyricsDisplay.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">暂无歌词</div>';
        return;
    }
    
    playerLyricsDisplay.innerHTML = lyricsData.map((lyric, index) => 
        `<div class="lyrics-line" data-time="${lyric.time}" data-index="${index}">${escapeHtml(lyric.text)}</div>`
    ).join('');
}

// 歌词自动滚动（跟随播放时间）
let lyricsUpdateInterval = null;

bottomAudioPlayer.addEventListener('play', () => {
    startLyricsSync();
});

bottomAudioPlayer.addEventListener('pause', () => {
    stopLyricsSync();
});

bottomAudioPlayer.addEventListener('ended', () => {
    stopLyricsSync();
    // 清除所有高亮
    document.querySelectorAll('.lyrics-line').forEach(line => {
        line.classList.remove('active');
    });
    // 自动播放下一首
    playNext();
});

// 修复内存泄漏：在音频加载开始时清理定时器
bottomAudioPlayer.addEventListener('loadstart', () => {
    stopLyricsSync();
});

function startLyricsSync() {
    if (lyricsUpdateInterval) return;
    
    lyricsUpdateInterval = setInterval(() => {
        const currentTime = bottomAudioPlayer.currentTime;
        updateLyricsHighlight(currentTime);
    }, 100);
}

function stopLyricsSync() {
    if (lyricsUpdateInterval) {
        clearInterval(lyricsUpdateInterval);
        lyricsUpdateInterval = null;
    }
}

function updateLyricsHighlight(currentTime) {
    const lines = document.querySelectorAll('.lyrics-line');
    if (lines.length === 0) return;
    
    let activeIndex = -1;
    
    // 找到当前应该高亮的歌词行
    for (let i = lyricsData.length - 1; i >= 0; i--) {
        if (currentTime >= lyricsData[i].time) {
            activeIndex = i;
            break;
        }
    }
    
    // 更新高亮状态
    lines.forEach((line, index) => {
        if (index === activeIndex) {
            if (!line.classList.contains('active')) {
                // 移除之前的高亮
                lines.forEach(l => l.classList.remove('active'));
                // 添加新的高亮
                line.classList.add('active');
                
                // 只在歌词面板显示时滚动
                if (playerLyricsPanel.classList.contains('show')) {
                    // 滚动到当前歌词，确保在可视区域中心
                    const panelRect = playerLyricsPanel.getBoundingClientRect();
                    const lineRect = line.getBoundingClientRect();
                    const lineTop = lineRect.top - panelRect.top + playerLyricsPanel.scrollTop;
                    
                    playerLyricsPanel.scrollTo({
                        top: lineTop - playerLyricsPanel.clientHeight / 2 + lineRect.height / 2,
                        behavior: 'smooth'
                    });
                }
            }
        } else {
            line.classList.remove('active');
        }
    });
}

// 音质切换时重新加载音频
playerQuality.addEventListener('change', () => {
    if (currentSong.platform && currentSong.id) {
        const quality = playerQuality.value;
        const audioUrl = `${API_BASE}/api/proxy/url?source=${currentSong.platform}&id=${currentSong.id}&br=${quality}`;
        const wasPlaying = !bottomAudioPlayer.paused;
        const currentTime = bottomAudioPlayer.currentTime;
        
        bottomAudioPlayer.src = audioUrl;
        if (wasPlaying) {
            bottomAudioPlayer.play().then(() => {
                bottomAudioPlayer.currentTime = currentTime;
            });
        }
    }
});

// 统计功能
const refreshStatsBtn = document.getElementById('refresh-stats-btn');
const statsPeriod = document.getElementById('stats-period');
const systemStatus = document.getElementById('system-status');
const statsSummary = document.getElementById('stats-summary');
const platformStats = document.getElementById('platform-stats');
const qpsStats = document.getElementById('qps-stats');
const typeStats = document.getElementById('type-stats');

refreshStatsBtn.addEventListener('click', async () => {
    await loadAllStats();
});

async function loadAllStats() {
    const period = statsPeriod.value;
    
    // 系统状态
    try {
        const statusData = await safeFetch(`${API_BASE}/api/proxy/status`);
        if (statusData.code === 200 && statusData.data) {
            const platforms = Object.keys(statusData.data.platforms || {}).map(key => ({
                name: getPlatformName(key),
                enabled: statusData.data.platforms[key].enabled
            }));
            systemStatus.innerHTML = `
                <div class="stat-item">
                    <div class="stat-label">状态</div>
                    <div class="stat-value">${statusData.data.status || 'unknown'}</div>
                </div>
                ${platforms.map(p => `
                    <div class="stat-item">
                        <div class="stat-label">${p.name}</div>
                        <div class="stat-value">${p.enabled ? '✅ 已启用' : '❌ 未启用'}</div>
                    </div>
                `).join('')}
            `;
        }
    } catch (error) {
        systemStatus.innerHTML = '<div class="error">加载失败</div>';
    }
    
    // 统计摘要
    try {
        const summaryData = await safeFetch(`${API_BASE}/api/proxy/stats/summary`);
        if (summaryData.code === 200 && summaryData.data) {
            statsSummary.innerHTML = `
                <div class="stat-item">
                    <div class="stat-label">今日总调用</div>
                    <div class="stat-value">${formatNumber(summaryData.data.today?.total_calls || 0)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">今日成功率</div>
                    <div class="stat-value">${(summaryData.data.today?.success_rate || 0).toFixed(2)}%</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">本周总调用</div>
                    <div class="stat-value">${formatNumber(summaryData.data.week?.total_calls || 0)}</div>
                </div>
            `;
        }
    } catch (error) {
        statsSummary.innerHTML = '<div class="error">加载失败</div>';
    }
    
    // 平台统计
    try {
        const platformsData = await safeFetch(`${API_BASE}/api/proxy/stats/platforms?period=${period}`);
        if (platformsData.code === 200 && platformsData.data && platformsData.data.platforms) {
            platformStats.innerHTML = Object.keys(platformsData.data.platforms).map(key => {
                const p = platformsData.data.platforms[key];
                return `
                    <div class="stat-item">
                        <div class="stat-label">${getPlatformName(key)}</div>
                        <div class="stat-value">
                            调用: ${formatNumber(p.total_calls || 0)}<br>
                            成功率: ${(p.success_rate || 0).toFixed(2)}%
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        platformStats.innerHTML = '<div class="error">加载失败</div>';
    }
    
    // QPS 统计
    try {
        const qpsData = await safeFetch(`${API_BASE}/api/proxy/stats/qps?period=${period}`);
        if (qpsData.code === 200 && qpsData.data && qpsData.data.qps) {
            const qps = qpsData.data.qps;
            qpsStats.innerHTML = `
                <div class="stat-item">
                    <div class="stat-label">平均 QPS</div>
                    <div class="stat-value">${(qps.avg_qps || 0).toFixed(4)}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">峰值 QPS</div>
                    <div class="stat-value">${(qps.peak_qps || 0).toFixed(4)}</div>
                </div>
            `;
        }
    } catch (error) {
        qpsStats.innerHTML = '<div class="error">加载失败</div>';
    }
    
    // 请求类型统计
    try {
        const typesData = await safeFetch(`${API_BASE}/api/proxy/stats/types?period=${period}`);
        if (typesData.code === 200 && typesData.data && typesData.data.requestTypes) {
            typeStats.innerHTML = Object.keys(typesData.data.requestTypes).map(key => {
                const t = typesData.data.requestTypes[key];
                return `
                    <div class="stat-item">
                        <div class="stat-label">${key}</div>
                        <div class="stat-value">
                            调用: ${formatNumber(t.total_calls || 0)}<br>
                            成功率: ${(t.success_rate || 0).toFixed(2)}%
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        typeStats.innerHTML = '<div class="error">加载失败</div>';
    }
}

// 工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getPlatformName(platform) {
    const names = {
        'netease': '网易云音乐',
        'kuwo': '酷我音乐',
        'qq': 'QQ音乐'
    };
    return names[platform] || platform;
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function showError(container, message) {
    container.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

// 友好的错误信息处理
function getUserFriendlyError(error) {
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        return '网络连接失败，请检查网络设置';
    }
    if (errorMessage.includes('404')) {
        return '未找到请求的资源';
    }
    if (errorMessage.includes('500')) {
        return '服务器错误，请稍后重试';
    }
    if (errorMessage.includes('403')) {
        return '访问被拒绝，请检查权限';
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        return '请求超时，请稍后重试';
    }
    
    return '操作失败，请稍后重试';
}

// 安全的 fetch 包装函数，自动检查状态码
async function safeFetch(url, options = {}) {
    try {
        const response = await fetch(url, options);
        
        // 检查响应状态
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // 根据 Content-Type 决定返回格式
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else if (contentType && contentType.includes('text/')) {
            return await response.text();
        } else {
            return response;
        }
    } catch (error) {
        // 重新抛出错误，让调用者处理
        throw error;
    }
}

// 保存全部歌曲按钮
if (saveAllSongsBtn) {
    saveAllSongsBtn.addEventListener('click', async () => {
        if (currentPlaylistSongs.length === 0) {
            alert('没有可保存的歌曲');
            return;
        }
        
        if (!confirm(`确定要保存全部 ${currentPlaylistSongs.length} 首歌曲吗？这可能需要一些时间。`)) {
            return;
        }
        
        saveAllSongsBtn.disabled = true;
        saveProgress.style.display = 'block';
        saveProgress.innerHTML = '<div class="loading">正在保存，请稍候...</div>';
        
        try {
            const data = await safeFetch(`${API_BASE}/api/playlist/save-all`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    source: playlistPlatform.value,
                    songs: currentPlaylistSongs,
                    quality: 'flac24bit'
                })
            });
            
            if (data.code === 200) {
                saveProgress.innerHTML = `
                    <div class="success">
                        <p>${data.message}</p>
                        <p>成功: ${data.data.success}，失败: ${data.data.failed}</p>
                    </div>
                `;
            } else {
                saveProgress.innerHTML = `<div class="error">保存失败: ${escapeHtml(data.message)}</div>`;
            }
        } catch (error) {
            saveProgress.innerHTML = `<div class="error">保存出错: ${escapeHtml(getUserFriendlyError(error))}</div>`;
        } finally {
            saveAllSongsBtn.disabled = false;
        }
    });
}

// 清空历史按钮
const clearHistoryBtn = document.getElementById('clear-history-btn');
if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('确定要清空所有播放历史吗？')) {
            clearPlayHistory();
        }
    });
}

// 事件委托 - 避免重复绑定事件监听器
// 在页面加载时绑定一次，后续通过事件委托处理动态添加的元素
document.addEventListener('DOMContentLoaded', () => {
    // 搜索结果事件委托
    const searchResults = document.getElementById('search-results');
    if (searchResults) {
        searchResults.addEventListener('click', (e) => {
            // 如果点击的是添加到队列按钮，不处理
            if (e.target.classList.contains('add-to-queue-btn')) {
                return;
            }
            
            const card = e.target.closest('.song-card');
            if (card) {
                const platform = card.dataset.platform;
                const id = card.dataset.id;
                const name = card.dataset.name;
                const artist = card.dataset.artist;
                
                if (e.target.classList.contains('clickable-text')) {
                    e.stopPropagation();
                    const keyword = e.target.dataset.keyword;
                    if (keyword && keyword !== '未知') {
                        performSearch(keyword);
                    }
                } else if (platform && id) {
                    playSong(platform, id, name, artist);
                }
            }
        });
    }
    
    // 歌单结果事件委托
    const playlistResults = document.getElementById('playlist-results');
    if (playlistResults) {
        playlistResults.addEventListener('click', (e) => {
            // 如果点击的是添加到队列按钮，不处理
            if (e.target.classList.contains('add-to-queue-btn')) {
                return;
            }
            
            const card = e.target.closest('.song-card');
            if (card) {
                const platform = card.dataset.platform;
                const id = card.dataset.id;
                const name = card.dataset.name;
                const artist = card.dataset.artist;
                
                if (e.target.classList.contains('clickable-text')) {
                    e.stopPropagation();
                    const keyword = e.target.dataset.keyword;
                    if (keyword) {
                        performSearch(keyword);
                    }
                } else if (platform && id) {
                    playSong(platform, id, name, artist);
                }
            }
        });
    }
    
    // 排行榜结果事件委托
    const toplistResults = document.getElementById('toplist-results');
    if (toplistResults) {
        toplistResults.addEventListener('click', (e) => {
            // 如果点击的是添加到队列按钮，不处理
            if (e.target.classList.contains('add-to-queue-btn')) {
                return;
            }
            
            const card = e.target.closest('.song-card');
            if (card) {
                const platform = card.dataset.platform;
                const id = card.dataset.id;
                const name = card.dataset.name;
                const artist = card.dataset.artist;
                
                if (e.target.classList.contains('clickable-text')) {
                    e.stopPropagation();
                    const keyword = e.target.dataset.keyword;
                    if (keyword) {
                        performSearch(keyword);
                    }
                } else if (platform && id) {
                    playSong(platform, id, name, artist);
                }
            }
        });
    }
    
    // 播放历史事件委托
    const historyResults = document.getElementById('history-results');
    if (historyResults) {
        historyResults.addEventListener('click', (e) => {
            const card = e.target.closest('.song-card');
            if (card) {
                const platform = card.dataset.platform;
                const id = card.dataset.id;
                const name = card.dataset.name;
                const artist = card.dataset.artist;
                
                if (e.target.classList.contains('clickable-text')) {
                    e.stopPropagation();
                    const keyword = e.target.dataset.keyword;
                    if (keyword && keyword !== '未知') {
                        performSearch(keyword);
                    }
                } else if (platform && id) {
                    playSong(platform, id, name, artist);
                }
            }
        });
    }
    
    // 添加到队列按钮事件委托
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-queue-btn')) {
            e.stopPropagation();
            const platform = e.target.dataset.platform;
            const id = e.target.dataset.id;
            const name = e.target.dataset.name;
            const artist = e.target.dataset.artist || '';
            if (platform && id) {
                addToQueue(platform, id, name, artist);
            }
        }
    });
    
    // 从队列移除按钮事件委托
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-from-queue-btn')) {
            e.stopPropagation();
            const queueItem = e.target.closest('.queue-item');
            if (queueItem) {
                const index = parseInt(queueItem.dataset.index);
                removeFromQueue(index);
            }
        }
    });
});

// 页面加载时的初始化
window.addEventListener('load', () => {
    // 不再自动加载统计，统计在高级功能中按需加载
    
    // 初始化队列显示
    updateQueueDisplay();
});

// 播放上一首
function playPrevious() {
    if (playQueue.length === 0) return;
    
    let nextIndex;
    if (playMode === PlayMode.RANDOM) {
        nextIndex = Math.floor(Math.random() * playQueue.length);
    } else if (currentQueueIndex <= 0) {
        if (playMode === PlayMode.LOOP) {
            nextIndex = playQueue.length - 1;
        } else {
            return; // 顺序播放且已是第一首
        }
    } else {
        nextIndex = currentQueueIndex - 1;
    }
    
    const song = playQueue[nextIndex];
    if (song) {
        currentQueueIndex = nextIndex;
        playSong(song.platform, song.id, song.name, song.artist);
    }
}

// 播放下一首
function playNext() {
    if (playQueue.length === 0) return;
    
    let nextIndex;
    if (playMode === PlayMode.RANDOM) {
        nextIndex = Math.floor(Math.random() * playQueue.length);
    } else if (playMode === PlayMode.SINGLE) {
        nextIndex = currentQueueIndex; // 单曲循环，播放同一首
    } else if (currentQueueIndex >= playQueue.length - 1) {
        if (playMode === PlayMode.LOOP) {
            nextIndex = 0; // 列表循环，回到第一首
        } else {
            return; // 顺序播放且已是最后一首
        }
    } else {
        nextIndex = currentQueueIndex + 1;
    }
    
    const song = playQueue[nextIndex];
    if (song) {
        currentQueueIndex = nextIndex;
        playSong(song.platform, song.id, song.name, song.artist);
    }
}

// 切换播放模式
function togglePlayMode() {
    const modes = [PlayMode.SEQUENCE, PlayMode.LOOP, PlayMode.RANDOM, PlayMode.SINGLE];
    const modeNames = {
        [PlayMode.SEQUENCE]: '顺序播放',
        [PlayMode.LOOP]: '列表循环',
        [PlayMode.RANDOM]: '随机播放',
        [PlayMode.SINGLE]: '单曲循环'
    };
    const modeIcons = {
        [PlayMode.SEQUENCE]: '▶',
        [PlayMode.LOOP]: '🔁',
        [PlayMode.RANDOM]: '🔀',
        [PlayMode.SINGLE]: '🔂'
    };
    
    const modeBtn = document.getElementById('play-mode-btn');
    if (modeBtn) {
        modeBtn.textContent = modeIcons[playMode];
        modeBtn.title = modeNames[playMode];
    }
}

// 切换到下一个播放模式
function switchPlayMode() {
    const modes = [PlayMode.SEQUENCE, PlayMode.LOOP, PlayMode.RANDOM, PlayMode.SINGLE];
    const currentIndex = modes.indexOf(playMode);
    playMode = modes[(currentIndex + 1) % modes.length];
    
    togglePlayMode();
    
    // 保存播放模式
    try {
        localStorage.setItem('tunehub_play_mode', playMode);
    } catch (error) {
        console.error('保存播放模式失败:', error);
    }
}

// 音量控制
function setVolume(value) {
    const volume = Math.max(0, Math.min(1, value));
    bottomAudioPlayer.volume = volume;
    
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
        volumeSlider.value = volume * 100;
    }
    
    const volumeBtn = document.getElementById('volume-btn');
    if (volumeBtn) {
        if (volume === 0) {
            volumeBtn.textContent = '🔇';
            volumeBtn.title = '静音';
        } else if (volume < 0.5) {
            volumeBtn.textContent = '🔉';
            volumeBtn.title = '音量: ' + Math.round(volume * 100) + '%';
        } else {
            volumeBtn.textContent = '🔊';
            volumeBtn.title = '音量: ' + Math.round(volume * 100) + '%';
        }
    }
    
    // 保存音量设置
    try {
        localStorage.setItem('tunehub_volume', volume.toString());
    } catch (error) {
        console.error('保存音量设置失败:', error);
    }
}

function toggleMute() {
    if (bottomAudioPlayer.volume === 0) {
        // 恢复之前的音量
        const savedVolume = localStorage.getItem('tunehub_volume');
        setVolume(savedVolume ? parseFloat(savedVolume) : 0.5);
    } else {
        // 静音
        localStorage.setItem('tunehub_previous_volume', bottomAudioPlayer.volume.toString());
        setVolume(0);
    }
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    // 如果正在输入，不触发快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch(e.key) {
        case ' ': // 空格键 - 播放/暂停
            e.preventDefault();
            if (bottomAudioPlayer.paused) {
                bottomAudioPlayer.play();
            } else {
                bottomAudioPlayer.pause();
            }
            break;
        case 'ArrowLeft': // 左箭头 - 上一首
            e.preventDefault();
            playPrevious();
            break;
        case 'ArrowRight': // 右箭头 - 下一首
            e.preventDefault();
            playNext();
            break;
        case 'ArrowUp': // 上箭头 - 音量增加
            e.preventDefault();
            setVolume(Math.min(1, bottomAudioPlayer.volume + 0.1));
            break;
        case 'ArrowDown': // 下箭头 - 音量减少
            e.preventDefault();
            setVolume(Math.max(0, bottomAudioPlayer.volume - 0.1));
            break;
        case '/': // 斜杠 - 聚焦搜索框
            e.preventDefault();
            searchKeyword?.focus();
            break;
        case 'Escape': // Esc - 关闭歌词面板
            if (playerLyricsPanel?.classList.contains('show')) {
                playerLyricsPanel.classList.remove('show');
            }
            break;
    }
});

// 将 playSong 和 loadToplist 暴露到全局作用域（使用命名空间避免污染）
window.TuneHub = {
    playSong,
    loadToplist,
    playPrevious,
    playNext,
    switchPlayMode,
    setVolume,
    toggleMute
};

