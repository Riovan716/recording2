const { LiveStream } = require('../models');
const path = require('path');
const fs = require('fs');

let liveStreams = [];
let streamingStats = {
  totalStreams: 0,
  totalDuration: 0, // in hours
  totalViewers: 0,
  activeStreams: 0,
  averageViewers: 0,
  streamHistory: [] // untuk tracking history
};

// Hapus mock data statis dan gunakan data dinamis sepenuhnya
// const mockStats = {
//   totalStreams: 12,
//   totalDuration: 48,
//   totalViewers: 156,
//   activeStreams: 0,
//   averageViewers: 13
// };

exports.startLive = async (req, res) => {
  const { id, title } = req.body;
  
  try {
    console.log('Starting live stream with data:', { id, title });
    
    // Validasi input
    if (!id) {
      console.log('Stream ID is missing');
      return res.status(400).json({ 
        error: 'Stream ID is required',
        success: false 
      });
    }

    // Cek apakah ID sudah ada di database (untuk mencegah duplikat)
    console.log('Checking for existing stream with ID:', id);
    const existingStream = await LiveStream.findOne({
      where: { id: id }
    });
    console.log('Existing stream found:', existingStream ? 'Yes' : 'No');
    
    if (existingStream) {
      return res.status(400).json({ 
        error: 'Live stream with this ID already exists',
        success: false 
      });
    }
    
    // Cek apakah ID sudah ada di memory (untuk mencegah duplikat)
    console.log('Checking memory for existing stream with ID:', id);
    const existingInMemory = liveStreams.find(s => s.id === id);
    console.log('Existing in memory:', existingInMemory ? 'Yes' : 'No');
    
    if (!existingInMemory) {
      const newStream = { 
        id,
        title: title || `Live Stream ${id}`,
        startTime: new Date().toISOString(),
        viewers: 0,
        isRecording: false // Semua live stream otomatis tersimpan
      };
      liveStreams.push(newStream);
      
      // Simpan ke database (semua live stream otomatis tersimpan)
      console.log('Creating live stream record in database...');
      const liveStreamRecord = await LiveStream.create({
        id,
        title: title || `Live Stream ${id}`,
        startTime: new Date(),
        viewers: 0,
        isRecording: false,
        status: 'active'
      });
      console.log('Live stream record created successfully');
      
      console.log('Live stream automatically saved to database:', liveStreamRecord.toJSON());
      
      // Update stats
      streamingStats.activeStreams = liveStreams.length;
      // totalStreams now calculated from database, no need to increment in memory
      
      // Add to history
      streamingStats.streamHistory.push({
        id,
        startTime: newStream.startTime,
        endTime: null,
        duration: 0,
        viewers: 0,
        isRecording: false
      });
      
      res.json({ success: true });
    } else {
      res.status(400).json({ 
        error: 'Live stream with this ID is already active',
        success: false 
      });
    }
  } catch (error) {
    console.error('Error starting live stream:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to start live stream',
      details: error.message,
      success: false 
    });
  }
};

exports.stopLive = async (req, res) => {
  const { id } = req.body;
  const streamToStop = liveStreams.find(s => s.id === id);
  
  try {
    if (streamToStop) {
      const endTime = new Date();
      const startTime = new Date(streamToStop.startTime);
      const durationHours = (endTime - startTime) / (1000 * 60 * 60);
      
      // Check if there's a recording available
      const existingStream = await LiveStream.findByPk(id);
      const hasRecording = existingStream && existingStream.recordingPath;
      
      // Update database - set status based on whether recording exists
      await LiveStream.update({
        endTime: endTime,
        duration: durationHours,
        viewers: streamToStop.viewers || 0,
        status: hasRecording ? 'recording' : 'ended' // If recording exists, set to 'recording', otherwise 'ended'
      }, {
        where: { id: id }
      });
      
      console.log('Live stream stopped and updated in database:', { 
        id, 
        duration: durationHours, 
        status: hasRecording ? 'recording' : 'ended',
        hasRecording 
      });
      
      // Update history
      const historyEntry = streamingStats.streamHistory.find(h => h.id === id);
      if (historyEntry) {
        historyEntry.endTime = endTime.toISOString();
        historyEntry.duration = durationHours;
        historyEntry.viewers = streamToStop.viewers || 0;
        
        // Update total duration
        streamingStats.totalDuration += durationHours;
        // Update total viewers
        streamingStats.totalViewers += historyEntry.viewers;
      }
    }
    
    // Remove from active streams
    liveStreams = liveStreams.filter(s => s.id !== id);
    streamingStats.activeStreams = liveStreams.length;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error stopping live stream:', error);
    res.status(500).json({ error: 'Failed to stop live stream' });
  }
};

