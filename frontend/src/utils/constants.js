/**
 * Centralized Constants for CENTAURO ERP
 * Single Source of Truth for status values and enums
 */

// ============================================
// PROJECT STATUS
// ============================================
export const PROJECT_STATUS = {
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
  PAUSADO: 'Pausado',
  CANCELADO: 'Cancelado',
};

export const PROJECT_STATUS_OPTIONS = [
  { value: 'Em Andamento', label: 'Em Andamento' },
  { value: 'Concluído', label: 'Concluído' },
  { value: 'Pausado', label: 'Pausado' },
  { value: 'Cancelado', label: 'Cancelado' },
];

// ============================================
// CONTRACT STATUS
// ============================================
export const CONTRACT_STATUS = {
  ATIVO: 'Ativo',
  VENCIDO: 'Vencido',
  CANCELADO: 'Cancelado',
};

export const CONTRACT_STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Vencido', label: 'Vencido' },
  { value: 'Cancelado', label: 'Cancelado' },
];

// ============================================
// VEHICLE STATUS
// ============================================
export const VEHICLE_STATUS = {
  ACTIVE: 'ACTIVE',
  MAINTENANCE: 'MAINTENANCE',
};

export const VEHICLE_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'MAINTENANCE', label: 'Manutenção' },
];

// ============================================
// PURCHASE STATUS
// ============================================
export const PURCHASE_STATUS = {
  PENDENTE: 'PENDENTE',
  APROVADO: 'APROVADO',
  REJEITADO: 'REJEITADO',
  COMPRADO: 'COMPRADO',
};

export const PURCHASE_STATUS_OPTIONS = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REJEITADO', label: 'Rejeitado' },
  { value: 'COMPRADO', label: 'Comprado' },
];

// ============================================
// TICKET STATUS
// ============================================
export const TICKET_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
};

export const TICKET_STATUS_LABELS = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em Andamento',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

// ============================================
// BILLING STATUS
// ============================================
export const BILLING_STATUS = {
  PREVISTO: 'PREVISTO',
  EMITIDA: 'EMITIDA',
  PAGO: 'PAGO',
  VENCIDA: 'VENCIDA',
  CANCELADA: 'CANCELADA',
  SUBSTITUIDA: 'SUBSTITUIDA',
};

// ============================================
// STATUS COLOR MAPPINGS (for StatusBadge)
// ============================================
export const STATUS_COLORS = {
  // Green (success/active)
  green: ['ACTIVE', 'ATIVO', 'VALID', 'VÁLIDO', 'COMPLETED', 'CONCLUÍDO', 'PAID', 'PAGO', 'APPROVED', 'APROVADO', 'Concluído', 'Ativo'],

  // Yellow/Amber (warning/pending)
  yellow: ['PENDING', 'PENDENTE', 'WARNING', 'IN_PROGRESS', 'EM ANDAMENTO', 'Em Andamento', 'Pausado'],

  // Red (danger/error)
  red: ['INACTIVE', 'INATIVO', 'EXPIRED', 'VENCIDO', 'REJECTED', 'REJEITADO', 'CANCELLED', 'CANCELADO', 'Vencido', 'Cancelado'],

  // Blue (info)
  blue: ['EMITIDA', 'COMPRADO'],
};
