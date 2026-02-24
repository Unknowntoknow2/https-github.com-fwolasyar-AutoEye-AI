
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, RotateCcw, Check, Info, AlertTriangle, Video, Camera, ZoomIn, ZoomOut, Grid, ScanBarcode, CreditCard, Ruler, Target, Sun, Moon, Square, Circle, Sparkles, Eye, Lock, Aperture, Layers, Target as FocusIcon, Activity, Loader2 } from './Icons';
import { UploadedFile, ImageAnalysis } from '../types';
import { analyzeSingleImage } from '../services/geminiService';

interface CameraCaptureProps {
  onCaptureComplete: (files: File[], qualityTag?: '4K_UHD' | 'HD' | 'SD' | 'LOW_RES') => void;
  onClose: () => void;
  mode?: 'inspection' | 'vin';
  stepId?: string; 
  tier?: 'Tier_C';
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCaptureComplete, onClose, mode = 'inspection', stepId, tier = 'Tier_C' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [tempMedia, setTempMedia] = useState<{ url: string, type: 'image' | 'video', file: File, analysis?: ImageAnalysis } | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [activeQuality, setActiveQuality] = useState<'4K_UHD' | 'HD' | 'SD' | 'LOW_RES'>('HD');
  const [scanMode, setScanMode] = useState<'standard' | 'macro' | 'dent'>('standard');
  const [isProcessingEffect, setIsProcessingEffect] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [focusPoint, setFocusPoint] = useState<{ x: number, y: number } | null>(null);
  const [isFocusing, setIsFocusing] = useState(false);
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  const startCamera = useCallback(async () => {
    try {
      if (stream) stream.getTracks().forEach(track => track.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 3840 }, height: { ideal: 2160 } },
        audio: captureMode === 'video'
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.muted = true;
      }
    } catch (err) {
      setError("Camera access denied.");
    }
  }, [facingMode, captureMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [startCamera]);

  const handleTapToFocus = (e: React.MouseEvent | React.TouchEvent) => {
    if (!videoRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setFocusPoint({ x: clientX, y: clientY });
    setIsFocusing(true);
    setTimeout(() => { setIsFocusing(false); setTimeout(() => setFocusPoint(null), 500); }, 1500);
  };

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessingEffect(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `${stepId || 'capture'}.jpg`, { type: 'image/jpeg' });
    
    setTempMedia({ url: dataUrl, type: 'image', file });
    setIsProcessingEffect(false);
    
    runInstantAnalysis(file, dataUrl);
  };

  const runInstantAnalysis = async (file: File, url: string) => {
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeSingleImage({ file, previewUrl: url, type: 'image' }, 0);
      setTempMedia(prev => prev ? { ...prev, analysis } : null);
    } catch (err) {
      console.error("Instant review failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return '#ef4444';
      case 'Severe': return '#f97316';
      case 'Moderate': return '#eab308';
      case 'Minor': return '#10b981';
      default: return '#6366f1';
    }
  };

  useEffect(() => {
    if (!tempMedia?.analysis || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = tempMedia.url;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      tempMedia.analysis?.detectedIssues.forEach(issue => {
        const pts = issue.evidence.polygon_points;
        if (!pts || pts.length < 2) return;
        const color = getSeverityColor(issue.severity);
        const isScratch = issue.issueType === 'Scratch';

        ctx.beginPath();
        pts.forEach((pt, i) => {
          const y = (pt[0] / 1000) * canvas.height;
          const x = (pt[1] / 1000) * canvas.width;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });

        if (isScratch) {
          // Forensic Skeleton Trace Styling
          ctx.shadowBlur = 10;
          ctx.shadowColor = color;
          ctx.strokeStyle = color;
          ctx.lineWidth = 6; 
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
          
          // Inner core trace for "skeleton" emphasis
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Volumetric Polygon Styling
          ctx.closePath();
          ctx.fillStyle = `${color}44`;
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 8;
          ctx.stroke();
        }
      });
    };
  }, [tempMedia]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden select-none">
      <div className="absolute top-0 w-full z-20 p-8 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
           <span className="text-white font-black text-2xl drop-shadow-lg flex items-center gap-3 uppercase tracking-tighter">
             <Aperture className={`w-7 h-7 text-indigo-400 animate-spin-slow`} />
             {isAnalyzing ? "Processing High-Res Signal..." : tempMedia?.analysis ? "Skeleton Trace Verified" : "Forensic Lens Active"}
           </span>
           <div className="flex gap-2">
             <span className="px-3 py-1 bg-white/10 text-white/60 text-[10px] font-black rounded uppercase tracking-widest backdrop-blur-md">V35.0 HR-CORE</span>
             {tempMedia?.analysis && <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded uppercase tracking-widest shadow-lg animate-pulse">PRECISION OK</span>}
           </div>
        </div>
        <button onClick={onClose} className="pointer-events-auto p-4 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all">
           <X className="w-7 h-7" />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden bg-black" onMouseDown={handleTapToFocus} onTouchStart={handleTapToFocus}>
        {!tempMedia && (
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        )}
        
        {tempMedia && (
           <div className="absolute inset-0 w-full h-full">
              <img src={tempMedia.url} className="w-full h-full object-cover" />
              <canvas ref={previewCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
              
              {isAnalyzing && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                    <Loader2 className="w-16 h-16 text-indigo-400 animate-spin mb-4" />
                    <span className="text-[12px] font-black text-white uppercase tracking-[0.5em] animate-pulse text-center px-10">Running Skeleton Trace Analysis...</span>
                 </div>
              )}
           </div>
        )}

        {focusPoint && (
          <div className={`absolute pointer-events-none z-50 transition-all duration-300 ${isFocusing ? 'scale-110 opacity-100' : 'scale-75 opacity-0'}`} style={{ left: focusPoint.x - 40, top: focusPoint.y - 40 }}>
            <div className="w-20 h-20 border-2 border-indigo-400 rounded-full animate-ping" />
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="bg-black pb-16 pt-10 px-12 flex items-center justify-around shrink-0 border-t border-white/5">
        {tempMedia ? (
           <>
             <button onClick={() => setTempMedia(null)} className="flex flex-col items-center gap-4 text-slate-400 hover:text-white transition-all transform hover:scale-105">
               <RotateCcw className="w-12 h-12" />
               <span className="text-[11px] font-black uppercase tracking-widest">Discard Trace</span>
             </button>
             <button onClick={() => onCaptureComplete([tempMedia.file], activeQuality)} className="flex flex-col items-center gap-4">
               <div className="w-28 h-28 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-[0_0_50px_rgba(16,185,129,0.4)] transform transition-transform hover:scale-110 active:scale-95">
                 <Check className="w-14 h-14" />
               </div>
               <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Commit to Pool</span>
             </button>
           </>
        ) : (
           <>
              <div className="flex flex-col items-center gap-6">
                <button onClick={() => setCaptureMode(prev => prev === 'photo' ? 'video' : 'photo')} className="w-16 h-16 rounded-2xl flex items-center justify-center border-2 border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all">
                  {captureMode === 'video' ? <Video className="w-7 h-7" /> : <Camera className="w-7 h-7" />}
                </button>
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                   <Activity className="w-4 h-4 text-indigo-400" />
                   <span className="text-[9px] font-black text-white uppercase tracking-widest">L16-HR CORE Active</span>
                </div>
              </div>
              
              <button onClick={takePhoto} className="relative group">
                 <div className="w-32 h-32 rounded-full border-[8px] border-white/10 p-2 transition-all group-hover:border-white/30 group-active:scale-90">
                    <div className="w-full h-full bg-white rounded-full transition-transform group-active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.2)]" />
                 </div>
              </button>

              <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="p-6 bg-slate-800/80 rounded-full text-white hover:bg-slate-700 transition-all active:rotate-180 duration-500">
                <RefreshCw className="w-10 h-10" />
              </button>
           </>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
