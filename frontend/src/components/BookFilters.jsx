function BookFilters({
  filterYearFrom,
  filterYearTo,
  filterExactYearInput,
  filterExactYear,
  filterTrusted,
  filterMine,
  filterReadingStatus,
  showMineToggle,
  sortField,
  sortDirection,
  onYearFromChange,
  onYearToChange,
  onExactYearInputChange,
  onToggleTrusted,
  onToggleMine,
  onReadingStatusChange,
  onSortFieldChange,
  onToggleSortDirection,
}) {
  return (
    <div className="nf-filter-panel">
      {!filterExactYear && (
        <div className="nf-filter-group nf-filter-year-range">
          <label className="nf-filter-label" htmlFor="filter-year-from">Year range</label>
          <div className="nf-year-range-inputs">
            <input
              id="filter-year-from"
              className="nf-filter-input"
              type="number"
              placeholder="From"
              value={filterYearFrom}
              onChange={(event) => onYearFromChange(event.target.value)}
              min="1450"
              max="2026"
            />
            <span className="nf-year-range-separator">—</span>
            <input
              id="filter-year-to"
              className="nf-filter-input"
              type="number"
              placeholder="To"
              value={filterYearTo}
              onChange={(event) => onYearToChange(event.target.value)}
              min="1450"
              max="2026"
            />
          </div>
        </div>
      )}
      <div className="nf-filter-group nf-filter-exact-year">
        <label className="nf-filter-label" htmlFor="filter-exact-year">Exact year</label>
        <input
          id="filter-exact-year"
          className="nf-filter-input"
          type="number"
          placeholder="Exact year"
          value={filterExactYearInput}
          onChange={(event) => onExactYearInputChange(event.target.value)}
          min="1450"
          max="2026"
        />
      </div>
      <div className="nf-filter-group nf-filter-toggle">
        <label className="nf-filter-label" htmlFor="filter-trusted">Verified</label>
        <button
          id="filter-trusted"
          type="button"
          className={`nf-action-btn ${filterTrusted ? 'nf-action-btn--active' : ''}`}
          onClick={onToggleTrusted}
        >
          {filterTrusted ? 'Verified only' : 'All books'}
        </button>
      </div>
      {showMineToggle && (
        <div className="nf-filter-group nf-filter-toggle">
          <label className="nf-filter-label" htmlFor="filter-mine">Ownership</label>
          <button
            id="filter-mine"
            type="button"
            className={`nf-action-btn ${filterMine ? 'nf-action-btn--active' : ''}`}
            aria-pressed={filterMine}
            onClick={onToggleMine}
          >
            {filterMine ? 'My books only' : 'Everyone'}
          </button>
        </div>
      )}
      {showMineToggle && (
        <div className="nf-filter-group">
          <label className="nf-filter-label" htmlFor="filter-reading-status">Reading status</label>
          <select
            id="filter-reading-status"
            className="nf-filter-select"
            value={filterReadingStatus}
            onChange={(e) => onReadingStatusChange(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="want">Want to Read</option>
            <option value="reading">Reading</option>
            <option value="finished">Finished</option>
          </select>
        </div>
      )}
      <div className="nf-filter-group">
        <label className="nf-filter-label" htmlFor="sort-field">Sort by</label>
        <select
          id="sort-field"
          className="nf-filter-select"
          value={sortField}
          onChange={(event) => onSortFieldChange(event.target.value)}
        >
          <option value="title">Title</option>
          <option value="author">Author</option>
          <option value="genre">Genre</option>
          <option value="year">Year</option>
          <option value="added">Date added</option>
        </select>
      </div>
      <div className="nf-filter-group nf-filter-toggle nf-sort-order-group">
        <label className="nf-filter-label" htmlFor="sort-direction">Order</label>
        <button
          id="sort-direction"
          type="button"
          className={`nf-action-btn nf-sort-direction-btn ${sortDirection === 'desc' ? 'nf-action-btn--active' : ''}`}
          onClick={onToggleSortDirection}
        >
          {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        </button>
      </div>
    </div>
  );
}

export default BookFilters;