exports.getActive = (req, res) => {
  res.json(liveStreams);
};

exports.getStats = async (req, res) => {
  try {
    // Get total streams from database instead of memory
    const totalStreamsFromDB = await LiveStream.count();
    
    // Calculate real stats from history
    const completedStreams = streamingStats.streamHistory.filter(h => h.endTime);
    const totalCompletedStreams = completedStreams.length;
    const totalDuration = streamingStats.totalDuration;
    const totalViewers = streamingStats.totalViewers;
    
    // Hitung rata-rata penonton dengan lebih akurat
    let averageViewers = 0;
    if (totalCompletedStreams > 0 && totalViewers > 0) {
      averageViewers = Math.round(totalViewers / totalCompletedStreams);
    }
    
    const stats = {
      totalStreams: totalStreamsFromDB, // Use database count instead of memory
      totalDuration: Math.round(totalDuration * 100) / 100, // Round to 2 decimal places
      totalViewers: totalViewers,
      activeStreams: liveStreams.length,
      averageViewers: averageViewers
    };
    
    console.log('Stats requested - Database count:', totalStreamsFromDB, 'Memory count:', streamingStats.totalStreams);
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

exports.updateViewers = (req, res) => {
  const { id, viewers } = req.body;
  const stream = liveStreams.find(s => s.id === id);
  if (stream) {
    // Tambahkan viewers baru ke stream yang sedang aktif
    const oldViewers = stream.viewers || 0;
    stream.viewers = oldViewers + viewers;
    
    // Update history entry juga
    const historyEntry = streamingStats.streamHistory.find(h => h.id === id && !h.endTime);
    if (historyEntry) {
      historyEntry.viewers = stream.viewers;
    }
    
    console.log(`Updated viewers for stream ${id}: ${stream.viewers}`);
  }
  res.json({ success: true });
};

exports.getStreamInfo = (req, res) => {
  const { id } = req.params;
  const stream = liveStreams.find(s => s.id === id);
  
  if (stream) {
    // Hitung durasi stream saat ini
    const startTime = new Date(stream.startTime);
    const currentTime = new Date();
    const durationHours = (currentTime - startTime) / (1000 * 60 * 60);
    
    res.json({
      startTime: stream.startTime,
      viewers: stream.viewers || 0,
      duration: durationHours, // Tambahkan durasi real-time
      streamId: stream.id,
      isRecording: stream.isRecording || false
    });
  } else {
    res.status(404).json({ error: 'Stream not found' });
  }
};

// Tambahkan fungsi untuk mendapatkan statistik satu stream
exports.getCurrentStreamStats = (req, res) => {
  const { id } = req.params;
  const stream = liveStreams.find(s => s.id === id);
  
  if (stream) {
    // Hitung durasi stream saat ini
    const startTime = new Date(stream.startTime);
    const currentTime = new Date();
    const durationHours = (currentTime - startTime) / (1000 * 60 * 60);
    
    const stats = {
      totalStreams: 1, // Selalu 1 karena ini hanya untuk stream saat ini
      totalDuration: durationHours,
      totalViewers: stream.viewers || 0,
      activeStreams: 1, // Selalu 1 karena ini stream yang aktif
      averageViewers: stream.viewers || 0 // Sama dengan total viewers untuk satu stream
    };
    
    res.json(stats);
  } else {
    res.status(404).json({ error: 'Stream not found' });
  }
};

exports.resetStats = async (req, res) => {
  try {
    // Reset memory stats to match database
    const totalStreamsFromDB = await LiveStream.count();
    
    streamingStats = {
      totalStreams: totalStreamsFromDB,
      totalDuration: 0,
      totalViewers: 0,
      activeStreams: 0,
      averageViewers: 0,
      streamHistory: []
    };
    
    console.log('Stats reset to match database:', { totalStreams: totalStreamsFromDB });
    res.json({ success: true, message: 'Statistik berhasil direset', totalStreams: totalStreamsFromDB });
  } catch (error) {
    console.error('Error resetting stats:', error);
    res.status(500).json({ error: 'Failed to reset stats' });
  }
};

// Endpoint untuk memaksa sync stats dengan database
exports.syncStats = async (req, res) => {
  try {
    const totalStreamsFromDB = await LiveStream.count();
    
    // Update memory stats to match database
    streamingStats.totalStreams = totalStreamsFromDB;
    
    console.log('Stats synced with database:', { totalStreams: totalStreamsFromDB });
    res.json({ 
      success: true, 
      message: 'Stats berhasil disinkronkan dengan database', 
      totalStreams: totalStreamsFromDB 
    });
  } catch (error) {
    console.error('Error syncing stats:', error);
    res.status(500).json({ error: 'Failed to sync stats' });
  }
};


// Tambahkan di bagian atas file, setelah deklarasi variabel

// Fungsi untuk inisialisasi data awal jika belum ada data
const initializeDefaultStats = async () => {
  try {
    // Reset memory stats to match database
    const totalStreamsFromDB = await LiveStream.count();
    streamingStats.totalStreams = totalStreamsFromDB;
    streamingStats.totalDuration = 0;
    streamingStats.totalViewers = 0;
    streamingStats.activeStreams = 0;
    streamingStats.averageViewers = 0;
    streamingStats.streamHistory = [];
    
    console.log('Stats initialized from database:', { totalStreams: totalStreamsFromDB });
  } catch (error) {
    console.error('Error initializing stats:', error);
    // Fallback to default values
    streamingStats.totalStreams = 0;
    streamingStats.totalDuration = 0;
    streamingStats.totalViewers = 0;
    streamingStats.activeStreams = 0;
    streamingStats.averageViewers = 0;
    streamingStats.streamHistory = [];
  }
};

// Panggil fungsi inisialisasi setelah database siap
setTimeout(() => {
  initializeDefaultStats();
}, 1000); // Delay 1 detik untuk memastikan database siap

// Fungsi untuk mendapatkan history live stream dari database
exports.getLiveStreamHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    
    const { count, rows } = await LiveStream.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error getting live stream history:', error);
    res.status(500).json({ error: 'Failed to get live stream history' });
  }
};

