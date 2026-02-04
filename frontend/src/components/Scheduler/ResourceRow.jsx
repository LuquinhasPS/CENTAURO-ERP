import React from 'react';
import SchedulerCell from './SchedulerCell';

/**
 * ResourceRow - Renders a single row in the scheduler grid
 * 
 * CRITICAL: Uses React.Fragment (<>) to preserve CSS Grid layout.
 * The parent grid in Scheduler.jsx expects flat cell elements.
 */
const ResourceRow = ({
  resource,
  days,
  allocations,
  projects,
  clients,
  getHolidayInfo,
  onCellClick,
  onAllocationClick,
  onQuickAllocate,
  canEdit = true
}) => {
  // Get allocations for a specific resource and day
  const getAllocationsForCell = (day) => {
    const dayStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

    return allocations.filter(alloc => {
      if (!alloc.date) return false;
      return alloc.date === dayStr &&
        alloc.resource_type === resource.type &&
        alloc.resource_id === resource.originalId;
    });
  };

  return (
    <>
      {/* Resource Info Cell (Left Column) */}
      <div className="resource-cell">
        <span className={`resource-badge ${resource.type.toLowerCase()}`}>
          {resource.type === 'PERSON' ? '👤' : (resource.type === 'CAR' ? '🚗' : '🔧')}
        </span>
        <span className="resource-name">{resource.name}</span>
      </div>

      {/* Day Cells */}
      {days.map((day, dayIndex) => {
        const cellAllocations = getAllocationsForCell(day);
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        const holidayInfo = getHolidayInfo ? getHolidayInfo(day) : null;

        return (
          <SchedulerCell
            key={`${resource.id}-${dayIndex}`}
            date={day}
            resourceId={resource.originalId}
            resourceType={resource.type}
            allocations={cellAllocations}
            isWeekend={isWeekend}
            isHoliday={!!holidayInfo}
            projects={projects}
            clients={clients}
            onCellClick={onCellClick}
            onAllocationClick={onAllocationClick}
            onQuickAllocate={onQuickAllocate}
            canEdit={canEdit}
          />
        );
      })}
    </>
  );
};

export default ResourceRow;
