
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

const OVERLAY_PATHS: Record<string, string> = {
  'corner': "M10,10 L30,10 M10,10 L10,30  M90,10 L70,10 M90,10 L90,30  M10,90 L30,90 M10,90 L10,70  M90,90 L70,90 M90,90 L90,70", 
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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [activeQuality, setActiveQuality] = useState<'4K_UHD' | 'HD' | 'SD' | 'LOW_RES'>('HD');
  const [scanMode, setScanMode] = useState<'standard' | 'macro' | 'dent'>('standard');
  const [isProcessingEffect, setIsProcessingEffect] = useState(false);
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');

  const startCamera = useCallback(async () => {
    try {
      if (stream) stream.getTracks().forEach(track => track.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode,
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          advanced: [{ focusMode: 'continuous' }] as any
        },
        audio: true 
      });
      
      setStream(newStream);
      const track = newStream.getVideoTracks()[0];
      const settings = track.getSettings();
      
      let quality: '4K_UHD' | 'HD' | 'SD' | 'LOW_RES' = 'SD';
      if (settings.width && settings.width >= 3800) quality = '4K_UHD';
      else if (settings.width && settings.width >= 1900) quality = 'HD';
      else if (settings.width && settings.width < 1280) quality = 'LOW_RES';
      setActiveQuality(quality);

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

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (navigator.vibrate) navigator.vibrate(50);
    
    if (scanMode === 'macro' || scanMode === 'dent') {
        setIsProcessingEffect(true);
        captureSpecialStack().then(() => setIsProcessingEffect(false));
    } else {
        captureImage();
    }
  };

  const captureSpecialStack = async () => {
     if (!videoRef.current || !canvasRef.current) return;
     const video = videoRef.current;
     const canvas = canvasRef.current;
     const ctx = canvas.getContext('2d', { willReadFrequently: true });
     if (!ctx) return;

     canvas.width = video.videoWidth; 
     canvas.height = video.videoHeight;
     
     const sWidth = video.videoWidth * (scanMode === 'macro' ? 0.6 : 0.9);
     const sHeight = video.videoHeight * (scanMode === 'macro' ? 0.6 : 0.9);
     const sx = (video.videoWidth - sWidth) / 2;
     const sy = (video.videoHeight - sHeight) / 2;

     const drawFrame = (alpha: number) => {
         ctx.globalAlpha = alpha;
         ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
     };

     drawFrame(1.0);
     await new Promise(r => setTimeout(r, 60)); 
     drawFrame(0.5); 
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
    
    const modeTag = scanMode === 'macro' ? '_linear' : scanMode === 'dent' ? '_volumetric' : '';
    const fileName = `${stepId || 'capture'}${modeTag}.jpg`;
    const file = new File([new Blob([u8arr], { type: mime })], fileName, { type: mime });
    
    setTempMedia({ url: dataUrl, type: 'image', file });
  };

  const handleTrigger = () => {
      takePhoto();
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
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col font-sans">
      <div className="absolute top-0 w-full z-20 p-6 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex flex-col gap-1 pointer-events-auto">
           <span className="text-white font-bold text-xl drop-shadow-md flex items-center gap-2 uppercase tracking-tighter">
             <Aperture className="w-6 h-6 text-indigo-400 animate-spin-slow" />
             {scanMode === 'dent' ? 'Volumetric Dent Mode' : scanMode === 'macro' ? 'Linear Path Trace' : 'Standard Capture'}
             <span className={`text-[10px] px-2 py-0.5 rounded font-black tracking-widest ${activeQuality === '4K_UHD' ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                 {activeQuality.replace('_', ' ')}
             </span>
           </span>
           <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
             {scanMode === 'dent' ? "Zebra patterns enabled for deflectometry." : "Precise Metrology Active."}
           </span>
        </div>
        <button onClick={onClose} className="pointer-events-auto p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all">
           <X className="w-6 h-6" />
        </button>
      </div>
      
      {isProcessingEffect && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-lg animate-fade-in">
              <Sparkles className="w-16 h-16 text-indigo-400 animate-pulse mb-6" />
              <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Building Manifold</h3>
              <p className="text-[10px] text-indigo-300 font-mono tracking-widest animate-pulse">RECONSTRUCTING SURFACE ENTROPY...</p>
          </div>
      )}

      <div className="flex-1 relative overflow-hidden bg-black">
        <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${tempMedia ? 'hidden' : 'block'}`}
            style={{ 
                transform: `scale(${scanMode === 'macro' ? 1.5 : 1})`, 
                filter: scanMode === 'dent' ? 'contrast(1.6) brightness(1.1) grayscale(0.2)' : 'none'
            }}
        />
        
        {tempMedia && tempMedia.type === 'image' && (
            <img src={tempMedia.url} className="absolute inset-0 w-full h-full object-cover" />
        )}

        {!tempMedia && scanMode === 'dent' && (
             <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center opacity-30">
                 {/* Deflectometry Zebra Pattern Grid */}
                 <div className="w-full h-full" style={{
                     backgroundImage: 'repeating-linear-gradient(45deg, #000 0px, #000 15px, transparent 15px, transparent 30px), repeating-linear-gradient(-45deg, #000 0px, #000 15px, transparent 15px, transparent 30px)',
                     mixBlendMode: 'overlay'
                 }}></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[80vw] h-[80vw] max-w-[500px] max-h-[500px] border border-cyan-500/30 rounded-full animate-pulse"></div>
                 </div>
                 <div className="absolute bottom-40 bg-cyan-500/20 px-6 py-2 rounded-full border border-cyan-500/40 text-cyan-400 text-[10px] font-black uppercase tracking-widest backdrop-blur-xl">
                     Watch for Pattern Warping
                 </div>
             </div>
        )}
        
        {!tempMedia && mode === 'inspection' && (
             <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none opacity-20 z-20" preserveAspectRatio="none">
                 <path d={OVERLAY_PATHS.corner} fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="2,2" />
             </svg>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="bg-black pb-12 pt-8 px-10 flex items-center justify-around">
        {tempMedia ? (
           <>
             <button onClick={() => setTempMedia(null)} className="flex flex-col items-center gap-3 text-slate-400 hover:text-white transition-all transform hover:scale-105">
               <RotateCcw className="w-10 h-10" />
               <span className="text-[10px] font-black uppercase tracking-widest">Rescan</span>
             </button>
             <button onClick={confirmCapture} className="flex flex-col items-center gap-3">
               <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] transform transition-transform hover:scale-110 active:scale-95">
                 <Check className="w-12 h-12" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Lock Evidence</span>
             </button>
           </>
        ) : (
           <>
              <button onClick={cycleScanMode} className={`p-5 rounded-3xl transition-all border-2 flex flex-col items-center gap-2 transform active:scale-90 ${scanMode === 'dent' ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)]' : scanMode === 'macro' ? 'bg-indigo-900/30 border-indigo-500 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-slate-800 border-transparent text-slate-400'}`}>
                 {scanMode === 'dent' ? <Grid className="w-7 h-7" /> : scanMode === 'macro' ? <Layers className="w-7 h-7" /> : <Camera className="w-7 h-7" />}
                 <span className="text-[9px] font-black uppercase tracking-tighter">{scanMode === 'dent' ? 'VOLUMETRIC' : scanMode === 'macro' ? 'LINEAR' : 'STANDARD'}</span>
              </button>
              
              <button onClick={handleTrigger} className="relative group">
                 <div className="w-28 h-28 rounded-full border-[6px] border-white/10 p-2 transition-all group-hover:border-white/30 group-active:scale-95">
                    <div className={`w-full h-full rounded-full shadow-2xl transition-all duration-300 ${scanMode === 'dent' ? 'bg-cyan-400 shadow-cyan-500/50' : scanMode === 'macro' ? 'bg-indigo-500 shadow-indigo-500/50' : 'bg-white'} group-active:scale-90`}></div>
                 </div>
              </button>

              <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="p-5 bg-slate-800/80 rounded-full text-white hover:bg-slate-700 transition-all transform active:rotate-180 duration-500">
                <RefreshCw className="w-8 h-8" />
              </button>
           </>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
