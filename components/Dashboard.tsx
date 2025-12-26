
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnalysisResult, UploadedFile, CarIssue, ImageAnalysis, ConsolidatedIssue, AuditLogEntry } from '../types';
import { 
  ZoomIn, ZoomOut, Play, Clock,
  ShieldCheck, Loader2, Printer, Flag, Layers,
  ChevronRight, Car, Eye, EyeOff, Target, Info, AlertTriangle, Shield, CheckCircle2,
  Search, GitCompare, Smartphone, Ruler, Sparkles, Box, Lock, Sun, MonitorOff, FileText, Check, XCircle
} from './Icons';
import { generateForensicReport } from '../services/reportService';
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
  const [hoveredIssueIndex, setHoveredIssueIndex] = useState<number | null>(null);
  const [showHull, setShowHull] = useState(true);
  const [activeTab, setActiveTab] = useState<'audit' | 'anomalies'>('anomalies');
  const [overrides, setOverrides] = useState<Record<string, 'approved' | 'rejected'>>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentAnalysis = useMemo(() => {
    return result.images.find(img => img.imageIndex === selectedMediaIndex) || null;
  }, [result, selectedMediaIndex]);

  const scopedIssues = useMemo(() => {
    if (!currentAnalysis) return [];
    let list = currentAnalysis.detectedIssues;
    if (selectedPart) {
      list = list.filter(issue => issue.part.toLowerCase().includes(selectedPart.toLowerCase()));
    }
    return list;
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

      if (!currentAnalysis) return;

      if (showHull && currentAnalysis.vehicle_hull && currentAnalysis.vehicle_hull.length > 2) {
          ctx.beginPath();
          currentAnalysis.vehicle_hull.forEach((pt, i) => {
              const x = (pt[0] / 1000) * W;
              const y = (pt[1] / 1000) * H;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
          });
          ctx.closePath();
          ctx.lineWidth = Math.max(5, W/250);
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
          ctx.setLineDash([20, 10]);
          ctx.stroke();
          ctx.setLineDash([]);
      }

      scopedIssues.forEach((issue, idx) => {
        if (overrides[issue.id] === 'rejected') return;
        const pts = issue.evidence?.polygon_points;
        const isHovered = hoveredIssueIndex === idx;
        const isFractured = issue.severity === 'Critical';
        
        let color = overrides[issue.id] === 'approved' ? '#10b981' : '#6366f1'; 
        if (isFractured) color = '#ef4444';

        if (pts && pts.length >= 3) {
          ctx.beginPath();
          pts.forEach((pt, i) => {
            const x = (pt[0] / 1000) * W;
            const y = (pt[1] / 1000) * H;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.closePath();
          
          const fillAlpha = isHovered ? 0.75 : overlayOpacity;
          ctx.fillStyle = `${color}${Math.floor(fillAlpha * 255).toString(16).padStart(2, '0')}`;
          ctx.fill();
          
          ctx.lineWidth = isHovered ? 12 : 6;
          ctx.strokeStyle = color;
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
      });
    };
  }, [selectedMediaIndex, files, scopedIssues, overlayOpacity, hoveredIssueIndex, showHull, currentAnalysis, overrides]);

  const handleOverride = (id: string, action: 'approved' | 'rejected') => {
      setOverrides(prev => ({ ...prev, [id]: action }));
  };

  return (
    <div className="w-full max-w-[1550px] mx-auto p-4 md:p-6 space-y-6 pb-20 animate-fade-in font-sans">
      {/* V9.1 Header: Compliance Mode */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div className="flex flex-col">
                  <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">Compliance Notice</span>
                  <span className="text-xs text-amber-200/70 font-medium">ASSISTED MODE ONLY — All AI proposals require manual adjuster sign-off.</span>
              </div>
          </div>
          <div className="flex gap-2">
              <button className="text-[9px] font-black bg-amber-500 text-black px-3 py-1.5 rounded uppercase hover:bg-amber-400 transition-colors">Export Audit Log</button>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-center relative overflow-hidden">
             <div className="absolute top-2 right-2 p-1">
                <Shield className="w-8 h-8 text-indigo-500/20" />
             </div>
             <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Insurability</h2>
             <div className="flex items-baseline gap-2">
                 <span className={`text-6xl font-black tracking-tighter ${result.conditionScore > 8 ? 'text-emerald-400' : 'text-red-500'}`}>
                     {(result.conditionScore).toFixed(1)}
                 </span>
                 <span className="text-xl text-slate-600">/ 10</span>
             </div>
          </div>

          <div className="col-span-12 md:col-span-9 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-8 backdrop-blur">
              <div className="flex gap-12">
                  <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Est. Liability</span>
                      <span className="text-2xl font-bold text-white">${result.financials.grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Audit Tier</span>
                      <div className="flex items-center gap-2 mt-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-mono font-bold text-emerald-300 uppercase tracking-tighter">V9.1 DETERMINISTIC</span>
                      </div>
                  </div>
              </div>
               <div className="flex gap-4 items-center">
                    <button onClick={onReset} className="bg-slate-800 text-slate-400 border border-slate-700 px-6 py-3 rounded-xl font-bold text-sm hover:text-white transition-all">
                        Reset
                    </button>
                    <button className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/40">
                        Sign & Finalize
                    </button>
               </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[780px]">
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col shadow-2xl overflow-hidden">
              <div className="flex border-b border-slate-800">
                  <button onClick={() => setActiveTab('anomalies')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'anomalies' ? 'text-indigo-400 bg-indigo-500/5 border-b-2 border-indigo-500' : 'text-slate-500'}`}>Anomalies</button>
                  <button onClick={() => setActiveTab('audit')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'audit' ? 'text-indigo-400 bg-indigo-500/5 border-b-2 border-indigo-500' : 'text-slate-500'}`}>Evidence Audit</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-4">
                  {activeTab === 'anomalies' ? (
                      scopedIssues.map((issue, idx) => (
                        <div key={idx} onMouseEnter={() => setHoveredIssueIndex(idx)} onMouseLeave={() => setHoveredIssueIndex(null)} className={`bg-slate-800/40 border p-4 rounded-2xl group transition-all cursor-default ${overrides[issue.id] === 'rejected' ? 'opacity-40 grayscale' : 'hover:border-indigo-500'} ${overrides[issue.id] === 'approved' ? 'border-emerald-500/50' : 'border-slate-700'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="text-xs font-black text-white uppercase tracking-tighter">{issue.part.replace(/_/g, ' ')}</div>
                                    <div className="text-[10px] font-bold uppercase text-indigo-400">{issue.issueType}</div>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleOverride(issue.id, 'approved')} className={`p-1.5 rounded-lg transition-all ${overrides[issue.id] === 'approved' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}><Check className="w-4 h-4" /></button>
                                    <button onClick={() => handleOverride(issue.id, 'rejected')} className={`p-1.5 rounded-lg transition-all ${overrides[issue.id] === 'rejected' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}><XCircle className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-400 mb-3 italic">"{issue.telemetry.evidence.summary}"</p>
                            <div className="flex flex-wrap gap-1">
                                {issue.telemetry.evidence.negative_evidence.map((neg, i) => (
                                    <span key={i} className="text-[8px] font-black bg-slate-700/50 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700 uppercase">NO_{neg.split(' ')[2]?.toUpperCase() || 'REF'}</span>
                                ))}
                            </div>
                        </div>
                      ))
                  ) : (
                      currentAnalysis?.detectedIssues.map((issue, idx) => (
                        <div key={idx} className="bg-slate-800/20 border border-slate-800 p-4 rounded-xl space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{issue.part} - TELEMETRY</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded ${issue.telemetry.gate_results.pass_fail.containment ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {issue.telemetry.gate_results.pass_fail.containment ? 'CONTAINED' : 'LEAK_DETECTED'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 font-bold uppercase">Hull Coverage</span>
                                    <span className="text-xs text-white font-mono">{(issue.telemetry.gate_results.hull_coverage * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] text-slate-500 font-bold uppercase">Confidence Justification</span>
                                    <p className="text-[9px] text-indigo-300 leading-tight mt-1">{issue.telemetry.evidence.confidence_justification}</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-slate-800">
                                <span className="text-[8px] text-slate-500 font-bold uppercase mb-1 block">Limitations</span>
                                <div className="space-y-1">
                                    {issue.telemetry.evidence.limitations.map((lim, i) => (
                                        <div key={i} className="text-[9px] text-slate-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" /> {lim}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                      ))
                  )}
              </div>
              
              <div className="mt-auto h-[340px] bg-slate-900/50 border-t border-slate-800 p-4">
                  <VehicleSchematic issues={result.images.flatMap(img => img.detectedIssues)} onPartClick={setSelectedPart} selectedPart={selectedPart} />
              </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-5">
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 flex items-center justify-between shadow-xl">
                  <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Audit Protocols</span>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowHull(!showHull)} className={`flex items-center gap-2 text-[10px] font-black uppercase px-4 py-2 rounded-xl border ${showHull ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                               {showHull ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} Hull Gate
                            </button>
                            <div className="px-3 py-2 bg-slate-800 rounded-xl flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">SLAM_LINK_ACTIVE</span>
                            </div>
                        </div>
                      </div>
                  </div>
              </div>

              <div className="flex-1 bg-slate-950 rounded-[3rem] border border-slate-800 relative overflow-hidden shadow-2xl flex flex-col justify-center items-center">
                  {files[selectedMediaIndex] && (
                      <canvas 
                        ref={canvasRef} 
                        className="max-w-full h-full object-contain cursor-crosshair transition-all duration-700 shadow-2xl" 
                      />
                  )}

                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 p-4 bg-slate-900/90 backdrop-blur-3xl rounded-3xl border border-white/5 shadow-2xl">
                        {files.map((f, i) => (
                            <button key={i} onClick={() => setSelectedMediaIndex(i)} className={`relative min-w-[70px] w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedMediaIndex === i ? 'border-indigo-500 scale-110 shadow-2xl shadow-indigo-500/40' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                                <img src={f.previewUrl} className="w-full h-full object-cover" />
                                <div className="absolute top-1 right-1 px-1 bg-indigo-500 text-white text-[8px] font-black rounded uppercase">V{i+1}</div>
                            </button>
                        ))}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
