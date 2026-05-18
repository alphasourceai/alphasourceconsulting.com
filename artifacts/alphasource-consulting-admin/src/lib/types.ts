export type AdminRole = "super_admin" | "admin" | "analyst" | "billing_admin" | "viewer";

export type AdminPermissions = {
  canReadClients: boolean;
  canWriteClients: boolean;
  canWriteUploads: boolean;
  canReadBilling: boolean;
  canWriteBilling: boolean;
  canReadAnalysis: boolean;
  canWriteAnalysis: boolean;
  canReadPdf: boolean;
  canGeneratePdf: boolean;
  canReadSecureUploads: boolean;
  canWriteSecureUploads: boolean;
  canReadAdminManagement: boolean;
  canManageAdminAccess: boolean;
  canReadAudit: boolean;
};

export type AdminUser = {
  id: string;
  email: string;
  role?: AdminRole | string;
  status?: string;
};

export type AdminAccess = {
  id: string;
  email: string;
  role: AdminRole | string;
  status: string;
};

export type AdminMeResponse = {
  ok: true;
  admin?: AdminAccess;
  permissions?: Partial<AdminPermissions>;
  user: AdminUser;
  role: string;
};

export type AdminAccessUser = {
  userId: string;
  email: string | null;
  displayName?: string | null;
  role: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminUsersResponse = {
  ok: true;
  items: AdminAccessUser[];
};

export type CreateAdminUserAccessRequest = {
  name: string;
  email: string;
  role: AdminRole;
};

export type CreateAdminUserAccessResponse = {
  ok: true;
  adminUser: AdminAccessUser;
  auth?: {
    existingUser?: boolean;
    inviteSent?: boolean;
  };
};

export type UpdateAdminUserAccessRequest = {
  name?: string;
  role?: AdminRole;
  status?: "active" | "inactive";
};

export type UpdateAdminUserAccessResponse = {
  ok: true;
  adminUser: AdminAccessUser;
};

export type AuditEvent = {
  id: string;
  occurredAt: string | null;
  occurredAtMst: string | null;
  source: string | null;
  eventType: string | null;
  actorAdminUserId: string | null;
  actorAdminEmail: string | null;
  actorDisplayName: string | null;
  actorRole: string | null;
  clientEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceSummary: string | null;
  location: string | null;
  metadata: Record<string, unknown>;
  createdAt: string | null;
};

export type AuditEventsQuery = {
  startDate?: string;
  endDate?: string;
  eventType?: string;
  clientEmail?: string;
  actorEmail?: string;
  targetType?: string;
  limit?: number;
  offset?: number;
};

export type AuditEventsResponse = {
  ok: true;
  items: AuditEvent[];
  count: number;
  hasMore: boolean;
};

export type BillingSummary = {
  checkoutSessionCount: number;
  paidCheckoutSessionCount: number;
  openCheckoutSessionCount: number;
  expiredCheckoutSessionCount: number;
  manualOverrideCount: number;
  latestPaymentStatus: string | null;
};

export type BillingOverviewStatus = "open" | "paid" | "expired" | "all";
export type BillingUploadStatus = "active" | "voided" | "all";

export type BillingOverviewSummary = {
  checkoutSessionCount: number;
  paidCheckoutSessionCount: number;
  openCheckoutSessionCount: number;
  expiredCheckoutSessionCount: number;
  manualOverrideCount: number;
  needsReviewEventCount: number;
};

export type AdminClient = {
  email: string;
  latestName: string | null;
  latestOfficeName: string | null;
  latestOrgType: string | null;
  latestPhone: string | null;
  submissionCount: number;
  uploadCount: number;
  latestSubmittedAt: string | null;
  latestStatus: string | null;
  billing: BillingSummary;
};

export type AdminClientsResponse = {
  ok: true;
  items: AdminClient[];
  limit: number;
  offset: number;
  count: number;
  hasMore: boolean;
};

export type CreateAdminClientRequest = {
  email: string;
  firstName: string;
  lastName: string;
  officeName: string;
  orgType: string;
  phone?: string;
};

export type CreatedAdminClient = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  officeName: string | null;
  orgType: string | null;
  phone: string | null;
  submissionCount: number;
  uploadCount: number;
};

