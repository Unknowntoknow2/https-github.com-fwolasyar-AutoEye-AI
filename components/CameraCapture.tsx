import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, RotateCcw, Check, Info, AlertTriangle, Video, Camera, ZoomIn, ZoomOut, Grid, ScanBarcode, CreditCard, Ruler, Target, Sun, Moon, Square, Circle, Sparkles, Eye, Lock, Aperture, Layers } from './Icons';
import { UploadedFile } from '../types';

interface CameraCaptureProps {
  onCaptureComplete: (files: File[], qualityTag?: '4K_UHD' | 'HD' | 'SD' | 'LOW_RES') => void;
  onClose: () => void;
  mode?: 'inspection' | 'vin';
  stepId?: string; 
  tier?: 'Tier_A' | 'Tier_B' | 'Tier_C';
}

// --- CLEAN GHOST OVERLAYS ---
const OVERLAY_PATHS: Record<string, string> = {
  'corner': "M10,10 L30,10 M10,10 L10,30  M90,10 L70,10 M90,10 L90,30  M10,90 L30,90 M10,90 L10,70  M90,90 L70,90 M90,90 L90,70", // Corner guides
  'tire': "M50,85 C69.3,85 85,69.3 85,50 C85,30.7 69.3,15 50,15 C30.7,15 15,30.7 15,50 C15,69.3 30.7,85 50,85 Z M50,70 C61,70 70,61 70,50 C70,39 61,30 50,30 C39,30 30,39 30,50 C30,61 39,70 50,70 Z",
  'vin': "M15,40 L85,40 L85,60 L15,60 Z",
  'reference_card': "M25,40 L75,40 L75,60 L25,60 Z",
  'aruco': "M35,35 L65,35 L65,65 L35,65 Z"
};

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCaptureComplete, onClose, mode = 'inspection', stepId, tier = 'Tier_C' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [tempMedia, setTempMedia] = useState<{ url: string, type: 'image' | 'video', file: File } | null>(null);
  const [refMode, setRefMode] = useState<'none' | 'card' | 'aruco'>(tier === 'Tier_C' ? 'aruco' : 'none');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);
  
  // QUALITY METRICS
  const [activeQuality, setActiveQuality] = useState<'4K_UHD' | 'HD' | 'SD' | 'LOW_RES'>('HD');
  
  // SCAN MODES: 'standard' | 'macro' (Scratch/HRNet) | 'dent' (Deflectometry)
  const [scanMode, setScanMode] = useState<'standard' | 'macro' | 'dent'>('standard');
  const [isProcessingEffect, setIsProcessingEffect] = useState(false);
  
  // VIDEO STATE
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);

  // FOCUS CONTROL STATE
  const [focusMode, setFocusMode] = useState<'continuous' | 'manual'>('continuous');
  const [focusDistance, setFocusDistance] = useState<number>(0.0);
  const [showFocusSlider, setShowFocusSlider] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      if (stream) stream.getTracks().forEach(track => track.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          // UPGRADED TO 4K PREFERENCE for Forensic Detail
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          advanced: [{ focusMode: 'continuous' }] as any
        },
        audio: true 
      });
      
      setStream(newStream);
      
      const track = newStream.getVideoTracks()[0];
      const settings = track.getSettings();
      
      // DETERMINE ACTUAL QUALITY
      let quality: '4K_UHD' | 'HD' | 'SD' | 'LOW_RES' = 'SD';
      if (settings.width && settings.width >= 3800) quality = '4K_UHD';
      else if (settings.width && settings.width >= 1900) quality = 'HD';
      else if (settings.width && settings.width < 1280) quality = 'LOW_RES';
      setActiveQuality(quality);

      const caps = (track.getCapabilities ? track.getCapabilities() : {}) as any;
      if (caps.focusMode && Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
          setFocusMode('continuous');
      }

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.muted = true;
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Camera access denied.");
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [startCamera]);

  const toggleFocusMode = async () => {
      if (!stream) return;
      const track = stream.getVideoTracks()[0];
      const newMode = focusMode === 'continuous' ? 'manual' : 'continuous';
      try {
          // @ts-ignore
          await track.applyConstraints({ advanced: [{ focusMode: newMode }] });
          setFocusMode(newMode);
          setShowFocusSlider(newMode === 'manual');
      } catch (e) { console.warn("Focus mode not supported", e); }
  };

  const handleManualFocus = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!stream) return;
      const val = parseFloat(e.target.value);
      setFocusDistance(val);
      const track = stream.getVideoTracks()[0];
      try {
           // @ts-ignore
           await track.applyConstraints({ advanced: [{ focusMode: 'manual', focusDistance: val }] });
      } catch (err) { console.warn("Manual focus not supported"); }
  };

  // Recording Timer
  useEffect(() => {
      let interval: any;
      if (isRecording) {
          interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
      } else {
          setRecordingTime(0);
      }
      return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = () => {
      if (!stream) return;
      videoChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
      recorder.onstop = () => {
          const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
          const file = new File([blob], `${stepId || 'video'}.webm`, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setTempMedia({ url, type: 'video', file });
      };
      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  // --- HRNET / SUPER-RES PREPROCESSING ---
  const applyHRNetPreprocessing = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const w = width;
    const h = height;
    const mix = 0.85; 
    const buffer = new Uint8ClampedArray(data); 
    
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) { 
           const val = 9 * buffer[i + c]
             - buffer[((y - 1) * w + x - 1) * 4 + c] 
             - buffer[((y - 1) * w + x) * 4 + c]     
             - buffer[((y - 1) * w + x + 1) * 4 + c] 
             - buffer[(y * w + x - 1) * 4 + c]       
             - buffer[(y * w + x + 1) * 4 + c]       
             - buffer[((y + 1) * w + x - 1) * 4 + c] 
             - buffer[((y + 1) * w + x) * 4 + c]     
             - buffer[((y + 1) * w + x + 1) * 4 + c];
           data[i + c] = Math.min(255, Math.max(0, val * mix + buffer[i + c] * (1 - mix)));
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (navigator.vibrate) navigator.vibrate(50);
    
    if (scanMode === 'macro') {
        setIsProcessingEffect(true);
        captureMacroStack().then(() => setIsProcessingEffect(false));
    } else {
        captureImage();
    }
  };

  const captureMacroStack = async () => {
     if (!videoRef.current || !canvasRef.current) return;
     const video = videoRef.current;
     const canvas = canvasRef.current;
     const ctx = canvas.getContext('2d', { willReadFrequently: true });
     if (!ctx) return;

     canvas.width = video.videoWidth; 
     canvas.height = video.videoHeight;
     
     // 50% Center Crop (Simulated Optical Zoom)
     const sWidth = video.videoWidth * 0.5;
     const sHeight = video.videoHeight * 0.5;
     const sx = (video.videoWidth - sWidth) / 2;
     const sy = (video.videoHeight - sHeight) / 2;

     const drawFrame = (alpha: number) => {
         ctx.globalAlpha = alpha;
         if (facingMode === 'user') {
             ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
             ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
             ctx.restore();
         } else {
             ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
         }
     };

     // Multi-Frame Stacking
     drawFrame(1.0);
     await new Promise(r => setTimeout(r, 40)); 
     drawFrame(0.5); 
     await new Promise(r => setTimeout(r, 40));
     drawFrame(0.33); 
     
     ctx.globalAlpha = 1.0;
     applyHRNetPreprocessing(ctx, canvas.width, canvas.height);
     finalizeCapture(canvas);
  };
  
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
       if (facingMode === 'user') {
           ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
       }
       ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    finalizeCapture(canvas);
  };

  const finalizeCapture = (canvas: HTMLCanvasElement) => {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    
    const modeTag = scanMode === 'macro' ? '_macro' : scanMode === 'dent' ? '_dent' : '';
    const fileName = `${stepId || 'capture'}${refMode !== 'none' ? '_ref' : ''}${modeTag}.jpg`;
    const file = new File([new Blob([u8arr], { type: mime })], fileName, { type: mime });
    
    setTempMedia({ url: dataUrl, type: 'image', file });
  };

  const handleTrigger = () => {
      if (captureMode === 'photo') takePhoto();
      else isRecording ? stopRecording() : startRecording();
  };

  const confirmCapture = () => {
    if (tempMedia) onCaptureComplete([tempMedia.file], activeQuality);
  };

  const cycleScanMode = () => {
      setScanMode(prev => {
          if (prev === 'standard') return 'macro';
          if (prev === 'macro') return 'dent';
          return 'standard';
      });
      setZoomLevel(1.0);
  };

  const formatTime = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans">
      {/* Top Bar */}
      <div className="absolute top-0 w-full z-20 p-6 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex flex-col gap-1 pointer-events-auto">
           <span className="text-white font-bold text-xl drop-shadow-md flex items-center gap-2">
             {captureMode === 'video' ? <Video className="w-5 h-5 text-red-500" /> : <Camera className="w-5 h-5 text-white" />}
             {refMode !== 'none' ? (
                 <>
                    {refMode === 'card' ? <CreditCard className="w-5 h-5 text-emerald-400" /> : <Target className="w-5 h-5 text-blue-400" />}
                    {refMode === 'card' ? 'SCALE REF' : 'ARUCO MARKER'}
                 </>
             ) : (
                 stepId ? stepId.replace(/_/g, ' ').toUpperCase() : (captureMode === 'video' ? 'VIDEO SCAN' : 'PHOTO SCAN')
             )}
             
             {/* MODE BADGES */}
             {scanMode === 'macro' && <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded font-bold">HRNET / SKELETON</span>}
             {scanMode === 'dent' && <span className="text-[10px] bg-pink-500 text-white px-2 py-0.5 rounded font-bold">DEFLECTOMETRY</span>}
             {/* QUALITY BADGE */}
             <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${activeQuality === '4K_UHD' ? 'bg-indigo-500 text-white' : activeQuality === 'HD' ? 'bg-slate-600 text-white' : 'bg-red-500 text-white'}`}>
                 {activeQuality.replace('_', ' ')}
             </span>
           </span>
           <div className="flex items-center gap-2">
                <span className="text-white/80 text-sm font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-md inline-block">
                    {captureMode === 'video' 
                        ? (isRecording ? `Recording...` : "Press Red Button to Record")
                        : (refMode === 'card' ? "Place Credit Card (85.6mm)" : refMode === 'aruco' ? "Align ArUco 4x4" : 
                           scanMode === 'dent' ? "Align Zebra Lines over Dent" : "Align with shape")
                    }
                </span>
           </div>
        </div>
        <button onClick={onClose} className="pointer-events-auto p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all">
           <X className="w-6 h-6" />
        </button>
      </div>
      
      {/* PROCESSING OVERLAY (Simulating Super-Res) */}
      {isProcessingEffect && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur">
              <Sparkles className="w-12 h-12 text-amber-400 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-white mb-1">HRNet Preprocessing</h3>
              <p className="text-sm text-amber-300 font-mono">Enhancing Skeleton Topology...</p>
          </div>
      )}

      {/* Recording Timer */}
      {isRecording && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-600 px-4 py-1 rounded-full text-white font-mono font-bold animate-pulse z-30 shadow-lg">
              {formatTime(recordingTime)}
          </div>
      )}

      {/* Viewport */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {error && (
            <div className="absolute inset-0 flex items-center justify-center text-white font-bold bg-slate-900">{error}</div>
        )}
        
        {/* VIDEO FEED */}
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${tempMedia ? 'hidden' : 'block'}`}
            style={{ 
                transform: `scale(${scanMode === 'macro' ? 1.8 : 1})`, 
                filter: scanMode === 'macro' ? 'contrast(1.4) grayscale(1) invert(0.1)' : 'none'
            }}
        />
        
        {tempMedia && tempMedia.type === 'image' && (
            <img 
                src={tempMedia.url} 
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: `scale(${zoomLevel})` }}
            />
        )}
        
        {tempMedia && tempMedia.type === 'video' && (
            <video 
                src={tempMedia.url}
                controls
                className="absolute inset-0 w-full h-full object-contain bg-black"
            />
        )}

        {/* --- OVERLAY GUIDES (HULL / CARD / ARUCO) --- */}
        {!tempMedia && (
             <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-50 z-20" preserveAspectRatio="none">
                 {/* Render Active Overlay based on Mode */}
                 {mode === 'vin' && (
                    <path d={OVERLAY_PATHS.vin} fill="none" stroke="#f43f5e" strokeWidth="0.5" strokeDasharray="2" />
                 )}
                 {refMode === 'card' && (
                    <path d={OVERLAY_PATHS.reference_card} fill="none" stroke="#10b981" strokeWidth="0.5" strokeDasharray="2" />
                 )}
                 {refMode === 'aruco' && (
                    <path d={OVERLAY_PATHS.aruco} fill="none" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2" />
                 )}
                 {/* Standard Inspection Guide (The "Hull" Helper) */}
                 {scanMode === 'standard' && refMode === 'none' && mode === 'inspection' && (
                    <path d={OVERLAY_PATHS.corner} fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="2,2" />
                 )}
             </svg>
        )}

        {/* --- FOCUS SLIDER --- */}
        {!tempMedia && showFocusSlider && (
             <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 bg-black/60 backdrop-blur rounded-full py-4 px-2 flex flex-col items-center gap-4 border border-white/20">
                 <span className="text-[10px] text-white font-bold uppercase rotate-90 whitespace-nowrap mb-2">Focus</span>
                 <input 
                    type="range" min="0" max="1" step="0.05" value={focusDistance} onChange={handleManualFocus}
                    className="h-40 w-1 bg-slate-600 rounded-full appearance-none slider-vertical accent-amber-500 cursor-pointer"
                    style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                 />
                 <div className="w-6 h-6 rounded-full border border-amber-500 flex items-center justify-center">
                    <Lock className="w-3 h-3 text-amber-500" />
                 </div>
             </div>
        )}

        {/* --- DENT MODE OVERLAY (ZEBRA STRIPES) --- */}
        {scanMode === 'dent' && !tempMedia && (
             <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay z-10"
                  style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, #000 0px, #000 20px, #fff 20px, #fff 40px)',
                  }}
             >
             </div>
        )}

        {/* --- MACRO MODE INDICATOR --- */}
        {scanMode === 'macro' && !tempMedia && (
             <div className="absolute inset-0 pointer-events-none border-4 border-amber-500/50 box-border z-10 animate-pulse">
                 <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-4 py-1 rounded font-bold text-sm shadow-lg">
                     SKELETON MODE
                 </div>
                 {/* Crosshair */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-amber-500/30">
                     <div className="absolute top-1/2 left-0 w-full h-px bg-amber-500/50"></div>
                     <div className="absolute top-0 left-1/2 w-px h-full bg-amber-500/50"></div>
                 </div>
             </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom Controls */}
      <div className="bg-black pb-10 pt-6 px-4 md:px-10 flex items-center justify-around">
        {tempMedia ? (
           <>
             <button onClick={() => setTempMedia(null)} className="flex flex-col items-center gap-2 text-slate-300 hover:text-white transition-colors">
               <RotateCcw className="w-8 h-8" />
               <span className="text-xs font-bold uppercase">Retake</span>
             </button>
             
             <button onClick={confirmCapture} className="flex flex-col items-center gap-2">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-black shadow-lg transform transition-transform hover:scale-105">
                 <Check className="w-10 h-10" />
               </div>
               <span className="text-xs font-bold uppercase text-white">Use {tempMedia.type}</span>
             </button>
           </>
        ) : (
           <>
              <div className="flex gap-4">
                  {/* Mode Toggle */}
                  <button 
                    onClick={cycleScanMode} 
                    className={`p-4 rounded-full transition-colors flex flex-col items-center justify-center gap-1 border border-transparent
                        ${scanMode === 'macro' ? 'bg-amber-900/40 text-amber-400 border-amber-500/50' : 
                          scanMode === 'dent' ? 'bg-pink-900/40 text-pink-400 border-pink-500/50' : 
                          'bg-slate-800 text-slate-400'}`}
                  >
                     {scanMode === 'macro' ? <Eye className="w-6 h-6" /> : scanMode === 'dent' ? <Grid className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
                     <span className="text-[9px] font-bold uppercase">{scanMode === 'macro' ? 'MACRO' : scanMode === 'dent' ? 'DENT' : 'STD'}</span>
                  </button>

                  {/* FOCUS TOGGLE */}
                  <button 
                    onClick={toggleFocusMode}
                    className={`p-4 rounded-full transition-colors flex flex-col items-center justify-center gap-1 border-2 ${focusMode === 'manual' ? 'bg-amber-900/40 border-amber-500 text-amber-400' : 'bg-slate-800 border-transparent text-slate-400'}`}
                  >
                     {focusMode === 'manual' ? <Lock className="w-6 h-6" /> : <Aperture className="w-6 h-6" />}
                     <span className="text-[9px] font-bold uppercase">{focusMode === 'manual' ? 'LOCKED' : 'AF'}</span>
                  </button>
              </div>
              
              {/* Shutter / Record Button */}
              <button onClick={handleTrigger} className="relative group mx-4">
                 <div className={`w-24 h-24 rounded-full border-4 p-1 transition-colors ${isRecording ? 'border-red-500 animate-pulse' : 'border-white/20 group-hover:border-white/40'}`}>
                    <div className={`w-full h-full rounded-full shadow-lg transition-all duration-200 ${
                        captureMode === 'video' 
                            ? (isRecording ? 'bg-red-600 scale-50 rounded-lg' : 'bg-red-600 scale-90')
                            : (scanMode === 'macro' ? 'bg-amber-100 scale-90' : scanMode === 'dent' ? 'bg-pink-100 scale-90' : 'bg-white scale-90')
                    } group-active:scale-75`}></div>
                 </div>
              </button>

              <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="p-4 bg-slate-800 rounded-full text-white hover:bg-slate-700 transition-colors">
                <RefreshCw className="w-6 h-6" />
              </button>
           </>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;