import './SearchBar.css';

export default function SearchBar({ placeholder = 'Search...', value, onChange }) {
  return (
    <div className="search-bar">
      <svg className="search-bar__icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.4" />
        <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}