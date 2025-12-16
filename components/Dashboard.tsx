import React, { useState, useEffect, useRef } from 'react';
import { AnalysisResult, UploadedFile, CarIssue } from '../types';
import { 
  ZoomIn, ZoomOut, Play, Clock,
  ShieldCheck, Loader2, Printer, Flag, Layers,
  ChevronRight, Car
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
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(0);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  
  // Visual Controls matching User's HTML example
  const [overlayOpacity, setOverlayOpacity] = useState(0.40);
  const [hoveredIssueIndex, setHoveredIssueIndex] = useState<number | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredIssues = result.detectedIssues.filter(issue => {
    let partMatch = true;
    if (selectedPart) {
        const rawPart = issue.part.toLowerCase().replace(/ /g, '_');
        partMatch = rawPart.includes(selectedPart) || (selectedPart === 'wheel' && rawPart.includes('wheel'));
    }
    return partMatch;
  });

  // --- CANVAS RENDERING ENGINE (Matches User's Golden Standard) ---
  useEffect(() => {
    if (selectedMediaIndex === null || !files[selectedMediaIndex]) return;

    const file = files[selectedMediaIndex];
    if (file.type !== 'image') return; // Video handled separately

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = file.previewUrl;

    img.onload = () => {
      // 1. Setup Canvas to match Natural Image Dimensions (Pixel Perfect)
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const W = canvas.width;
      const H = canvas.height;

      // 2. Clear & Draw Base Image
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0);

      // 3. Draw Polygons
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      filteredIssues.forEach((issue, idx) => {
        if (typeof issue.sourceFileIndex === 'number' && issue.sourceFileIndex !== selectedMediaIndex) return;
        if (!issue.evidence?.polygon_points || issue.evidence.polygon_points.length < 3) return;

        const isHovered = hoveredIssueIndex === idx;
        
        // Determine Color based on Severity (Crimson/Orange/Gold)
        let fillRgb = '255, 215, 0'; // Gold (Minor)
        let strokeRgb = '200, 140, 0';
        
        if (issue.severity === 'Critical') { fillRgb = '220, 20, 60'; strokeRgb = '180, 10, 10'; }
        else if (issue.severity === 'Severe') { fillRgb = '255, 140, 0'; strokeRgb = '200, 80, 0'; }

        const activeOpacity = isHovered ? Math.min(overlayOpacity + 0.2, 0.9) : overlayOpacity;
        
        // DRAW POLYGON
        ctx.beginPath();
        issue.evidence.polygon_points!.forEach((pt, i) => {
          // GEMINI SCALE IS 0-1000. Convert to Image Pixels.
          const x = (pt[0] / 1000) * W;
          const y = (pt[1] / 1000) * H;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();

        // Fill
        ctx.fillStyle = `rgba(${fillRgb}, ${activeOpacity.toFixed(2)})`;
        ctx.fill();

        // Stroke
        ctx.lineWidth = Math.max(3, Math.round(W / 400)); // Dynamic stroke width
        ctx.strokeStyle = `rgba(${strokeRgb}, 0.95)`;
        ctx.stroke();

        // DRAW LABEL (Directly on canvas, like user's example)
        // Find top-most point for label
        const firstPt = issue.evidence.polygon_points![0];
        const lx = (firstPt[0] / 1000) * W;
        const ly = (firstPt[1] / 1000) * H;

        const fontSize = Math.max(12, Math.round(W / 60));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = 'bottom';
        
        const labelText = issue.part;
        const metrics = ctx.measureText(labelText);
        const pad = fontSize * 0.4;
        
        // Label Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(lx, ly - fontSize - pad * 2, metrics.width + pad * 2, fontSize + pad * 2);

        // Label Text
        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, lx + pad, ly - pad);
      });
    };
  }, [selectedMediaIndex, files, filteredIssues, overlayOpacity, hoveredIssueIndex]);


  // Handler for mouse interaction on canvas to detect hover
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Convert to 0-1000 scale for comparison
    const normX = (x / canvas.width) * 1000;
    const normY = (y / canvas.height) * 1000;

    // Simple Point-in-Polygon Check for Hover
    let foundIndex: number | null = null;
    
    // Check in reverse order (top layers first)
    for (let i = filteredIssues.length - 1; i >= 0; i--) {
        const issue = filteredIssues[i];
        if (typeof issue.sourceFileIndex === 'number' && issue.sourceFileIndex !== selectedMediaIndex) continue;
        if (!issue.evidence?.polygon_points) continue;
        
        // Ray casting algorithm
        const vs = issue.evidence.polygon_points;
        let inside = false;
        for (let j = 0, k = vs.length - 1; j < vs.length; k = j++) {
            const xi = vs[j][0], yi = vs[j][1];
            const xj = vs[k][0], yj = vs[k][1];
            const intersect = ((yi > normY) !== (yj > normY))
                && (normX < (xj - xi) * (normY - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        
        if (inside) {
            foundIndex = i; // Use global index
            break; 
        }
    }
    setHoveredIssueIndex(foundIndex);
  };

  const handleSaveReport = async () => {
    setIsGeneratingReport(true);
    setTimeout(async () => {
        await generateForensicReport(result, files, caseId, vin);
        setIsGeneratingReport(false);
    }, 100);
  };

  const handleSchematicClick = (partKey: string) => {
      setSelectedPart(selectedPart === partKey ? null : partKey);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 space-y-6 pb-20 animate-fade-in font-sans">
      
      {/* --- HEADER --- */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3 bg-[#07101a] border border-slate-800 p-6 rounded-2xl shadow-2xl flex items-center justify-between">
             <div>
                 <h2 className="text-[#cfe8ff] text-xs font-bold uppercase tracking-widest mb-1">Condition Score</h2>
                 <div className="flex items-baseline gap-2">
                     <span className={`text-5xl font-bold tracking-tighter ${result.conditionScore > 8 ? 'text-emerald-400' : result.conditionScore > 5 ? 'text-yellow-400' : 'text-red-500'}`}>
                         {(result.conditionScore / 10).toFixed(1)}
                     </span>
                     <span className="text-xl text-slate-500">/ 10.0</span>
                 </div>
             </div>
          </div>

          <div className="col-span-12 md:col-span-9 bg-[#07101a] border border-slate-800 p-6 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-6">
              <div className="flex flex-col gap-1 pr-6 border-r border-slate-800">
                  <span className="text-xs text-[#9fb6c9] uppercase font-bold">Total Estimate</span>
                  <span className="text-2xl font-bold text-[#e6eef8]">${result.financials.grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-1 pr-6 border-r border-slate-800">
                  <span className="text-xs text-[#9fb6c9] uppercase font-bold">Defects</span>
                  <span className="text-2xl font-bold text-[#e6eef8]">{filteredIssues.length}</span>
              </div>
               <div className="flex gap-3">
                    <button 
                        onClick={handleSaveReport} 
                        disabled={isGeneratingReport}
                        className="bg-[#12202a] text-[#e6eef8] border border-[#234252] px-4 py-2 rounded-lg font-medium text-sm hover:bg-[#1a2c38] transition-colors flex items-center gap-2"
                    >
                        {isGeneratingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                        Export PDF
                    </button>
                    <button onClick={onReset} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-500 transition-colors">
                        New Scan
                    </button>
               </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[750px]">
          
          {/* LEFT: PARTS LIST */}
          <div className="lg:col-span-4 bg-[#07101a] border border-slate-800 rounded-2xl p-4 flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-[#cfe8ff] uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Detected Parts
                  </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  {filteredIssues.length === 0 ? (
                      <div className="text-center py-6 text-slate-600 text-xs">No issues found.</div>
                  ) : (
                      filteredIssues.map((issue, idx) => {
                          const originalIdx = result.detectedIssues.indexOf(issue);
                          const isHovered = hoveredIssueIndex === originalIdx;
                          return (
                          <div 
                              key={idx} 
                              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isHovered ? 'bg-[#12202a] border-indigo-500' : 'bg-[#0b0f14] border-slate-800 hover:border-slate-700'}`}
                              onMouseEnter={() => setHoveredIssueIndex(originalIdx)}
                              onMouseLeave={() => setHoveredIssueIndex(null)}
                              onClick={() => { if(typeof issue.sourceFileIndex === 'number') setSelectedMediaIndex(issue.sourceFileIndex); }}
                          >
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] text-white ${issue.severity === 'Critical' ? 'bg-red-600' : issue.severity === 'Severe' ? 'bg-orange-600' : 'bg-yellow-600'}`}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-[#e6eef8]">{issue.part}</div>
                                    <div className="text-[10px] text-[#9fb6c9]">{issue.issueType}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-mono font-bold text-[#e6eef8]">${issue.repair_suggestion?.estimated_cost}</div>
                                <div className="text-[9px] text-[#9fb6c9]">{Math.round((issue.confidence || 0) * 100)}%</div>
                            </div>
                          </div>
                      )})
                  )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-800 h-1/3">
                  <VehicleSchematic issues={filteredIssues} onPartClick={handleSchematicClick} selectedPart={selectedPart} />
              </div>
          </div>

          {/* RIGHT: CANVAS VIEWER */}
          <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Toolbar */}
              <div className="bg-[#07101a] rounded-2xl border border-slate-800 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <label className="text-[10px] text-[#9fb6c9] font-bold uppercase flex items-center gap-2">
                          Opacity 
                          <input 
                            type="range" 
                            min="0.1" max="0.9" step="0.05" 
                            value={overlayOpacity} 
                            onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                            className="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                          {(overlayOpacity * 100).toFixed(0)}%
                      </label>
                  </div>
              </div>

              {/* Main Viewer - CANVAS IMPLEMENTATION */}
              <div ref={containerRef} className="flex-1 bg-black rounded-2xl border border-slate-800 relative overflow-hidden shadow-2xl flex flex-col justify-center items-center">
                  {selectedMediaIndex !== null && files[selectedMediaIndex] ? (
                      <>
                        {files[selectedMediaIndex].type === 'video' ? (
                             <video 
                               src={files[selectedMediaIndex].previewUrl} 
                               controls 
                               className="block max-w-full h-auto max-h-[600px] object-contain"
                             />
                        ) : (
                             // THE CANVAS - REPLACES IMG+SVG
                             <canvas 
                                ref={canvasRef}
                                className="block max-w-full max-h-[600px] object-contain cursor-crosshair"
                                onMouseMove={handleCanvasMouseMove}
                                onMouseLeave={() => setHoveredIssueIndex(null)}
                             />
                        )}
                      </>
                  ) : (
                      <div className="text-slate-500">No Image Selected</div>
                  )}

                  {/* Thumbnails */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#07101a]/90 backdrop-blur p-2 rounded-xl border border-slate-700 flex gap-2">
                        {files.map((f, i) => (
                            <button 
                                key={i} 
                                onClick={() => setSelectedMediaIndex(i)}
                                className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${selectedMediaIndex === i ? 'border-indigo-500 scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <img src={f.previewUrl} className="w-full h-full object-cover" />
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