export type CreateAdminClientResponse = {
  ok: true;
  client: CreatedAdminClient;
};

export type AdminClientOption = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  officeName: string | null;
  orgType: string | null;
  phone: string | null;
  ghlCid: string | null;
  latestSubmittedAt: string | null;
};

export type AdminClientOptionsResponse = {
  ok: true;
  items: AdminClientOption[];
  limit: number;
  count: number;
};

export type AdminAnalysisError = {
  code: string | null;
  message: string | null;
} | null;

export type AdminAnalysisProviderStatus = {
  ok?: boolean;
  errorType?: string | null;
};

export type AdminAnalysisIssue = {
  title?: string | null;
  impact?: string | null;
  recommendation?: string | null;
  sources?: string[];
  count?: number;
};

export type AdminAnalysisTrend = {
  text?: string | null;
  source?: string | null;
};

export type StructuredExecutiveSummary = {
  summary?: string | null;
  primaryConcern?: string | null;
  recommendedFocus?: string | null;
};

export type StructuredEvidenceItem = {
  label?: string | null;
  value?: string | null;
  sourceHint?: string | null;
};

export type StructuredRankedFinding = {
  rank?: number | null;
  title?: string | null;
  category?: string | null;
  severity?: "low" | "medium" | "high" | "critical" | string | null;
  confidence?: "low" | "medium" | "high" | string | null;
  evidence?: StructuredEvidenceItem[];
  financialValue?: string | null;
  operationalImplication?: string | null;
  recommendedAction?: string | null;
  followUpQuestion?: string | null;
  implementationDifficulty?: "low" | "medium" | "high" | string | null;
  estimatedImpactCategory?: string | null;
  clientFacingSummary?: string | null;
  internalReviewerNotes?: string | null;
};

export type StructuredAnalysis = {
  schemaVersion?: string | null;
  toolType?: "financial" | "ar" | "claims" | string | null;
  executiveSummary?: StructuredExecutiveSummary | null;
  rankedFindings?: StructuredRankedFinding[];
  dataQualityNotes?: string[];
  implementationPriorities?: string[];
  consultantChecklist?: string[];
  suggestedReportSections?: string[];
};

export type StructuredProviderStatus = {
  status?: "parsed" | "missing" | "invalid_json" | "validation_failed" | string | null;
};

export type AdminAnalysisData = {
  sourceFormat?: string | null;
  toolType?: string | null;
  generatedAt?: string | null;
  raw_analyses?: Record<string, string>;
  provider_statuses?: Record<string, AdminAnalysisProviderStatus>;
  provider_structured_outputs?: Record<string, StructuredAnalysis | null>;
  structured_provider_statuses?: Record<string, StructuredProviderStatus | null>;
  structured_analysis?: StructuredAnalysis | null;
  all_trends?: AdminAnalysisTrend[];
  deduplicated_issues?: AdminAnalysisIssue[];
  total_issue_count?: number;
};

export type AdminAnalysisJobFile = {
  id: string;
  jobId: string;
  toolName: string | null;
  originalFilename: string | null;
  contentType: string | null;
  byteSize: number | null;
  uploadFileId: string | null;
  uploadId: string | null;
  status: string | null;
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  erroredAt: string | null;
  processedAt?: string | null;
  error: AdminAnalysisError;
  analysisData?: AdminAnalysisData | null;
};

export type AdminAnalysisJob = {
  id: string;
  status: string | null;
  progressPercent: number;
  currentStep: string | null;
  clientEmail: string | null;
  firstName: string | null;
  lastName: string | null;
  officeName: string | null;
  orgType: string | null;
  phone: string | null;
  ghlCid: string | null;
  clientMode: string | null;
  analysisRunId: string | null;
  submissionId: string | null;
  createdByAdminUserId: string | null;
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  erroredAt: string | null;
  updatedAt: string | null;
  error: AdminAnalysisError;
  files: AdminAnalysisJobFile[];
};

