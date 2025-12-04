import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';
import './SearchableSelect.css';

const SearchableSelect = ({ options, value, onChange, placeholder, name, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    // Initialize search term with current value
    setSearchTerm(value || '');
  }, [value]);

  useEffect(() => {
    // Filter options based on search term
    if (!searchTerm) {
      setFilteredOptions(options);
    } else {
      const lowerTerm = searchTerm.toLowerCase();
      const filtered = options.filter(option =>
        option.label.toLowerCase().includes(lowerTerm)
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        // If the current search term doesn't match the value (user typed but didn't select), 
        // we might want to reset it or keep it as free text. 
        // For now, let's keep it as free text if the parent allows it, 
        // but here we just ensure the visual state matches the prop value if we want strict mode.
        // But since we update parent on change, it should be fine.
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    onChange({ target: { name, value: newValue } });
  };

  const handleSelectOption = (optionValue) => {
    setSearchTerm(optionValue);
    setIsOpen(false);
    onChange({ target: { name, value: optionValue } });
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className="searchable-select-wrapper" ref={wrapperRef}>
      <div className="searchable-select-input-container">
        <input
          type="text"
          className="input searchable-select-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          required={required}
        />
        <div className="searchable-select-icon">
          <ChevronDown size={16} />
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <ul className="searchable-select-dropdown">
          {filteredOptions.map((option, index) => (
            <li
              key={index}
              className="searchable-select-option"
              onClick={() => handleSelectOption(option.value)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchableSelect;
