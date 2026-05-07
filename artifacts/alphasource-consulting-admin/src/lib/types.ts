export type AdminUser = {
  id: string;
  email: string;
};

export type AdminMeResponse = {
  ok: true;
  user: AdminUser;
  role: "admin";
};

export type BillingSummary = {
  checkoutSessionCount: number;
  paidCheckoutSessionCount: number;
  openCheckoutSessionCount: number;
  manualOverrideCount: number;
  latestPaymentStatus: string | null;
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

export type StripeCustomerSummary = {
  stripeCustomerId: string | null;
  livemode: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CheckoutSessionSummary = {
  id: string;
  stripeCheckoutSessionId: string | null;
  purpose: string | null;
  mode: string | null;
  status: string | null;
  paymentStatus: string | null;
  amountTotal: number | null;
  currency: string | null;
  livemode: boolean | null;
  uploadId: string | null;
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

export type SafeApiError = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
};
