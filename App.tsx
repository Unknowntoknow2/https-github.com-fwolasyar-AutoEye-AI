
import React, { useState, useEffect } from 'react';
import { UploadedFile, AnalysisResult, CaseDetails, BenchmarkReport } from './types';
import UploadSection from './components/UploadSection';
import Dashboard from './components/Dashboard';
import CameraCapture from './components/CameraCapture';
import BenchmarkUI from './components/BenchmarkUI';
import { analyzeVehicleCondition, extractVinFromImage } from './services/geminiService';
import { runFullBenchmark, GOLDEN_DATASET } from './services/benchmarkService';
import { Car, Loader2, AlertCircle, Shield, Flag, Clock, RefreshCw, Zap } from './components/Icons';

const App: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<{ message: string, type: 'quota' | 'generic' } | null>(null);
  const [quotaWait, setQuotaWait] = useState<number>(0);
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);
  
  // Camera & Case State
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessingVin, setIsProcessingVin] = useState(false);
  const [caseDetails, setCaseDetails] = useState<CaseDetails>({ vin: '', vehicleLabel: '' });
  const [caseId, setCaseId] = useState<string>('');

  useEffect(() => {
    generateCaseId();
  }, []);

  useEffect(() => {
    let timer: any;
    if (quotaWait > 0) {
      timer = setInterval(() => {
        setQuotaWait(prev => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quotaWait]);

  const generateCaseId = () => {
    setCaseId(`CASE-${new Date().getTime()}`);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    setQuotaWait(0);

    try {
      const analysisData = await analyzeVehicleCondition(files, caseDetails, (isWaiting, waitSeconds) => {
          if (isWaiting) setQuotaWait(waitSeconds);
          else setQuotaWait(0);
      });
      setResult({ ...analysisData, vehicleId: caseDetails.vehicleLabel || 'Batch Audit' });
    } catch (err: any) {
      console.error(err);
      setError({ message: err.message || "Forensic analysis failed.", type: 'generic' });
    } finally {
      setIsAnalyzing(false);
      setQuotaWait(0);
    }
  };

  const resetApp = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setQuotaWait(0);
    generateCaseId();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col font-sans">
      {/* NAVBAR */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur fixed top-0 w-full z-50">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={resetApp}>
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg"><Car className="w-5 h-5 text-white" /></div>
            <div className="flex flex-col">
               <span className="font-bold text-lg tracking-tight leading-none">AutoEye<span className="text-indigo-400">AI</span></span>
               <span className="text-[10px] text-slate-500 font-mono uppercase">V11.0 Fluid</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fluid Matrix Tier</span>
             </div>
             <Shield className="w-5 h-5 text-indigo-500/40" />
          </div>
        </div>
      </nav>

      {/* QUOTA COUNTDOWN OVERLAY */}
      {quotaWait > 0 && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center text-center p-8 animate-fade-in">
           <div className="relative w-48 h-48 mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                 <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-800" />
                 <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="5" strokeDasharray="283" strokeDashoffset={283 - (283 * (quotaWait / 60))} className="text-indigo-500 transition-all duration-1000 stroke-cap-round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                 <span className="text-5xl font-black text-white">{quotaWait}</span>
              </div>
           </div>
           <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">Quota Cooling Period</h3>
           <p className="max-w-md text-slate-400 text-sm font-medium leading-relaxed">
             The AI Provider has triggered a mandatory reset window. V11.0 is self-throttling to prevent permanent blocking. **Audit will resume automatically.**
           </p>
           <div className="mt-8 flex items-center gap-3 text-indigo-400 bg-indigo-500/10 px-6 py-2 rounded-2xl border border-indigo-500/20">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Retrying with half batch size...</span>
           </div>
        </div>
      )}

      <main className="flex-grow pt-24 px-4">
        {!result ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
            <UploadSection 
              files={files} 
              onFilesSelected={(f) => { setFiles(prev => [...prev, ...f]); setError(null); }} 
              onRemoveFile={(i) => setFiles(prev => prev.filter((_, idx) => idx !== i))}
              onAnalyze={handleAnalyze}
              onStartCamera={(m) => setShowCamera(true)}
              isAnalyzing={isAnalyzing && quotaWait === 0}
              caseDetails={caseDetails}
              onUpdateCaseDetails={setCaseDetails}
              onUpdateFile={(i, u) => setFiles(prev => prev.map((f, idx) => idx === i ? {...f, ...u} : f))}
            />
            
            {error && (
              <div className="max-w-xl mx-auto px-8 py-6 rounded-[2.5rem] border-2 bg-red-500/5 border-red-500/30 text-red-200 shadow-2xl animate-fade-in">
                 <div className="flex items-start gap-5">
                    <div className="p-4 rounded-2xl bg-red-500/10 text-red-500"><AlertCircle className="w-6 h-6" /></div>
                    <div className="flex flex-col gap-2">
                       <span className="font-black uppercase tracking-[0.2em] text-[10px]">Audit Halted</span>
                       <p className="text-sm font-semibold leading-relaxed opacity-90">{error.message}</p>
                    </div>
                 </div>
              </div>
            )}
          </div>
        ) : (
          <Dashboard 
            result={result} 
            onReset={resetApp} 
            files={files}
            caseId={caseId}
            vin={caseDetails.vin}
          />
        )}
      </main>

      <footer className="py-8 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-xs font-bold tracking-widest uppercase opacity-40">
          <p>© 2025 AutoEye AI. V11 Fluid Matrix Enabled.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
