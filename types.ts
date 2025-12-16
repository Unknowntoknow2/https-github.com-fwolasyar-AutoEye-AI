
export interface DamageAttributes {
  length_mm?: number;
  width_mm?: number;
  area_mm2?: number;
  depth_mm?: number; // Estimated via monocular analysis
  volume_cc?: number; // Estimated
  
  // Tier A: Sensor Fusion Data
  sensor_depth_mm?: number; // Sub-millimeter precision from LiDAR/Depth Map
  sensor_volume_cc?: number; 
  scan_uncertainty_mm?: number; // e.g., +/- 0.5mm
  calibration_method?: 'AI_Estimation' | 'Reference_Object' | 'LiDAR_Fusion';
}

export interface DamageEvidence {
  mask_rle?: string; // Run-Length Encoding of damage mask
  depth_map_link?: string;
  marker?: { 
    type: 'ArUco' | 'CreditCard'; 
    size_mm?: number; 
    bbox_px?: number[]; // [x,y,w,h]
    scale_mm_per_px?: number; 
    confidence: number; 
  };
  specular_features?: {
    iso_count: number;
    curvature_mean: number;
    intensity_mean: number;
    color_shift_rgb: [number,number,number];
  };
  pointcloud_link?: string;
  
  // Phase 2: Scratch Engine Output
  scratch_polyline?: Array<[number, number]>; // [x, y] coordinates tracing linear defects
  polygon_points?: Array<[number, number]>; // [x, y] coordinates tracing area defects (Dents, Rust)
  scratch_width_px?: number;
  layer_probabilities?: {
      clear_coat: number;
      primer: number;
      metal: number;
  };
}

export interface AuditPack {
  capture_tier: 'Tier_A' | 'Tier_B' | 'Tier_C';
  model_versions: {
    segmentation: string; // e.g., "SegFormer-b5-v2"
    depth: string;       // e.g., "LiDAR-Fusion-v1.2"
    damage_classifier: string; // e.g., "HRNet-Scratch-v4"
  };
  uncertainty_log: {
    sensor_noise: number;
    segmentation_uncertainty: number;
    scale_uncertainty: number;
  };
  timestamp: string;
  integrity_hash: string; // Simulated cryptographic hash
}

export interface RepairSuggestion {
  method: string;
  estimated_hours: number;
  estimated_cost: number;
  estimated_cost_max?: number;
  currency: string;
  parts_needed?: string[];
}

export interface ImageQuality {
  blur_score: number; // 0-100
  glare_fraction: number; // 0-1
  lighting_condition: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  suitable_for_measurement: boolean;
  has_reference_object?: boolean;
}

export interface CarIssue {
  id: string;
  part: string;
  issueType: 'Scratch' | 'Dent' | 'Paint Chip' | 'Rust' | 'Crack' | 'Misalignment' | 'Gap' | 'Dislocation' | 'Glass Damage' | 'Spider Crack' | 'Glass Chip' | 'Tear' | 'Structure' | 'Fading' | 'Other';
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Critical';
  severity_score: number; // 0-1.0 normalized score
  location: string; 
  visualEvidence: string; 
  description: string;
  boundingBox?: number[]; // [ymin, xmin, ymax, xmax] 0-1000 scale
  confidence?: number; // 0-100
  
  // ROI / CV Gating Fields
  in_roi?: boolean; // Is this issue inside the vehicle hull?
  exclusion_reason?: string; // e.g. "Background", "Reflection", "Pavement"

  // PRODUCTION VALIDATION FIELDS
  inside_hull?: boolean; // Geometric check result
  hull_iou?: number; // Intersection over Union with Hull

  // New Engineering Fields
  attributes?: DamageAttributes;
  repair_suggestion?: RepairSuggestion;
  
  // Provenance & Evidence
  methodology?: string; // e.g., "specular-deflectometry + mask_refine_v2"
  evidence?: DamageEvidence;
  
  sourceFileIndex?: number;
}

export interface FinancialSummary {
  totalLaborCost: number;
  totalPartsCost: number;
  grandTotal: number;
  currency: string;
  repairDurationDays: number;
  tax_amount?: number;
}

export interface CaseDetails {
  vin: string;
  vehicleLabel: string;
}

export interface RoiValidationMetrics {
  hull_defined: boolean;
  detections_inside_hull_pct: number; // Metric: % of issues inside hull
  spatial_consistency_score: number; // Metric: 0-100
}

export interface AnalysisResult {
  conditionScore: number; 
  vehicleId?: string;
  executiveSummary: string;
  
  // Vehicle Hull for ROI Visualization
  vehicle_hull?: Array<[number, number]>; // [x,y] points 0-1000

  // New: ROI Validation Metrics for Production Monitoring
  roi_validation?: RoiValidationMetrics;

  detectedIssues: CarIssue[];
  financials: FinancialSummary;
  image_quality_report?: ImageQuality; 
  methodology_notes?: string[]; 
  audit_pack?: AuditPack; 
  processing_meta?: {
    model_version: string;
    inference_time_ms: number;
  };
}

export interface UploadedFile {
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  segment?: {
    start: string;
    end: string;
  };
  hasReference?: boolean;
  captureTier?: 'Tier_A' | 'Tier_B' | 'Tier_C';
  qualityRating?: '4K_UHD' | 'HD' | 'SD' | 'LOW_RES'; // Audit tag
}
