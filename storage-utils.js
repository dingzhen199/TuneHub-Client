const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

const STORAGE_DIR = path.join(__dirname, 'storage');

// 清理文件名中的非法字符
function sanitizeFileName(fileName) {
  if (!fileName) return '未知';
  // 替换Windows和Linux文件系统不支持的字符
  return fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || '未知';
}

// 确保存储目录存在
function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

// 获取歌曲存储目录路径（新结构：平台/歌手/专辑/歌曲名称）
function getSongStorageDir(source, artist, album, songName) {
  ensureStorageDir();
  const safeArtist = sanitizeFileName(artist || '未知歌手');
  const safeAlbum = sanitizeFileName(album || '未知专辑');
  const safeSongName = sanitizeFileName(songName || '未知歌曲');
  
  const songDir = path.join(STORAGE_DIR, source, safeArtist, safeAlbum, safeSongName);
  if (!fs.existsSync(songDir)) {
    fs.mkdirSync(songDir, { recursive: true });
  }
  return songDir;
}

// 获取歌曲存储路径
function getSongStoragePath(source, artist, album, songName, quality = '320k') {
  const songDir = getSongStorageDir(source, artist, album, songName);
  
  // 根据音质确定文件扩展名
  let ext = '.mp3';
  if (quality === 'flac' || quality === 'flac24bit') {
    ext = '.flac';
  }
  
  return path.join(songDir, `song${ext}`);
}

// 获取歌词存储路径
function getLyricsStoragePath(source, artist, album, songName) {
  const songDir = getSongStorageDir(source, artist, album, songName);
  return path.join(songDir, 'lyrics.lrc');
}

// 获取专辑封面存储路径
function getCoverStoragePath(source, artist, album, songName) {
  const songDir = getSongStorageDir(source, artist, album, songName);
  return path.join(songDir, 'cover.jpg');
}

// 检查文件是否存在
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// 下载并保存音乐文件
async function downloadAndSaveSong(source, artist, album, songName, quality, audioUrl) {
  try {
    const filePath = getSongStoragePath(source, artist, album, songName, quality);
    
    // 如果文件已存在，直接返回路径
    if (fileExists(filePath)) {
      return filePath;
    }
    
    // 下载文件
    const response = await axios({
      method: 'GET',
      url: audioUrl,
      responseType: 'stream',
      timeout: 60000, // 60秒超时
    });
    
    // 保存文件
    const writer = fs.createWriteStream(filePath);
    await pipelineAsync(response.data, writer);
    
    return filePath;
  } catch (error) {
    console.error('下载音乐文件失败:', error.message);
    throw error;
  }
}

// 下载并保存专辑封面
async function downloadAndSaveCover(source, artist, album, songName, coverUrl) {
  try {
    const filePath = getCoverStoragePath(source, artist, album, songName);
    
    // 如果文件已存在，直接返回路径
    if (fileExists(filePath)) {
      return filePath;
    }
    
    // 下载文件
    const response = await axios({
      method: 'GET',
      url: coverUrl,
      responseType: 'stream',
      timeout: 30000, // 30秒超时
    });
    
    // 保存文件
    const writer = fs.createWriteStream(filePath);
    await pipelineAsync(response.data, writer);
    
    return filePath;
  } catch (error) {
    console.error('下载专辑封面失败:', error.message);
    throw error;
  }
}

// 保存歌词文件（直接保存文本内容）
function saveLyrics(source, artist, album, songName, lyricsText) {
  try {
    const filePath = getLyricsStoragePath(source, artist, album, songName);
    
    // 如果文件已存在，直接返回路径
    if (fileExists(filePath)) {
      return filePath;
    }
    
    // 保存文件
    fs.writeFileSync(filePath, lyricsText, 'utf8');
    
    return filePath;
  } catch (error) {
    console.error('保存歌词文件失败:', error.message);
    throw error;
  }
}

// 读取本地歌词文件
function readLocalLyrics(source, artist, album, songName) {
  try {
    const filePath = getLyricsStoragePath(source, artist, album, songName);
    if (fileExists(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
    return null;
  } catch (error) {
    console.error('读取本地歌词失败:', error.message);
    return null;
  }
}

// 获取本地音乐文件路径
function getLocalSongPath(source, artist, album, songName, quality) {
  const filePath = getSongStoragePath(source, artist, album, songName, quality);
  if (fileExists(filePath)) {
    return filePath;
  }
  return null;
}

// 获取本地封面路径
function getLocalCoverPath(source, artist, album, songName) {
  const filePath = getCoverStoragePath(source, artist, album, songName);
  if (fileExists(filePath)) {
    return filePath;
  }
  return null;
}

module.exports = {
  getSongStoragePath,
  getLyricsStoragePath,
  getCoverStoragePath,
  fileExists,
  downloadAndSaveSong,
  downloadAndSaveCover,
  saveLyrics,
  readLocalLyrics,
  getLocalSongPath,
  getLocalCoverPath,
  STORAGE_DIR
};