// Fungsi untuk mendapatkan detail live stream
exports.getLiveStreamDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const stream = await LiveStream.findByPk(id);
    
    if (!stream) {
      return res.status(404).json({ error: 'Live stream not found' });
    }
    
    res.json({
      success: true,
      data: stream
    });
  } catch (error) {
    console.error('Error getting live stream detail:', error);
    res.status(500).json({ error: 'Failed to get live stream detail' });
  }
};

// Fungsi untuk mengupdate recording path
exports.updateRecordingPath = async (req, res) => {
  try {
    const { id, recordingPath } = req.body;
    
    // Update the recording path and set status to 'recording' if stream was 'ended'
    const updated = await LiveStream.update({
      recordingPath: recordingPath,
      status: 'recording' // Always set to recording when recording path is available
    }, {
      where: { id: id }
    });
    
    console.log('Recording path updated:', { id, recordingPath, updated: updated[0] });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating recording path:', error);
    res.status(500).json({ error: 'Failed to update recording path' });
  }
};

// Fungsi untuk streaming video live stream
exports.streamVideo = (req, res) => {
  const { id } = req.params;
  const filePath = path.join(__dirname, '../uploads', `${id}.webm`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video file tidak ditemukan' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Set CORS headers for video streaming
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Accept-Ranges', 'bytes');

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/webm',
      'Cache-Control': 'no-cache',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/webm',
      'Cache-Control': 'no-cache',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
};

// Fungsi untuk download video live stream
exports.downloadVideo = (req, res) => {
  const { id } = req.params;
  const filePath = path.join(__dirname, '../uploads', `${id}.webm`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video file tidak ditemukan' });
  }

  res.download(filePath, `live_stream_${id}.webm`);
};

// Fungsi untuk upload recording dari live stream
exports.uploadLiveStreamRecording = async (req, res) => {
  try {
    const { streamId, judul } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!streamId) return res.status(400).json({ error: 'Stream ID wajib diisi' });

    const filename = req.file.filename;
    const recordingPath = `/uploads/${filename}`;

    // Update LiveStream record with recording path and set status to 'recording'
    const updated = await LiveStream.update({
      recordingPath: recordingPath,
      isRecording: true,
      status: 'recording' // Set status to 'recording' when recording is uploaded
    }, {
      where: { id: streamId }
    });

    if (updated[0] > 0) {
      console.log('Live stream recording path updated:', { streamId, recordingPath, status: 'recording' });
      res.json({ success: true, recordingPath, filename });
    } else {
      res.status(404).json({ error: 'Live stream tidak ditemukan' });
    }
  } catch (err) {
    console.error('Error uploading live stream recording:', err);
    res.status(500).json({ error: 'Gagal upload live stream recording' });
  }
};

