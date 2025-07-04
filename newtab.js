// newtab.js

document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const timerDisplay = document.getElementById('timer-display');
    const timerStatus = document.getElementById('timer-status');
    const timerCircle = document.getElementById('timer-circle');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const categoryInput = document.getElementById('category-input');
    const heatmapGrid = document.getElementById('heatmap-grid');
    const streakSummary = document.getElementById('streak-summary');
    const todayTime = document.getElementById('today-time');
    const weekTime = document.getElementById('week-time');
    const streakCount = document.getElementById('streak-count');
    const statsLink = document.getElementById('stats-link');
    const settingsLink = document.getElementById('settings-link');
    
    // Timer state
    let timerState = {
        isRunning: false,
        endTime: null,
        duration: 25 * 60 // 25 minutes in seconds
    };
    
    let allSessions = [];
    
    // Load categories from sessions
    function loadCategories() {
        chrome.storage.local.get('sessions', (data) => {
            const sessions = data.sessions || [];
            setupCategoryAutocomplete(categoryInput, sessions);
        });
    }
    
    // Initialize
    loadTimerState();
    loadSessions();
    loadCategories();
    updateDisplay();
    
    // Timer functions
    function loadTimerState() {
        chrome.storage.sync.get(['isRunning', 'endTime', 'duration'], (data) => {
            timerState.isRunning = data.isRunning || false;
            timerState.endTime = data.endTime || null;
            timerState.duration = data.duration || (25 * 60);
            updateDisplay();
        });
    }
    
    function saveTimerState() {
        chrome.storage.sync.set(timerState);
    }
    
    function updateDisplay() {
        const now = Date.now();
        let remainingTime = timerState.duration;
        
        if (timerState.isRunning && timerState.endTime) {
            remainingTime = Math.max(0, Math.round((timerState.endTime - now) / 1000));
            
            if (remainingTime === 0) {
                // Timer finished
                completeSession();
                return;
            }
        }
        
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Update circular progress
        const progress = ((timerState.duration - remainingTime) / timerState.duration) * 360;
        timerCircle.style.background = `conic-gradient(#10b981 ${progress}deg, rgba(255,255,255,0.2) ${progress}deg)`;
        
        // Update status and buttons
        if (timerState.isRunning) {
            timerStatus.textContent = 'Focusing...';
            startBtn.disabled = true;
            pauseBtn.disabled = false;
            stopBtn.disabled = false;
        } else {
            timerStatus.textContent = remainingTime === timerState.duration ? 'Ready to focus' : 'Paused';
            startBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = remainingTime === timerState.duration;
        }
    }
    
    function startTimer() {
        const now = Date.now();
        timerState.isRunning = true;
        timerState.endTime = now + (getCurrentRemainingTime() * 1000);
        saveTimerState();
        updateDisplay();
        
        // Set chrome alarm
        chrome.alarms.create('focusTimer', { when: timerState.endTime });
    }
    
    function pauseTimer() {
        timerState.isRunning = false;
        timerState.duration = getCurrentRemainingTime();
        timerState.endTime = null;
        saveTimerState();
        updateDisplay();
        
        // Clear chrome alarm
        chrome.alarms.clear('focusTimer');
    }
    
    function stopTimer() {
        timerState.isRunning = false;
        timerState.duration = 25 * 60; // Reset to 25 minutes
        timerState.endTime = null;
        saveTimerState();
        updateDisplay();
        
        // Clear chrome alarm
        chrome.alarms.clear('focusTimer');
    }
    
    function getCurrentRemainingTime() {
        if (!timerState.isRunning || !timerState.endTime) {
            return timerState.duration;
        }
        return Math.max(0, Math.round((timerState.endTime - Date.now()) / 1000));
    }
    
    function completeSession() {
        const category = categoryInput.value.trim() || 'Uncategorized';
        const session = {
            duration: 25 * 60, // 25 minutes in seconds
            category: category,
            endTime: Date.now()
        };
        
        // Save session
        chrome.storage.local.get('sessions', (data) => {
            const sessions = data.sessions || [];
            sessions.push(session);
            chrome.storage.local.set({ sessions }, () => {
                allSessions = sessions;
                updateStats();
                renderHeatmap(allSessions);
            });
        });
        
        // Reset timer
        stopTimer();
        
        // Show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Focus Session Complete!',
            message: `Great job! You focused for 25 minutes in ${category}.`
        });
        
        timerStatus.textContent = 'Session complete! 🎉';
    }
    
    // Session and statistics functions
    function loadSessions() {
        chrome.storage.local.get('sessions', (data) => {
            allSessions = data.sessions || [];
            updateStats();
            renderHeatmap(allSessions);
        });
    }
    
    function updateStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());
        
        let todayMinutes = 0;
        let weekMinutes = 0;
        
        allSessions.forEach(session => {
            const sessionDate = new Date(session.endTime);
            const minutes = session.duration / 60;
            
            if (sessionDate >= today) {
                todayMinutes += minutes;
            }
            if (sessionDate >= thisWeekStart) {
                weekMinutes += minutes;
            }
        });
        
        todayTime.textContent = formatMinutes(todayMinutes);
        weekTime.textContent = formatMinutes(weekMinutes);
        
        // Calculate streak
        const heatmapData = generateHeatmapData(allSessions);
        const streakStats = calculateStreakStats(heatmapData);
        streakCount.textContent = streakStats.currentStreak;
    }
    
    function formatMinutes(minutes) {
        if (minutes < 60) {
            return Math.round(minutes) + 'm';
        } else {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = Math.round(minutes % 60);
            return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
        }
    }
    
    // Heatmap functions (simplified versions from options.js)
    function generateHeatmapData(sessions) {
        const data = {};
        const today = new Date();
        const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        
        // Initialize all days in the past year with 0 minutes
        for (let date = new Date(oneYearAgo); date <= today; date.setDate(date.getDate() + 1)) {
            const dateStr = date.toISOString().split('T')[0];
            data[dateStr] = 0;
        }
        
        // Add session data
        sessions.forEach(session => {
            const sessionDate = new Date(session.endTime);
            const dateStr = sessionDate.toISOString().split('T')[0];
            if (data.hasOwnProperty(dateStr)) {
                data[dateStr] += session.duration / 60; // Convert to minutes
            }
        });
        
        return data;
    }
    
    function getIntensityLevel(minutes) {
        if (minutes === 0) return 0;
        if (minutes < 30) return 1;
        if (minutes < 60) return 2;
        if (minutes < 120) return 3;
        return 4;
    }
    
    function calculateStreakStats(data) {
        const dates = Object.keys(data).sort();
        let currentStreak = 0;
        let longestStreak = 0;
        let totalDays = 0;
        let totalMinutes = 0;
        
        // Calculate current streak (from today backwards)
        const today = new Date().toISOString().split('T')[0];
        for (let i = dates.length - 1; i >= 0; i--) {
            const date = dates[i];
            const minutes = data[date];
            
            if (date > today) continue;
            
            if (minutes > 0) {
                if (date === today || currentStreak > 0) {
                    currentStreak++;
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        
        // Calculate longest streak and totals
        let tempStreak = 0;
        dates.forEach(date => {
            const minutes = data[date];
            totalMinutes += minutes;
            
            if (minutes > 0) {
                totalDays++;
                tempStreak++;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        });
        
        return {
            currentStreak,
            longestStreak,
            totalDays,
            totalMinutes: Math.round(totalMinutes)
        };
    }
    
    function createHeatmapGrid(data) {
        const today = new Date();
        const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        
        // Start from the Sunday of the week containing oneYearAgo
        const startDate = new Date(oneYearAgo);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        
        const grid = document.createElement('div');
        grid.className = 'heatmap-grid';
        
        // Add month labels
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let currentMonth = -1;
        const monthLabels = [];
        
        for (let week = 0; week < 53; week++) {
            const weekStart = new Date(startDate);
            weekStart.setDate(startDate.getDate() + week * 7);
            if (weekStart.getMonth() !== currentMonth) {
                currentMonth = weekStart.getMonth();
                monthLabels.push({ week, month: months[currentMonth] });
            }
        }
        
        // Add empty cell for day labels column
        const emptyCell = document.createElement('div');
        grid.appendChild(emptyCell);
        
        // Add month labels
        monthLabels.forEach((monthData) => {
            const monthCell = document.createElement('div');
            monthCell.className = 'heatmap-month';
            monthCell.textContent = monthData.month;
            monthCell.style.gridColumn = `${monthData.week + 2} / span 4`;
            grid.appendChild(monthCell);
        });
        
        // Add day labels
        const dayLabels = ['', 'M', '', 'W', '', 'F', ''];
        dayLabels.forEach((label, index) => {
            const dayCell = document.createElement('div');
            dayCell.className = 'heatmap-day-label';
            dayCell.textContent = label;
            dayCell.style.gridRow = index + 2;
            dayCell.style.gridColumn = 1;
            grid.appendChild(dayCell);
        });
        
        // Add day cells
        for (let week = 0; week < 53; week++) {
            for (let day = 0; day < 7; day++) {
                const cellDate = new Date(startDate);
                cellDate.setDate(startDate.getDate() + week * 7 + day);
                
                if (cellDate > today) continue;
                
                const dateStr = cellDate.toISOString().split('T')[0];
                const minutes = data[dateStr] || 0;
                const level = getIntensityLevel(minutes);
                
                const dayCell = document.createElement('div');
                dayCell.className = `heatmap-day level-${level}`;
                dayCell.style.gridRow = day + 2;
                dayCell.style.gridColumn = week + 2;
                
                // Add data attributes for tooltip
                dayCell.setAttribute('data-date', dateStr);
                dayCell.setAttribute('data-minutes', minutes);
                dayCell.setAttribute('data-formatted-date', cellDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }));
                
                grid.appendChild(dayCell);
            }
        }
        
        return grid;
    }
    
    function renderHeatmap(sessions) {
        const data = generateHeatmapData(sessions);
        const stats = calculateStreakStats(data);
        
        // Clear existing heatmap
        heatmapGrid.innerHTML = '';
        
        // Create new heatmap
        const grid = createHeatmapGrid(data);
        heatmapGrid.appendChild(grid);
        
        // Update streak summary
        const totalHours = formatMinutes(stats.totalMinutes);
        streakSummary.textContent = `${stats.totalDays} days • Current: ${stats.currentStreak} days • Longest: ${stats.longestStreak} days • Total: ${totalHours}`;
        
        // Add tooltip functionality
        addHeatmapTooltips();
    }
    
    function addHeatmapTooltips() {
        let tooltip = null;
        
        const heatmapDays = heatmapGrid.querySelectorAll('.heatmap-day');
        
        heatmapDays.forEach(day => {
            day.addEventListener('mouseenter', (e) => {
                const date = e.target.getAttribute('data-formatted-date');
                const minutes = parseFloat(e.target.getAttribute('data-minutes'));
                const focusTime = minutes > 0 ? formatMinutes(minutes) : 'No focus time';
                
                // Create tooltip
                tooltip = document.createElement('div');
                tooltip.className = 'heatmap-tooltip';
                tooltip.innerHTML = `<strong>${date}</strong><br>${focusTime}`;
                document.body.appendChild(tooltip);
                
                // Position tooltip with boundary checking
                const rect = e.target.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                
                let left = rect.left + rect.width / 2;
                let top = rect.top - 8;
                
                // Prevent tooltip from going outside viewport
                if (left - tooltipRect.width / 2 < 5) {
                    left = tooltipRect.width / 2 + 5;
                } else if (left + tooltipRect.width / 2 > window.innerWidth - 5) {
                    left = window.innerWidth - tooltipRect.width / 2 - 5;
                }
                
                if (top < 5) {
                    top = rect.bottom + 8;
                    tooltip.style.transform = 'translate(-50%, 0%)';
                } else {
                    tooltip.style.transform = 'translate(-50%, -100%)';
                }
                
                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';
            });
            
            day.addEventListener('mouseleave', () => {
                if (tooltip) {
                    tooltip.remove();
                    tooltip = null;
                }
            });
        });
    }
    
    // Event listeners
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    stopBtn.addEventListener('click', stopTimer);
    
    statsLink.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    
    settingsLink.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    
    // Update display every second
    setInterval(updateDisplay, 1000);
    
    // Listen for timer completion from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'timerComplete') {
            completeSession();
        }
    });
    
    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && (changes.isRunning || changes.endTime || changes.duration)) {
            loadTimerState();
        }
        if (namespace === 'local' && changes.sessions) {
            allSessions = changes.sessions.newValue || [];
            updateStats();
            renderHeatmap(allSessions);
            loadCategories(); // Refresh categories when sessions change
        }
    });
});