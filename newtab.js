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
    
    // Scratchpad element
    const scratchpadTextarea = document.getElementById('scratchpad');
    
    // Priority task elements
    const priorityTaskElements = {
        urgentImportant: {
            inputs: [document.getElementById('urgent-important-text-1')],
            checkboxes: [document.getElementById('urgent-important-1')]
        },
        urgentLessImportant: {
            inputs: [
                document.getElementById('urgent-less-important-text-1'),
                document.getElementById('urgent-less-important-text-2')
            ],
            checkboxes: [
                document.getElementById('urgent-less-important-1'),
                document.getElementById('urgent-less-important-2')
            ]
        },
        managementItems: {
            inputs: [
                document.getElementById('management-items-text-1'),
                document.getElementById('management-items-text-2'),
                document.getElementById('management-items-text-3')
            ],
            checkboxes: [
                document.getElementById('management-items-1'),
                document.getElementById('management-items-2'),
                document.getElementById('management-items-3')
            ]
        }
    };
    
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
    loadPriorityTasks();
    loadScratchpad();
    updateDisplay();
    
    // Timer functions
    function loadTimerState() {
        chrome.storage.sync.get('timer', (data) => {
            if (data.timer) {
                timerState.isRunning = data.timer.isRunning || false;
                timerState.endTime = data.timer.endTime || null;
                timerState.duration = data.timer.duration || (25 * 60);
            } else {
                timerState.isRunning = false;
                timerState.endTime = null;
                timerState.duration = 25 * 60;
            }
            updateDisplay();
        });
    }
    
    function saveTimerState() {
        chrome.storage.sync.set({ timer: timerState });
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
            startBtn.style.display = 'none';
            pauseBtn.disabled = false;
            stopBtn.disabled = false;
        } else {
            timerStatus.textContent = remainingTime === timerState.duration ? 'Ready to focus' : 'Paused';
            startBtn.style.display = 'inline-block';
            pauseBtn.disabled = true;
            stopBtn.disabled = remainingTime === timerState.duration;
        }
    }
    
    function startTimer() {
        const duration = getCurrentRemainingTime();
        const category = categoryInput.value.trim() || 'Uncategorized';
        
        // Save category setting
        chrome.storage.sync.set({ settings: { lastCategory: category } });
        
        // Use background script to start timer
        chrome.runtime.sendMessage({ command: 'start', duration }, (response) => {
            console.log(response.status);
            loadTimerState();
        });
    }
    
    function pauseTimer() {
        // Play crash sound when pausing timer
        try {
            createCrashSound();
        } catch (error) {
            console.log('Could not play crash sound:', error);
        }
        
        // Use background script to stop timer (without saving session)
        chrome.runtime.sendMessage({ command: 'stop' }, (response) => {
            console.log(response.status);
            loadTimerState();
        });
    }
    
    function stopTimer() {
        // Play crash sound when stopping timer
        try {
            createCrashSound();
        } catch (error) {
            console.log('Could not play crash sound:', error);
        }
        
        // Use background script to reset timer
        const duration = 25 * 60; // Reset to 25 minutes
        chrome.runtime.sendMessage({ command: 'reset', duration }, (response) => {
            console.log(response.status);
            loadTimerState();
        });
    }
    
    function getCurrentRemainingTime() {
        if (!timerState.isRunning || !timerState.endTime) {
            return timerState.duration;
        }
        return Math.max(0, Math.round((timerState.endTime - Date.now()) / 1000));
    }
    
    function completeSession() {
        // Play chime sound
        try {
            createChime();
        } catch (error) {
            console.log('Could not play chime sound:', error);
        }
        
        // The background script already handles session saving and notifications
        // Just update the UI and reload the timer state
        loadTimerState();
        loadSessions(); // Refresh sessions data
        timerStatus.textContent = 'Session complete! 🎉';
        
        // Clear the status message after a few seconds
        setTimeout(() => {
            if (timerStatus.textContent === 'Session complete! 🎉') {
                timerStatus.textContent = 'Ready to focus';
            }
        }, 5000);
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
        
        // Scroll to show the rightmost (most recent) dates
        setTimeout(() => {
            const heatmapContainer = heatmapGrid.parentElement;
            heatmapContainer.scrollLeft = heatmapContainer.scrollWidth - heatmapContainer.clientWidth;
        }, 100);
    }
    
    // Priority task functions
    function loadPriorityTasks() {
        chrome.storage.local.get('priorityTasks', (data) => {
            const tasks = data.priorityTasks || {
                urgentImportant: [{text: '', completed: false}],
                urgentLessImportant: [{text: '', completed: false}, {text: '', completed: false}],
                managementItems: [{text: '', completed: false}, {text: '', completed: false}, {text: '', completed: false}]
            };
            
            // Load urgent important (1 task)
            tasks.urgentImportant.forEach((task, index) => {
                if (priorityTaskElements.urgentImportant.inputs[index]) {
                    priorityTaskElements.urgentImportant.inputs[index].value = task.text;
                    priorityTaskElements.urgentImportant.checkboxes[index].checked = task.completed;
                    updateTaskAppearance(priorityTaskElements.urgentImportant.inputs[index], task.completed);
                }
            });
            
            // Load urgent less important (2 tasks)
            tasks.urgentLessImportant.forEach((task, index) => {
                if (priorityTaskElements.urgentLessImportant.inputs[index]) {
                    priorityTaskElements.urgentLessImportant.inputs[index].value = task.text;
                    priorityTaskElements.urgentLessImportant.checkboxes[index].checked = task.completed;
                    updateTaskAppearance(priorityTaskElements.urgentLessImportant.inputs[index], task.completed);
                }
            });
            
            // Load management items (3 tasks)
            tasks.managementItems.forEach((task, index) => {
                if (priorityTaskElements.managementItems.inputs[index]) {
                    priorityTaskElements.managementItems.inputs[index].value = task.text;
                    priorityTaskElements.managementItems.checkboxes[index].checked = task.completed;
                    updateTaskAppearance(priorityTaskElements.managementItems.inputs[index], task.completed);
                }
            });
        });
    }
    
    function savePriorityTasks() {
        const tasks = {
            urgentImportant: priorityTaskElements.urgentImportant.inputs.map((input, index) => ({
                text: input.value,
                completed: priorityTaskElements.urgentImportant.checkboxes[index].checked
            })),
            urgentLessImportant: priorityTaskElements.urgentLessImportant.inputs.map((input, index) => ({
                text: input.value,
                completed: priorityTaskElements.urgentLessImportant.checkboxes[index].checked
            })),
            managementItems: priorityTaskElements.managementItems.inputs.map((input, index) => ({
                text: input.value,
                completed: priorityTaskElements.managementItems.checkboxes[index].checked
            }))
        };
        
        chrome.storage.local.set({ priorityTasks: tasks });
    }
    
    function updateTaskAppearance(inputElement, completed) {
        if (completed) {
            inputElement.classList.add('completed');
        } else {
            inputElement.classList.remove('completed');
        }
    }
    
    // Scratchpad functions
    function loadScratchpad() {
        chrome.storage.local.get('scratchpad', (data) => {
            const content = data.scratchpad || '';
            scratchpadTextarea.value = content;
        });
    }
    
    function saveScratchpad() {
        const content = scratchpadTextarea.value;
        chrome.storage.local.set({ scratchpad: content });
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
    
    // Duration button handlers
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const duration = parseInt(btn.getAttribute('data-duration'));
            timerState.duration = duration * 60; // Convert to seconds
            saveTimerState();
            updateDisplay();
        });
    });
    
    // Priority task event listeners
    Object.values(priorityTaskElements).forEach(section => {
        section.inputs.forEach((input, index) => {
            input.addEventListener('input', savePriorityTasks);
            
            // Add checkbox event listener
            section.checkboxes[index].addEventListener('change', (e) => {
                updateTaskAppearance(input, e.target.checked);
                savePriorityTasks();
            });
        });
    });
    
    // Scratchpad event listener
    scratchpadTextarea.addEventListener('input', saveScratchpad);
    
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
        if (namespace === 'sync' && changes.timer) {
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