
import { jsPDF } from "jspdf";
import { AnalysisResult, UploadedFile } from "../types";

export const generateForensicReport = async (result: AnalysisResult, files: UploadedFile[], caseId: string, vin: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 20;

  doc.setFillColor(15, 23, 42); 
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("AutoEye AI Forensic Audit", margin, 25);
  doc.setFontSize(10);
  doc.text(`ID: ${caseId} | VIN: ${vin || 'N/A'}`, margin, 35);

  y = 60;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text("Executive Summary", margin, y);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(result.executiveSummary, pageWidth - 2 * margin), margin, y);
  
  y += 20;
  doc.setFont("helvetica", "bold");
  doc.text("Financial Breakdown", margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.text(`Labor: $${result.financials.totalLaborCost.toLocaleString()}`, margin + 5, y); y += 6;
  doc.text(`Parts: $${result.financials.totalPartsCost.toLocaleString()}`, margin + 5, y); y += 6;
  doc.text(`Total Liability: $${result.financials.grandTotal.toLocaleString()}`, margin + 5, y);

  y += 15;
  doc.setFont("helvetica", "bold");
  doc.text("Consolidated Anomalies", margin, y);
  y += 10;
  result.consolidatedIssues.forEach(issue => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${issue.part.toUpperCase()} - ${issue.issueType}`, margin + 5, y);
    doc.setFont("helvetica", "normal");
    const dims = issue.physical_max_dimension_mm ? ` | Max Dim: ${Math.round(issue.physical_max_dimension_mm)}mm` : '';
    doc.text(`Severity: ${issue.severity}${dims} | Estimate: $${issue.consolidated_cost}`, margin + 5, y + 5);
    y += 12;
  });

  doc.save(`Forensic_Report_${caseId}.pdf`);
};
