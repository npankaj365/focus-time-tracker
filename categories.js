// categories.js - Shared category management utilities

// Default categories
const DEFAULT_CATEGORIES = ['Research', 'Learning', 'Work', 'Volunteering'];

// Get all unique categories from sessions plus defaults
function getAllCategories(sessions = []) {
    const categoriesFromSessions = sessions
        .map(session => session.category)
        .filter(category => category && category.trim() !== '' && category !== 'Uncategorized');
    
    const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...categoriesFromSessions])];
    return allCategories.sort();
}

// Create autocomplete dropdown for category input
function setupCategoryAutocomplete(inputElement, sessions = []) {
    const categories = getAllCategories(sessions);
    
    // Create datalist element
    const datalistId = inputElement.id + '-datalist';
    let datalist = document.getElementById(datalistId);
    
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = datalistId;
        inputElement.setAttribute('list', datalistId);
        inputElement.parentNode.appendChild(datalist);
    }
    
    // Clear existing options
    datalist.innerHTML = '';
    
    // Add category options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        datalist.appendChild(option);
    });
    
    return categories;
}

// Create dropdown select for categories
function createCategorySelect(id, selectedValue = '') {
    const select = document.createElement('select');
    select.id = id;
    select.className = 'w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500';
    
    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Select category...';
    select.appendChild(emptyOption);
    
    return select;
}

// Update category select with current data
function updateCategorySelect(selectElement, sessions = [], selectedValue = '') {
    const categories = getAllCategories(sessions);
    
    // Clear existing options except the first one
    while (selectElement.children.length > 1) {
        selectElement.removeChild(selectElement.lastChild);
    }
    
    // Add category options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        if (category === selectedValue) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
    
    // Add "Other..." option for custom categories
    const otherOption = document.createElement('option');
    otherOption.value = '_other_';
    otherOption.textContent = 'Other...';
    selectElement.appendChild(otherOption);
    
    return categories;
}

// Handle "Other" category selection with custom input
function handleCategorySelectChange(selectElement, customInputElement) {
    if (selectElement.value === '_other_') {
        customInputElement.style.display = 'block';
        customInputElement.focus();
        customInputElement.value = '';
    } else {
        customInputElement.style.display = 'none';
        customInputElement.value = selectElement.value;
    }
}

// Get the final category value (from select or custom input)
function getFinalCategoryValue(selectElement, customInputElement) {
    if (selectElement.value === '_other_') {
        return customInputElement.value.trim() || 'Uncategorized';
    }
    return selectElement.value || 'Uncategorized';
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEFAULT_CATEGORIES,
        getAllCategories,
        setupCategoryAutocomplete,
        createCategorySelect,
        updateCategorySelect,
        handleCategorySelectChange,
        getFinalCategoryValue
    };
}