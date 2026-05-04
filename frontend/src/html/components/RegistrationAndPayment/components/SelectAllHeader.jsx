import React from 'react';

/**
 * AG-Grid custom header component for the row-selection checkbox column.
 * Renders an invisible click-target that selects / deselects all visible
 * rows when clicked.
 *
 * AG-Grid passes a `params` object; the grid API is available via
 * `params.api`.
 */
const SelectAllHeader = (params) => {
  const handleClick = () => {
    const api = params.api;
    if (!api) return;
    const selectedRows = api.getSelectedRows();
    const totalRows    = api.getDisplayedRowCount();
    if (selectedRows.length === totalRows && totalRows > 0) {
      api.deselectAll();
    } else {
      api.selectAll();
    }
    setTimeout(() => api.refreshHeader?.(), 10);
  };

  let allSelected = false;
  if (params.api) {
    const selected = params.api.getSelectedRows();
    const total    = params.api.getDisplayedRowCount();
    allSelected    = total > 0 && selected.length === total;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        cursor: 'pointer',
      }}
      onClick={handleClick}
      title={allSelected ? 'Deselect all' : 'Select all'}
    />
  );
};

export default SelectAllHeader;
