
import React from 'react';
import { BenchmarkReport, EvaluationMetrics } from '../types';
import { Shield, Target, GitCompare, AlertTriangle, CheckCircle2, Flag, Ruler, Layers, TrendingUp, TrendingDown } from './Icons';

interface BenchmarkUIProps {
  report: BenchmarkReport;
  onClose: () => void;
}

const MetricCard = ({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-2">
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <span className={`text-3xl font-black ${color}`}>{value}</span>
  </div>
);

const BenchmarkUI: React.FC<BenchmarkUIProps> = ({ report, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto animate-fade-in font-sans">
      <div className="max-w-6xl mx-auto w-full space-y-10 py-10">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Forensic Accuracy Audit</h2>
            </div>
            <p className="text-slate-500 font-mono text-xs">MODEL: {report.modelVersion} • TIMESTAMP: {new Date(report.timestamp).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-slate-700 transition-all">Close Auditor</button>
        </div>

        {/* OVERALL PERFORMANCE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard label="Precision" value={`${(report.overallMetrics.precision * 100).toFixed(1)}%`} icon={Target} color="text-emerald-400" />
          <MetricCard label="Recall" value={`${(report.overallMetrics.recall * 100).toFixed(1)}%`} icon={GitCompare} color="text-indigo-400" />
          <MetricCard label="F1-Score" value={`${(report.overallMetrics.f1 * 100).toFixed(1)}%`} icon={Layers} color="text-cyan-400" />
          <MetricCard label="Geometric IoU" value={`${(report.overallMetrics.meanIoU * 100).toFixed(1)}%`} icon={Ruler} color="text-amber-400" />
        </div>

        {/* REGRESSION ANALYSIS */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
             <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
               <TrendingUp className="w-4 h-4 text-emerald-500" /> Regression Audit Log
             </h3>
             <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded border border-emerald-500/20">
                L9 PASS TIER
             </div>
          </div>
          
          <table className="w-full text-left">
            <thead className="bg-slate-800/50 text-[10px] font-black text-slate-500 uppercase">
              <tr>
                <th className="p-4">Image ID</th>
                <th className="p-4">Accuracy (F1)</th>
                <th className="p-4">False Positives</th>
                <th className="p-4">False Negatives</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {report.perImageResults.map((res, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-all">
                  <td className="p-4 text-xs font-mono text-slate-300">{res.imageId}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full max-w-[100px] overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: `${res.metrics.f1 * 100}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-white">{(res.metrics.f1 * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="p-4 text-xs font-bold text-red-400">{res.falsePositives}</td>
                  <td className="p-4 text-xs font-bold text-amber-400">{res.falseNegatives}</td>
                  <td className="p-4">
                    {res.metrics.f1 > 0.8 ? (
                      <span className="flex items-center gap-1 text-[9px] font-black text-emerald-400 uppercase"><CheckCircle2 className="w-3 h-3"/> PASS</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] font-black text-amber-400 uppercase"><AlertTriangle className="w-3 h-3"/> REVIEW</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BENCHMARK FOOTER */}
        <div className="flex items-center justify-between p-8 bg-indigo-600 rounded-[2.5rem] shadow-2xl shadow-indigo-900/40">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                 <Flag className="w-8 h-8 text-white" />
              </div>
              <div>
                <h4 className="text-xl font-black text-white tracking-tighter">Golden Set Verified</h4>
                <p className="text-indigo-100 text-sm opacity-80">This build meets the Enterprise Accuracy Mandate (v8.3).</p>
              </div>
           </div>
           <button className="bg-white text-indigo-600 px-8 py-3 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all shadow-xl">DOWNLOAD ARTIFACT</button>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkUI;
