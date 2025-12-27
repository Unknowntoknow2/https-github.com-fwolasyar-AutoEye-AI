
import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, XCircle, CheckCircle2, Plus, Loader2, ScanBarcode, Car, ArrowRight, Camera, Smartphone, Image as ImageIcon, Ruler, Layers, Target, Box, Info, Sun, Video, MonitorOff, Sparkles, ShieldCheck, Lock, FileText, Check, Zap } from './Icons';
import { UploadedFile, CaseDetails } from '../types';

interface UploadSectionProps {
  files: UploadedFile[];
  onFilesSelected: (files: UploadedFile[]) => void;
  onUpdateFile: (index: number, updates: Partial<UploadedFile>) => void;
  onRemoveFile: (index: number) => void;
  onAnalyze: () => void;
  onStartCamera: (mode: 'inspection' | 'vin', stepId?: string, tier?: 'Tier_A' | 'Tier_B' | 'Tier_C') => void;
  isAnalyzing: boolean;
  caseDetails: CaseDetails;
  onUpdateCaseDetails: (details: CaseDetails) => void;
}

const ANALYSIS_PHASES = [
  "Bundling Matrix Clusters (RPM Optimization)...",
  "Segmenting Structural Sub-Pixel Manifolds...",
  "Reconstructing Volumetric Damage (SLAM)...",
  "Auditing Batch Consistency (Infinite Tier)...",
  "Finalizing Settlement Ready CIECA Payload..."
];

