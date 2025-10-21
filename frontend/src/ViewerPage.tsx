import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from './config';
import { io } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

// Color palette konsisten
const LIGHT_GREEN = "#BBF7D0";
const WHITE = "#fff";
const GRAY_TEXT = "#64748b";
const CARD_RADIUS = 18;
const SHADOW = "0 4px 24px rgba(187,247,208,0.12)";
const FONT_FAMILY = "Poppins, Inter, Segoe UI, Arial, sans-serif";

const COLORS = {
  primary: LIGHT_GREEN,
  primaryDark: "#86EFAC",
  text: "#1e293b",
  subtext: GRAY_TEXT,
  border: "#e5e7eb",
  bg: "#f5f5f5",
  white: WHITE,
  red: "#ef4444",
  green: "#22c55e",
};

interface LiveStreamData {
  id: string;
  title: string;
  startTime: string;
  viewers: number;
  status: 'active' | 'ended' | 'recording';
  isRecording: boolean;
  recordingPath?: string;
}

const ViewerPage: React.FC = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const [streamData, setStreamData] = useState<LiveStreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewers, setViewers] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [currentBitrate, setCurrentBitrate] = useState(0);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [showStreamEndedModal, setShowStreamEndedModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const deviceRef = useRef<any>(null);
  const consumerRef = useRef<any>(null);
  const audioConsumerRef = useRef<any>(null);
  const consumerTransportRef = useRef<any>(null);
  const networkMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const bufferResetRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (streamId) {
      fetchStreamData();
    }
    
    return () => {
      // Cleanup on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (consumerRef.current) {
        consumerRef.current.close();
      }
      if (audioConsumerRef.current) {
        audioConsumerRef.current.close();
      }
      if (networkMonitorRef.current) {
        clearInterval(networkMonitorRef.current);
      }
      if (bufferResetRef.current) {
        clearInterval(bufferResetRef.current);
      }
    };
  }, [streamId]);

  // Listen for viewer count updates
  useEffect(() => {
    if (socketRef.current && streamId) {
      const handleViewerCountUpdate = (data: { roomId: string; viewers: number }) => {
        if (data.roomId === streamId) {
          setViewers(data.viewers);
          console.log(`[ViewerPage] Viewer count updated: ${data.viewers}`);
        }
      };

      socketRef.current.on('viewerCountUpdate', handleViewerCountUpdate);

      return () => {
        if (socketRef.current) {
          socketRef.current.off('viewerCountUpdate', handleViewerCountUpdate);
        }
      };
    }
  }, [streamId, socketRef.current]);

  // Check stream status periodically
  useEffect(() => {
    if (!streamId || !isConnected) return;
    
    // Check status every 5 seconds for faster response
    const statusInterval = setInterval(async () => {
      const streamEnded = await checkStreamStatus();
      if (streamEnded) {
        clearInterval(statusInterval);
      }
    }, 5000);
    
    return () => clearInterval(statusInterval);
  }, [streamId, isConnected]);

  const fetchStreamData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/livestream/detail/${streamId}`);
      
      if (response.ok) {
        const data = await response.json();
        setStreamData(data.data);
        
        // Update viewers count
        setViewers(data.data.viewers || 0);
        
        // Live streaming concept: handle different stream states
        if (data.data.status === 'active') {
          // Stream is active, try to connect to live stream
          try {
            await connectToStream();
          } catch (err) {
            console.error('WebRTC connection failed:', err);
            // If live connection fails, check if there's a recording available
            if (data.data.recordingPath) {
              console.log('Live connection failed, but recording available. Showing recording instead.');
              setStreamData(prev => prev ? { ...prev, status: 'recording' } : null);
            } else {
              setError('Gagal terhubung ke live stream. Pastikan admin sedang streaming dan coba lagi.');
            }
          }
        } else if (data.data.status === 'ended') {
          // Stream has ended, check if recording is available
          if (data.data.recordingPath) {
            // Stream has ended and has recording, show recording
            setStreamData(prev => prev ? { ...prev, status: 'recording' } : null);
          } else {
            // Stream has ended but no recording available yet, wait a bit and retry
            console.log('Stream ended but no recording available yet. Retrying in 3 seconds...');
            setTimeout(async () => {
              try {
                const retryResponse = await fetch(`${API_URL}/api/livestream/detail/${streamId}`);
                if (retryResponse.ok) {
                  const retryData = await retryResponse.json();
                  if (retryData.data.recordingPath) {
                    setStreamData(prev => prev ? { ...prev, status: 'recording', recordingPath: retryData.data.recordingPath } : null);
                  } else {
                    setError('Live stream sudah berakhir. Recording sedang diproses, silakan coba lagi dalam beberapa saat.');
                  }
                }
              } catch (retryErr) {
                console.error('Retry failed:', retryErr);
                setError('Live stream sudah berakhir. Recording sedang diproses, silakan coba lagi dalam beberapa saat.');
              }
            }, 3000);
          }
        } else if (data.data.status === 'recording') {
          // Stream is in recording mode, show recording
          setStreamData(prev => prev ? { ...prev, status: 'recording' } : null);
        } else {
          // Stream status is unknown or invalid
          setError('Status live stream tidak valid atau tidak dikenali.');
        }
      } else {
        setError('Live stream tidak ditemukan atau sudah berakhir');
      }
    } catch (err) {
      setError('Gagal memuat live stream');
      console.error('Error fetching stream data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Network quality monitoring
  const startNetworkMonitoring = () => {
    if (networkMonitorRef.current) {
      clearInterval(networkMonitorRef.current);
    }
    
    networkMonitorRef.current = setInterval(() => {
      if (consumerRef.current && consumerTransportRef.current) {
        try {
          const stats = consumerRef.current.getStats();
          if (stats && stats.length > 0) {
            const videoStats = stats.find((stat: any) => stat.type === 'inbound-rtp' && stat.kind === 'video');
            if (videoStats) {
              const bitrate = videoStats.bytesReceived * 8 / 1000; // kbps
              setCurrentBitrate(bitrate);
              
              // Determine network quality based on bitrate and packet loss
              if (bitrate > 2000 && (!videoStats.packetsLost || videoStats.packetsLost < 5)) {
                setNetworkQuality('good');
              } else if (bitrate > 1000 && (!videoStats.packetsLost || videoStats.packetsLost < 15)) {
                setNetworkQuality('fair');
              } else {
                setNetworkQuality('poor');
              }
              
              // Check for stream issues and delay accumulation
              if (bitrate === 0 || videoStats.packetsLost > 50) {
                console.warn('Stream quality degraded, attempting recovery...');
                setError('Kualitas stream menurun. Mencoba perbaikan...');
                // Attempt to reconnect
                setTimeout(() => {
                  if (streamId) {
                    connectToStream();
                  }
                }, 3000);
              }
              
              // Check for delay accumulation (high packet loss or low bitrate)
              if (videoStats.packetsLost > 20 || bitrate < 500) {
                console.warn('Delay accumulation detected, attempting recovery...');
                // Gentle recovery without aggressive buffer reset
                if (videoRef.current && videoRef.current.readyState >= 2) {
                  const buffered = videoRef.current.buffered;
                  if (buffered.length > 0) {
                    const bufferEnd = buffered.end(buffered.length - 1);
                    const currentTime = videoRef.current.currentTime;
                    const bufferSize = bufferEnd - currentTime;
                    
                    // Only reset if buffer is really large (> 15 seconds)
                    if (bufferSize > 15) {
                      console.log('Large buffer detected, performing gentle reset...');
                      videoRef.current.currentTime = bufferEnd - 5; // Keep 5 seconds buffer
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn('Error getting network stats:', error);
        }
      }
    }, 5000); // Check every 5 seconds (reduced frequency)
  };

  // Buffer reset to prevent delay accumulation - STABLE VERSION
  const startBufferReset = () => {
    if (bufferResetRef.current) {
      clearInterval(bufferResetRef.current);
    }
    
    bufferResetRef.current = setInterval(() => {
      if (streamStartTime && videoRef.current) {
        const currentTime = Date.now();
        const streamDuration = currentTime - streamStartTime;
        
        // Reset buffer every 5 minutes to prevent delay accumulation (more stable)
        if (streamDuration > 0 && streamDuration % 300000 < 10000) { // Every 5 minutes
          console.log('Performing gentle buffer reset to prevent delay...');
          
          // Gentle buffer reset without disrupting playback
          if (videoRef.current && videoRef.current.readyState >= 2) {
            // Only reset if video is playing and has data
            const currentTime = videoRef.current.currentTime;
            const buffered = videoRef.current.buffered;
            
            // Check if buffer is getting too large (> 10 seconds)
            if (buffered.length > 0) {
              const bufferEnd = buffered.end(buffered.length - 1);
              const bufferSize = bufferEnd - currentTime;
              
              if (bufferSize > 10) {
                console.log('Buffer too large, performing gentle reset...');
                videoRef.current.currentTime = bufferEnd - 2; // Keep 2 seconds buffer
              }
            }
          }
        }
      }
    }, 30000); // Check every 30 seconds (less aggressive)
  };

  // Check stream status from database
  const checkStreamStatus = async () => {
    if (!streamId) return;
    
    try {
      const response = await fetch(`${API_URL}/api/livestream/detail/${streamId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.data) {
          // Check if stream status is 'ended' or 'recording' (stream has ended)
          if (data.data.status === 'ended' || data.data.status === 'recording') {
            setShowStreamEndedModal(true);
            // Stop video playback
            if (videoRef.current) {
              videoRef.current.pause();
            }
            // Disconnect from stream
            setIsConnected(false);
            // Clear the interval to prevent further checks
            return true;
          }
        }
      }
    } catch (error) {
      console.error('Error checking stream status:', error);
    }
  };

  const connectToStream = async () => {
    try {
      // Set timeout for WebRTC connection
      const connectionTimeout = setTimeout(() => {
        console.log('WebRTC connection timeout');
        setError('Timeout terhubung ke live stream. Pastikan admin sedang streaming dan coba lagi.');
      }, 10000); // 10 second timeout
      
      // Connect to MediaSoup server
      socketRef.current = io('http://192.168.1.14:4000');
      
      socketRef.current.on('connect', async () => {
        console.log('Connected to MediaSoup server');
        setIsConnected(true);
        clearTimeout(connectionTimeout); // Clear timeout on successful connection
        console.log('Connection status updated to: true');
        
        // Listen for viewer count updates
        socketRef.current.on('viewerCountUpdate', (data: { roomId: string; viewers: number }) => {
          if (data.roomId === streamId) {
            setViewers(data.viewers);
            console.log(`[ViewerPage] Viewer count updated: ${data.viewers}`);
          }
        });
        
        // Check if producer exists for this room
        console.log('Checking producer for room:', streamId);
        const producerCheck: any = await Promise.race([
          new Promise((resolve) => {
            socketRef.current.emit('checkProducer', { roomId: streamId }, resolve);
          }),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Producer check timeout')), 5000);
          })
        ]).catch((error) => {
          console.error('Producer check failed:', error);
          return { hasVideoProducer: false, hasAudioProducer: false, error: error.message };
        });
        
        console.log('Producer check result:', producerCheck);
        if (producerCheck.allRooms) {
          console.log('Available rooms:', producerCheck.allRooms);
        }
        
        if (!producerCheck.hasVideoProducer) {
          console.log('No video producer found for live stream');
          setError('Admin belum memulai streaming. Silakan tunggu atau hubungi admin untuk memulai live stream.');
          return;
        }
        
        // Get RTP capabilities
        const rtpCapabilities = await new Promise((resolve) => {
          socketRef.current.emit('getRtpCapabilities', null, resolve);
        });
        
        // Create device
        deviceRef.current = new mediasoupClient.Device();
        await deviceRef.current.load({ routerRtpCapabilities: rtpCapabilities });
        
        // Create consumer transport
        const transportParams = await new Promise((resolve) => {
          socketRef.current.emit('createConsumerTransport', null, resolve);
        });
        
        const consumerTransport = deviceRef.current.createRecvTransport(transportParams);
        consumerTransportRef.current = consumerTransport;
        
        // Connect transport
        consumerTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
          try {
            await new Promise((resolve) => {
              socketRef.current.emit('connectConsumerTransport', { dtlsParameters }, resolve);
            });
            callback();
          } catch (err) {
            errback(err);
          }
        });
        
        // Wait a bit for transport to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Consume video stream with retry
        console.log('Attempting to consume stream for room:', streamId);
        let consumeParams: any = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries && (!consumeParams || consumeParams.error)) {
          if (retryCount > 0) {
            console.log(`Retry ${retryCount} for consume...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
          }
          
          consumeParams = await new Promise((resolve) => {
            socketRef.current.emit('consume', { 
              transportId: consumerTransport.id,
              rtpCapabilities: deviceRef.current.rtpCapabilities,
              roomId: streamId 
            }, resolve);
          });
          
          retryCount++;
        }
        
        console.log('Consume params received after', retryCount, 'attempts:', consumeParams);
        
        if (consumeParams && !consumeParams.error) {
          // Backend returns {consumers: Array} or direct array
          const consumers = consumeParams.consumers || (Array.isArray(consumeParams) ? consumeParams : [consumeParams]);
          
          console.log('Consumers array:', consumers);
          console.log('Consumer details:', consumers.map((c: any) => ({ kind: c.kind, id: c.id, producerId: c.producerId })));
          
          // Find video and audio consumers
          const videoConsumer = consumers.find((c: any) => c.kind === 'video');
          const audioConsumer = consumers.find((c: any) => c.kind === 'audio');
          console.log('Video consumer found:', videoConsumer);
          console.log('Audio consumer found:', audioConsumer);
          
          const tracks = [];
          let videoConsumerRef = null;
          let audioConsumerLocal = null;
          
          // Create video consumer
          if (videoConsumer && videoConsumer.producerId) {
            console.log('Creating video consumer with producerId:', videoConsumer.producerId);
            try {
              videoConsumerRef = await consumerTransport.consume({
                id: videoConsumer.id,
                producerId: videoConsumer.producerId,
                kind: videoConsumer.kind,
                rtpParameters: videoConsumer.rtpParameters
              });
              console.log('Video consumer created successfully:', videoConsumerRef);
              tracks.push(videoConsumerRef.track);
            } catch (error) {
              console.error('Error creating video consumer:', error);
            }
          }
          
          // Create audio consumer
          if (audioConsumer && audioConsumer.producerId) {
            console.log('Creating audio consumer with producerId:', audioConsumer.producerId);
            try {
              audioConsumerLocal = await consumerTransport.consume({
                id: audioConsumer.id,
                producerId: audioConsumer.producerId,
                kind: audioConsumer.kind,
                rtpParameters: audioConsumer.rtpParameters
              });
              console.log('Audio consumer created successfully:', audioConsumerLocal);
              
              // Ensure audio track is enabled
              if (audioConsumerLocal.track) {
                audioConsumerLocal.track.enabled = true;
                console.log('Audio track enabled:', audioConsumerLocal.track.enabled);
              }
              
              tracks.push(audioConsumerLocal.track);
            } catch (error) {
              console.error('Error creating audio consumer:', error);
            }
          }
          
          // Store consumers for cleanup
          consumerRef.current = videoConsumerRef;
          audioConsumerRef.current = audioConsumerLocal;
          
              if (tracks.length > 0 && videoRef.current) {
                const stream = new MediaStream(tracks);
                console.log('Created MediaStream with tracks:', tracks.length);
                console.log('MediaStream tracks:', stream.getTracks());
                console.log('Video tracks:', stream.getVideoTracks());
                console.log('Audio tracks:', stream.getAudioTracks());
                
                // Simplified track handling
            
            // Log audio track details
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
              console.log('Audio track details:', audioTracks.map(track => ({
                id: track.id,
                kind: track.kind,
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
                label: track.label
              })));
              setHasAudio(true);
            } else {
              console.warn('No audio tracks found in stream!');
              setHasAudio(false);
            }
            
            // Set connection status to true since we have a valid stream
            setIsConnected(true);
            
            if (videoRef.current) {
              try {
                videoRef.current.srcObject = stream;
                console.log('Assigned stream to video element');
                console.log('Stream tracks:', stream.getTracks().length);
                console.log('Video element ready state:', videoRef.current.readyState);
              } catch (error) {
                console.error('Error assigning stream to video element:', error);
                setError('Gagal mengaitkan stream ke video element');
              }
            }
            
            // Start network monitoring for adaptive bitrate
            startNetworkMonitoring();
            
            // Set stream start time for delay monitoring
            setStreamStartTime(Date.now());
            
            // Start periodic buffer reset to prevent delay accumulation
            startBufferReset();
            
            // Wait a bit for the stream to be ready
            setTimeout(() => {
              if (videoRef.current) {
                // Ensure audio is not muted
                videoRef.current.muted = false;
                videoRef.current.volume = 1.0;
                
                // Optimize video element for low latency
                // Note: webkitVideoDecodedByteCount is read-only, cannot be set
                
                videoRef.current.play().then(() => {
                  console.log('Video started playing successfully');
                  console.log('Audio enabled:', !videoRef.current?.muted);
                  console.log('Volume:', videoRef.current?.volume);
                  console.log('Video dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
                  
                  // Reset buffer to prevent delay
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                  }
                  
                  // Additional audio verification
                  const srcObject = videoRef.current?.srcObject;
                  if (srcObject && 'getAudioTracks' in srcObject) {
                    const audioTracks = (srcObject as MediaStream).getAudioTracks();
                    if (audioTracks && audioTracks.length > 0) {
                      console.log('Audio tracks in video element:', audioTracks.length);
                      audioTracks.forEach((track: MediaStreamTrack, index: number) => {
                        console.log(`Audio track ${index}:`, {
                          enabled: track.enabled,
                          muted: track.muted,
                          readyState: track.readyState
                        });
                      });
                    } else {
                      console.warn('No audio tracks found in video element!');
                    }
                  } else {
                    console.warn('No audio tracks found in video element!');
                  }
                }).catch((error) => {
                  console.error('Error playing video:', error);
                  console.log('Trying to play with user interaction...');
                  // If autoplay fails, try to play on user interaction
                  const playButton = document.createElement('button');
                  playButton.textContent = 'Klik untuk memutar video';
                  playButton.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #2563EB;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    z-index: 1000;
                  `;
                  playButton.onclick = () => {
                    if (videoRef.current) {
                      videoRef.current.play().then(() => {
                        console.log('Video started playing after user interaction');
                        playButton.remove();
                      }).catch(err => {
                        console.error('Still failed to play:', err);
                      });
                    }
                  };
                  const videoElement = videoRef.current;
                  if (videoElement && videoElement.parentElement) {
                    videoElement.parentElement.appendChild(playButton);
                  }
                });
              }
            }, 500);
          } else if (videoConsumer && !videoConsumer.producerId) {
            console.log('Video consumer found but missing producerId');
            setError('Error: Video consumer tidak memiliki producerId. Silakan coba lagi.');
          } else if (!videoConsumer) {
            console.log('No video producer available');
            setError('Admin belum memulai streaming video. Silakan tunggu atau hubungi admin.');
          } else {
            setError('Gagal mengonsumsi stream.');
          }
        } else {
          console.error('Consume error:', consumeParams?.error);
          setError('Gagal mengonsumsi stream: ' + (consumeParams?.error || 'Unknown error'));
        }
      });
      
      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from MediaSoup server');
        setIsConnected(false);
        setError('Koneksi ke server terputus. Mencoba menyambung kembali...');
        
        // Attempt to reconnect
        setTimeout(() => {
          if (streamId) {
            console.log('Attempting to reconnect...');
            connectToStream();
          }
        }, 3000);
      });
      
      // Listen for new producers
      socketRef.current.on('newProducer', async ({ roomId, kind }: any) => {
        console.log('New producer detected:', { roomId, kind });
        if (roomId === streamId && deviceRef.current) {
          // Try to consume the new producer (both video and audio)
          try {
            const consumeParams: any = await new Promise((resolve) => {
              socketRef.current.emit('consume', { 
                transportId: consumerTransportRef.current.id,
                rtpCapabilities: deviceRef.current.rtpCapabilities,
                roomId: streamId 
              }, resolve);
            });
            
            if (consumeParams && !consumeParams.error) {
              const consumers = Array.isArray(consumeParams) ? consumeParams : [consumeParams];
              const videoConsumer = consumers.find(c => c.kind === 'video');
              const audioConsumer = consumers.find(c => c.kind === 'audio');
              
              const tracks = [];
              
              // Create video consumer if not exists
              if (videoConsumer && !consumerRef.current) {
                const videoConsumerRef = await consumerTransportRef.current.consume({
                  id: videoConsumer.id,
                  producerId: videoConsumer.producerId,
                  kind: videoConsumer.kind,
                  rtpParameters: videoConsumer.rtpParameters
                });
                consumerRef.current = videoConsumerRef;
                tracks.push(videoConsumerRef.track);
              }
              
              // Create audio consumer if not exists
              if (audioConsumer) {
                const audioConsumerRef = await consumerTransportRef.current.consume({
                  id: audioConsumer.id,
                  producerId: audioConsumer.producerId,
                  kind: audioConsumer.kind,
                  rtpParameters: audioConsumer.rtpParameters
                });
                tracks.push(audioConsumerRef.track);
              }
              
              if (tracks.length > 0 && videoRef.current) {
                const stream = new MediaStream(tracks);
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(console.error);
                console.log('Updated stream with new producer:', kind);
              }
            }
          } catch (err) {
            console.error('Error consuming new producer:', err);
          }
        }
      });
      
    } catch (err) {
      console.error('Error connecting to stream:', err);
      setError('Gagal terhubung ke live stream. Pastikan admin sedang streaming dan coba lagi.');
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return COLORS.green;
      case 'ended':
        return COLORS.subtext;
      case 'recording':
        return COLORS.red;
      default:
        return COLORS.subtext;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'LIVE';
      case 'ended':
        return 'BERAKHIR';
      case 'recording':
        return 'RECORDING';
      default:
        return 'TIDAK DIKETAHUI';
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: COLORS.bg,
        fontFamily: FONT_FAMILY,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: `4px solid ${COLORS.border}`,
            borderTop: `4px solid ${COLORS.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <div style={{ fontSize: '18px', color: COLORS.text, fontWeight: 500 }}>
            Memuat live stream...
          </div>
        </div>
      </div>
    );
  }

  if (error || !streamData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: COLORS.bg,
        fontFamily: FONT_FAMILY,
      }}>
        <div style={{
          background: COLORS.white,
          borderRadius: CARD_RADIUS,
          padding: '48px',
          textAlign: 'center',
          boxShadow: SHADOW,
          maxWidth: '500px',
          margin: '0 20px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>📺</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 600,
            color: COLORS.text,
            margin: '0 0 16px 0'
          }}>
            Live Stream Tidak Tersedia
          </h1>
          <p style={{
            fontSize: '16px',
            color: COLORS.subtext,
            margin: '0 0 24px 0',
            lineHeight: 1.5
          }}>
            {error || 'Live stream yang Anda cari tidak ditemukan atau sudah berakhir.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: COLORS.primary,
                color: COLORS.white,
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = COLORS.primaryDark}
              onMouseOut={e => e.currentTarget.style.background = COLORS.primary}
            >
              🔄 Coba Lagi
            </button>
            <button
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  if (streamData?.status === 'active') {
                    console.log('Manual retry: attempting WebRTC connection...');
                    await connectToStream();
                  } else {
                    console.log('Manual retry: fetching stream data...');
                    await fetchStreamData();
                  }
                } catch (err) {
                  console.error('Manual retry failed:', err);
                  setError('Gagal terhubung ke stream. Silakan coba lagi.');
                } finally {
                  setLoading(false);
                }
              }}
              style={{
                background: COLORS.green,
                color: COLORS.white,
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#16a34a'}
              onMouseOut={e => e.currentTarget.style.background = COLORS.green}
            >
              📡 Hubungkan ke Stream
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: FONT_FAMILY,
      color: COLORS.text,
    }}>
      {/* Header */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '16px 20px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            background: getStatusColor(streamData.status),
            color: COLORS.white,
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: COLORS.white,
              animation: streamData.status === 'active' ? 'pulse 1s infinite' : 'none'
            }} />
            {getStatusText(streamData.status)}
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div
        ref={containerRef}
        style={{
          paddingTop: '80px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: '#ffffff'
        }}
      >
        {streamData.status === 'active' ? (
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '1200px',
            aspectRatio: '16/9',
            background: '#000',
            borderRadius: isFullscreen ? '0' : '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Live Stream Video */}
            <video
              ref={videoRef}
              autoPlay
              controls
              playsInline
              muted={false}
              preload="none"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              // Low latency optimizations
              onLoadedData={() => {
                // Reset buffer to prevent delay
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  // Set low latency buffer settings
                  // Note: webkitVideoDecodedByteCount is read-only, cannot be set
                }
              }}
              onError={(e) => {
                console.error('Video load error:', e);
                setError('Gagal memuat video live stream');
              }}
              onLoadedMetadata={() => {
                console.log('Video metadata loaded');
              }}
              onCanPlay={() => {
                console.log('Video can play');
              }}
              onPlay={() => {
                console.log('Video started playing');
              }}
              onPause={() => {
                console.log('Video paused');
              }}
              onWaiting={() => {
                console.log('Video buffering...');
              }}
              onStalled={() => {
                console.log('Video stalled');
              }}
              onSuspend={() => {
                console.log('Video suspended');
              }}
              onAbort={() => {
                console.log('Video aborted');
                setError('Video stream terputus. Mencoba menyambung kembali...');
                // Attempt to reconnect
                setTimeout(() => {
                  if (streamId) {
                    connectToStream();
                  }
                }, 2000);
              }}
            >
              Browser Anda tidak mendukung video player.
            </video>
            
            {/* Connection Status */}
            {!isConnected && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255, 255, 255, 0.95)',
                color: COLORS.text,
                padding: '20px',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>🔄</div>
                <div>Menghubungkan ke live stream...</div>
                <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                  Pastikan admin sedang streaming
                </div>
              </div>
            )}

            {/* Live Indicator */}
            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: COLORS.red,
              color: COLORS.white,
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: COLORS.white,
                animation: 'pulse 1s infinite'
              }} />
              LIVE
            </div>

            {/* Viewers Count */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(0, 0, 0, 0.7)',
              color: COLORS.white,
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 500
              }}>
                👥 {viewers} penonton
              </div>
          </div>
        ) : (streamData.status === 'ended' || streamData.status === 'recording') && streamData.recordingPath ? (
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '1200px',
            aspectRatio: '16/9',
            background: '#000',
            borderRadius: isFullscreen ? '0' : '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)'
          }}>
            <video
              ref={videoRef}
              controls
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
              src={`${API_URL}${streamData.recordingPath}`}
              onError={(e) => {
                console.error('Video load error:', e);
                setError('Gagal memuat recording');
              }}
            >
              Browser Anda tidak mendukung video player.
            </video>

            <div style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: COLORS.subtext,
              color: COLORS.white,
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 600
            }}>
              BERAKHIR
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px',
            background: '#f8f9fa',
            borderRadius: '12px',
            color: COLORS.subtext,
            fontSize: '18px',
            border: '1px solid #e5e7eb'
          }}>
            Live stream sudah berakhir dan tidak ada recording tersedia
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        background: 'rgba(248, 249, 250, 0.95)',
        padding: '20px',
        textAlign: 'center',
        color: COLORS.subtext,
        fontSize: '14px',
        borderTop: '1px solid #e5e7eb'
      }}>
        <p style={{ margin: '0 0 8px 0' }}>
          Powered by Umalo
        </p>
        <p style={{ margin: 0, fontSize: '12px' }}>
          © 2025 - Semua hak dilindungi
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Stream Ended Modal */}
      {showStreamEndedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: COLORS.white,
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              📺
            </div>
            
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: COLORS.text,
              margin: '0 0 16px 0'
            }}>
              Livestream Berakhir
            </h2>
            
            <p style={{
              fontSize: '16px',
              color: COLORS.subtext,
              margin: '0 0 24px 0',
              lineHeight: '1.5'
            }}>
              Admin telah mengakhiri livestream. Terima kasih telah menonton!
            </p>
            
            <div style={{
              display: 'flex',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  setShowStreamEndedModal(false);
                  // Refresh the page to show recording if available
                  window.location.reload();
                }}
                style={{
                  background: COLORS.primary,
                  color: COLORS.text,
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 32px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = COLORS.primaryDark;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = COLORS.primary;
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewerPage;
