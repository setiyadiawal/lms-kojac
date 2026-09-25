
export type InvoiceStatus = 'draft' | 'issued' | 'partial' | 'paid' | 'void';
export type PricingMode = 'hourly' | 'per_student';
export type RecipientKind = 'student' | 'institution';

export type InvoicePaymentMethod = {
  id?: string | null;
  method_type?: string | null;
  label: string;
  account_name?: string | null;
  account_number?: string | null;
  is_active?: boolean;
  sort_order?: number;
};

export type InvoiceSession = {
  id?: string | null;
  source_report_id?: string | null;
  session_date: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  sort_order?: number;
};

export type InvoicePayment = {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

export type InvoiceRow = {
  id: string;
  recipient_user_id?: string | null;
  recipient_kind: RecipientKind;
  class_id?: string | null;
  invoice_code: string;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus | string;
  invoice_number?: string | null;
  pricing_mode: PricingMode;
  recipient_name: string;
  recipient_address?: string | null;
  recipient_phone?: string | null;
  sender_name?: string | null;
  sender_address?: string | null;
  sender_phone?: string | null;
  item_label: string;
  class_name_snapshot?: string | null;
  total_sessions: number;
  total_minutes: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
  additional_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_methods_snapshot?: InvoicePaymentMethod[];
  notes?: string | null;
  session_start?: string | null;
  session_end?: string | null;
  created_at?: string | null;
  issued_at?: string | null;
  paid_at?: string | null;
  voided_at?: string | null;
  void_reason?: string | null;
};

export type InvoiceDetail = InvoiceRow & {
  sessions: InvoiceSession[];
  payments: InvoicePayment[];
};

export type InvoiceSetup = {
  organization?: {
    sender_name?: string;
    sender_address?: string;
    sender_phone?: string;
  } | null;
  students: Array<{
    user_id: string;
    name: string;
    billing_name?: string | null;
    address?: string | null;
    phone?: string | null;
  }>;
  classes: Array<{
    id: string;
    name: string;
    code?: string | null;
  }>;
  payment_methods: InvoicePaymentMethod[];
};

export type InvoiceOverview = {
  rows: InvoiceRow[];
  summary: {
    total_invoices: number;
    total_amount: number;
    paid_amount: number;
    outstanding_amount: number;
    overdue_count: number;
  };
};