const UploadSection: React.FC<UploadSectionProps> = ({ 
  files, 
  onFilesSelected, 
  onRemoveFile,
  onAnalyze,
  onStartCamera,
  isAnalyzing
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showTierModal, setShowTierModal] = useState(false); 
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [complianceAccepted, setComplianceAccepted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAnalyzing) {
      setCurrentStepIndex(0);
      const interval = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev < ANALYSIS_PHASES.length - 1) return prev + 1;
          return prev;
        });
      }, 2500); 
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const handleTierSelect = (tier: 'Tier_A' | 'Tier_B' | 'Tier_C') => {
    onStartCamera('inspection', `evidence_${files.length + 1}`, tier);
    setShowTierModal(false);
  };

  const handleUploadSelect = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const newFiles = Array.from(e.target.files).map((file) => ({
            file,
            previewUrl: URL.createObjectURL(file),
            type: file.type.startsWith('video') ? 'video' : 'image',
            captureTier: 'Tier_C' 
        } as UploadedFile));
        onFilesSelected(newFiles);
        e.target.value = ''; 
    }
  };

  const triggerAnalyze = () => {
    if (!complianceAccepted) {
      setShowComplianceModal(true);
    } else {
      onAnalyze();
    }
  };

  if (isAnalyzing) {
    return (
        <div className="w-full max-w-4xl mx-auto p-12 flex flex-col items-center justify-center min-h-[60vh] bg-slate-900/80 rounded-[4rem] border-2 border-slate-800 backdrop-blur-xl animate-fade-in shadow-2xl">
           <div className="relative w-40 h-40 mb-12">
              <svg className="animate-spin w-full h-full text-slate-800" viewBox="0 0 24 24">
                 <circle className="opacity-10" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"></circle>
                 <path className="opacity-90 text-indigo-500" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <Zap className="w-12 h-12 text-white animate-pulse mb-2" />
                 <span className="text-[10px] font-black text-indigo-400">BATCHING</span>
              </div>
           </div>
           
           <h3 className="text-3xl font-black text-white mb-4 tracking-tighter text-center uppercase">V9.9.0 Matrix Rebuilder Active</h3>
           <div className="flex items-center gap-3 bg-indigo-500/10 px-6 py-2 rounded-2xl border border-indigo-500/20 mb-12">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <p className="text-indigo-400 font-mono text-[11px] font-bold tracking-widest uppercase">{ANALYSIS_PHASES[currentStepIndex]}</p>
           </div>
           
           <div className="flex gap-4 w-full max-w-sm">
              {ANALYSIS_PHASES.map((_, i) => (
                 <div key={i} className={`h-2 flex-1 rounded-full transition-all duration-700 ${i === currentStepIndex ? 'bg-indigo-500 shadow-[0_0_20px_#6366f1]' : i < currentStepIndex ? 'bg-indigo-900/50' : 'bg-slate-800'}`}></div>
              ))}
           </div>
           <p className="mt-10 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Processing up to {files.length} evidence manifolds in parallel</p>
        </div>
    );
  }

  if (files.length === 0) {
      return (
        <div className="w-full max-w-5xl mx-auto py-12 px-6 flex flex-col items-center animate-fade-in">
            <div className="text-center space-y-4 mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-lg shadow-indigo-900/10">
                    <Zap className="w-3.5 h-3.5" /> High-Volume Infinite Matrix Tier
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-tight">
                    Structural <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">Forensics</span>
                </h1>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
                    Optimized for 100k+ batch uploads. Featuring **Matrix Bundling** to bypass API quota limits and **SLAM Volumetric** reconstruction.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-4xl mb-16">
                <button 
                    onClick={() => setShowTierModal(true)}
                    className="group relative h-72 bg-slate-800/40 hover:bg-slate-800 border-2 border-slate-800 hover:border-indigo-500 rounded-[3rem] flex flex-col items-center justify-center transition-all duration-500 shadow-2xl hover:shadow-indigo-500/20"
                >
                    <div className="w-24 h-24 bg-slate-700 group-hover:bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 transition-all group-hover:rotate-12 group-hover:scale-110">
                        <Camera className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Initialize Scan</h3>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Adjuster Capture Flow</p>
                </button>

                <button 
                    onClick={handleUploadSelect}
                    className="group relative h-72 bg-slate-800/40 hover:bg-slate-800 border-2 border-slate-800 hover:border-emerald-500 rounded-[3rem] flex flex-col items-center justify-center transition-all duration-500 shadow-2xl hover:shadow-emerald-500/20"
                >
                    <div className="w-24 h-24 bg-slate-700 group-hover:bg-emerald-600 rounded-3xl flex items-center justify-center mb-8 transition-all group-hover:-rotate-12 group-hover:scale-110">
                        <UploadCloud className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Bulk Import</h3>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Process Matrix Evidence</p>
                </button>
            </div>
            
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-slate-800/30 p-8 rounded-[2rem] border border-slate-800 space-y-4">
                   <div className="p-3 bg-indigo-500/10 w-fit rounded-2xl"><Zap className="w-6 h-6 text-indigo-400" /></div>
                   <h4 className="text-sm font-black text-white uppercase tracking-widest">Matrix Parallelism</h4>
                   <p className="text-xs text-slate-500 leading-relaxed font-medium">Bundles multiple images into single-request clusters to maximize RPM throughput by 500%.</p>
                </div>
                <div className="bg-slate-800/30 p-8 rounded-[2rem] border border-slate-800 space-y-4">
                   <div className="p-3 bg-emerald-500/10 w-fit rounded-2xl"><ShieldCheck className="w-6 h-6 text-emerald-400" /></div>
                   <h4 className="text-sm font-black text-white uppercase tracking-widest">Forensic Gating</h4>
                   <p className="text-xs text-slate-500 leading-relaxed font-medium">Moire and adversarial detection active. Automatically filters re-photographed screens from evidence.</p>
                </div>
                <div className="bg-slate-800/30 p-8 rounded-[2rem] border border-slate-800 space-y-4">
                   <div className="p-3 bg-cyan-500/10 w-fit rounded-2xl"><Layers className="w-6 h-6 text-cyan-400" /></div>
                   <h4 className="text-sm font-black text-white uppercase tracking-widest">Volumetric SLAM</h4>
                   <p className="text-xs text-slate-500 leading-relaxed font-medium">Reconstructs 3D crush depth from flat 2D evidence across high-volume batch sets.</p>
                </div>
            </div>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
        </div>
      );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-10 space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-10">
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Audit Evidence</h2>
              <p className="text-slate-500 font-mono text-xs font-bold tracking-[0.3em]">V9.9.0 MATRIX PROCESSING :: ACTIVE</p>
            </div>
            <div className="flex items-center gap-4 bg-slate-800/50 px-6 py-3 rounded-2xl border border-slate-700">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{files.length} Manifolds Loaded</span>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {files.map((file, index) => (
               <div key={index} className="group relative aspect-square rounded-[2rem] overflow-hidden shadow-2xl border-2 border-slate-800 hover:border-indigo-500 transition-all cursor-pointer">
                  <img src={file.previewUrl} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
                   <button 
                     onClick={(e) => { e.stopPropagation(); onRemoveFile(index); }}
                     className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-xl"
                  >
                     <XCircle className="w-4 h-4" />
                  </button>
               </div>
            ))}

            <button 
               onClick={() => setShowTierModal(true)}
               className="aspect-square rounded-[2rem] border-2 border-dashed border-slate-700 bg-slate-800/20 hover:bg-slate-800 hover:border-indigo-500 text-slate-500 flex flex-col items-center justify-center gap-4 transition-all group"
            >
               <div className="w-16 h-16 rounded-2xl bg-slate-800 group-hover:bg-indigo-500/20 flex items-center justify-center transition-all">
                  <Plus className="w-8 h-8" />
               </div>
               <span className="text-[10px] font-black uppercase tracking-widest">Add Evidence</span>
            </button>
        </div>

        <div className="flex flex-col items-center pt-12 border-t border-slate-800">
            <button
              onClick={triggerAnalyze}
              disabled={files.length === 0}
              className={`
                px-16 py-6 rounded-3xl font-black text-xl shadow-2xl flex items-center gap-4 transition-all transform hover:scale-[1.02] active:scale-95
                ${files.length > 0 
                  ? 'bg-white text-black hover:bg-slate-100' 
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'}
              `}
            >
               <span className="uppercase tracking-tighter">Run Infinite Matrix Audit</span>
               <Zap className="w-6 h-6" />
            </button>
            <p className="mt-6 text-[9px] text-slate-500 font-black uppercase tracking-[0.4em]">High-throughput tier v9.9 activated</p>
        </div>

        {showComplianceModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in zoom-in-95">
                <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 w-full max-w-2xl shadow-2xl">
                    <div className="flex items-center gap-6 mb-10">
                        <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-3xl"><ShieldCheck className="w-10 h-10" /></div>
                        <div>
                            <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Settlement Readiness</h3>
                            <p className="text-slate-500 text-[10px] font-black tracking-widest uppercase">Forensic Matrix Tier 9.9.0</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4 mb-10 bg-black/40 p-8 rounded-[2rem] border border-white/5 text-slate-400 text-xs leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar">
                        <p className="font-black text-white uppercase text-[10px] tracking-widest mb-4">Liability Protocol:</p>
                        <p>1. **Infinite Matrix Scaling:** This build utilizes high-frequency batching to process evidence at scale. Automated backoff is active to prevent API provider throttle.</p>
                        <p>2. **Adversarial Gating:** Images flagged for Moire patterns or digital screen re-photography will be automatically rejected to ensure settlement integrity.</p>
                        <p>3. **Precision:** SLAM Volumetric analysis is derived from viewpoint consensus. Minimum 3 angles recommended for structural disintegration reports.</p>
                    </div>
                    
                    <div className="flex gap-4">
                        <button onClick={() => setShowComplianceModal(false)} className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all">Cancel</button>
                        <button onClick={() => { setComplianceAccepted(true); setShowComplianceModal(false); onAnalyze(); }} className="flex-1 py-5 bg-white hover:bg-slate-100 text-black rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl">
                            <Zap className="w-4 h-4" /> Accept & Initialize
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default UploadSection;
