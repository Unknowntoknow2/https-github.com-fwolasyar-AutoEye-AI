import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, XCircle, CheckCircle2, Plus, Loader2, ScanBarcode, Car, ArrowRight, Camera, Smartphone, Image as ImageIcon, Ruler, Layers, Target, Box, Info, Sun, Video } from './Icons';
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
  "Preprocessing images (Reflection Check)...",
  "Running Ensemble: YOLO + SegFormer...",
  "Orchestrating HRNet scratch detection...",
  "Calculating Tier-C depth estimation...",
  "Generating Forensic Audit Pack..."
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false); // New Tier Modal
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAnalyzing) {
      setCurrentStepIndex(0);
      const interval = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev < ANALYSIS_PHASES.length - 1) return prev + 1;
          return prev;
        });
      }, 1500); 
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const handleTierSelect = (tier: 'Tier_A' | 'Tier_B' | 'Tier_C') => {
    // Pass the selected tier to the camera
    onStartCamera('inspection', `evidence_${files.length + 1}`, tier);
    setShowTierModal(false);
    setShowAddModal(false);
  };

  const handleCameraClick = () => {
    setShowAddModal(false);
    setShowTierModal(true); // Open Tier Selection instead of Camera directly
  };

  const handleUploadSelect = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
    setShowAddModal(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        // Convert FileList to Array
        const newFiles = Array.from(e.target.files).map((file) => {
            const originalFile = file as File;
            return {
                file: originalFile,
                previewUrl: URL.createObjectURL(originalFile),
                type: originalFile.type.startsWith('video') ? 'video' : 'image',
                hasReference: originalFile.name.includes('_ref'),
                captureTier: 'Tier_C' // Default for uploads
            } as UploadedFile;
        });
        
        onFilesSelected(newFiles);
        e.target.value = ''; // Reset input
    }
  };

  // --- VIEW: ANALYZING LOADER ---
  if (isAnalyzing) {
    return (
        <div className="w-full max-w-4xl mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh] bg-slate-900/50 rounded-3xl border border-slate-800 backdrop-blur-sm animate-fade-in">
           <div className="relative w-32 h-32 mb-10">
              <svg className="animate-spin w-full h-full text-slate-800" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none"></circle>
                 <path className="opacity-75 text-indigo-500" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                 <Car className="w-10 h-10 text-white animate-pulse" />
              </div>
           </div>
           
           <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">AI Orchestration Active</h3>
           <p className="text-indigo-400 font-mono text-sm animate-pulse mb-10">{ANALYSIS_PHASES[currentStepIndex]}</p>
           
           <div className="flex gap-3">
              {ANALYSIS_PHASES.map((_, i) => (
                 <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentStepIndex ? 'w-8 bg-indigo-500 shadow-[0_0_10px_#6366f1]' : i < currentStepIndex ? 'w-4 bg-slate-600' : 'w-4 bg-slate-800'}`}></div>
              ))}
           </div>
        </div>
    );
  }

  // --- VIEW: START PAGE (EMPTY STATE) ---
  if (files.length === 0) {
      return (
        <div className="w-full max-w-5xl mx-auto py-12 px-6 flex flex-col items-center animate-fade-in">
            {/* Header Text */}
            <div className="text-center space-y-4 mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <ScanBarcode className="w-3 h-3" /> Engineering Forensic Playbook
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
                    Vehicle Condition <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Scanner</span>
                </h1>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    Execute forensic analysis using Ensemble Models (Object Detection + Segmentation) to detect dents, tears, and structural misalignment.
                </p>
            </div>

            {/* The Two Main Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl mb-12">
                {/* Option 1: Camera (Triggers Tier Select) */}
                <button 
                    onClick={() => setShowTierModal(true)}
                    className="group relative h-64 bg-slate-800/50 hover:bg-slate-800 border-2 border-slate-700 hover:border-indigo-500 rounded-3xl flex flex-col items-center justify-center transition-all duration-300 overflow-hidden shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>
                    <div className="w-20 h-20 bg-slate-700 group-hover:bg-indigo-600 rounded-full flex items-center justify-center mb-6 transition-colors shadow-lg group-hover:scale-110 duration-300">
                        <Camera className="w-9 h-9 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Start Scan</h3>
                    <p className="text-slate-400 text-sm font-medium">Select Tier (A/B/C)</p>
                </button>

                {/* Option 2: Upload */}
                <button 
                    onClick={handleUploadSelect}
                    className="group relative h-64 bg-slate-800/50 hover:bg-slate-800 border-2 border-slate-700 hover:border-emerald-500 rounded-3xl flex flex-col items-center justify-center transition-all duration-300 overflow-hidden shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-1"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>
                    <div className="w-20 h-20 bg-slate-700 group-hover:bg-emerald-600 rounded-full flex items-center justify-center mb-6 transition-colors shadow-lg group-hover:scale-110 duration-300">
                        <UploadCloud className="w-9 h-9 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Upload Evidence</h3>
                    <p className="text-slate-400 text-sm font-medium">Import existing files</p>
                </button>
            </div>
            
            {/* INSPECTION GUIDELINES (FROM BLOG) */}
            <div className="w-full max-w-3xl bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Info className="w-4 h-4"/> Optimal Capture Guidelines</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold"><Video className="w-4 h-4" /> Multi-Angle / Video</div>
                        <p>Use video to track reflections. If a "dent" moves with the camera, it's just a reflection. Real damage stays static.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold"><Sun className="w-4 h-4" /> Avoid Shadows</div>
                        <p>Inspect in even lighting. Shadows can mimic paint loss or obscure micro-damages.</p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold"><ScanBarcode className="w-4 h-4" /> Clean Vehicle</div>
                        <p>Wipe dirt/mud. AI may misinterpret heavy soil as structural damage or corrosion.</p>
                    </div>
                </div>
            </div>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
            
            {/* TIER SELECTION MODAL */}
            {showTierModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-2xl shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Select Capture Tier</h3>
                            <button onClick={() => setShowTierModal(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><XCircle className="w-6 h-6" /></button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {/* Tier A */}
                            <button onClick={() => handleTierSelect('Tier_A')} className="flex items-start gap-4 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-transparent hover:border-cyan-500 transition-all text-left group">
                                <div className="p-3 rounded-full bg-cyan-900/30 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors"><Layers className="w-6 h-6" /></div>
                                <div>
                                    <h4 className="font-bold text-white flex items-center gap-2">Tier A: Sensor Fusion <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded uppercase">Best</span></h4>
                                    <p className="text-sm text-slate-400 mt-1">LiDAR / Depth Map fusion. Sub-millimeter precision.</p>
                                </div>
                            </button>

                            {/* Tier B */}
                            <button onClick={() => handleTierSelect('Tier_B')} className="flex items-start gap-4 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-transparent hover:border-blue-500 transition-all text-left group">
                                <div className="p-3 rounded-full bg-blue-900/30 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Box className="w-6 h-6" /></div>
                                <div>
                                    <h4 className="font-bold text-white">Tier B: Photogrammetry</h4>
                                    <p className="text-sm text-slate-400 mt-1">Multi-view Structure from Motion (SfM). High accuracy volume.</p>
                                </div>
                            </button>

                            {/* Tier C */}
                            <button onClick={() => handleTierSelect('Tier_C')} className="flex items-start gap-4 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-transparent hover:border-emerald-500 transition-all text-left group">
                                <div className="p-3 rounded-full bg-emerald-900/30 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><Target className="w-6 h-6" /></div>
                                <div>
                                    <h4 className="font-bold text-white">Tier C: Monocular + Marker</h4>
                                    <p className="text-sm text-slate-400 mt-1">Single image with ArUco/Card scale. Standard accuracy.</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // --- VIEW: GRID PAGE (FILES EXIST) ---
  return (
    <div className="w-full max-w-6xl mx-auto p-6 md:p-10 space-y-12">
        {/* ... (Existing Grid View Code but make sure Add Button triggers the new flow) */}
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-8">
            <div className="space-y-1">
              <h2 className="text-3xl font-semibold text-white tracking-tight">Evidence Gallery</h2>
              <p className="text-slate-400 font-medium">Review captured images before orchestration.</p>
            </div>
            {/* ... stats ... */}
        </div>

        {/* DYNAMIC GRID LAYOUT */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {files.map((file, index) => (
               <div key={index} className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border-2 border-slate-700 hover:border-indigo-500 transition-all cursor-pointer">
                  <img src={file.previewUrl} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                  {/* ... badges ... */}
                  {file.captureTier && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-indigo-500/80 text-white text-[8px] font-bold uppercase rounded z-10">
                          {file.captureTier.replace('_', ' ')}
                      </div>
                  )}
                  {/* ... remove button ... */}
                   <button 
                     onClick={(e) => { e.stopPropagation(); onRemoveFile(index); }}
                     className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:scale-110 shadow-lg transform translate-y-[-10px] group-hover:translate-y-0 z-20"
                  >
                     <XCircle className="w-4 h-4" />
                  </button>
               </div>
            ))}

            <button 
               onClick={() => setShowTierModal(true)}
               className="aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/30 hover:bg-slate-800 hover:border-indigo-500 hover:text-indigo-400 text-slate-500 flex flex-col items-center justify-center gap-3 transition-all group"
            >
               <div className="w-12 h-12 rounded-full bg-slate-800 group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors">
                  <Plus className="w-6 h-6" />
               </div>
               <span className="text-sm font-bold">Add Evidence</span>
            </button>
        </div>

        <div className="flex justify-center pt-8 border-t border-slate-800/50">
            <button
              onClick={onAnalyze}
              disabled={files.length === 0}
              className={`
                px-12 py-5 rounded-full font-bold text-lg shadow-xl flex items-center gap-3 transition-all transform hover:scale-[1.02]
                ${files.length > 0 
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-900/30 ring-4 ring-indigo-900/20' 
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'}
              `}
            >
               <span>Begin Forensic Analysis</span>
               {files.length > 0 && <ArrowRight className="w-5 h-5" />}
            </button>
        </div>

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
        
        {/* REUSE TIER MODAL HERE FOR GRID ADD */}
        {showTierModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-2xl shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">Select Capture Tier</h3>
                            <button onClick={() => setShowTierModal(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"><XCircle className="w-6 h-6" /></button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {/* Tier A */}
                            <button onClick={() => handleTierSelect('Tier_A')} className="flex items-start gap-4 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-transparent hover:border-cyan-500 transition-all text-left group">
                                <div className="p-3 rounded-full bg-cyan-900/30 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors"><Layers className="w-6 h-6" /></div>
                                <div>
                                    <h4 className="font-bold text-white flex items-center gap-2">Tier A: Sensor Fusion <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded uppercase">Best</span></h4>
                                    <p className="text-sm text-slate-400 mt-1">LiDAR / Depth Map fusion. Sub-millimeter precision.</p>
                                </div>
                            </button>

                            {/* Tier B */}
                            <button onClick={() => handleTierSelect('Tier_B')} className="flex items-start gap-4 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-transparent hover:border-blue-500 transition-all text-left group">
                                <div className="p-3 rounded-full bg-blue-900/30 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Box className="w-6 h-6" /></div>
                                <div>
                                    <h4 className="font-bold text-white">Tier B: Photogrammetry</h4>
                                    <p className="text-sm text-slate-400 mt-1">Multi-view Structure from Motion (SfM). High accuracy volume.</p>
                                </div>
                            </button>

                            {/* Tier C */}
                            <button onClick={() => handleTierSelect('Tier_C')} className="flex items-start gap-4 p-4 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-transparent hover:border-emerald-500 transition-all text-left group">
                                <div className="p-3 rounded-full bg-emerald-900/30 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><Target className="w-6 h-6" /></div>
                                <div>
                                    <h4 className="font-bold text-white">Tier C: Monocular + Marker</h4>
                                    <p className="text-sm text-slate-400 mt-1">Single image with ArUco/Card scale. Standard accuracy.</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
    </div>
  );
};

export default UploadSection;