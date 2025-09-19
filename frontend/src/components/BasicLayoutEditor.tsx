import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaArrowsAlt, FaExpand, FaTimes } from 'react-icons/fa';

interface CameraLayout {
  id: string;
  deviceId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  enabled: boolean;
}

interface BasicLayoutEditorProps {
  cameras: Array<{ deviceId: string; label: string }>;
  onLayoutChange: (layouts: CameraLayout[]) => void;
  onClose?: () => void;
  initialLayouts?: CameraLayout[];
}

const BasicLayoutEditor: React.FC<BasicLayoutEditorProps> = ({
  cameras,
  onLayoutChange,
  onClose,
  initialLayouts
}) => {
  const [layouts, setLayouts] = useState<CameraLayout[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingItem, setResizingItem] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [videoElements, setVideoElements] = useState<{ [deviceId: string]: HTMLVideoElement }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastLayoutRef = useRef<string>('');

  // Initialize layouts when cameras or initialLayouts change
  useEffect(() => {
    if (cameras.length === 0) return;
    
    console.log('BasicLayoutEditor: cameras received:', cameras.length, cameras);
    console.log('BasicLayoutEditor: initialLayouts:', initialLayouts);
    
    // Use initialLayouts if provided and matches camera count, otherwise create default layout
    if (initialLayouts && initialLayouts.length > 0 && initialLayouts.length === cameras.length) {
      console.log('BasicLayoutEditor: Using initialLayouts with', initialLayouts.length, 'cameras');
      setLayouts(initialLayouts);
    } else {
      console.log('BasicLayoutEditor: Creating default layout for', cameras.length, 'cameras');
      const defaultLayouts: CameraLayout[] = cameras.map((camera, index) => {
        let x = 0, y = 0, width = 0, height = 0;
        
        if (cameras.length === 1) {
          x = 0; y = 0; width = 100; height = 100;
        } else if (cameras.length === 2) {
          x = index * 50; y = 0; width = 50; height = 100;
        } else if (cameras.length === 3) {
          if (index === 0) {
            x = 0; y = 0; width = 50; height = 100;
          } else {
            x = 50; y = (index - 1) * 50; width = 50; height = 50;
          }
        } else if (cameras.length === 4) {
          x = (index % 2) * 50; y = Math.floor(index / 2) * 50; width = 50; height = 50;
        }

        return {
          id: `camera-${camera.deviceId}`,
          deviceId: camera.deviceId,
          label: camera.label,
          x, y, width, height,
          zIndex: index,
          enabled: true
        };
      });

      setLayouts(defaultLayouts);
    }
  }, [cameras.length, initialLayouts]);

  // Initialize video elements
  useEffect(() => {
    const initializeVideos = async () => {
      // Clean up existing videos first
      Object.values(videoElements).forEach(video => {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
        if (video.parentNode === document.body) {
          document.body.removeChild(video);
        }
      });
      
      const newVideoElements: { [deviceId: string]: HTMLVideoElement } = {};
      
      for (const camera of cameras) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: camera.deviceId } },
            audio: false
          });
          
          const video = document.createElement('video');
          video.srcObject = stream;
          video.autoplay = true;
          video.muted = true;
          video.style.display = 'none';
          document.body.appendChild(video);
          
          newVideoElements[camera.deviceId] = video;
        } catch (error) {
          console.error(`Error initializing camera ${camera.deviceId}:`, error);
        }
      }
      
      setVideoElements(newVideoElements);
    };

    if (cameras.length > 0) {
      initializeVideos();
    }

    // Cleanup
    return () => {
      Object.values(videoElements).forEach(video => {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
        if (video.parentNode === document.body) {
          document.body.removeChild(video);
        }
      });
    };
  }, [cameras.length]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each camera layout (only enabled ones)
    layouts.filter(layout => layout.enabled).forEach(layout => {
      const video = videoElements[layout.deviceId];
      if (!video || video.readyState < 2) return;

      const x = (layout.x / 100) * canvas.width;
      const y = (layout.y / 100) * canvas.height;
      const width = (layout.width / 100) * canvas.width;
      const height = (layout.height / 100) * canvas.height;

      try {
        // Draw video frame
        ctx.drawImage(video, x, y, width, height);

        // Draw border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Draw label background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, width, 30);

        // Draw label text
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText(layout.label, x + 10, y + 20);
      } catch (error) {
        console.error(`Error drawing camera ${layout.deviceId}:`, error);
      }
    });
  }, [layouts, videoElements]);

  // Update canvas with interval
  useEffect(() => {
    const interval = setInterval(() => {
      drawCanvas();
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [drawCanvas]);

  // Notify parent only when layouts actually change
  useEffect(() => {
    if (layouts.length > 0) {
      const layoutString = JSON.stringify(layouts);
      // Only call onLayoutChange if layout actually changed
      if (lastLayoutRef.current !== layoutString) {
        lastLayoutRef.current = layoutString;
        // Use setTimeout to prevent setState during render
        setTimeout(() => {
          onLayoutChange(layouts);
        }, 0);
        // Auto-save to localStorage when layout changes
        localStorage.setItem('cameraLayout', layoutString);
      }
    }
  }, [layouts.length]); // Only depend on length to prevent infinite loop

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent, itemId: string, action: 'drag' | 'resize') => {
    e.preventDefault();
    
    if (action === 'drag') {
      setDraggedItem(itemId);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const item = layouts.find(l => l.id === itemId);
        if (item) {
          setDragOffset({
            x: e.clientX - rect.left - (item.x / 100) * rect.width,
            y: e.clientY - rect.top - (item.y / 100) * rect.height
          });
        }
      }
    } else if (action === 'resize') {
      setResizingItem(itemId);
      const item = layouts.find(l => l.id === itemId);
      if (item) {
        setResizeStart({
          x: e.clientX,
          y: e.clientY,
          width: item.width,
          height: item.height
        });
      }
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    if (draggedItem) {
      const newX = Math.max(0, Math.min(100 - layouts.find(l => l.id === draggedItem)!.width, 
        ((e.clientX - rect.left - dragOffset.x) / containerWidth) * 100));
      const newY = Math.max(0, Math.min(100 - layouts.find(l => l.id === draggedItem)!.height, 
        ((e.clientY - rect.top - dragOffset.y) / containerHeight) * 100));

      setLayouts(prev => prev.map(layout => 
        layout.id === draggedItem 
          ? { ...layout, x: newX, y: newY }
          : layout
      ));
    }

    if (resizingItem) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(10, Math.min(100 - layouts.find(l => l.id === resizingItem)!.x, 
        resizeStart.width + (deltaX / containerWidth) * 100));
      const newHeight = Math.max(10, Math.min(100 - layouts.find(l => l.id === resizingItem)!.y, 
        resizeStart.height + (deltaY / containerHeight) * 100));

      setLayouts(prev => prev.map(layout => 
        layout.id === resizingItem 
          ? { ...layout, width: newWidth, height: newHeight }
          : layout
      ));
    }
  }, [draggedItem, dragOffset, resizingItem, resizeStart, layouts]);

  const handleMouseUp = useCallback(() => {
    setDraggedItem(null);
    setResizingItem(null);
  }, []);

  // Add global mouse event listeners
  useEffect(() => {
    if (draggedItem || resizingItem) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedItem, resizingItem, handleMouseMove, handleMouseUp]);

  const bringToFront = (itemId: string) => {
    const maxZ = Math.max(...layouts.map(l => l.zIndex));
    setLayouts(prev => prev.map(layout => 
      layout.id === itemId 
        ? { ...layout, zIndex: maxZ + 1 }
        : layout
    ));
  };

  const removeCamera = (itemId: string) => {
    setLayouts(prev => prev.filter(layout => layout.id !== itemId));
  };

  const toggleCamera = (itemId: string) => {
    setLayouts(prev => prev.map(layout => 
      layout.id === itemId 
        ? { ...layout, enabled: !layout.enabled }
        : layout
    ));
  };

  const resetLayout = () => {
    const resetLayouts: CameraLayout[] = cameras.map((camera, index) => {
      let x = 0, y = 0, width = 0, height = 0;
      
      if (cameras.length === 1) {
        x = 0; y = 0; width = 100; height = 100;
      } else if (cameras.length === 2) {
        x = index * 50; y = 0; width = 50; height = 100;
      } else if (cameras.length === 3) {
        if (index === 0) {
          x = 0; y = 0; width = 50; height = 100;
        } else {
          x = 50; y = (index - 1) * 50; width = 50; height = 50;
        }
      } else if (cameras.length === 4) {
        x = (index % 2) * 50; y = Math.floor(index / 2) * 50; width = 50; height = 50;
      }

      return {
        id: `camera-${camera.deviceId}`,
        deviceId: camera.deviceId,
        label: camera.label,
        x, y, width, height,
        zIndex: index,
        enabled: true
      };
    });
    setLayouts(resetLayouts);
  };

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '800px', 
      margin: '0 auto', 
      backgroundColor: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '16px', 
        borderBottom: '1px solid #e5e7eb' 
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'black', margin: 0 }}>
          Atur Layout Kamera
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              padding: '8px 12px', 
              fontSize: '14px', 
              color: 'black', 
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FaTimes style={{ fontSize: '14px' }} />
            Tutup
          </button>
        )}
      </div>

      {/* Instructions */}
      <div style={{ 
        padding: '16px', 
        backgroundColor: '#f9fafb', 
        borderBottom: '1px solid #e5e7eb' 
      }}>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          Drag kamera untuk mengatur posisi, tarik sudut kanan bawah untuk resize. Double-click untuk bring to front.
        </p>
      </div>

      {/* Layout Container */}
      <div 
        ref={containerRef}
        style={{ 
          position: 'relative', 
          width: '100%', 
          aspectRatio: '16/9',
          backgroundColor: '#000',
          overflow: 'hidden'
        }}
      >
        {/* Canvas for video preview */}
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />

        {/* Overlay Controls */}
        {layouts.map(layout => (
          <div
            key={layout.id}
            style={{
              position: 'absolute',
              left: `${layout.x}%`,
              top: `${layout.y}%`,
              width: `${layout.width}%`,
              height: `${layout.height}%`,
              border: '2px solid transparent',
              cursor: draggedItem === layout.id ? 'grabbing' : 'grab',
              zIndex: layout.zIndex + 1000
            }}
            onMouseDown={(e) => handleMouseDown(e, layout.id, 'drag')}
            onDoubleClick={() => bringToFront(layout.id)}
          >
            {/* Resize Handle */}
            <div
              style={{
                position: 'absolute',
                bottom: '-5px',
                right: '-5px',
                width: '10px',
                height: '10px',
                backgroundColor: '#3b82f6',
                border: '2px solid white',
                borderRadius: '2px',
                cursor: 'nw-resize'
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, layout.id, 'resize');
              }}
            />

            {/* Camera Controls */}
            <div
              style={{
                position: 'absolute',
                top: '-30px',
                left: '0',
                display: 'flex',
                gap: '4px',
                opacity: 0,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
            >
              <button
                onClick={() => bringToFront(layout.id)}
                style={{
                  padding: '4px',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
                title="Bring to Front"
              >
                <FaExpand />
              </button>
              <button
                onClick={() => removeCamera(layout.id)}
                style={{
                  padding: '4px',
                  backgroundColor: 'rgba(239,68,68,0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
                title="Remove Camera"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Camera Selection */}
      <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'black', margin: '0 0 12px 0' }}>
          Pilih Kamera yang Aktif
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          {layouts.map(layout => (
            <label key={layout.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 12px',
              backgroundColor: layout.enabled ? '#f0f9ff' : '#f9fafb',
              border: `1px solid ${layout.enabled ? '#3b82f6' : '#d1d5db'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: layout.enabled ? '#1e40af' : '#6b7280'
            }}>
              <input
                type="checkbox"
                checked={layout.enabled}
                onChange={() => toggleCamera(layout.id)}
                style={{ 
                  width: '16px', 
                  height: '16px',
                  accentColor: '#3b82f6'
                }}
              />
              <span style={{ fontWeight: layout.enabled ? '500' : '400' }}>
                {layout.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Layout Info */}
      <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              {layouts.filter(layout => layout.enabled).length} dari {layouts.length} kamera aktif
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={resetLayout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: 'black',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Reset Layout
            </button>
            <button
              onClick={() => {
                // Save layout to localStorage
                localStorage.setItem('cameraLayout', JSON.stringify(layouts));
                // Explicitly call onLayoutChange to ensure parent gets updated
                onLayoutChange(layouts);
                // Show success message with better UX
                const button = document.activeElement as HTMLButtonElement;
                const originalText = button.innerHTML;
                button.innerHTML = '✅ Tersimpan!';
                button.style.backgroundColor = '#059669';
                setTimeout(() => {
                  button.innerHTML = originalText;
                  button.style.backgroundColor = '#10b981';
                }, 2000);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
            >
              💾 Simpan Layout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicLayoutEditor;
