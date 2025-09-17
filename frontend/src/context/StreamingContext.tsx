import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { API_URL } from '../config';
import { useAuth } from './AuthContext';

interface StreamingState {
  isStreaming: boolean;
  isRecording: boolean;
  isScreenRecording: boolean;
  roomId: string | null;
  localStream: MediaStream | null;
  recordingStream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  liveStreamRecorder: MediaRecorder | null; // For live stream recording
  videoBlob: Blob | null;
  videoUrl: string | null;
  status: string;
  selectedKelas: string;
  selectedMapel: string;
  recordingStartTime: number | null;
  recordingDuration: number;
  recordingTitle: string; // Store the recording title
}

interface StreamingContextType {
  streamingState: StreamingState;
  startStream: (kelas: string, mapel: string) => Promise<void>;
  stopStream: () => Promise<void>;
  startCameraRecording: (kelas: string, judul: string) => Promise<void>;
  startScreenRecording: (kelas: string, judul: string) => Promise<void>;
  stopRecording: () => void;
  uploadRecording: () => Promise<void>;
  cancelUpload: () => void;
  updateStatus: (status: string) => void;
  setSelectedKelas: (kelas: string) => void;
  setSelectedMapel: (mapel: string) => void;
  startMultiCameraRecording: (selectedCameras: string[], layoutType: string, judul: string) => Promise<void>;
}

const StreamingContext = createContext<StreamingContextType | undefined>(undefined);

export const useStreaming = () => {
  const context = useContext(StreamingContext);
  if (!context) {
    throw new Error('useStreaming must be used within a StreamingProvider');
  }
  return context;
};

