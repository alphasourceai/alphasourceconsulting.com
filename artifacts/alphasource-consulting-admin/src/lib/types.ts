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
  successUrl: string;
  cancelUrl: string;
};

export type CreateCheckoutSessionResponse = {
  ok: true;
  checkoutSessionId: string;
  url: string;
  status: string | null;
  paymentStatus: string | null;
};

export type SafeApiError = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
};
