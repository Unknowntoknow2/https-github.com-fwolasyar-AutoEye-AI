
export interface CalibrationData {
  mm_per_unit?: number;
  reference_object_detected: boolean;
  reference_type?: 'credit_card' | 'id_card' | 'ruler' | 'none';
  confidence_scale: number;
}

export interface AuditGateResults {
  shot_type: 'far' | 'mid' | 'close';
  hull_coverage: number;
  containment_ratio: number;
  area_ratio_vs_hull: number;
  aspect_ratio: number;
  confidence_floor: number;
  pass_fail: {
    coords_valid: boolean;
    policy_confidence: boolean;
    policy_area: boolean;
    containment: boolean;
    shape_gate: boolean;
    boundary_trap: boolean;
  };
}

export interface ForensicEvidence {
  summary: string;
  negative_evidence: string[];
  confidence_justification: string;
  limitations: string[];
}

export interface ForensicTelemetry {
  estimated_crush_depth_mm: number;
  material_type: 'metal' | 'glass' | 'plastic' | 'rubber' | 'composite';
  gate_results: AuditGateResults; // V9.1 Deterministic Telemetry
  evidence: ForensicEvidence;    // V9.1 Structured Explainability
  is_spoof_detected?: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  stage: 'Adversarial' | 'Spectral' | 'Hull' | 'SLAM' | 'Calibration';
  status: 'passed' | 'warning' | 'flagged';
  detail: string;
}

export interface CarIssue {
  id: string;
  part: string;
  issueType: 'Scratch' | 'Dent' | 'Paint Chip' | 'Rust' | 'Crack' | 'Gap' | 'Misalignment';
  severity: 'Critical' | 'Severe' | 'Moderate' | 'Minor';
  description: string;
  confidence: number;
  status: 'verified' | 'provisional' | 'rejected';
  sourceFileIndex: number;
  validation_warning?: string;
  evidence: { 
    polygon_points: [number, number][];
    gap_line?: [number, number][]; 
  };
  telemetry: ForensicTelemetry;
  repair_suggestion?: { 
    method: string; 
    estimated_cost: number; 
  };
}

export interface ImageAnalysis {
  imageIndex: number;
  vehicle_hull: [number, number][];
  detectedIssues: CarIssue[];
  shot_type: 'standard' | 'macro' | 'dent';
  adversarial_report?: {
    is_screen_detected: boolean;
    confidence: number;
    moire_pattern_risk: number;
  };
  calibration: CalibrationData;
  audit_trail: AuditLogEntry[];
}

export interface ConsolidatedIssue {
  id: string;
  part: string;
  issueType: string;
  severity: string;
  total_instances: number;
  evidence_indices: number[];
  max_confidence: number;
  avg_crush_depth_mm: number;
  consolidated_cost: number;
  relative_centroid: [number, number];
  consensus_score: number;
  volumetric_consistency_score: number;
  // Fix: physical_max_dimension_mm added to satisfy forensic report requirements in services/reportService.ts
  physical_max_dimension_mm?: number;
}

export interface AnalysisResult {
  conditionScore: number;
  executiveSummary: string;
  images: ImageAnalysis[];
  consolidatedIssues: ConsolidatedIssue[];
  financials: {
    totalLaborCost: number;
    totalPartsCost: number;
    grandTotal: number;
    currency: string;
    repairDurationDays: number;
  };
  processing_meta: {
    model_version: string;
    inference_time_ms: number;
    precision_tier: string;
    calibration_status: string;
    consensus_tier: string;
    is_anti_spoof_passed: boolean;
  };
  vehicleId?: string;
}

export interface UploadedFile {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  captureTier?: 'Tier_A' | 'Tier_B' | 'Tier_C';
}

export interface CaseDetails {
  vin: string;
  vehicleLabel: string;
}

// Fix: EvaluationMetrics added to support benchmark reporting and satisfy import requirements
export interface EvaluationMetrics {
  precision: number;
  recall: number;
  f1: number;
  meanIoU: number;
  dimensionErrorPercent: number;
}

// Fix: GroundTruth interfaces added for benchmark validation in services/benchmarkService.ts
export interface GroundTruthIssue {
  part: string;
  issueType: string;
  polygon: [number, number][];
}

export interface GroundTruthSet {
  id: string;
  imageUrl: string;
  issues: GroundTruthIssue[];
}

export interface BenchmarkReport {
  timestamp: string;
  modelVersion: string;
  // Fix: overallMetrics updated to use EvaluationMetrics interface, resolving missing property 'dimensionErrorPercent'
  overallMetrics: EvaluationMetrics;
  // Fix: perImageResults structure defined for better type safety in dashboard and reporting
  perImageResults: {
    imageId: string;
    metrics: EvaluationMetrics;
    falsePositives: number;
    falseNegatives: number;
  }[];
}
