import React from 'react';
import { STATUS_COLORS } from '../../utils/constants';

/**
 * StatusBadge - Displays status with contextual coloring
 * Uses centralized STATUS_COLORS from constants.js
 */
const StatusBadge = ({ status, type = 'default' }) => {
  // Map statuses to colors using centralized constants
  const getStatusColor = (status) => {
    const s = status?.toUpperCase();
    const sOriginal = status; // Keep original for case-sensitive comparison

    // Check against centralized color mappings
    if (STATUS_COLORS.green.includes(s) || STATUS_COLORS.green.includes(sOriginal)) {
      return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' }; // Green
    }
    if (STATUS_COLORS.red.includes(s) || STATUS_COLORS.red.includes(sOriginal)) {
      return { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' }; // Red
    }
    if (STATUS_COLORS.yellow.includes(s) || STATUS_COLORS.yellow.includes(sOriginal)) {
      return { bg: '#fef9c3', color: '#854d0e', border: '#fde047' }; // Yellow
    }
    if (STATUS_COLORS.blue.includes(s) || STATUS_COLORS.blue.includes(sOriginal)) {
      return { bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' }; // Blue
    }

    // Fallback for hardcoded common statuses (in case not in constants)
    if (['ACTIVE', 'ATIVO', 'VALID', 'VÁLIDO', 'COMPLETED', 'CONCLUÍDO', 'PAID', 'PAGO', 'APPROVED', 'APROVADO'].includes(s)) {
      return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' };
    }
    if (['INACTIVE', 'INATIVO', 'EXPIRED', 'VENCIDO', 'REJECTED', 'REJEITADO', 'CANCELED', 'CANCELADO'].includes(s)) {
      return { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' };
    }
    if (['PENDING', 'PENDENTE', 'PROCESSING', 'PROCESSANDO', 'MAINTENANCE', 'MANUTENÇÃO', 'ON_HOLD'].includes(s)) {
      return { bg: '#fef9c3', color: '#854d0e', border: '#fde047' };
    }
    if (['DRAFT', 'RASCUNHO'].includes(s)) {
      return { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }

    // Default
    return { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
  };

  const style = getStatusColor(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
