
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnalysisResult, UploadedFile, CarIssue, ImageAnalysis, ConsolidatedIssue, PartTier } from './types';
import { Aperture, Eye, ShieldCheck, AlertCircle, Zap, Shield, Box, GitCompare, ChevronRight, Download, Printer, ZoomIn, ZoomOut, Maximize, Move, RotateCcw, Ruler, Layers, AlertTriangle, MonitorOff, DollarSign, Wrench, Shield as AuctionIcon, CheckCircle2, Lock, Sparkles, Sun, Moon, Search, Activity, Target, ShieldAlert, ExternalLink, FileText, Settings, MapPin } from './Icons';
import VehicleSchematic from './VehicleSchematic';
import { generateForensicReport } from './services/reportService';

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
  const [isExporting, setIsExporting] = useState(false);
  const [partTier, setPartTier] = useState<PartTier>('OEM');
  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentAnalysis = useMemo(() => result.images[selectedMediaIndex] || null, [result, selectedMediaIndex]);
  const currentIssues = useMemo(() => currentAnalysis?.detectedIssues || [], [currentAnalysis]);
  const trustScore = result.blind_trust_score;

  const dynamicFinancials = useMemo(() => {
    let totalParts = 0;
    let totalLabor = 0;
    const laborRate = result.market_context?.labor_rate_per_hour || 125;
    result.images.forEach(img => {
      img.detectedIssues.forEach(issue => {
        const market = issue.telemetry.localized_market_data;
        if (market) {
          totalParts += partTier === 'OEM' ? market.oem_price : market.aftermarket_price;
          totalLabor += (market.avg_labor_hours * laborRate);
        }
      });
    });
    const subtotal = totalParts + totalLabor;
    const tax = subtotal * ((result.market_context?.tax_rate_percent || 8) / 100);
    return { parts: totalParts, labor: totalLabor, tax: tax, total: subtotal + tax };
  }, [result, partTier]);

  const resetView = useCallback(() => { setZoom(1); setOffset({ x: 0, y: 0 }); setHoveredIssueId(null); }, []);

  useEffect(() => { resetView(); }, [selectedMediaIndex, resetView]);

  const handleWheel = (e: React.WheelEvent) => {
    const factor = Math.pow(1.1, -e.deltaY / 200);
    setZoom(prev => Math.min(Math.max(prev * factor, 0.5), 15));
  };

  const handleMouseDown = (e: React.MouseEvent) => { if (e.button === 0) { setIsDragging(true); setLastMousePos({ x: e.clientX, y: e.clientY }); } };

  const handleMouseMove = (e: React.MouseMoveEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Fix for error in file Dashboard.tsx on line 310: Cannot find name 'handleExport'.
  // Added handleExport to trigger forensic report generation using generateForensicReport service.
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await generateForensicReport(result, files, caseId, vin);
    } catch (err) {
      console.error("Forensic export failed:", err);
    } finally {
      setIsExporting(false);
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
    const file = files[selectedMediaIndex];
    if (!file || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.src = file.previewUrl;
    img.onload = () => {
      const availableWidth = containerRef.current!.clientWidth - 40;
      const availableHeight = containerRef.current!.clientHeight - 40;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const containerRatio = availableWidth / availableHeight;
      let rw, rh;
      if (imgRatio > containerRatio) { rw = availableWidth; rh = availableWidth / imgRatio; }
      else { rh = availableHeight; rw = availableHeight * imgRatio; }
      canvas.width = rw; canvas.height = rh;
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
          const color = getSeverityColor(issue.severity);
          const isScratch = issue.issueType === 'Scratch';
          ctx.beginPath();
          pts.forEach((pt, i) => {
            const y = (pt[0] / 1000) * canvas.height;
            const x = (pt[1] / 1000) * canvas.width;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          });
          if (isScratch) {
            ctx.strokeStyle = color;
            ctx.lineWidth = (isHovered ? 5 : 2) / zoom;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (isHovered) { ctx.shadowBlur = 15 / zoom; ctx.shadowColor = color; }
            ctx.stroke();
            ctx.shadowBlur = 0;
          } else {
            ctx.closePath();
            ctx.fillStyle = isHovered ? `${color}88` : `${color}44`;
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = (isHovered ? 4 : 1) / zoom;
            ctx.stroke();
          }
        });
      }
      ctx.restore();
    };
  }, [selectedMediaIndex, files, currentAnalysis, hoveredIssueId, showMasks, zoom, offset]);

  return (
    <div className="fixed inset-0 bg-[#010208] flex flex-col animate-fade-in overflow-hidden">
      <header className="h-20 flex items-center justify-between px-10 border-b border-white/5 bg-black/80 backdrop-blur-3xl z-50 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-sm font-black text-white uppercase tracking-[0.5em]">Forensic Metrology V34.0</h1>
            <p className="text-[10px] text-indigo-400 font-mono font-bold mt-1 tracking-widest italic flex items-center gap-2">
               <ShieldCheck className="w-3.5 h-3.5" /> L16 CLUSTER INTEGRITY: CERTIFIED
            </p>
          </div>
        </div>
        <div className="flex items-center gap-10">
          <div className="hidden xl:flex items-center gap-4 px-6 py-2 bg-white/5 rounded-2xl border border-white/10">
             <MapPin className="w-4 h-4 text-emerald-500" />
             <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Regional Node</span>
                <span className="text-[10px] font-bold text-white uppercase">{result.market_context?.location_name || 'Localized Hub'}</span>
             </div>
          </div>
          <button onClick={onReset} className="px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Dismiss Case</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-[420px] border-r border-white/5 bg-black/40 backdrop-blur-md flex flex-col overflow-hidden shrink-0">
          <div className="flex-1 flex flex-col p-8 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Metrology Anomalies</h3>
              <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
              {currentIssues.map(issue => (
                <div key={issue.id} onMouseEnter={() => setHoveredIssueId(issue.id)} onMouseLeave={() => setHoveredIssueId(null)}
                  className={`p-6 rounded-[3rem] border transition-all duration-500 cursor-pointer ${hoveredIssueId === issue.id ? 'bg-indigo-600/15 border-indigo-500/50 scale-[1.02] shadow-2xl' : 'bg-white/5 border-white/5'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-black text-white uppercase tracking-wider">{issue.part}</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{issue.issueType}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-widest" style={{ color: getSeverityColor(issue.severity), backgroundColor: `${getSeverityColor(issue.severity)}10`, borderColor: `${getSeverityColor(issue.severity)}30` }}>
                      {issue.severity}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className={`p-3 rounded-2xl border transition-all ${partTier === 'OEM' ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-black/40 border-white/5 opacity-50'}`}>
                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">OEM Price</span>
                      <span className="text-[11px] font-mono font-bold text-white">${issue.telemetry.localized_market_data?.oem_price.toLocaleString()}</span>
                    </div>
                    <div className={`p-3 rounded-2xl border transition-all ${partTier === 'Aftermarket' ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-black/40 border-white/5 opacity-50'}`}>
                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Aftermarket</span>
                      <span className="text-[11px] font-mono font-bold text-white">${issue.telemetry.localized_market_data?.aftermarket_price.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-t border-white/5 pt-4">
                    <div className="text-slate-500">LABOR: <span className="text-indigo-400">{issue.telemetry.localized_market_data?.avg_labor_hours}H</span></div>
                    <div className="text-indigo-400">@{result.market_context?.labor_rate_per_hour}/H</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="h-80 border-t border-white/5 p-8 bg-black/60">
             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8 flex justify-between items-center">
                <span>Core Reflection Hub</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[8px]">V34 SYNC</span>
             </div>
             <VehicleSchematic issues={result.consolidatedIssues} />
          </div>
        </aside>

        <main className="flex-1 relative bg-[#000105] flex flex-col overflow-hidden">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-40">
            <div className="bg-black/90 backdrop-blur-3xl px-12 py-5 rounded-full border border-white/10 flex items-center gap-10 shadow-2xl">
              <div className="flex items-center gap-4">
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                 <span className="text-[11px] font-black text-white uppercase tracking-[0.5em]">Forensic Beam Enabled</span>
              </div>
              <div className="h-5 w-px bg-white/10"></div>
              <button onClick={() => setShowMasks(!showMasks)} className={`text-[10px] font-black uppercase tracking-widest transition-all ${showMasks ? 'text-indigo-400' : 'text-slate-500'}`}>
                {showMasks ? 'Terminate Overlays' : 'Project Overlays'}
              </button>
            </div>
          </div>

          <div ref={containerRef} className="flex-1 flex items-center justify-center p-20 cursor-grab active:cursor-grabbing overflow-hidden"
            onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
            <canvas ref={canvasRef} className="shadow-[0_0_300px_rgba(0,0,0,1)] rounded-[4rem]" />
          </div>

          <div className="absolute bottom-48 left-12 flex flex-col gap-4">
             <div className="glass-panel p-6 rounded-[2.5rem] border border-white/10 flex flex-col gap-4 shadow-2xl">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Financial Hub</span>
                <div className="flex gap-2">
                   {(['OEM', 'Aftermarket'] as PartTier[]).map(tier => (
                     <button key={tier} onClick={() => setPartTier(tier)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${partTier === tier ? 'bg-white text-black' : 'bg-white/5 text-slate-500 border border-white/5'}`}>
                       {tier}
                     </button>
                   ))}
                </div>
             </div>
          </div>

          <div className="absolute bottom-48 right-12 flex flex-col gap-4">
             <button onClick={() => setZoom(z => Math.min(z + 0.5, 10))} className="w-14 h-14 glass-panel rounded-3xl flex items-center justify-center text-white"><ZoomIn className="w-7 h-7" /></button>
             <button onClick={() => setZoom(z => Math.max(z - 0.5, 0.5))} className="w-14 h-14 glass-panel rounded-3xl flex items-center justify-center text-white"><ZoomOut className="w-7 h-7" /></button>
             <button onClick={resetView} className="w-14 h-14 glass-panel rounded-3xl flex items-center justify-center text-white"><RotateCcw className="w-7 h-7" /></button>
          </div>

          <div className="h-44 border-t border-white/5 bg-black/80 backdrop-blur-3xl flex items-center justify-center gap-10 p-6 shrink-0 overflow-x-auto custom-scrollbar">
             {files.map((file, i) => (
               <button key={i} onClick={() => setSelectedMediaIndex(i)} className={`relative h-full aspect-video rounded-[3rem] overflow-hidden transition-all duration-700 border-2 shrink-0 ${selectedMediaIndex === i ? 'border-indigo-500 scale-105' : 'border-transparent opacity-15 hover:opacity-100'}`}>
                 <img src={file.previewUrl} className="w-full h-full object-cover" />
               </button>
             ))}
          </div>
        </main>

        <aside className="w-[420px] border-l border-white/5 bg-black/40 backdrop-blur-md flex flex-col overflow-hidden shrink-0">
          <div className="flex-1 flex flex-col p-12 overflow-hidden">
            <div className="relative w-72 h-72 mx-auto flex items-center justify-center mb-12 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                  <circle cx="144" cy="144" r="128" className="stroke-white/5 fill-none" strokeWidth="18" />
                  <circle cx="144" cy="144" r="128" className="stroke-indigo-500 fill-none" strokeWidth="18" strokeDasharray={804} strokeDashoffset={804 - (804 * (1 - (dynamicFinancials.total / 65000)))} strokeLinecap="round" />
              </svg>
              <div className="absolute flex flex-col items-center">
                 <span className="text-6xl font-black text-white tracking-tighter">${(dynamicFinancials.total / 1000).toFixed(1)}K</span>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-4">Forensic Liability</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mb-10">
               {[
                 { label: "Parts Subtotal", value: dynamicFinancials.parts, icon: <Box className="w-4 h-4" /> },
                 { label: "Labor @ Local Rate", value: dynamicFinancials.labor, icon: <Wrench className="w-4 h-4" /> },
                 { label: "Total Tax", value: dynamicFinancials.tax, icon: <DollarSign className="w-4 h-4" /> }
               ].map((item, i) => (
                 <div key={i} className="flex justify-between items-center p-5 bg-white/5 rounded-[2rem] border border-white/5">
                    <div className="flex items-center gap-4 text-slate-400"> {item.icon} <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span> </div>
                    <span className="text-[12px] font-black text-white font-mono">${item.value.toLocaleString()}</span>
                 </div>
               ))}
            </div>

            <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 pr-2">
               {result.consolidatedIssues.map(issue => (
                 <div key={issue.id} className="p-8 bg-indigo-500/5 rounded-[3.5rem] border border-indigo-500/10 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                       <span className="text-[12px] font-black text-white uppercase tracking-wider">{issue.part}</span>
                       <span className="text-emerald-400 font-mono text-[11px] font-bold">L16 AUDIT OK</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest" style={{ color: getSeverityColor(issue.severity), borderColor: `${getSeverityColor(issue.severity)}30` }}>
                        {issue.severity}
                      </div>
                      {issue.severity === 'Critical' && <div className="text-red-500 text-[10px] font-black uppercase flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> SAFETY BREACH</div>}
                    </div>
                 </div>
               ))}
            </div>

            <div className="mt-12 pt-12 border-t border-white/5 shrink-0">
               <div className="flex justify-between items-end mb-10">
                  <div>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-3">Settle Matrix ({partTier})</span>
                    <span className="text-6xl font-black text-white tracking-tighter animate-pulse">${Math.round(dynamicFinancials.total).toLocaleString()}</span>
                  </div>
               </div>
               <button onClick={handleExport} disabled={isExporting} className="w-full py-8 bg-indigo-500 text-white hover:bg-indigo-600 rounded-[3rem] text-[13px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-5 shadow-[0_0_100px_rgba(99,102,241,0.3)] active:scale-95 disabled:opacity-50">
                  {isExporting ? <Activity className="w-6 h-6 animate-spin" /> : <FileText className="w-6 h-6" />}
                  {isExporting ? "Compiling Forensic Evidence..." : "Export Admissible Forensic Pack"}
               </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Dashboard;
