
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnalysisResult, UploadedFile, CarIssue, ImageAnalysis, ConsolidatedIssue } from '../types';
import { Aperture, Eye, ShieldCheck, AlertCircle, Zap, Shield, Box, GitCompare, ChevronRight, Download, Printer, ZoomIn, ZoomOut, Maximize, Move, RotateCcw, Ruler, Layers, AlertTriangle, MonitorOff, DollarSign, Wrench, Shield as AuctionIcon, CheckCircle2, Lock, Sparkles, Sun, Moon, Search, Activity, Target } from './Icons';
import VehicleSchematic from './VehicleSchematic';

interface DashboardProps {
  result: AnalysisResult;
  files: UploadedFile[];
  onReset: () => void;
  caseId: string;
  vin: string;
}

const Dashboard: React.FC<DashboardProps> = ({ result, files, onReset, caseId, vin }) => {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number>(0);
  const [hoveredIssueId, setHoveredIssueId] = useState<string | null>(null);
  const [showMasks, setShowMasks] = useState(true);
  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentAnalysis = useMemo(() => result.images[selectedMediaIndex] || null, [result, selectedMediaIndex]);
  const currentIssues = useMemo(() => currentAnalysis?.detectedIssues || [], [currentAnalysis]);
  const trustScore = result.blind_trust_score;

  const resetView = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setHoveredIssueId(null);
  }, []);

  useEffect(() => {
    resetView();
  }, [selectedMediaIndex, resetView]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = Math.pow(1.1, -e.deltaY / 200);
    setZoom(prev => Math.min(Math.max(prev * factor, 0.5), 15));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { setIsDragging(true); setLastMousePos({ x: e.clientX, y: e.clientY }); }
  };

  const handleMouseMove = (e: React.MouseMoveEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'Severe': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'Moderate': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      case 'Minor': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    }
  };

  useEffect(() => {
    const file = files[selectedMediaIndex];
    if (!file) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = file.previewUrl;
    img.onload = () => {
      const container = containerRef.current;
      if (!container) return;

      const availableWidth = container.clientWidth - 40;
      const availableHeight = container.clientHeight - 40;
      
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const containerRatio = availableWidth / availableHeight;

      let renderWidth, renderHeight;
      if (imgRatio > containerRatio) {
        renderWidth = availableWidth;
        renderHeight = availableWidth / imgRatio;
      } else {
        renderHeight = availableHeight;
        renderWidth = availableHeight * imgRatio;
      }

      canvas.width = renderWidth;
      canvas.height = renderHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      if (showMasks && currentAnalysis) {
        currentAnalysis.detectedIssues.forEach((issue) => {
          const pts = issue.evidence?.polygon_points;
          if (!pts || pts.length < 2) return;
          const isHovered = hoveredIssueId === issue.id;
          
          let color = '#6366f1'; 
          if (issue.severity === 'Critical') color = '#ef4444';
          else if (issue.severity === 'Severe') color = '#f97316';
          else if (issue.severity === 'Moderate') color = '#eab308';
          else color = '#10b981';
          
          ctx.beginPath();
          pts.forEach((pt, i) => {
            const y = (pt[0] / 1000) * canvas.height;
            const x = (pt[1] / 1000) * canvas.width;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });

          if (issue.issueType === 'Paint Oxidation') {
            ctx.closePath();
            const pattern = ctx.createRadialGradient(
                (pts[0][1]/1000)*canvas.width, (pts[0][0]/1000)*canvas.height, 1,
                (pts[0][1]/1000)*canvas.width, (pts[0][0]/1000)*canvas.height, 50
            );
            pattern.addColorStop(0, `${color}44`);
            pattern.addColorStop(1, 'transparent');
            ctx.fillStyle = pattern;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1/zoom;
            ctx.stroke();
          } else if (issue.issueType === 'Scratch') {
            ctx.strokeStyle = color;
            ctx.lineWidth = (isHovered ? 6 : 3) / zoom;
            ctx.lineCap = 'round';
            ctx.stroke();
          } else {
            ctx.closePath();
            ctx.fillStyle = isHovered ? `${color}77` : `${color}44`;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = (isHovered ? 5 : 3) / zoom;
            ctx.stroke();
          }
        });
      }
      ctx.restore();
    };
  }, [selectedMediaIndex, files, currentAnalysis, hoveredIssueId, showMasks, zoom, offset]);

  return (
    <div className="fixed inset-0 bg-[#020617] flex flex-col animate-fade-in overflow-hidden">
      {/* L16 Header */}
      <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-black/40 backdrop-blur-3xl z-50 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-white uppercase tracking-[0.4em]">Forensic Signal V27.0</h1>
            <p className="text-[10px] text-slate-500 font-mono font-bold mt-1 tracking-widest italic">GROUNDED IN REAL-TIME MARKET OEM DATA</p>
          </div>
          <div className="px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Market Grounded</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex flex-col items-end mr-4">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Compliance ID</span>
             <span className="text-[10px] font-mono text-indigo-400 font-bold">{result.processing_meta.compliance_audit_id}</span>
          </div>
          <button onClick={onReset} className="px-6 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Terminate Audit</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Metrology Column */}
        <aside className="w-[360px] border-r border-white/5 bg-black/20 backdrop-blur-md flex flex-col overflow-hidden shrink-0">
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Component Audit Log</h3>
              <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
              {currentIssues.map(issue => (
                <div key={issue.id} onMouseEnter={() => setHoveredIssueId(issue.id)} onMouseLeave={() => setHoveredIssueId(null)}
                  className={`p-5 rounded-3xl border transition-all duration-300 cursor-pointer ${hoveredIssueId === issue.id ? 'bg-indigo-600/20 border-indigo-500/50 scale-[1.02]' : 'bg-white/5 border-white/5'}`}>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-white uppercase tracking-wider truncate max-w-[150px]">{issue.part}</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{issue.issueType}</span>
                    </div>
                    <div className={`px-2 py-1 rounded border text-[9px] font-black uppercase tracking-widest ${getSeverityStyle(issue.severity)}`}>
                      {issue.severity}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                      <span className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Depth Audit</span>
                      <span className="text-[10px] font-mono text-white font-bold">{issue.telemetry.topology.peak_deformation_depth_microns}μm</span>
                    </div>
                    <div className="p-2.5 bg-black/40 rounded-xl border border-white/5">
                      <span className="text-[8px] font-bold text-slate-500 uppercase block mb-1">Length Trace</span>
                      <span className="text-[10px] font-mono text-white font-bold">{(issue.measured_length_mm || 0).toFixed(1)}mm</span>
                    </div>
                  </div>

                  {/* Forensic Verdict / Severity Analysis */}
                  <div className="mb-4 p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-3 h-3 text-indigo-400" />
                      <span className="text-[9px] font-black text-indigo-300 uppercase">Forensic Verdict</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed italic">
                      {issue.severity === 'Critical' ? "Structural compromise or missing safety assembly detected." :
                       issue.severity === 'Severe' ? "Significant surface deformation requiring panel-level repair." :
                       issue.severity === 'Moderate' ? "Mid-range impact damage; restoration within PDR/Refinish limits." :
                       "Surface-level abrasion; minor cosmetic intervention required."}
                    </p>
                  </div>

                  {issue.telemetry.grounding_sources && issue.telemetry.grounding_sources.length > 0 && (
                    <div className="p-3 bg-black/40 rounded-xl border border-white/5 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-indigo-400" />
                        <span className="text-[8px] font-bold text-indigo-400 uppercase">OEM Verified</span>
                      </div>
                      <a href={issue.telemetry.grounding_sources[0].uri} target="_blank" rel="noreferrer" className="text-[9px] text-white font-medium hover:underline truncate block">
                        {issue.telemetry.grounding_sources[0].title}
                      </a>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Liability: <span className="text-emerald-400 font-black tracking-widest">${issue.repair_suggestion?.estimated_cost}</span></div>
                    <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{issue.repair_suggestion?.method}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-60 border-t border-white/5 p-4 bg-black/40">
             <VehicleSchematic issues={result.consolidatedIssues} />
          </div>
        </aside>

        {/* Central Visualization Area */}
        <main className="flex-1 relative bg-[#020617] flex flex-col overflow-hidden">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
            <div className="bg-black/60 backdrop-blur-3xl px-8 py-3 rounded-full border border-white/10 flex items-center gap-4 shadow-2xl">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Principal Metrology Active</span>
            </div>
          </div>

          <div 
            ref={containerRef} 
            className="flex-1 flex items-center justify-center p-10 cursor-grab active:cursor-grabbing overflow-hidden"
            onWheel={handleWheel} 
            onMouseDown={handleMouseDown} 
            onMouseMove={handleMouseMove} 
            onMouseUp={handleMouseUp}
          >
            <canvas ref={canvasRef} className="shadow-[0_0_120px_rgba(0,0,0,0.9)] rounded-3xl" />
          </div>

          <div className="h-28 border-t border-white/5 bg-black/40 backdrop-blur-2xl flex items-center justify-center gap-4 p-4 shrink-0 overflow-x-auto custom-scrollbar">
             {files.map((file, i) => (
               <button key={i} onClick={() => setSelectedMediaIndex(i)}
                 className={`relative h-full aspect-video rounded-xl overflow-hidden transition-all duration-300 border-2 shrink-0 ${selectedMediaIndex === i ? 'border-indigo-500 scale-105 shadow-xl' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                 <img src={file.previewUrl} className="w-full h-full object-cover" />
               </button>
             ))}
          </div>
        </main>

        {/* Executive Summary & Trust */}
        <aside className="w-[360px] border-l border-white/5 bg-black/20 backdrop-blur-md flex flex-col overflow-hidden shrink-0">
          <div className="flex-1 flex flex-col p-8 overflow-hidden">
            <div className="relative w-48 h-48 mx-auto flex items-center justify-center mb-8 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="84" className="stroke-white/5 fill-none" strokeWidth="12" />
                  <circle cx="96" cy="96" r="84" className={`${trustScore > 95 ? 'stroke-emerald-500' : 'stroke-indigo-500'} fill-none transition-all duration-1000`} strokeWidth="12" strokeDasharray={527} strokeDashoffset={527 - (527 * trustScore / 100)} strokeLinecap="round" />
              </svg>
              <div className="absolute flex flex-col items-center">
                 <span className="text-6xl font-black text-white tracking-tighter">{Math.round(trustScore)}</span>
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Trust Matrix</span>
              </div>
            </div>

            <div className="w-full p-6 bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20 mb-8">
               <span className="text-[11px] font-bold text-indigo-300 leading-relaxed uppercase tracking-tight italic">
                   "{result.executiveSummary}"
               </span>
            </div>

            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
               {result.consolidatedIssues.map(issue => (
                 <div key={issue.id} className="p-4 bg-black/40 rounded-2xl border border-white/5">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-black text-white uppercase">{issue.part}</span>
                       <span className="text-[10px] font-black text-emerald-400">${issue.consolidated_cost}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest ${getSeverityStyle(issue.severity)}`}>
                        {issue.severity}
                      </div>
                      {issue.verified_market_sources && (
                         <div className="flex items-center gap-2 text-[8px] text-slate-500 italic">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> OEM Match
                         </div>
                      )}
                    </div>
                 </div>
               ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 shrink-0">
               <div className="flex justify-between items-center mb-4">
                  <span className="text-[11px] font-black text-slate-500 uppercase">Audit Valuation</span>
                  <span className="text-3xl font-black text-white">${result.financials.grandTotal.toLocaleString()}</span>
               </div>
               <button className="w-full py-4 bg-white text-black hover:bg-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl">
                  Generate Forensic Audit <Download className="w-4 h-4" />
               </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
