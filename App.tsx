import React, { useState, useEffect } from 'react';
import { UploadedFile, AnalysisResult, CaseDetails } from './types';
import UploadSection from './components/UploadSection';
import Dashboard from './components/Dashboard';
import CameraCapture from './components/CameraCapture';
import { analyzeVehicleCondition, extractVinFromImage } from './services/geminiService';
import { Car, Loader2, AlertCircle, FileText } from './components/Icons';

const App: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'inspection' | 'vin'>('inspection');
  const [cameraStepId, setCameraStepId] = useState<string | undefined>(undefined);
  const [isProcessingVin, setIsProcessingVin] = useState(false);

  // Case Details State (Simplified for Forensic Use)
  const [caseDetails, setCaseDetails] = useState<CaseDetails>({
    vin: '',
    vehicleLabel: ''
  });
  const [caseId, setCaseId] = useState<string>('');

  useEffect(() => {
    generateCaseId();
  }, []);

  const generateCaseId = () => {
    const date = new Date();
    const id = `CASE-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`;
    setCaseId(id);
  };

  const handleFilesSelected = (newFiles: UploadedFile[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    setError(null);
  };

  const handleUpdateFile = (index: number, updates: Partial<UploadedFile>) => {
    setFiles(prev => prev.map((file, i) => (i === index ? { ...file, ...updates } : file)));
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCameraCaptureComplete = async (capturedFiles: File[], qualityTag?: '4K_UHD' | 'HD' | 'SD' | 'LOW_RES') => {
    setShowCamera(false);

    if (cameraMode === 'vin' && capturedFiles.length > 0) {
      // Process VIN scan
      setIsProcessingVin(true);
      try {
        const vin = await extractVinFromImage(capturedFiles[0]);
        if (vin && vin !== 'NOT_FOUND') {
           const cleanedVin = vin.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
           setCaseDetails(prev => ({ ...prev, vin: cleanedVin }));
        } else {
           setError("Could not extract VIN. Please try again or enter manually.");
        }
      } catch (err) {
        setError("Failed to process VIN image.");
      } finally {
        setIsProcessingVin(false);
      }
    } else {
      // Process standard inspection photos
      const processed: UploadedFile[] = capturedFiles.map(file => {
        const isVideo = file.type.startsWith('video');
        // Check if file was captured in reference mode (CameraCapture appends _ref)
        const hasReference = file.name.includes('_ref');
        
        return {
          file,
          previewUrl: URL.createObjectURL(file),
          type: isVideo ? 'video' : 'image',
          segment: isVideo ? { start: '', end: '' } : undefined,
          hasReference,
          qualityRating: qualityTag // Store quality tag from camera
        };
      });
      handleFilesSelected(processed);
    }
  };

  const handleStartCamera = (mode: 'inspection' | 'vin', stepId?: string) => {
    setCameraMode(mode);
    setCameraStepId(stepId);
    setShowCamera(true);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const analysisData = await analyzeVehicleCondition(files, caseDetails);
      // Inject the Case ID into the result for reporting
      setResult({ ...analysisData, vehicleId: analysisData.vehicleId || caseDetails.vehicleLabel || 'Unknown Vehicle' });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Analysis failed. Please try clear images.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetApp = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setCaseDetails({
      vin: '',
      vehicleLabel: ''
    });
    generateCaseId();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex flex-col font-sans">
      {/* Processing Overlay for VIN */}
      {isProcessingVin && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col items-center justify-center text-center">
           <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
           <h3 className="text-xl font-bold text-white">Extracting ID...</h3>
        </div>
      )}

      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur fixed top-0 w-full z-50">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={resetApp}>
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
               <span className="font-bold text-lg tracking-tight leading-none">AutoEye<span className="text-indigo-400">AI</span></span>
               <span className="text-[10px] text-slate-500 font-mono">ENTERPRISE FORENSICS</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Session ID</span>
                <span className="text-xs font-mono text-indigo-300">{caseId}</span>
             </div>
             <div className="h-8 w-px bg-slate-700 hidden md:block"></div>
             <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
               v3.0.0
             </span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow pt-24 px-4">
        {!result ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 animate-fade-in">
            <UploadSection 
              files={files} 
              onFilesSelected={handleFilesSelected} 
              onUpdateFile={handleUpdateFile}
              onRemoveFile={handleRemoveFile}
              onAnalyze={handleAnalyze}
              onStartCamera={handleStartCamera}
              isAnalyzing={isAnalyzing}
              caseDetails={caseDetails}
              onUpdateCaseDetails={setCaseDetails}
            />
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 px-6 py-4 rounded-xl text-center animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex items-center justify-center gap-2 mb-1">
                    <AlertCircle className="w-5 h-5" />
                    <p className="font-medium">Analysis Error</p>
                 </div>
                 <p className="text-sm opacity-80">{error}</p>
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
      
      {/* Footer */}
      <footer className="py-8 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>© 2025 AutoEye AI. Forensic Analysis Tool. Confidential & Proprietary.</p>
        </div>
      </footer>

      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture 
          onCaptureComplete={handleCameraCaptureComplete}
          onClose={() => setShowCamera(false)}
          mode={cameraMode}
          stepId={cameraStepId}
        />
      )}
    </div>
  );
};

export default App;