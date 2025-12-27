
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnalysisResult, UploadedFile, CarIssue, ImageAnalysis, ConsolidatedIssue, AuditLogEntry } from '../types';
import { 
  ZoomIn, ZoomOut, Play, Clock,
  ShieldCheck, Loader2, Printer, Flag, Layers,
  ChevronRight, Car, Eye, EyeOff, Target, Info, AlertTriangle, Shield, CheckCircle2,
  Search, GitCompare, Smartphone, Ruler, Sparkles, Box, Lock, Sun, MonitorOff, FileText, Check, XCircle, Aperture, FileJson, Wrench, DollarSign, RefreshCw, Zap
} from './Icons';
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
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0.4); 
  const [hoveredIssueId, setHoveredIssueId] = useState<string | null>(null);
  const [showMasks, setShowMasks] = useState(true);
  const [activeTab, setActiveTab] = useState<'audit' | 'anomalies'>('anomalies');
  const [overrides, setOverrides] = useState<Record<string, 'approved' | 'rejected'>>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentAnalysis = useMemo(() => {
    return result.images.find(img => img.imageIndex === selectedMediaIndex) || null;
  }, [result, selectedMediaIndex]);

  const currentIssues = useMemo(() => {
    if (!currentAnalysis) return [];
    let list = [...currentAnalysis.detectedIssues];
    
    if (selectedPart) {
      const p = selectedPart.toLowerCase().replace(/_/g, ' ');
      list = list.filter(issue => {
        const iPart = issue.part.toLowerCase();
        return iPart.includes(p) || p.includes(iPart) || 
               (p.includes('bumper') && iPart.includes('bumper')) ||
               (p.includes('quarter') && iPart.includes('quarter')) ||
               (p.includes('door') && iPart.includes('door')) ||
               (p.includes('light') && iPart.includes('light')) ||
               (p.includes('glass') && iPart.includes('glass'));
      });
    }
    
    const severityMap: Record<string, number> = { 'Critical': 4, 'Severe': 3, 'Moderate': 2, 'Minor': 1 };
    return list.sort((a, b) => severityMap[b.severity] - severityMap[a.severity]);
  }, [currentAnalysis, selectedPart]);

  useEffect(() => {
    const file = files[selectedMediaIndex];
    if (!file || file.type !== 'image') return; 

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = file.previewUrl;

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0);

      if (!currentAnalysis || !showMasks) return;

      // Draw Ghost Hull (Spectral baseline)
      if (currentAnalysis.vehicle_hull && currentAnalysis.vehicle_hull.length > 2) {
          ctx.save();
          ctx.beginPath();
          currentAnalysis.vehicle_hull.forEach((pt, i) => {
              const x = (pt[0] / 1000) * W;
              const y = (pt[1] / 1000) * H;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
          ctx.setLineDash([10, 5]);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
      }

      // Sort issues by area for layering
      const sortedIssues = [...currentAnalysis.detectedIssues].sort((a, b) => {
          const areaA = a.evidence?.polygon_points ? calculatePolygonArea(a.evidence.polygon_points) : 0;
          const areaB = b.evidence?.polygon_points ? calculatePolygonArea(b.evidence.polygon_points) : 0;
          return areaB - areaA;
      });

      sortedIssues.forEach((issue) => {
        if (overrides[issue.id] === 'rejected') return;
        const pts = issue.evidence?.polygon_points;
        const isHovered = hoveredIssueId === issue.id;
        
        const palette = {
            Critical: { fill: 'rgba(245, 158, 11, 0.4)', stroke: '#f59e0b', box: '#f59e0b' },
            Severe: { fill: 'rgba(217, 70, 239, 0.4)', stroke: '#d946ef', box: '#d946ef' },
            Moderate: { fill: 'rgba(34, 211, 238, 0.5)', stroke: '#22d3ee', box: '#22d3ee' }, 
            Minor: { fill: 'rgba(132, 204, 22, 0.4)', stroke: '#84cc16', box: '#84cc16' }
        }[issue.severity] || { fill: 'rgba(99, 102, 241, 0.4)', stroke: '#6366f1', box: '#6366f1' };

        if (pts && pts.length >= 3) {
          ctx.save();
          
          // 1. Structural Lasso Trace
          ctx.beginPath();
          pts.forEach((pt, i) => {
            const x = (pt[0] / 1000) * W;
            const y = (pt[1] / 1000) * H;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.fillStyle = isHovered ? `${palette.stroke}AA` : palette.fill;
          ctx.fill();
          ctx.lineWidth = Math.max(3, W/400);
          ctx.strokeStyle = palette.stroke;
          ctx.stroke();

          // 2. Precision Corner Anchors
          let minX = 1000, maxX = 0, minY = 1000, maxY = 0;
          pts.forEach(p => {
            minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
            minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
          });

          const bx = (minX / 1000) * W;
          const by = (minY / 1000) * H;
          const bw = ((maxX - minX) / 1000) * W;
          const bh = ((maxY - minY) / 1000) * H;

          const cornerLen = Math.min(bw, bh) * 0.2;
          ctx.strokeStyle = palette.box;
          ctx.lineWidth = Math.max(5, W/300);
          
          // L-Brackets
          ctx.beginPath(); ctx.moveTo(bx, by + cornerLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cornerLen, by); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx + bw - cornerLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cornerLen); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx, by + bh - cornerLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cornerLen, by + bh); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx + bw - cornerLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cornerLen); ctx.stroke();

          // 3. Anatomical Annotation Badge (Percentages Purged)
          const tagH = Math.max(32, W/40);
          const tagW = Math.max(160, W/8);
          ctx.fillStyle = '#000000';
          const badgeY = (by < tagH + 20) ? by + bh + 10 : by - tagH - 10;
          ctx.fillRect(bx, badgeY, tagW, tagH);
          ctx.fillStyle = palette.stroke;
          ctx.fillRect(bx, badgeY, 8, tagH); 
          
          ctx.font = `bold ${tagH * 0.5}px Inter`;
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          const badgeText = issue.part.toUpperCase();
          ctx.fillText(badgeText, bx + 18, badgeY + (tagH/2));

          ctx.restore();
        }
      });
    };

    function calculatePolygonArea(p: [number, number][]) {
        let area = 0;
        for (let i = 0; i < p.length; i++) {
            const [x1, y1] = p[i];
            const [x2, y2] = p[(i + 1) % p.length];
            area += (x1 * y2 - x2 * y1);
        }
        return Math.abs(area) / 2;
    }
  }, [selectedMediaIndex, files, currentAnalysis, overlayOpacity, hoveredIssueId, showMasks, overrides, currentIssues]);

  return (
    <div className="w-full max-w-[1580px] mx-auto p-4 md:p-6 space-y-6 pb-20 animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-[3rem] flex items-center justify-between shadow-3xl">
          <div className="flex items-center gap-10">
              <div className="flex items-center gap-6 border-r border-slate-800 pr-10">
                  <div className="p-5 bg-indigo-600 rounded-[2rem] shadow-xl shadow-indigo-600/20"><Aperture className="w-7 h-7 text-white animate-spin-slow" /></div>
                  <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none mb-2">Structural Topology Tier</span>
                      <span className="text-base text-white font-black tracking-tight">{result.processing_meta.model_version}</span>
                  </div>
              </div>
              <div className="flex items-center gap-6">
                  <div className="flex flex-col text-indigo-400">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none mb-2">Anatomical Sync</span>
                      <span className="text-base font-black uppercase tracking-tighter">Manifold: RECONSTRUCTED</span>
                  </div>
              </div>
          </div>
          <div className="flex gap-4">
              <button onClick={() => setShowMasks(!showMasks)} className={`px-10 py-4 rounded-3xl text-[11px] font-black uppercase transition-all border-2 flex items-center gap-4 ${showMasks ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.3)]' : 'text-slate-500 border-slate-700'}`}>
                {showMasks ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                {showMasks ? 'Topology Active' : 'Source Mode'}
              </button>
              <button className="bg-white text-black px-12 py-4 rounded-3xl font-black text-xs uppercase hover:bg-slate-200 shadow-2xl transition-all tracking-widest">Verify Audit</button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 min-h-[850px]">
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-[4rem] flex flex-col shadow-3xl overflow-hidden">
              <div className="flex border-b border-slate-800 p-3">
                  <button onClick={() => setActiveTab('anomalies')} className={`flex-1 py-6 text-[11px] font-black uppercase tracking-[0.2em] transition-all rounded-[2.5rem] ${activeTab === 'anomalies' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}>Anatomical Detections</button>
                  <button onClick={() => setActiveTab('audit')} className={`flex-1 py-6 text-[11px] font-black uppercase tracking-[0.2em] transition-all rounded-[2.5rem] ${activeTab === 'audit' ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}>Metrology Log</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
                  {currentIssues.length > 0 ? (
                    currentIssues.map((issue) => (
                      <div 
                        key={issue.id} 
                        onMouseEnter={() => setHoveredIssueId(issue.id)} 
                        onMouseLeave={() => setHoveredIssueId(null)} 
                        className={`bg-slate-800/40 border-2 p-8 rounded-[3rem] group transition-all cursor-default ${hoveredIssueId === issue.id ? 'border-indigo-500 bg-indigo-500/5 shadow-3xl' : 'border-slate-800'}`}
                      >
                          <div className="flex justify-between items-start mb-5">
                              <div className="text-[16px] font-black text-white uppercase tracking-tighter flex items-center gap-4">
                                  <div className={`w-3.5 h-3.5 rounded-full ${issue.part.includes('bumper') || issue.part.includes('hood') ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : 'bg-indigo-400'}`}></div>
                                  {issue.part.replace(/_/g, ' ')}
                              </div>
                              <div className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${issue.severity === 'Critical' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
                                  {issue.severity}
                              </div>
                          </div>
                          <div className="flex gap-8 mb-5">
                              <div className="flex items-center gap-3 text-[13px] font-bold text-slate-300"><Ruler className="w-5 h-5 text-indigo-400" /> {Math.round(issue.measured_length_mm || 0)}mm</div>
                              <div className="flex items-center gap-3 text-[13px] font-bold text-slate-300"><DollarSign className="w-5 h-5 text-emerald-400" /> ${issue.repair_suggestion?.estimated_cost.toLocaleString()}</div>
                          </div>
                          <p className="text-[13px] text-slate-500 leading-relaxed font-medium italic border-l-4 border-slate-800 pl-6">"{issue.description}"</p>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-16 space-y-10 opacity-30">
                       <Zap className="w-20 h-20 text-slate-700 animate-pulse" />
                       <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.5em]">Structural Baseline Locked</p>
                    </div>
                  )}
              </div>
              
              <div className="mt-auto h-[350px] bg-slate-900 border-t border-slate-800 p-10">
                  <VehicleSchematic issues={result.images.flatMap(img => img.detectedIssues)} onPartClick={setSelectedPart} selectedPart={selectedPart} />
              </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-8">
              <div className="bg-slate-900 rounded-[3.5rem] border border-slate-800 p-6 flex items-center justify-between shadow-3xl">
                  <div className="flex items-center gap-10">
                      <div className="flex items-center gap-4 bg-slate-800 p-3 rounded-3xl">
                           <button onClick={() => setOverlayOpacity(prev => Math.max(0.1, prev - 0.1))} className="p-3 text-slate-400 hover:text-white transition-all"><ZoomOut className="w-6 h-6" /></button>
                           <span className="text-[11px] font-black text-slate-200 w-16 text-center tracking-[0.2em]">{Math.round(overlayOpacity * 100)}%</span>
                           <button onClick={() => setOverlayOpacity(prev => Math.min(0.9, prev + 0.1))} className="p-3 text-slate-400 hover:text-white transition-all"><ZoomIn className="w-6 h-6" /></button>
                      </div>
                      <div className="h-10 w-px bg-slate-800"></div>
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Forensic Manifold Viewport</span>
                  </div>
                  <div className="flex gap-4 p-3 bg-slate-950 rounded-[2.5rem] border border-slate-800 overflow-x-auto max-w-[60%] custom-scrollbar">
                        {files.map((f, i) => (
                            <button key={i} onClick={() => setSelectedMediaIndex(i)} className={`relative min-w-[4rem] w-16 h-16 rounded-[1.5rem] overflow-hidden border-2 transition-all ${selectedMediaIndex === i ? 'border-indigo-500 scale-110 shadow-3xl' : 'border-transparent opacity-30 hover:opacity-100'}`}>
                                <img src={f.previewUrl} className="w-full h-full object-cover" />
                            </button>
                        ))}
                  </div>
              </div>

              <div className="flex-1 bg-slate-950 rounded-[5rem] border-4 border-slate-800 relative overflow-hidden shadow-3xl flex flex-col justify-center items-center group">
                  <canvas ref={canvasRef} className="max-w-full h-full object-contain cursor-crosshair transition-all duration-1000 group-hover:scale-[1.001]" />
                  
                  {/* V16.0 STRUCTURAL HUD */}
                  <div className="absolute bottom-10 left-0 w-full px-16 pointer-events-none flex flex-col items-center animate-fade-in">
                      <div className="bg-black/90 backdrop-blur-[50px] px-16 py-6 rounded-[4rem] border border-white/10 flex items-center justify-between w-full shadow-[0_20px_100px_rgba(0,0,0,0.8)]">
                          <div className="flex items-center gap-12">
                            <Zap className="w-8 h-8 text-indigo-400 animate-pulse" />
                            <div className="flex flex-col">
                               <span className="text-[18px] font-black text-white tracking-[0.6em] uppercase leading-none mb-2">Topology V16.0</span>
                               <span className="text-[11px] text-indigo-400 font-mono uppercase tracking-[0.4em] opacity-80 underline underline-offset-4 decoration-indigo-500/30">Anatomical_Boundary_Locked :: {currentIssues.length} Global_Manifolds</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-14">
                            <div className="flex items-center gap-4">
                                <div className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_20px_#fbbf24]"></div>
                                <span className="text-[11px] text-white/90 font-black uppercase tracking-[0.2em]">Structural Failure</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-4 h-4 rounded-full bg-indigo-500 shadow-[0_0_20px_#6366f1]"></div>
                                <span className="text-[11px] text-white/90 font-black uppercase tracking-[0.2em]">Spectral Ghost</span>
                            </div>
                          </div>
                      </div>
                  </div>

                  {/* Top Right Status Lock */}
                  <div className="absolute top-16 right-16 opacity-30 group-hover:opacity-100 transition-all duration-500">
                      <div className="flex items-center gap-5 text-white font-black text-[12px] uppercase tracking-[0.5em] bg-black/70 px-10 py-5 rounded-full border border-white/20 backdrop-blur-2xl shadow-3xl">
                          <ShieldCheck className="w-7 h-7 text-indigo-400" /> Anatomical Symmetry Verified
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