export type AdminAnalysisJobResponse = {
  ok: true;
  job: AdminAnalysisJob;
};

export type AdminAnalysisPhiAcknowledgmentRequest = {
  confirmedNoPhi: boolean;
  initials: string;
  acknowledgmentVersion: string;
};

export type AdminAnalysisProcessRequest = {
  phiAcknowledgment: AdminAnalysisPhiAcknowledgmentRequest;
};

export type AdminAnalysisJobPromotionResponse = AdminAnalysisJobResponse & {
  submissionId?: string | null;
  uploadId?: string | null;
  promoted?: boolean;
};

export type PdfGeneratorClientOption = {
  email: string;
  submissionCount: number;
  eligibleUploadCount: number;
  latestSubmittedAt: string | null;
  latestUploadTime: string | null;
};

export type PdfGeneratorSubmission = {
  id: string;
  clientEmail: string | null;
  firstName: string | null;
  lastName: string | null;
  officeName: string | null;
  orgType: string | null;
  phone: string | null;
  source: string | null;
  status: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  analysisRunId: string | null;
};

export type PdfGeneratorOpportunity = {
  title: string;
  impact: string;
  recommendation: string;
};

export type PdfGeneratorAnalysis = {
  hasAnalysisData: boolean;
  opportunities: PdfGeneratorOpportunity[];
  trends: string[];
  keyTrends: string[];
};

export type PdfGeneratorMetadata = {
  pdfVersion: number;
  pdfUrl: string | null;
  pdfGeneratedAt: string | null;
  reportPath: string | null;
  signedUrl: string | null;
};

export type PdfGeneratorUpload = {
  id: string;
  fileName: string | null;
  toolName: string | null;
  uploadTime: string | null;
  clientEmail: string | null;
  submissionId: string | null;
  paid: boolean;
  analysis: PdfGeneratorAnalysis;
  pdf: PdfGeneratorMetadata;
  warnings: string[];
};

export type PdfGeneratorOptionsResponse = {
  ok: true;
  clients: PdfGeneratorClientOption[];
  count: number;
};

export type PdfGeneratorClientResponse = {
  ok: true;
  clientEmail: string;
  submissions: PdfGeneratorSubmission[];
  uploads: PdfGeneratorUpload[];
  count: number;
};

export type GeneratePdfReportRequest = {
  uploadId: string;
  opportunities: PdfGeneratorOpportunity[];
  trends: string[];
  keyTrends: string[];
  additionalNotes: string;
};

export type GeneratePdfReportResponse = {
  ok: true;
  upload: PdfGeneratorUpload;
  pdf: PdfGeneratorMetadata;
  warnings: string[];
};

export type SecureUploadFile = {
  id: string;
  requestId: string | null;
  sessionId: string | null;
  userId: string | null;
  userEmail: string | null;
  originalFilename: string | null;
  contentType: string | null;
  byteSize: number | null;
  gcsBucket: string | null;
  objectName: string | null;
  gsPath: string | null;
  consoleUrl: string | null;
  createdAt: string | null;
  completedAt: string | null;
};

export type SecureUploadFilesQuery = {
  completedOnly?: boolean;
  email?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
};

