
import { supabase } from '../../lib/supabase';
import type {
  InvoiceDetail,
  InvoiceOverview,
  InvoicePaymentMethod,
  InvoiceRow,
  InvoiceSetup,
} from './types';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export async function getManagementInvoiceSetup(): Promise<InvoiceSetup> {
  const { data, error } = await supabase.rpc('get_management_invoice_setup');
  if (error) throw error;

  const raw = asRecord(data);
  const organization = asRecord(raw.organization ?? raw.organization_settings ?? raw.sender);

  const studentSource = asArray(raw.students ?? raw.student_options ?? raw.recipients);
  const classSource = asArray(raw.classes ?? raw.class_options);
  const paymentSource = asArray(raw.payment_methods ?? raw.paymentMethods);

  return {
    organization: {
      sender_name: textValue(organization.sender_name ?? organization.name),
      sender_address: textValue(organization.sender_address ?? organization.address),
      sender_phone: textValue(organization.sender_phone ?? organization.phone),
    },
    students: studentSource.map((entry) => {
      const row = asRecord(entry);
      return {
        user_id: textValue(row.user_id ?? row.id),
        name: textValue(row.name ?? row.full_name ?? row.billing_name, 'Siswa KOJAC'),
        billing_name: textValue(row.billing_name) || null,
        address: textValue(row.address) || null,
        phone: textValue(row.phone) || null,
      };
    }).filter((row) => row.user_id),
    classes: classSource.map((entry) => {
      const row = asRecord(entry);
      return {
        id: textValue(row.id ?? row.class_id),
        name: textValue(row.name ?? row.class_name, 'Kelas KOJAC'),
        code: textValue(row.code ?? row.class_code) || null,
      };
    }).filter((row) => row.id),
    payment_methods: paymentSource.map((entry) => {
      const row = asRecord(entry);
      return {
        id: textValue(row.id) || null,
        method_type: textValue(row.method_type) || null,
        label: textValue(row.label ?? row.name, 'Pembayaran'),
        account_name: textValue(row.account_name) || null,
        account_number: textValue(row.account_number) || null,
        is_active: row.is_active !== false,
        sort_order: numberValue(row.sort_order),
      } satisfies InvoicePaymentMethod;
    }),
  };
}

function normalizeInvoice(entry: unknown): InvoiceRow {
  const row = asRecord(entry);
  return {
    id: textValue(row.id ?? row.invoice_id),
    recipient_user_id: textValue(row.recipient_user_id) || null,
    recipient_kind: (textValue(row.recipient_kind, 'student') as InvoiceRow['recipient_kind']),
    class_id: textValue(row.class_id) || null,
    invoice_code: textValue(row.invoice_code, 'JPNPRIVAT'),
    invoice_date: textValue(row.invoice_date),
    due_date: textValue(row.due_date),
    status: textValue(row.status, 'draft'),
    invoice_number: textValue(row.invoice_number) || null,
    pricing_mode: (textValue(row.pricing_mode, 'hourly') as InvoiceRow['pricing_mode']),
    recipient_name: textValue(row.recipient_name, 'Penerima'),
    recipient_address: textValue(row.recipient_address) || null,
    recipient_phone: textValue(row.recipient_phone) || null,
    sender_name: textValue(row.sender_name) || null,
    sender_address: textValue(row.sender_address) || null,
    sender_phone: textValue(row.sender_phone) || null,
    item_label: textValue(row.item_label, 'Kelas Bahasa Jepang'),
    class_name_snapshot: textValue(row.class_name_snapshot ?? row.class_name) || null,
    total_sessions: numberValue(row.total_sessions),
    total_minutes: numberValue(row.total_minutes),
    quantity: numberValue(row.quantity),
    unit_price: numberValue(row.unit_price),
    subtotal: numberValue(row.subtotal),
    additional_amount: numberValue(row.additional_amount),
    total_amount: numberValue(row.total_amount),
    paid_amount: numberValue(row.paid_amount),
    payment_methods_snapshot: asArray(row.payment_methods_snapshot ?? row.payment_methods) as InvoicePaymentMethod[],
    notes: textValue(row.notes) || null,
    session_start: textValue(row.session_start) || null,
    session_end: textValue(row.session_end) || null,
    created_at: textValue(row.created_at) || null,
    issued_at: textValue(row.issued_at) || null,
    paid_at: textValue(row.paid_at) || null,
    voided_at: textValue(row.voided_at) || null,
    void_reason: textValue(row.void_reason) || null,
  };
}

