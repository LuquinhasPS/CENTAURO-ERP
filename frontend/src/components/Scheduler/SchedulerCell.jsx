import React, { useState } from 'react';
import ProjectPopover from './ProjectPopover';

/**
 * SchedulerCell - Renders a single cell in the scheduler grid
 * 
 * Features:
 * - Click empty cell: Opens Quick Allocation Popover
 * - Click allocation bar: Opens edit modal
 * - Future: Drag-to-Fill support
 */
const SchedulerCell = ({
  date,
  resourceId,
  resourceType,
  allocations = [],
  isWeekend = false,
  isHoliday = false,
  projects = [],
  clients = [],
  onCellClick,
  onAllocationClick,
  onQuickAllocate,
  canEdit = true
}) => {
  const [showPopover, setShowPopover] = useState(false);

  // Get project and client info for an allocation
  const getProjectInfo = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return { tag: `Proj #${projectId}`, clientName: '-' };

    const client = clients.find(c => c.id === project.client_id);
    const clientName = client?.name?.split(' ')[0] || '-';

    return {
      tag: project.tag || project.name,
      clientName,
      fullName: `${client?.name || 'Cliente'} | ${project.tag}`
    };
  };

  const hasAllocations = allocations.length > 0;

  const handleCellClick = (e) => {
    e.stopPropagation();

    if (!canEdit) return;

    // If cell is empty, show popover for quick allocation
    if (!hasAllocations && onQuickAllocate) {
      setShowPopover(true);
    } else if (onCellClick) {
      // Fallback to original behavior (open modal)
      onCellClick({ date, resourceId, resourceType });
    }
  };

  const handleProjectSelect = (project) => {
    setShowPopover(false);
    if (onQuickAllocate) {
      onQuickAllocate(project.id, date, resourceId, resourceType);
    }
  };

  const cellClasses = [
    'allocation-cell',
    isWeekend ? 'weekend' : '',
    isHoliday ? 'holiday' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cellClasses}
      onClick={handleCellClick}
      style={{
        cursor: canEdit ? 'pointer' : 'default',
        position: 'relative' // For popover positioning
      }}
    >
      {/* Allocation Bars */}
      {allocations.map((alloc) => {
        const projectInfo = getProjectInfo(alloc.project_id);

        return (
          <div
            key={alloc.id}
            className="allocation-bar"
            style={{
              left: '0%',
              width: '100%',
              backgroundColor: alloc.status === 'CONFIRMED' ? '#3b82f6' : '#f59e0b'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onAllocationClick) {
                onAllocationClick(alloc);
              }
            }}
            title={projectInfo.fullName}
          >
            <span className="allocation-tag">{projectInfo.tag}</span>
            <span className="allocation-client">{projectInfo.clientName}</span>
          </div>
        );
      })}

      {/* Quick Allocation Popover */}
      {showPopover && (
        <ProjectPopover
          projects={projects}
          clients={clients}
          onSelect={handleProjectSelect}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  );
};

export default SchedulerCell;
