export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  course: CertificateCourseInfo;
  user: CertificateUserInfo;
  templateId: string;
  template: CertificateTemplate;
  status: CertificateStatus;
  issuedAt: string;
  expiresAt?: string;
  verificationCode: string;
  verificationUrl: string;
  grade?: string;
  score?: number;
  completionDate: string;
  downloadUrl: string;
  pdfUrl?: string;
  metadata: CertificateMetadata;
  blockchain?: BlockchainRecord;
}

export type CertificateStatus =
  | "issued"
  | "active"
  | "revoked"
  | "expired"
  | "pending";

export interface CertificateCourseInfo {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  instructor: {
    id: string;
    name: string;
    avatar: string;
  };
  category: string;
  level: string;
  duration: number;
}

export interface CertificateUserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  design: TemplateDesign;
  layout: TemplateLayout;
}

export interface TemplateDesign {
  backgroundColor: string;
  borderColor: string;
  headerColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl?: string;
  sealUrl?: string;
  pattern?: string;
}

export interface TemplateLayout {
  orientation: "landscape" | "portrait";
  size: "letter" | "a4";
  margins: { top: number; right: number; bottom: number; left: number };
  sections: TemplateSection[];
}

export interface TemplateSection {
  type: "header" | "body" | "footer" | "seal" | "signature" | "qr";
  x: number;
  y: number;
  width: number;
  height: number;
  styles?: Record<string, string | number>;
}

export interface CertificateMetadata {
  completionDate: string;
  totalHours: number;
  modulesCompleted: number;
  totalModules: number;
  grade?: string;
  score?: number;
  skills?: string[];
  achievements?: string[];
}

export interface BlockchainRecord {
  network: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: string;
  contractAddress: string;
  tokenId: string;
}

// Certificate sharing
export interface CertificateShare {
  id: string;
  certificateId: string;
  platform: SharePlatform;
  sharedAt: string;
  clicks: number;
}

export type SharePlatform =
  | "linkedin"
  | "twitter"
  | "facebook"
  | "email"
  | "direct";

export interface ShareData {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
}

// Verification
export interface VerificationResult {
  valid: boolean;
  certificate?: Certificate;
  error?: string;
  verifiedAt: string;
}

// Certificate collection
export interface CertificateCollection {
  userId: string;
  certificates: Certificate[];
  totalHours: number;
  totalCourses: number;
  skills: string[];
  recentActivity: CertificateActivity[];
}

export interface CertificateActivity {
  type: "issued" | "shared" | "verified" | "downloaded";
  certificateId: string;
  courseName: string;
  timestamp: string;
}

// Template management
export interface CreateTemplateInput {
  name: string;
  design: TemplateDesign;
  layout: TemplateLayout;
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  isDefault?: boolean;
}

// Certificate generation
export interface GenerateCertificateInput {
  userId: string;
  courseId: string;
  templateId?: string;
  grade?: string;
  score?: number;
  completionDate?: string;
}

export interface CertificateGenerationResult {
  certificateId: string;
  pdfUrl: string;
  verificationCode: string;
  verificationUrl: string;
}

// Certificate API response
export interface CertificateListResponse {
  certificates: Certificate[];
  total: number;
  page: number;
  pageSize: number;
}

// Badge system (related to certificates)
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: BadgeCategory;
  criteria: BadgeCriteria;
  tier: BadgeTier;
  earnedBy: number;
}

export type BadgeCategory =
  | "course"
  | "skill"
  | "engagement"
  | "social"
  | "achievement";

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export interface BadgeCriteria {
  type: string;
  threshold: number;
  timeframe?: string;
}

export interface UserBadge {
  badgeId: string;
  userId: string;
  earnedAt: string;
  badge: Badge;
}