// Fungsi untuk mendapatkan recording live stream
exports.getRecordings = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const { count, rows } = await LiveStream.findAndCountAll({
      where: {
        isRecording: true,
        recordingPath: { [require('sequelize').Op.ne]: null }
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error getting recordings:', error);
    res.status(500).json({ error: 'Failed to get recordings' });
  }
};

// Fungsi untuk menghapus live stream dari database dan file system
exports.deleteLiveStream = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Delete request received for ID:', id);
    
    // Cari live stream di database
    const stream = await LiveStream.findByPk(id);
    console.log('Stream found:', stream ? 'Yes' : 'No');
    
    if (!stream) {
      console.log('Stream not found in database');
      return res.status(404).json({ 
        success: false,
        error: 'Live stream tidak ditemukan' 
      });
    }
    
    // Hapus file recording jika ada
    if (stream.recordingPath) {
      const filePath = path.join(__dirname, '..', stream.recordingPath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log('Recording file deleted:', filePath);
        } catch (fileError) {
          console.error('Error deleting recording file:', fileError);
        }
      }
    }
    
    // Hapus thumbnail jika ada
    const thumbnailPath = path.join(__dirname, '../uploads', `thumb_${id}.jpg`);
    if (fs.existsSync(thumbnailPath)) {
      try {
        fs.unlinkSync(thumbnailPath);
        console.log('Thumbnail file deleted:', thumbnailPath);
      } catch (fileError) {
        console.error('Error deleting thumbnail file:', fileError);
      }
    }
    
    // Hapus dari database
    await stream.destroy();
    
    // Hapus dari memory jika masih ada
    liveStreams = liveStreams.filter(s => s.id !== id);
    streamingStats.activeStreams = liveStreams.length;
    
    // Hapus dari history
    streamingStats.streamHistory = streamingStats.streamHistory.filter(h => h.id !== id);
    
    console.log('Live stream deleted successfully:', id);
    
    res.json({ 
      success: true, 
      message: 'Live stream berhasil dihapus' 
    });
    
  } catch (error) {
    console.error('Error deleting live stream:', error);
    res.status(500).json({ 
      success: false,
      error: 'Gagal menghapus live stream' 
    });
  }
};

// Fungsi untuk membersihkan live stream yang sudah berakhir dari memory
exports.cleanupEndedStreams = () => {
  // Hapus live stream yang sudah berakhir dari memory (lebih dari 1 jam yang lalu)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  liveStreams = liveStreams.filter(stream => {
    const startTime = new Date(stream.startTime);
    return startTime > oneHourAgo;
  });
  
  streamingStats.activeStreams = liveStreams.length;
  
  console.log('Cleaned up ended streams from memory. Active streams:', liveStreams.length);
};