export type SecureUploadFilesResponse = {
  ok: true;
  items: SecureUploadFile[];
  count: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type SecureUploadDownloadUrlResponse = {
  ok: true;
  downloadUrl: string;
  expiresInSeconds: number;
  expiresAt: string | null;
  fileName: string;
  contentType: string;
};

export type CreateSecureUploadRequestRequest = {
  clientEmail: string;
};

export type SecureUploadRequestMetadata = {
  requestId: string;
  clientEmail: string;
  expiresAt: string | null;
  expiresInMinutes: number;
  emailSent: boolean;
};

export type CreateSecureUploadRequestResponse = {
  ok: true;
  request: SecureUploadRequestMetadata;
};

export type StripeCustomerSummary = {
  stripeCustomerId: string | null;
  livemode: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CheckoutSessionSummary = {
  id: string;
  stripeCheckoutSessionId: string | null;
  clientEmail: string | null;
  purpose: string | null;
  mode: string | null;
  status: string | null;
  paymentStatus: string | null;
  amountTotal: number | null;
  currency: string | null;
  checkoutUrl: string | null;
  expiresAt: string | null;
  expiredAt: string | null;
  livemode: boolean | null;
  uploadId: string | null;
  uploadIds: string[];
  relatedUploads: BillingUploadSummary[];
  clientSubmissionId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type BillingUploadSummary = {
  id: string;
  fileName: string | null;
  toolName: string | null;
  paid: boolean | null;
  uploadTime: string | null;
  voided?: boolean | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  voidedByAdminEmail?: string | null;
};

export type BillingOverrideSummary = {
  id: string;
  targetType: string | null;
  targetId: string | null;
  clientEmail: string | null;
  overridePaid: boolean | null;
  reason: string | null;
  adminUserId: string | null;
  createdAt: string | null;
};

export type ClientRecentSubmissionUploadSummary = {
  id: string | null;
  fileName: string | null;
  toolName: string | null;
  paid: boolean | null;
  voided: boolean | null;
  uploadTime: string | null;
};

export type ClientRecentSubmissionSummary = {
  id: string | null;
  status: string | null;
  source: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  erroredAt: string | null;
  errorMessage: string | null;
  ghlCid: string | null;
  upload: ClientRecentSubmissionUploadSummary | null;
};

export type ClientProfileSummary = {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  officeName: string | null;
  orgType: string | null;
  phone: string | null;
  latestGhlCid: string | null;
};

export type ConsultantReviewArchiveItem = {
  id: string | null;
  uploadId: string | null;
  fileName: string | null;
  toolName: string | null;
  uploadTime: string | null;
  paid: boolean;
  voided: boolean;
  pdfGeneratedAt: string | null;
  structuredAnalysis: StructuredAnalysis;
  providerStructuredStatuses?: Record<string, StructuredProviderStatus | null>;
  rawAnalyses?: Record<string, string>;
  generatedAt: string | null;
  sourceFormat: string | null;
};

export type ClientBillingDetailResponse = {
  ok: true;
  clientEmail: string;
  latestGhlCid: string | null;
  clientProfile: ClientProfileSummary;
  customer: StripeCustomerSummary | null;
  summary: BillingSummary;
  checkoutSessions: CheckoutSessionSummary[];
  recentSubmissions: ClientRecentSubmissionSummary[];
  consultantReviews?: ConsultantReviewArchiveItem[];
  uploads: BillingUploadSummary[];
  billingOverrides: BillingOverrideSummary[];
  invoices?: unknown[];
  subscriptions?: unknown[];
};

export type BillingOverviewResponse = {
  ok: true;
  summary: BillingOverviewSummary;
  checkoutSessions: CheckoutSessionSummary[];
  billingOverrides: BillingOverrideSummary[];
  limit: number;
  offset: number;
  count: number;
  hasMore: boolean;
  invoices?: unknown[];
  subscriptions?: unknown[];
};

export type CreateCheckoutSessionRequest = {
  clientEmail: string;
  purpose: string;
  description: string;
  amount: number;
  currency: "usd";
  uploadId?: string;
  uploadIds?: string[];
  successUrl: string;
  cancelUrl: string;
};

export type CreateCheckoutSessionResponse = {
  ok: true;
  checkoutSessionId: string;
  url: string;
  status: string | null;
  paymentStatus: string | null;
  expiresAt?: string | null;
  expiredAt?: string | null;
  uploadId?: string | null;
  uploadIds?: string[];
  relatedUploads?: BillingUploadSummary[];
  clientSubmissionId?: string | null;
};

export type ExpireCheckoutSessionResponse = {
  ok: true;
  checkoutSession: CheckoutSessionSummary;
};

export type VoidAdminUploadRequest = {
  reason: string;
};

export type VoidAdminUploadResponse = {
  ok: true;
  upload: BillingUploadSummary;
};

export type SafeApiError = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
};
