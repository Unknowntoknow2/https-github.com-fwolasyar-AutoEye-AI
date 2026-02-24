
export interface GroundingSource {
  title: string;
  uri: string;
}

export interface CalibrationData {
  mm_per_unit?: number;
  reference_object_detected: boolean;
  reference_type?: 'credit_card' | 'id_card' | 'ruler' | 'none';
  confidence_scale: number;
  skew_factor?: number;
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

export interface ForensicTopology {
  peak_deformation_depth_microns: number;
  total_volume_loss_mm3: number;
  mesh_density_score: number;
  point_cloud_density_mm: number;
  refractive_compensation_active: boolean;
  normal_alignment_score: number;
  oxidation_index?: number; 
  crease_integrity_score?: number; 
}

export interface AdversarialAudit {
  lighting_consistency_score: number;
  noise_fingerprint_status: 'authentic' | 'generative_smoothing_detected' | 'composite_layer_detected';
  snr_db: number;
  is_valid_for_insurance: boolean;
  rejection_reason?: string;
  cryptographic_hash?: string;
}

export type PartTier = 'OEM' | 'Aftermarket' | 'Recycled';

export interface RegionalPricing {
  labor_rate_per_hour: number;
  parts_markup_percent: number;
  tax_rate_percent: number;
  location_name: string;
}

export interface ForensicTelemetry {
  estimated_crush_depth_mm: number;
  material_type: 'metal' | 'glass' | 'plastic' | 'rubber' | 'composite' | 'mechanical_assembly';
  gate_results: AuditGateResults; 
  evidence: ForensicEvidence;   
  topology: ForensicTopology;
  grounding_sources?: GroundingSource[];
  localized_market_data?: {
    oem_price: number;
    aftermarket_price: number;
    avg_labor_hours: number;
  };
}

export interface CarIssue {
  id: string;
  part: string;
  cieca_code?: string;
  issueType: 
    | 'Scratch' 
    | 'Dent' 
    | 'Paint Chip' 
    | 'Rust' 
    | 'Crack' 
    | 'Gap' 
    | 'Misalignment' 
    | 'Structural Disintegration' 
    | 'Missing Component' 
    | 'Component Fracture' 
    | 'Lighting Failure' 
    | 'Underbody Shield Damage' 
    | 'Structural Support Breach' 
    | 'Grill Breach' 
    | 'Paint Oxidation'
    | 'Edge/Crease Deformation'
    | 'Lens Fracture' 
    | 'Bracket Failure';
  severity: 'Critical' | 'Severe' | 'Moderate' | 'Minor';
  description: string;
  confidence: number;
  status: 'verified' | 'provisional' | 'rejected';
  sourceFileIndex: number;
  measured_length_mm?: number;
  evidence: { 
    polygon_points: [number, number][];
  };
  telemetry: ForensicTelemetry;
  repair_suggestion?: { 
    method: 'Replace' | 'Repair' | 'PDR' | 'Refinish'; 
    labor_hours: number;
    refinish_hours: number;
    estimated_cost: number; // This will now be dynamic based on tier selected in UI
    cieca_operation: string;
  };
}

export interface ImageAnalysis {
  imageIndex: number;
  vehicle_hull: [number, number][];
  detectedIssues: CarIssue[];
  shot_type: 'standard' | 'macro' | 'dent';
  adversarial_report: {
    is_screen_detected: boolean;
    is_deepfake_detected: boolean;
    moire_pattern_risk: number;
    audit_verdict: 'pass' | 'fail' | 'review';
    forensic_audit?: AdversarialAudit;
  };
  calibration: CalibrationData;
  audit_trail: { id: string; timestamp: string; stage: string; status: string; detail: string; }[];
}

export interface AnalysisResult {
  conditionScore: number;
  blind_trust_score: number;
  is_auction_guaranteed: boolean;
  executiveSummary: string;
  images: ImageAnalysis[];
  consolidatedIssues: ConsolidatedIssue[];
  market_context?: RegionalPricing;
  financials: {
    totalLaborCost: number;
    totalPartsCost: number;
    grandTotal: number;
    currency: string;
    repairDurationDays: number;
    applied_part_tier: PartTier;
  };
  processing_meta: {
    model_version: string;
    inference_time_ms: number;
    precision_tier: string;
    calibration_status: string;
    consensus_tier: string;
    is_anti_spoof_passed: boolean;
    compliance_audit_id: string;
    global_adversarial_status: 'authentic' | 'compromised' | 'low_fidelity';
    forensic_signature: string;
  };
  vehicleId?: string;
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
  total_labor_hours: number;
  total_refinish_hours: number;
  consolidated_cost: number;
  relative_centroid: [number, number];
  consensus_score: number;
  volumetric_consistency_score: number;
  physical_max_dimension_mm?: number;
  verified_market_sources?: GroundingSource[];
}

export interface UploadedFile {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  metadata?: { lat?: number; lng?: number; timestamp?: string; };
  analysis?: ImageAnalysis;
}

export interface CaseDetails {
  vin: string;
  vehicleLabel: string;
}

export interface EvaluationMetrics {
  precision: number;
  recall: number;
  f1: number;
  meanIoU: number;
  dimensionErrorPercent: number;
}

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

export interface BenchmarkImageResult {
  imageId: string;
  metrics: EvaluationMetrics;
  falsePositives: number;
  falseNegatives: number;
  compliance_id: string;
}

export interface BenchmarkReport {
  timestamp: string;
  modelVersion: string;
  overallMetrics: EvaluationMetrics;
  perImageResults: BenchmarkImageResult[];
}
