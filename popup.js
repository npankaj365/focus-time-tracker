// popup.js

const timerDisplay = document.getElementById('timer-display');
const durationInput = document.getElementById('duration-input');
const categorySelect = document.getElementById('category-select');
const categoryCustom = document.getElementById('category-custom');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const optionsLink = document.getElementById('options-link');

let timerInterval;
let allSessions = [];

// Load categories from sessions
function loadCategories() {
    chrome.storage.local.get('sessions', (data) => {
        allSessions = data.sessions || [];
        updateCategorySelect(categorySelect, allSessions);
    });
}

// Update UI based on stored state from sync storage
function updateUI() {
    chrome.storage.sync.get(['timer', 'settings'], (data) => {
        const { timer, settings } = data;
        
        if (settings?.lastCategory) {
            categorySelect.value = settings.lastCategory;
            if (categorySelect.value !== settings.lastCategory) {
                // Category doesn't exist in dropdown, use custom input
                categorySelect.value = '_other_';
                categoryCustom.style.display = 'block';
                categoryCustom.value = settings.lastCategory;
            }
        }
        durationInput.value = timer.duration / 60;

        if (timer.isRunning) {
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            durationInput.disabled = true;
            categorySelect.disabled = true;
            categoryCustom.disabled = true;
            updateTimerDisplay(timer.endTime);
            if (!timerInterval) {
                timerInterval = setInterval(() => updateTimerDisplay(timer.endTime), 1000);
            }
        } else {
            stopBtn.classList.add('hidden');
            startBtn.classList.remove('hidden');
            durationInput.disabled = false;
            categorySelect.disabled = false;
            categoryCustom.disabled = false;
            displayFormattedTime(timer.duration);
            clearInterval(timerInterval);
            timerInterval = null;
        }
    });
}

function updateTimerDisplay(endTime) {
    const remaining = Math.max(0, endTime - Date.now());
    const remainingSeconds = Math.round(remaining / 1000);
    displayFormattedTime(remainingSeconds);

    if (remaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        // The background script will handle the state change,
        // but we can preemptively update the UI.
        setTimeout(updateUI, 100); // Give storage a moment to update
    }
}

function displayFormattedTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Event Listeners
startBtn.addEventListener('click', () => {
    const duration = parseInt(durationInput.value, 10) * 60;
    const category = getFinalCategoryValue(categorySelect, categoryCustom);

    if (isNaN(duration) || duration <= 0) {
        alert("Please enter a valid duration.");
        return;
    }

    // Save settings to sync storage
    chrome.storage.sync.set({ settings: { lastCategory: category } });

    // Send command to background script
    chrome.runtime.sendMessage({ command: 'start', duration }, (response) => {
        console.log(response.status);
        updateUI();
    });
});

stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ command: 'stop' }, (response) => {
        console.log(response.status);
        updateUI();
    });
});

resetBtn.addEventListener('click', () => {
    const duration = parseInt(durationInput.value, 10) * 60;
    if (isNaN(duration) || duration <= 0) {
        alert("Please enter a valid duration to reset to.");
        return;
    }
    chrome.runtime.sendMessage({ command: 'reset', duration }, (response) => {
        console.log(response.status);
        updateUI();
    });
});


optionsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
});

// Category select change handler
categorySelect.addEventListener('change', () => {
    handleCategorySelectChange(categorySelect, categoryCustom);
});

// Listen for storage changes to update categories
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.sessions) {
        loadCategories();
    }
});

// Initial UI setup
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();
    updateUI();
});

// Listen for storage changes to keep UI in sync
chrome.storage.onChanged.addListener((changes, namespace) => {
    // Check for the 'sync' namespace now
    if (namespace === 'sync' && (changes.timer || changes.sessions)) {
        updateUI();
    }
});
