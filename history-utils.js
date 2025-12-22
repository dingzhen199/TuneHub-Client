const fs = require('fs');
const path = require('path');

const HISTORY_FILE = path.join(__dirname, 'storage', 'play_history.json');
const MAX_HISTORY = 100;

// 确保历史文件存在
function ensureHistoryFile() {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

// 读取播放历史
function getPlayHistory() {
  try {
    ensureHistoryFile();
    const data = fs.readFileSync(HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取播放历史失败:', error.message);
    return [];
  }
}

// 添加播放历史
function addToHistory(platform, id, name, artist) {
  try {
    ensureHistoryFile();
    let history = getPlayHistory();
    
    // 移除重复项（如果存在）
    history = history.filter(item => !(item.platform === platform && item.id === id));
    
    // 添加到开头
    history.unshift({
      platform,
      id,
      name,
      artist,
      timestamp: Date.now()
    });
    
    // 限制历史记录数量
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }
    
    // 保存到文件
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存播放历史失败:', error.message);
    return false;
  }
}

// 清空播放历史
function clearPlayHistory() {
  try {
    ensureHistoryFile();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('清空播放历史失败:', error.message);
    return false;
  }
}

// 删除单条历史记录
function removeHistoryItem(platform, id) {
  try {
    ensureHistoryFile();
    let history = getPlayHistory();
    history = history.filter(item => !(item.platform === platform && item.id === id));
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('删除历史记录失败:', error.message);
    return false;
  }
}

module.exports = {
  getPlayHistory,
  addToHistory,
  clearPlayHistory,
  removeHistoryItem
};