export async function getManagementInvoiceOverview(month: string): Promise<InvoiceOverview> {
  const { data, error } = await supabase.rpc('get_management_invoice_overview', { p_month: month });
  if (error) throw error;

  const raw = asRecord(data);
  const rowsSource = asArray(raw.rows ?? raw.invoices ?? data);
  const rows = rowsSource.map(normalizeInvoice).filter((row) => row.id);
  const summary = asRecord(raw.summary);

  const computedTotal = rows.reduce((sum, row) => sum + row.total_amount, 0);
  const computedPaid = rows.reduce((sum, row) => sum + row.paid_amount, 0);

  return {
    rows,
    summary: {
      total_invoices: numberValue(summary.total_invoices ?? summary.invoice_count ?? rows.length),
      total_amount: numberValue(summary.total_amount ?? summary.total_billed ?? computedTotal),
      paid_amount: numberValue(summary.paid_amount ?? summary.total_paid ?? computedPaid),
      outstanding_amount: numberValue(summary.outstanding_amount ?? summary.total_outstanding ?? (computedTotal - computedPaid)),
      overdue_count: numberValue(summary.overdue_count),
    },
  };
}

export async function saveManagementInvoice(payload: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('save_management_invoice', { p_payload: payload });
  if (error) throw error;
  return String(data);
}

export async function issueManagementInvoice(invoiceId: string) {
  const { data, error } = await supabase.rpc('issue_management_invoice', { p_invoice_id: invoiceId });
  if (error) throw error;
  return String(data ?? '');
}

export async function recordInvoicePayment(args: {
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
}) {
  const { data, error } = await supabase.rpc('record_management_invoice_payment', {
    p_invoice_id: args.invoiceId,
    p_amount: Math.trunc(args.amount),
    p_payment_date: args.paymentDate,
    p_payment_method: args.paymentMethod,
    p_reference_number: args.referenceNumber?.trim() || null,
    p_notes: args.notes?.trim() || null,
  });
  if (error) throw error;
  return data;
}

export async function voidManagementInvoice(invoiceId: string, reason: string) {
  const { error } = await supabase.rpc('void_management_invoice', {
    p_invoice_id: invoiceId,
    p_reason: reason.trim(),
  });
  if (error) throw error;
}

export async function getInvoiceDetail(invoiceId: string): Promise<InvoiceDetail> {
  const { data, error } = await supabase.rpc('get_invoice_detail', { p_invoice_id: invoiceId });
  if (error) throw error;

  const raw = asRecord(data);
  const invoiceRaw = asRecord(raw.invoice ?? data);
  const invoice = normalizeInvoice(invoiceRaw);

  return {
    ...invoice,
    sessions: asArray(raw.sessions ?? invoiceRaw.sessions).map((entry, index) => {
      const row = asRecord(entry);
      return {
        id: textValue(row.id ?? row.session_id) || null,
        source_report_id: textValue(row.source_report_id) || null,
        session_date: textValue(row.session_date),
        starts_at: textValue(row.starts_at),
        ends_at: textValue(row.ends_at),
        duration_minutes: numberValue(row.duration_minutes),
        sort_order: numberValue(row.sort_order ?? index),
      };
    }),
    payments: asArray(raw.payments ?? invoiceRaw.payments).map((entry) => {
      const row = asRecord(entry);
      return {
        id: textValue(row.id ?? row.payment_id),
        amount: numberValue(row.amount),
        payment_date: textValue(row.payment_date),
        payment_method: textValue(row.payment_method),
        reference_number: textValue(row.reference_number) || null,
        notes: textValue(row.notes) || null,
        created_at: textValue(row.created_at) || null,
      };
    }).filter((row) => row.id),
  };
}

export async function getMyInvoices(): Promise<InvoiceRow[]> {
  const { data, error } = await supabase.rpc('get_my_invoices');
  if (error) throw error;
  const raw = asRecord(data);
  return asArray(raw.rows ?? raw.invoices ?? data).map(normalizeInvoice).filter((row) => row.id);
}
