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
      if (isElectron && (window as any).electronAPI) {
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
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        throw new Error("Screen recording memerlukan koneksi HTTPS atau localhost untuk keamanan.");
      }

      // Get screen stream with system audio
      let screenStream: MediaStream;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: true, // This will capture system audio if user allows it
        });
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
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
      } catch (micError: any) {
        console.warn("Microphone access failed:", micError);
        // Continue without microphone if it fails
        micStream = new MediaStream();
      }

      // Combine audio streams using AudioContext
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
    setSelectedMapel
  };

  return (
    <StreamingContext.Provider value={value}>
      {children}
    </StreamingContext.Provider>
  );
};
