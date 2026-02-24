
import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, Camera, Zap, ShieldCheck, Sparkles, Layers, ArrowRight, XCircle, Info, ScanBarcode, FileText, Check, Loader2 } from './Icons';
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

const UploadSection: React.FC<UploadSectionProps> = ({ 
  files, 
  onFilesSelected, 
  onRemoveFile,
  onAnalyze,
  onStartCamera,
  isAnalyzing
}) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getGeoContext = (): Promise<{ lat: number, lng: number, timestamp: string } | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(undefined);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ 
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude, 
          timestamp: new Date().toISOString() 
        }),
        () => resolve(undefined),
        { timeout: 5000 }
      );
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const geo = await getGeoContext();
      const newFiles = Array.from(e.dataTransfer.files).map((file: File) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        type: file.type.startsWith('video') ? 'video' : 'image',
        captureTier: 'Tier_C',
        metadata: geo
      } as UploadedFile));
      onFilesSelected(newFiles);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const geo = await getGeoContext();
      const newFiles = Array.from(e.target.files).map((file: File) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        type: file.type.startsWith('video') ? 'video' : 'image',
        captureTier: 'Tier_C',
        metadata: geo
      } as UploadedFile));
      onFilesSelected(newFiles);
      e.target.value = ''; 
    }
  };

  if (isAnalyzing) {
    return (
      <div className="w-full max-w-2xl mx-auto py-24 flex flex-col items-center justify-center animate-fade-in">
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-indigo-500/20 blur-[80px] rounded-full animate-pulse"></div>
          <div className="relative w-48 h-48 border-[6px] border-indigo-500/10 rounded-full flex items-center justify-center">
            <div className="w-32 h-32 border-[6px] border-indigo-500/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
            <Zap className="absolute w-16 h-16 text-indigo-400 animate-pulse" />
          </div>
        </div>
        <h2 className="text-4xl font-black text-white text-center mb-4 tracking-tight uppercase">Forensic Sync</h2>
        <p className="text-slate-400 font-medium text-center max-w-md mb-8">
          The Signal Integrity Analyst is currently verifying the physics of the photo and scanning for adversarial noise patterns.
        </p>
        <div className="w-full bg-slate-800/50 h-2 rounded-full overflow-hidden border border-white/5">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-[shimmer_2s_infinite]" style={{ width: '75%' }}></div>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto px-6 py-12 flex flex-col items-center animate-fade-in">
        <header className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-4">
            <Sparkles className="w-3 h-3" /> 2026 Forensic Standards
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none mb-6">
            Visual <span className="text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400">Integrity</span>
          </h1>
          <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto">
            Metrology-grade vehicle audits with automated adversarial signal checks and physics-based light synchronization.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-20">
          <div 
            onClick={() => onStartCamera('inspection')}
            className="group relative h-80 glass-panel rounded-[3rem] p-10 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-[1.02] hover:border-indigo-500/50 active:scale-95"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl group-hover:rotate-6 transition-transform">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Active Scan</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Certified Forensic Entry</p>
          </div>

          <div 
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`group relative h-80 glass-panel rounded-[3rem] p-10 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-[1.02] active:scale-95 border-dashed ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10'}`}
          >
            <div className="w-24 h-24 bg-slate-800 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl group-hover:-rotate-6 transition-transform">
              <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-white" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Bulk Import</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Automated Metadata Extraction</p>
            <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileChange} />
          </div>
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60">
          {[
            { icon: <ShieldCheck />, title: "Adversarial Check", desc: "Detection of AI smoothing & layer masking." },
            { icon: <Layers />, title: "Solar Azimuth Sync", desc: "Physics validation via GPS shadow matching." },
            { icon: <Zap />, title: "10-Micron Guard", desc: "SNR audit for metrology-grade precision." }
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center text-center p-6 bg-white/5 rounded-3xl border border-white/10">
              <div className="p-3 bg-white/5 rounded-2xl mb-4 text-indigo-400">{feature.icon}</div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white mb-2">{feature.title}</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-12 animate-fade-in">
      <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Forensic Pool</h2>
          <p className="text-slate-500 font-mono text-[10px] font-bold tracking-[0.4em] mt-2 italic">STAGING FOR ADVERSARIAL AUDIT</p>
        </div>
        <div className="flex gap-4">
           <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 glass-panel rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-all">Add Files</button>
           <button onClick={onAnalyze} className="px-10 py-3 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
             Validate Signal <ArrowRight className="w-3 h-3" />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {files.map((file, i) => (
          <div key={i} className="group relative aspect-square rounded-[2.5rem] overflow-hidden glass-panel border-2 border-transparent hover:border-indigo-500 transition-all shadow-2xl">
            <img src={file.previewUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
               <button onClick={() => onRemoveFile(i)} className="text-[10px] font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
                 <XCircle className="w-3 h-3" /> Discard
               </button>
            </div>
            {file.metadata && (
              <div className="absolute top-4 right-4 p-1.5 bg-indigo-500 rounded-lg text-white shadow-lg">
                <ShieldCheck className="w-3 h-3" />
              </div>
            )}
            <div className="absolute top-4 left-4 w-6 h-6 rounded-lg bg-black/60 backdrop-blur-md flex items-center justify-center text-[10px] font-black text-white border border-white/10">
              {i + 1}
            </div>
          </div>
        ))}
      </div>
      <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileChange} />
    </div>
  );
};

export default UploadSection;
