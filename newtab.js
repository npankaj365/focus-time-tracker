// newtab.js

document.addEventListener('DOMContentLoaded', () => {
    // Initialize task manager
    const taskManager = new TaskManager();
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
    
    // Task UI elements
    const priorityTasksContainer = document.getElementById('priority-tasks-container');
    const completedTodaySection = document.getElementById('completed-today-section');
    const completedTodayList = document.getElementById('completed-today-list');
    const viewHistoryBtn = document.getElementById('view-history-btn');
    const archiveTasksBtn = document.getElementById('archive-tasks-btn');
    
    // Task priority config
    const taskPriorityConfig = {
        'urgent-important': {
            title: 'Urgent & Important',
            color: 'red',
            maxTasks: 1,
            placeholder: 'Enter your most critical task...'
        },
        'urgent-less-important': {
            title: 'Urgent & Less Important',
            color: 'yellow',
            maxTasks: 2,
            placeholder: 'Urgent task that can be delegated...'
        },
        'management-items': {
            title: 'Management Items',
            color: 'blue',
            maxTasks: 3,
            placeholder: 'Important long-term planning task...'
        }
    };
    
    // Timer state
    let timerState = {
        isRunning: false,
        endTime: null,
        duration: 25 * 60 // 25 minutes in seconds
    };
    
    let allSessions = [];
    let isEditingTask = false; // Flag to prevent re-renders while editing
    
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
    loadTasks();
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
    
    // Task functions
    async function loadTasks() {
        const tasks = await taskManager.getTodaysTasks();
        renderTasks(tasks);
        
        // Load completed tasks for today
        const completedTasks = await taskManager.getTodaysCompletedTasks();
        renderCompletedTasks(completedTasks);
    }
    
    function renderTasks(tasks) {
        priorityTasksContainer.innerHTML = '';
        
        for (const [priority, config] of Object.entries(taskPriorityConfig)) {
            const priorityTasks = tasks[priority] || [];
            const incompleteTasks = priorityTasks.filter(t => !t.completed);
            
            const prioritySection = document.createElement('div');
            // Use specific classes based on color
            const sectionClasses = {
                'red': 'bg-red-500/20 border border-red-400/30 rounded-lg p-3 lg:p-4',
                'yellow': 'bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3 lg:p-4',
                'blue': 'bg-blue-500/20 border border-blue-400/30 rounded-lg p-3 lg:p-4'
            };
            prioritySection.className = sectionClasses[config.color];
            
            const header = document.createElement('h4');
            const headerClasses = {
                'red': 'font-semibold text-red-200 mb-3 flex items-center justify-between',
                'yellow': 'font-semibold text-yellow-200 mb-3 flex items-center justify-between',
                'blue': 'font-semibold text-blue-200 mb-3 flex items-center justify-between'
            };
            header.className = headerClasses[config.color];
            
            const dotClasses = {
                'red': 'w-3 h-3 bg-red-500 rounded-full mr-2',
                'yellow': 'w-3 h-3 bg-yellow-500 rounded-full mr-2',
                'blue': 'w-3 h-3 bg-blue-500 rounded-full mr-2'
            };
            
            const btnClasses = {
                'red': 'add-task-btn text-red-200/60 hover:text-red-200 text-sm',
                'yellow': 'add-task-btn text-yellow-200/60 hover:text-yellow-200 text-sm',
                'blue': 'add-task-btn text-blue-200/60 hover:text-blue-200 text-sm'
            };
            
            header.innerHTML = `
                <div class="flex items-center">
                    <span class="${dotClasses[config.color]}"></span>
                    ${config.title} (${incompleteTasks.length}/${config.maxTasks})
                </div>
                ${incompleteTasks.length < config.maxTasks ? `
                    <button class="${btnClasses[config.color]}" data-priority="${priority}">
                        + Add
                    </button>
                ` : ''}
            `;
            prioritySection.appendChild(header);
            
            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'space-y-2';
            
            // Render existing tasks
            incompleteTasks.forEach(task => {
                const taskElement = createTaskElement(task, config);
                tasksContainer.appendChild(taskElement);
            });
            
            // Add empty slots if needed
            const emptySlots = config.maxTasks - incompleteTasks.length;
            for (let i = 0; i < emptySlots; i++) {
                const emptyTaskElement = createEmptyTaskElement(priority, config);
                tasksContainer.appendChild(emptyTaskElement);
            }
            
            prioritySection.appendChild(tasksContainer);
            priorityTasksContainer.appendChild(prioritySection);
        }
        
        // Add event listeners for add buttons
        document.querySelectorAll('.add-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const priority = e.target.getAttribute('data-priority');
                addNewTask(priority);
            });
        });
    }
    
    function createTaskElement(task, config) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'flex items-start gap-2';
        taskDiv.setAttribute('data-task-id', task.id);
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        
        const checkboxClasses = {
            'red': 'task-checkbox mt-1 w-4 h-4 text-red-500 bg-white/20 border-white/30 rounded focus:ring-red-400/50 focus:ring-2',
            'yellow': 'task-checkbox mt-1 w-4 h-4 text-yellow-500 bg-white/20 border-white/30 rounded focus:ring-yellow-400/50 focus:ring-2',
            'blue': 'task-checkbox mt-1 w-4 h-4 text-blue-500 bg-white/20 border-white/30 rounded focus:ring-blue-400/50 focus:ring-2'
        };
        checkbox.className = checkboxClasses[config.color];
        checkbox.checked = task.completed;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = task.text;
        
        const inputClasses = {
            'red': 'task-input flex-1 bg-white/10 text-white placeholder-white/50 p-2 rounded-md text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-red-400/50',
            'yellow': 'task-input flex-1 bg-white/10 text-white placeholder-white/50 p-2 rounded-md text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400/50',
            'blue': 'task-input flex-1 bg-white/10 text-white placeholder-white/50 p-2 rounded-md text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/50'
        };
        input.className = inputClasses[config.color];
        input.placeholder = config.placeholder;
        
        if (task.completed) {
            input.classList.add('completed');
        }
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-white/40 hover:text-white/60 text-sm mt-2';
        deleteBtn.innerHTML = '🗑️';
        
        // Event listeners
        checkbox.addEventListener('change', async (e) => {
            if (e.target.checked) {
                await taskManager.completeTask(task.id);
            } else {
                await taskManager.uncompleteTask(task.id);
            }
            loadTasks();
        });
        
        // Debounced update to avoid too many saves
        let updateTimeout;
        input.addEventListener('focus', () => {
            isEditingTask = true;
        });
        
        input.addEventListener('input', () => {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(async () => {
                if (input.value.trim() !== task.text) {
                    // Update task text reference to prevent unnecessary saves
                    task.text = input.value.trim();
                    await taskManager.updateTask(task.id, { text: input.value.trim() });
                }
            }, 500); // Update after 500ms of no typing
        });
        
        input.addEventListener('blur', async () => {
            clearTimeout(updateTimeout);
            if (input.value.trim() !== task.text) {
                task.text = input.value.trim();
                await taskManager.updateTask(task.id, { text: input.value.trim() });
            }
            isEditingTask = false;
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur(); // This will trigger the blur event and save
            }
        });
        
        deleteBtn.addEventListener('click', async () => {
            await taskManager.deleteTask(task.id);
            loadTasks();
        });
        
        taskDiv.appendChild(checkbox);
        taskDiv.appendChild(input);
        taskDiv.appendChild(deleteBtn);
        
        return taskDiv;
    }
    
    function createEmptyTaskElement(priority, config) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'flex items-start gap-2';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        
        const checkboxClasses = {
            'red': 'task-checkbox mt-1 w-4 h-4 text-red-500 bg-white/20 border-white/30 rounded focus:ring-red-400/50 focus:ring-2',
            'yellow': 'task-checkbox mt-1 w-4 h-4 text-yellow-500 bg-white/20 border-white/30 rounded focus:ring-yellow-400/50 focus:ring-2',
            'blue': 'task-checkbox mt-1 w-4 h-4 text-blue-500 bg-white/20 border-white/30 rounded focus:ring-blue-400/50 focus:ring-2'
        };
        checkbox.className = checkboxClasses[config.color];
        checkbox.disabled = true;
        
        const input = document.createElement('input');
        input.type = 'text';
        
        const inputClasses = {
            'red': 'task-input flex-1 bg-white/10 text-white placeholder-white/50 p-2 rounded-md text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-red-400/50',
            'yellow': 'task-input flex-1 bg-white/10 text-white placeholder-white/50 p-2 rounded-md text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400/50',
            'blue': 'task-input flex-1 bg-white/10 text-white placeholder-white/50 p-2 rounded-md text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/50'
        };
        input.className = inputClasses[config.color];
        input.placeholder = config.placeholder;
        
        // Track if task has been created
        let taskCreated = false;
        let currentTaskId = null;
        
        // Set editing flag on focus
        input.addEventListener('focus', () => {
            isEditingTask = true;
        });
        
        // Handle input changes
        input.addEventListener('input', async () => {
            if (!taskCreated && input.value.trim()) {
                // Create task when user starts typing
                taskCreated = true;
                const newTask = await taskManager.addTask(priority, input.value.trim(), categoryInput.value || 'General');
                currentTaskId = newTask.id;
                taskDiv.setAttribute('data-task-id', newTask.id);
                checkbox.disabled = false;
                
                // Set up checkbox listener
                checkbox.addEventListener('change', async (e) => {
                    if (e.target.checked) {
                        await taskManager.completeTask(currentTaskId);
                    } else {
                        await taskManager.uncompleteTask(currentTaskId);
                    }
                    loadTasks();
                });
            } else if (taskCreated && currentTaskId) {
                // Update existing task text as user types
                await taskManager.updateTask(currentTaskId, { text: input.value.trim() });
            }
        });
        
        // Handle when input loses focus
        input.addEventListener('blur', async () => {
            isEditingTask = false;
            if (taskCreated && currentTaskId && !input.value.trim()) {
                // Delete empty task
                await taskManager.deleteTask(currentTaskId);
                loadTasks();
            }
        });
        
        // Handle Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur(); // This will trigger the blur event and save or delete
            }
        });
        
        taskDiv.appendChild(checkbox);
        taskDiv.appendChild(input);
        
        return taskDiv;
    }
    
    async function addNewTask(priority) {
        const config = taskPriorityConfig[priority];
        const tasks = await taskManager.getTodaysTasks();
        const currentTasks = tasks[priority] || [];
        const incompleteTasks = currentTasks.filter(t => !t.completed);
        
        if (incompleteTasks.length < config.maxTasks) {
            await taskManager.addTask(priority, '', categoryInput.value || 'General');
            loadTasks();
        }
    }
    
    function renderCompletedTasks(completedTasks) {
        if (completedTasks.length === 0) {
            completedTodaySection.classList.add('hidden');
            return;
        }
        
        completedTodaySection.classList.remove('hidden');
        completedTodayList.innerHTML = '';
        
        completedTasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'completed-task-item';
            
            const time = new Date(task.completedAt).toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit' 
            });
            
            const priorityConfig = taskPriorityConfig[task.priority];
            const dotClasses = {
                'red': 'w-2 h-2 bg-red-500 rounded-full',
                'yellow': 'w-2 h-2 bg-yellow-500 rounded-full',
                'blue': 'w-2 h-2 bg-blue-500 rounded-full'
            };
            
            taskItem.innerHTML = `
                <span class="text-green-500">✓</span>
                <span class="flex-1 text-white/70">${task.text}</span>
                <span class="text-white/50 text-sm">${task.category} • ${time}</span>
                <span class="${dotClasses[priorityConfig.color]}"></span>
            `;
            
            completedTodayList.appendChild(taskItem);
        });
    }
    
    // Task history modal
    async function showTaskHistory() {
        const history = await taskManager.getTaskHistory();
        const modal = createHistoryModal(history);
        document.body.appendChild(modal);
    }
    
    function createHistoryModal(history) {
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800">📚 Task History</h2>
            <button class="close-modal text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        `;
        
        const body = document.createElement('div');
        body.className = 'modal-body';
        
        if (history.length === 0) {
            body.innerHTML = '<p class="text-gray-500 text-center">No task history yet. Completed tasks will appear here after archiving.</p>';
        } else {
            // Group by date
            const sortedHistory = history.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            sortedHistory.forEach(day => {
                const daySection = document.createElement('div');
                daySection.className = 'history-day';
                
                const date = new Date(day.date);
                const dateStr = date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                daySection.innerHTML = `
                    <h3 class="text-lg font-semibold text-gray-700 mb-3">${dateStr}</h3>
                    <div class="space-y-2">
                        ${day.tasks.map(task => {
                            const priorityConfig = taskPriorityConfig[task.priority];
                            const dotClasses = {
                                'red': 'w-2 h-2 bg-red-500 rounded-full',
                                'yellow': 'w-2 h-2 bg-yellow-500 rounded-full',
                                'blue': 'w-2 h-2 bg-blue-500 rounded-full'
                            };
                            return `
                                <div class="completed-task-item">
                                    <span class="text-green-500">✓</span>
                                    <span class="flex-1 text-gray-600">${task.text}</span>
                                    <span class="text-gray-400 text-sm">${task.category}</span>
                                    <span class="${dotClasses[priorityConfig.color]}"></span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
                
                body.appendChild(daySection);
            });
        }
        
        content.appendChild(header);
        content.appendChild(body);
        modal.appendChild(content);
        
        // Close modal functionality
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        return modal;
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
    
    // Task button event listeners
    viewHistoryBtn.addEventListener('click', showTaskHistory);
    
    archiveTasksBtn.addEventListener('click', async () => {
        await taskManager.archiveCompletedTasks();
        loadTasks();
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
        if (namespace === 'local' && changes.dailyTasks) {
            // Only refresh tasks if we're not currently editing
            if (!isEditingTask) {
                loadTasks(); // Refresh tasks when they change
            }
        }
    });
    
    // Check for task carry-over on load
    taskManager.carryOverIncompleteTasks().then(() => {
        loadTasks();
    });
});