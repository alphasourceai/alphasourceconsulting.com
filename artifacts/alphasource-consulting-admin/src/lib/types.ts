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

export type SafeApiError = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
  };
};
