import { useTasks } from '../../context/TaskContext';
import './FilterBar.css';

export default function FilterBar() {
  const { sortBy, setSortBy, searchQuery, setSearchQuery } = useTasks();

  return (
    <div className="filter-bar">
      <div className="filter-search">
        <svg className="filter-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          type="text"
          className="filter-search-input"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="filter-search-clear" onClick={() => setSearchQuery('')}>
            ✕
          </button>
        )}
      </div>

      <div className="filter-sort">
        <label className="filter-sort-label" htmlFor="sort-select">Sort by</label>
        <select
          id="sort-select"
          className="form-select filter-sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="createdAt">Date Created</option>
          <option value="dueDate">Due Date</option>
          <option value="priority">Priority</option>
        </select>
      </div>
    </div>
  );
}