export const StreamingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    isRecording: false,
    isScreenRecording: false,
    roomId: null,
    localStream: null,
    recordingStream: null,
    mediaRecorder: null,
    liveStreamRecorder: null,
    videoBlob: null,
    videoUrl: null,
    status: 'Ready to stream',
    selectedKelas: '',
    selectedMapel: '',
    recordingStartTime: null,
    recordingDuration: 0,
    recordingTitle: '',
  });

  const socket = useRef<any>(null);
  const deviceRef = useRef<any>(null);
  const producerTransportRef = useRef<any>(null);
  const videoProducerRef = useRef<any>(null);
  const audioProducerRef = useRef<any>(null);

  useEffect(() => {
    socket.current = io('http://192.168.1.17:4000');
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  const updateStatus = (status: string) => {
    setStreamingState(prev => ({ ...prev, status }));
  };

  const setSelectedKelas = (kelas: string) => {
    setStreamingState(prev => ({ ...prev, selectedKelas: kelas }));
  };

  const setSelectedMapel = (mapel: string) => {
    setStreamingState(prev => ({ ...prev, selectedMapel: mapel }));
  };

  const startStream = async (kelas: string, title: string) => {
    const roomId = `${kelas}_${title.replace(/\s+/g, '_')}_${Date.now()}`;
    
    updateStatus('Memulai kamera...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      console.log("Stream tracks:", stream.getTracks());
      console.log("Available tracks:", stream.getTracks());
      console.log("Video track:", stream.getVideoTracks()[0]);
      console.log("Audio track:", stream.getAudioTracks()[0]);

      // 1. Get RTP Capabilities
      console.log('Getting RTP capabilities...');
      const rtpCapabilities = await new Promise<any>((resolve) => {
        socket.current.emit("getRtpCapabilities", null, resolve);
      });
      console.log('RTP capabilities received:', rtpCapabilities);

      // 2. Create Device
      console.log('Creating MediaSoup device...');
      const device = new mediasoupClient.Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;
      console.log('MediaSoup device created and loaded');

      // 3. Create Producer Transport
      console.log('Creating producer transport...');
      const producerTransportParams = await new Promise<any>((resolve) => {
        socket.current.emit("createProducerTransport", null, resolve);
      });
      console.log('Producer transport params received:', producerTransportParams);
      const producerTransport = device.createSendTransport(producerTransportParams);
      producerTransportRef.current = producerTransport;
      console.log('Producer transport created');

      producerTransport.on("connect", ({ dtlsParameters }: any, callback: any) => {
        console.log('Producer transport connecting...');
        socket.current.emit("connectProducerTransport", { dtlsParameters }, callback);
      });

      producerTransport.on("produce", ({ kind, rtpParameters }: any, callback: any) => {
        console.log('Producer transport producing:', kind);
        socket.current.emit("produce", { kind, rtpParameters, roomId }, ({ id }: any) => callback({ id }));
      });

      producerTransport.on("connectionstatechange", (state) => {
        console.log('Producer transport connection state:', state);
      });

      // 4. Produce video & audio
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      if (!videoTrack) {
        throw new Error("No video track available");
      }

      console.log('Producing video track...');
      videoProducerRef.current = await producerTransport.produce({
        track: videoTrack,
      });
      console.log("videoTrack produced:", videoTrack, "producerId:", videoProducerRef.current.id);
      
      if (audioTrack) {
        console.log('Producing audio track...');
        audioProducerRef.current = await producerTransport.produce({
          track: audioTrack,
        });
        console.log("audioTrack produced:", audioTrack, "producerId:", audioProducerRef.current.id);
      } else {
        console.error("No audio track available!");
      }

      // 5. Start recording the stream for local storage
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        
        // Upload recording to backend
        try {
          const formData = new FormData();
          formData.append('recording', videoBlob, `${roomId}.webm`);
          formData.append('streamId', roomId);
          formData.append('judul', `Live Stream ${roomId}`);

          const response = await fetch(`${API_URL}/api/livestream/upload-recording`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });

          if (response.ok) {
            console.log('Live stream recording uploaded successfully');
          } else {
            console.error('Failed to upload live stream recording');
          }
        } catch (error) {
          console.error('Error uploading live stream recording:', error);
        }
      };

      mediaRecorder.start(1000); // Record in 1-second chunks
      console.log('Live stream recording started');

      // Update state
      setStreamingState(prev => ({
        ...prev,
        isStreaming: true,
        roomId,
        localStream: stream,
        liveStreamRecorder: mediaRecorder,
        status: 'Live streaming berjalan!',
        selectedKelas: kelas,
        selectedMapel: title
      }));

      console.log('Stream state updated, isStreaming:', true, 'roomId:', roomId);

      // Notify backend (automatically save to database)
      console.log('Notifying backend about stream start...');
      const response = await fetch(`${API_URL}/api/livestream/start`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: roomId,
          title: title,
          isRecording: false, // All streams are saved to database by default
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend API error:', errorData);
        throw new Error(errorData.error || 'Failed to start live stream');
      }
      
      console.log('Backend notified successfully, stream is now active');

    } catch (error) {
      console.error("Error starting stream:", error);
      console.error("Error details:", error);
      
      // Clean up on error
      if (streamingState.localStream) {
        streamingState.localStream.getTracks().forEach(track => track.stop());
      }
      if (videoProducerRef.current) {
        videoProducerRef.current.close();
        videoProducerRef.current = null;
      }
      if (audioProducerRef.current) {
        audioProducerRef.current.close();
        audioProducerRef.current = null;
      }
      if (producerTransportRef.current) {
        producerTransportRef.current.close();
        producerTransportRef.current = null;
      }
      
      updateStatus("Gagal memulai live streaming. Silakan coba lagi.");
    }
  };

  const stopStream = async () => {
    try {
      console.log('stopStream called, current roomId:', streamingState.roomId);
      updateStatus("Menghentikan live streaming...");

      // Stop live stream recording
      if (streamingState.liveStreamRecorder && streamingState.liveStreamRecorder.state === 'recording') {
        streamingState.liveStreamRecorder.stop();
        console.log('Live stream recording stopped');
      }

      // Stop MediaSoup producers
      if (videoProducerRef.current) {
        videoProducerRef.current.close();
        videoProducerRef.current = null;
      }
      if (audioProducerRef.current) {
        audioProducerRef.current.close();
        audioProducerRef.current = null;
      }

      // Stop producer transport
      if (producerTransportRef.current) {
        producerTransportRef.current.close();
        producerTransportRef.current = null;
      }

      // Stop local stream
      if (streamingState.localStream) {
        streamingState.localStream.getTracks().forEach(track => track.stop());
      }

      // Notify backend
      if (streamingState.roomId) {
        await fetch(`${API_URL}/api/livestream/stop`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ id: streamingState.roomId }),
        });
      }

      // Update state
      setStreamingState(prev => ({
        ...prev,
        isStreaming: false,
        roomId: null,
        localStream: null,
        liveStreamRecorder: null,
        status: 'Live streaming dihentikan',
        recordingStartTime: null,
        recordingDuration: 0,
      }));

    } catch (error) {
      console.error("Error stopping stream:", error);
      updateStatus("Gagal menghentikan live streaming.");
    }
  };

  const startCameraRecording = async (kelas: string, judul: string) => {
    try {
      updateStatus("Memulai recording kamera...");
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !('getUserMedia' in navigator.mediaDevices)) {
        throw new Error("Camera recording tidak didukung di browser ini. Silakan gunakan browser yang lebih baru.");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true,
        });
      } catch (getUserMediaError: any) {
        console.error("getUserMedia error:", getUserMediaError);
        
        // Handle specific error cases
        if (getUserMediaError.name === 'NotAllowedError') {
          throw new Error("Akses kamera dan mikrofon ditolak. Silakan izinkan akses dan coba lagi.");
        } else if (getUserMediaError.name === 'NotFoundError') {
          throw new Error("Kamera atau mikrofon tidak ditemukan. Pastikan perangkat tersambung.");
        } else if (getUserMediaError.name === 'NotReadableError') {
          throw new Error("Kamera atau mikrofon sedang digunakan oleh aplikasi lain.");
        } else if (getUserMediaError.name === 'OverconstrainedError') {
          throw new Error("Pengaturan kamera tidak dapat dipenuhi. Silakan coba lagi.");
        } else {
          throw new Error(`Gagal mengakses kamera: ${getUserMediaError.message || 'Error tidak diketahui'}`);
        }
      }

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error("MediaRecorder tidak didukung di browser ini.");
      }

      // Check for supported MIME types
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            throw new Error("Format video tidak didukung di browser ini.");
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(videoBlob);
        
        setStreamingState(prev => ({
          ...prev,
          videoBlob,
          videoUrl,
          recordingStream: null,
          mediaRecorder: null,
          status: 'Recording selesai'
        }));
      };

      mediaRecorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event);
        updateStatus("Error saat recording kamera. Silakan coba lagi.");
      };

      mediaRecorder.start();
      
      setStreamingState(prev => ({
        ...prev,
        isRecording: true,
        recordingStream: stream,
        mediaRecorder,
        recordingStartTime: Date.now(),
        recordingTitle: judul,
        status: 'Recording kamera berjalan...'
      }));

    } catch (error: any) {
      console.error("Error starting camera recording:", error);
      updateStatus(error.message || "Gagal memulai recording kamera.");
    }
  };

  const startScreenRecording = async (kelas: string, judul: string) => {
    try {
      updateStatus("Memulai recording layar...");
      
      // Check if we're in Electron
      const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
      
      // For Electron, try to use desktopCapturer API
      if (isElectron && (window as any).electronAPI && (window as any).electronAPI.getScreenSources) {
        try {
          updateStatus("Mengambil daftar layar yang tersedia...");
          const sources = await (window as any).electronAPI.getScreenSources();
          
          if (sources.length === 0) {
            throw new Error("Tidak ada layar yang tersedia untuk recording.");
          }
          
          // For now, use the first available screen source
          const source = sources[0];
          updateStatus(`Menggunakan layar: ${source.name}`);
          
          // Create screen stream with system audio
          const screenStream = await navigator.mediaDevices.getUserMedia({
            video: {
              // @ts-ignore - Electron specific constraint
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id,
                minWidth: 1280,
                maxWidth: 1920,
                minHeight: 720,
                maxHeight: 1080
              }
            },
            audio: {
              // @ts-ignore - Electron specific constraint
              mandatory: {
                chromeMediaSource: 'desktop'
              }
            }
          });

          // Create microphone stream for external audio
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: true
          });

          // Combine audio streams using AudioContext
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const destination = audioContext.createMediaStreamDestination();

          // Add screen audio (system audio from laptop)
          if (screenStream.getAudioTracks().length > 0) {
            const screenAudioSource = audioContext.createMediaStreamSource(screenStream);
            screenAudioSource.connect(destination);
            console.log('System audio connected');
          }

          // Add microphone audio (external audio)
          if (micStream.getAudioTracks().length > 0) {
            const micAudioSource = audioContext.createMediaStreamSource(micStream);
            micAudioSource.connect(destination);
            console.log('Microphone audio connected');
          }

          // Create combined stream with video and mixed audio
          const combinedStream = new MediaStream();
          
          // Add video track from screen
          screenStream.getVideoTracks().forEach(track => {
            combinedStream.addTrack(track);
          });
          
          // Add mixed audio tracks
          destination.stream.getAudioTracks().forEach(track => {
            combinedStream.addTrack(track);
          });

          console.log('Combined stream created with', combinedStream.getAudioTracks().length, 'audio tracks');
          
          // Continue with MediaRecorder setup
          const mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm;codecs=vp8,opus'
          });

          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            const videoBlob = new Blob(chunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(videoBlob);
            
            // Clean up audio context
            if (audioContext.state !== 'closed') {
              audioContext.close();
            }
            
            // Stop all tracks
            screenStream.getTracks().forEach(track => track.stop());
            micStream.getTracks().forEach(track => track.stop());
            
            setStreamingState(prev => ({
              ...prev,
              videoBlob,
              videoUrl,
              recordingStream: null,
              mediaRecorder: null,
              status: 'Recording selesai dengan audio laptop dan mikrofon'
            }));
          };

          mediaRecorder.onerror = (event: any) => {
            console.error("MediaRecorder error:", event);
            updateStatus("Error saat recording layar. Silakan coba lagi.");
          };

          mediaRecorder.start();
          
          setStreamingState(prev => ({
            ...prev,
            isScreenRecording: true,
            recordingStream: combinedStream,
            mediaRecorder,
            recordingStartTime: Date.now(),
            recordingTitle: judul,
            status: 'Recording layar berjalan dengan audio laptop dan mikrofon...'
          }));
          
          return; // Success, exit early
          
        } catch (electronError: any) {
          console.error("Electron screen recording failed:", electronError);
          updateStatus("Screen recording melalui Electron gagal. Mencoba metode alternatif...");
        }
      }
      
      // Check if getDisplayMedia is supported (fallback for web browsers)
      if (!navigator.mediaDevices || !('getDisplayMedia' in navigator.mediaDevices)) {
        if (isElectron) {
          throw new Error("Screen recording tidak didukung di Electron. Silakan gunakan aplikasi web di browser Chrome/Firefox/Edge untuk screen recording.");
        } else {
          throw new Error("Screen recording tidak didukung di browser ini. Silakan gunakan browser yang lebih baru seperti Chrome, Firefox, atau Edge.");
        }
      }

      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '192.168.1.17') {
        throw new Error("Screen recording memerlukan koneksi HTTPS atau localhost untuk keamanan.");
      }

      // Get screen stream with system audio
      let screenStream: MediaStream;
      try {
        updateStatus("Meminta izin untuk screen recording...");
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: true, // This will capture system audio if user allows it
        });
        updateStatus("Screen stream berhasil didapatkan...");
      } catch (getDisplayMediaError: any) {
        console.error("getDisplayMedia error:", getDisplayMediaError);
        
        // Handle specific error cases
        if (getDisplayMediaError.name === 'NotAllowedError') {
          throw new Error("Akses untuk screen recording ditolak. Silakan izinkan akses layar dan coba lagi.");
        } else if (getDisplayMediaError.name === 'NotSupportedError') {
          throw new Error("Screen recording tidak didukung di browser ini. Silakan gunakan browser yang lebih baru.");
        } else if (getDisplayMediaError.name === 'AbortError') {
          throw new Error("Screen recording dibatalkan oleh pengguna.");
        } else {
          throw new Error(`Gagal memulai screen recording: ${getDisplayMediaError.message || 'Error tidak diketahui'}`);
        }
      }

      // Get microphone stream for external audio
      let micStream: MediaStream;
      try {
        updateStatus("Meminta izin untuk mikrofon...");
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
        updateStatus("Mikrofon berhasil didapatkan...");
      } catch (micError: any) {
        console.warn("Microphone access failed:", micError);
        updateStatus("Mikrofon tidak tersedia, melanjutkan tanpa audio eksternal...");
        // Continue without microphone if it fails
        micStream = new MediaStream();
      }

      // Combine audio streams using AudioContext
      updateStatus("Menggabungkan audio streams...");
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const destination = audioContext.createMediaStreamDestination();

      // Add screen audio (system audio)
      if (screenStream.getAudioTracks().length > 0) {
        const screenAudioSource = audioContext.createMediaStreamSource(screenStream);
        screenAudioSource.connect(destination);
        console.log('System audio connected (web browser)');
      }

      // Add microphone audio (external audio)
      if (micStream.getAudioTracks().length > 0) {
        const micAudioSource = audioContext.createMediaStreamSource(micStream);
        micAudioSource.connect(destination);
        console.log('Microphone audio connected (web browser)');
      }

      // Create combined stream with video and mixed audio
      const combinedStream = new MediaStream();
      
      // Add video track from screen
      screenStream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
      
      // Add mixed audio tracks
      destination.stream.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track);
      });

      console.log('Combined stream created (web browser) with', combinedStream.getAudioTracks().length, 'audio tracks');
      updateStatus("Stream gabungan berhasil dibuat...");

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error("MediaRecorder tidak didukung di browser ini.");
      }

      // Check for supported MIME types
      updateStatus("Menyiapkan MediaRecorder...");
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            throw new Error("Format video tidak didukung di browser ini.");
          }
        }
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(videoBlob);
        
        // Clean up audio context
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
        
        // Stop all tracks
        screenStream.getTracks().forEach(track => track.stop());
        micStream.getTracks().forEach(track => track.stop());
        
        setStreamingState(prev => ({
          ...prev,
          videoBlob,
          videoUrl,
          recordingStream: null,
          mediaRecorder: null,
          status: 'Recording selesai dengan audio laptop dan mikrofon'
        }));
      };

      mediaRecorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event);
        updateStatus("Error saat recording layar. Silakan coba lagi.");
      };

      mediaRecorder.start();
      updateStatus("Recording layar dimulai...");
      
      setStreamingState(prev => ({
        ...prev,
        isScreenRecording: true,
        recordingStream: combinedStream,
        mediaRecorder,
        recordingStartTime: Date.now(),
        recordingTitle: judul,
        status: 'Recording layar berjalan dengan audio laptop dan mikrofon...'
      }));

    } catch (error: any) {
      console.error("Error starting screen recording:", error);
      updateStatus(error.message || "Gagal memulai recording layar.");
    }
  };

  const stopRecording = () => {
    if (streamingState.mediaRecorder && streamingState.mediaRecorder.state === 'recording') {
      streamingState.mediaRecorder.stop();
    }
    
    if (streamingState.recordingStream) {
      streamingState.recordingStream.getTracks().forEach(track => track.stop());
    }

    setStreamingState(prev => ({
      ...prev,
      isRecording: false,
      isScreenRecording: false,
      recordingStream: null,
      mediaRecorder: null,
      status: 'Recording dihentikan'
    }));
  };

  const uploadRecording = async () => {
    if (!streamingState.videoBlob) return;

    try {
      updateStatus("Mengupload recording...");
      
      const formData = new FormData();
      formData.append('recording', streamingState.videoBlob, 'recording.webm');
      formData.append('kelas', streamingState.selectedKelas);
      formData.append('judul', streamingState.recordingTitle || 'Recording');

      const response = await fetch(`${API_URL}/api/recordings/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        updateStatus("Recording berhasil diupload!");
        setStreamingState(prev => ({
          ...prev,
          videoBlob: null,
          videoUrl: null,
          recordingTitle: '',
          status: 'Recording berhasil diupload'
        }));
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error("Error uploading recording:", error);
      updateStatus("Gagal mengupload recording.");
    }
  };

  const cancelUpload = () => {
    if (streamingState.videoUrl) {
      URL.revokeObjectURL(streamingState.videoUrl);
    }
    
    setStreamingState(prev => ({
      ...prev,
      videoBlob: null,
      videoUrl: null,
      recordingTitle: '',
      status: 'Upload dibatalkan'
    }));
  };

  const startMultiCameraRecording = async (selectedCameras: string[], layoutType: string, judul: string) => {
    try {
      updateStatus("Memulai recording multi-kamera...");
      
      if (selectedCameras.length === 0) {
        throw new Error("Pilih setidaknya satu kamera untuk recording");
      }

      if (selectedCameras.length > 4) {
        throw new Error("Maksimal 4 kamera untuk recording");
      }

      // Get streams from selected cameras
      const cameraStreams: { [deviceId: string]: MediaStream } = {};
      const audioStreams: MediaStream[] = [];

      for (const deviceId of selectedCameras) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false // We'll handle audio separately
          });
          cameraStreams[deviceId] = stream;
        } catch (error: any) {
          console.error(`Error accessing camera ${deviceId}:`, error);
          throw new Error(`Gagal mengakses kamera: ${error.message}`);
        }
      }

      // Get audio stream (microphone)
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
        audioStreams.push(audioStream);
      } catch (error: any) {
        console.warn("Audio stream failed:", error);
        // Continue without audio if it fails
      }

      // Create canvas for composition
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context tidak tersedia');
      }

      // Create video elements for each camera
      const videoElements: { [deviceId: string]: HTMLVideoElement } = {};
      Object.entries(cameraStreams).forEach(([deviceId, stream]) => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.style.width = '320px';
        video.style.height = '240px';
        videoElements[deviceId] = video;
      });

      // Wait for videos to load and start playing
      await Promise.all(Object.values(videoElements).map(video => 
        new Promise(resolve => {
          video.onloadedmetadata = () => {
            video.play().then(() => {
              // Small delay to ensure video is actually playing
              setTimeout(() => {
                resolve(true);
              }, 100);
            }).catch(resolve);
          };
        })
      ));

      // Additional delay to ensure all videos are ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create canvas stream
      const canvasStream = canvas.captureStream(30); // 30 FPS

      // Combine canvas video with audio
      const combinedStream = new MediaStream();
      
      // Add canvas video track
      canvasStream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track);
      });

      // Add audio track if available
      if (audioStreams.length > 0) {
        audioStreams[0].getAudioTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
      }

      // Animation function to draw cameras to canvas
      const drawCamerasToCanvas = () => {
        try {
          // Clear canvas
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const activeStreams = Object.entries(cameraStreams).filter(([deviceId]) => 
            selectedCameras.includes(deviceId)
          );

          if (activeStreams.length === 0) return;

          switch (layoutType) {
            case 'grid':
              drawGridLayout(ctx, canvas.width, canvas.height, activeStreams, videoElements);
              break;
            case 'pip':
              drawPictureInPictureLayout(ctx, canvas.width, canvas.height, activeStreams, videoElements);
              break;
            case 'split':
              drawSplitLayout(ctx, canvas.width, canvas.height, activeStreams, videoElements);
              break;
          }
        } catch (error) {
          console.error('Error drawing to canvas:', error);
        }
      };

      // Layout drawing functions
      const drawGridLayout = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, streams: [string, MediaStream][], videos: { [deviceId: string]: HTMLVideoElement }) => {
        const count = streams.length;
        let cols = 1;
        let rows = 1;

        if (count === 2) {
          cols = 2;
          rows = 1;
        } else if (count === 3) {
          cols = 2;
          rows = 2;
        } else if (count >= 4) {
          cols = 2;
          rows = 2;
        }

        const cellWidth = canvasWidth / cols;
        const cellHeight = canvasHeight / rows;

        streams.forEach(([deviceId, stream], index) => {
          const video = videos[deviceId];
          if (!video || video.readyState < 2) return; // Check if video is ready

          const col = index % cols;
          const row = Math.floor(index / cols);
          
          const x = col * cellWidth;
          const y = row * cellHeight;

          try {
            // Draw video frame
            ctx.drawImage(video, x, y, cellWidth, cellHeight);

            // Draw camera label
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x, y, cellWidth, 30);
            ctx.fillStyle = 'white';
            ctx.font = '14px Arial';
            ctx.fillText(`Kamera ${index + 1}`, x + 10, y + 20);
          } catch (error) {
            console.error(`Error drawing camera ${index + 1}:`, error);
          }
        });
      };

      const drawPictureInPictureLayout = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, streams: [string, MediaStream][], videos: { [deviceId: string]: HTMLVideoElement }) => {
        if (streams.length === 0) return;

        // Main camera (first one)
        const [mainDeviceId, mainStream] = streams[0];
        const mainVideo = videos[mainDeviceId];
        if (mainVideo && mainVideo.readyState >= 2) {
          try {
            ctx.drawImage(mainVideo, 0, 0, canvasWidth, canvasHeight);
          } catch (error) {
            console.error('Error drawing main camera:', error);
          }
        }

        // Secondary cameras as small windows
        const pipSize = Math.min(canvasWidth, canvasHeight) * 0.25;
        const pipSpacing = pipSize + 10;

        streams.slice(1).forEach(([deviceId, stream], index) => {
          const video = videos[deviceId];
          if (!video || video.readyState < 2) return;

          const x = canvasWidth - pipSize - 10;
          const y = 10 + (index * pipSpacing);

          try {
            // Draw small video
            ctx.drawImage(video, x, y, pipSize, pipSize);

            // Draw border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, pipSize, pipSize);

            // Draw label
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x, y + pipSize - 20, pipSize, 20);
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.fillText(`Kamera ${index + 2}`, x + 5, y + pipSize - 5);
          } catch (error) {
            console.error(`Error drawing PIP camera ${index + 2}:`, error);
          }
        });
      };

      const drawSplitLayout = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, streams: [string, MediaStream][], videos: { [deviceId: string]: HTMLVideoElement }) => {
        if (streams.length === 0) return;

        if (streams.length === 2) {
          // Side by side
          const halfWidth = canvasWidth / 2;
          streams.forEach(([deviceId, stream], index) => {
            const video = videos[deviceId];
            if (!video) return;

            const x = index * halfWidth;
            ctx.drawImage(video, x, 0, halfWidth, canvasHeight);
          });
        } else {
          // Top and bottom
          const halfHeight = canvasHeight / 2;
          streams.forEach(([deviceId, stream], index) => {
            const video = videos[deviceId];
            if (!video) return;

            const y = index * halfHeight;
            ctx.drawImage(video, 0, y, canvasWidth, halfHeight);
          });
        }
      };

      // Store animation frame reference for cleanup
      let animationFrameId: number;
      let isRecordingActive = true;
      
      // Start animation loop
      const animate = () => {
        if (!isRecordingActive) return;
        
        drawCamerasToCanvas();
        animationFrameId = requestAnimationFrame(animate);
      };

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error("MediaRecorder tidak didukung di browser ini.");
      }

      // Check for supported MIME types
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            throw new Error("Format video tidak didukung di browser ini.");
          }
        }
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(videoBlob);
        
        // Stop animation loop
        isRecordingActive = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        
        // Clean up camera streams
        Object.values(cameraStreams).forEach(stream => {
          stream.getTracks().forEach(track => track.stop());
        });
        audioStreams.forEach(stream => {
          stream.getTracks().forEach(track => track.stop());
        });
        
        setStreamingState(prev => ({
          ...prev,
          videoBlob,
          videoUrl,
          recordingStream: null,
          mediaRecorder: null,
          isRecording: false,
          status: `Recording ${selectedCameras.length} kamera selesai`
        }));
      };

      mediaRecorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event);
        updateStatus("Error saat recording multi-kamera. Silakan coba lagi.");
      };

      // Start recording
      mediaRecorder.start();
      
      setStreamingState(prev => ({
        ...prev,
        isRecording: true,
        recordingStream: combinedStream,
        mediaRecorder,
        recordingStartTime: Date.now(),
        recordingTitle: judul,
        status: `Recording ${selectedCameras.length} kamera berjalan...`
      }));

      // Start animation loop
      animate();

      updateStatus(`Recording ${selectedCameras.length} kamera berjalan...`);

    } catch (error: any) {
      console.error("Error starting multi-camera recording:", error);
      updateStatus(error.message || "Gagal memulai recording multi-kamera.");
    }
  };

  const value = {
    streamingState,
    startStream,
    stopStream,
    startCameraRecording,
    startScreenRecording,
    stopRecording,
    uploadRecording,
    cancelUpload,
    updateStatus,
    setSelectedKelas,
    setSelectedMapel,
    startMultiCameraRecording
  };

  return (
    <StreamingContext.Provider value={value}>
      {children}
    </StreamingContext.Provider>
  );
};
