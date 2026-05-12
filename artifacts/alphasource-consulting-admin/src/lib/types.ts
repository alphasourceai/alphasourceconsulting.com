export type AdminRole = "super_admin" | "admin" | "analyst" | "billing_admin" | "viewer";

export type AdminPermissions = {
  canReadClients: boolean;
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

export type BillingSummary = {
  checkoutSessionCount: number;
  paidCheckoutSessionCount: number;
  openCheckoutSessionCount: number;
  manualOverrideCount: number;
  latestPaymentStatus: string | null;
};

export type BillingOverviewStatus = "open" | "paid" | "all";

export type BillingOverviewSummary = {
  checkoutSessionCount: number;
  paidCheckoutSessionCount: number;
  openCheckoutSessionCount: number;
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

export type AdminAnalysisData = {
  sourceFormat?: string | null;
  generatedAt?: string | null;
  raw_analyses?: Record<string, string>;
  provider_statuses?: Record<string, AdminAnalysisProviderStatus>;
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

export type ClientBillingDetailResponse = {
  ok: true;
  clientEmail: string;
  customer: StripeCustomerSummary | null;
  summary: BillingSummary;
  checkoutSessions: CheckoutSessionSummary[];
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
  uploadId?: string | null;
  uploadIds?: string[];
  relatedUploads?: BillingUploadSummary[];
  clientSubmissionId?: string | null;
};

export type SafeApiError = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
};
