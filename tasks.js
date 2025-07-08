// tasks.js - Task management utilities

// Task data structure:
// {
//   id: string (unique identifier),
//   text: string,
//   category: string,
//   priority: 'urgent-important' | 'urgent-less-important' | 'management-items',
//   completed: boolean,
//   completedAt: timestamp (when completed),
//   createdAt: timestamp,
//   date: string (YYYY-MM-DD format for the day this task belongs to)
// }

// Archive structure:
// {
//   date: string (YYYY-MM-DD),
//   tasks: [task objects],
//   archivedAt: timestamp
// }

class TaskManager {
    constructor() {
        this.listeners = [];
    }

    // Generate unique ID for tasks
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Get today's date in YYYY-MM-DD format
    getTodayString() {
        return new Date().toISOString().split('T')[0];
    }

    // Get all tasks for today
    async getTodaysTasks() {
        const data = await chrome.storage.local.get('dailyTasks');
        const allTasks = data.dailyTasks || {};
        const today = this.getTodayString();
        
        // Check if we need to carry over incomplete tasks from previous days
        await this.carryOverIncompleteTasks();
        
        return allTasks[today] || this.getEmptyTaskStructure();
    }

    // Get empty task structure
    getEmptyTaskStructure() {
        return {
            'urgent-important': [],
            'urgent-less-important': [],
            'management-items': []
        };
    }

    // Save today's tasks
    async saveTodaysTasks(tasks) {
        const data = await chrome.storage.local.get('dailyTasks');
        const allTasks = data.dailyTasks || {};
        const today = this.getTodayString();
        
        allTasks[today] = tasks;
        await chrome.storage.local.set({ dailyTasks: allTasks });
        
        // Notify listeners
        this.notifyListeners('tasksUpdated', tasks);
    }

    // Add a new task
    async addTask(priority, text, category = 'General') {
        const tasks = await this.getTodaysTasks();
        const newTask = {
            id: this.generateId(),
            text: text,
            category: category,
            priority: priority,
            completed: false,
            createdAt: Date.now(),
            date: this.getTodayString()
        };
        
        if (!tasks[priority]) {
            tasks[priority] = [];
        }
        
        tasks[priority].push(newTask);
        await this.saveTodaysTasks(tasks);
        
        return newTask;
    }

    // Update a task
    async updateTask(taskId, updates) {
        const tasks = await this.getTodaysTasks();
        let found = false;
        
        for (const priority in tasks) {
            const taskIndex = tasks[priority].findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                tasks[priority][taskIndex] = { ...tasks[priority][taskIndex], ...updates };
                found = true;
                break;
            }
        }
        
        if (found) {
            await this.saveTodaysTasks(tasks);
        }
        
        return found;
    }

    // Complete a task
    async completeTask(taskId) {
        const updates = {
            completed: true,
            completedAt: Date.now()
        };
        
        const success = await this.updateTask(taskId, updates);
        
        if (success) {
            // Archive completed tasks at the end of the day
            await this.checkAndArchiveCompletedTasks();
        }
        
        return success;
    }

    // Uncomplete a task
    async uncompleteTask(taskId) {
        const updates = {
            completed: false,
            completedAt: null
        };
        
        return await this.updateTask(taskId, updates);
    }

    // Delete a task
    async deleteTask(taskId) {
        const tasks = await this.getTodaysTasks();
        let found = false;
        
        for (const priority in tasks) {
            const taskIndex = tasks[priority].findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                tasks[priority].splice(taskIndex, 1);
                found = true;
                break;
            }
        }
        
        if (found) {
            await this.saveTodaysTasks(tasks);
        }
        
        return found;
    }

    // Get completed tasks for today
    async getTodaysCompletedTasks() {
        const tasks = await this.getTodaysTasks();
        const completed = [];
        
        for (const priority in tasks) {
            completed.push(...tasks[priority].filter(t => t.completed));
        }
        
        return completed.sort((a, b) => b.completedAt - a.completedAt);
    }

    // Carry over incomplete tasks from previous days
    async carryOverIncompleteTasks() {
        const data = await chrome.storage.local.get(['dailyTasks', 'lastCarryOverDate']);
        const allTasks = data.dailyTasks || {};
        const lastCarryOverDate = data.lastCarryOverDate;
        const today = this.getTodayString();
        
        // Only carry over once per day
        if (lastCarryOverDate === today) {
            return;
        }
        
        const todaysTasks = allTasks[today] || this.getEmptyTaskStructure();
        const dates = Object.keys(allTasks).sort();
        
        // Find all incomplete tasks from previous days
        for (const date of dates) {
            if (date >= today) continue;
            
            const dayTasks = allTasks[date];
            for (const priority in dayTasks) {
                const incompleteTasks = dayTasks[priority].filter(t => !t.completed);
                
                for (const task of incompleteTasks) {
                    // Check if this task already exists in today's tasks (by text)
                    const exists = todaysTasks[priority].some(t => t.text === task.text);
                    
                    if (!exists) {
                        // Carry over the task
                        todaysTasks[priority].push({
                            ...task,
                            id: this.generateId(), // New ID for today
                            date: today,
                            carriedFrom: task.date
                        });
                    }
                }
            }
        }
        
        // Save updated tasks and mark carry over as done
        allTasks[today] = todaysTasks;
        await chrome.storage.local.set({ 
            dailyTasks: allTasks,
            lastCarryOverDate: today
        });
    }

    // Archive completed tasks for a specific date
    async archiveCompletedTasks(date = null) {
        const targetDate = date || this.getTodayString();
        const data = await chrome.storage.local.get(['dailyTasks', 'taskArchive']);
        const allTasks = data.dailyTasks || {};
        const archive = data.taskArchive || [];
        
        if (!allTasks[targetDate]) {
            return;
        }
        
        const dayTasks = allTasks[targetDate];
        const completedTasks = [];
        
        // Collect all completed tasks
        for (const priority in dayTasks) {
            completedTasks.push(...dayTasks[priority].filter(t => t.completed));
        }
        
        if (completedTasks.length > 0) {
            // Add to archive
            archive.push({
                date: targetDate,
                tasks: completedTasks,
                archivedAt: Date.now()
            });
            
            // Remove completed tasks from daily tasks
            for (const priority in dayTasks) {
                dayTasks[priority] = dayTasks[priority].filter(t => !t.completed);
            }
            
            // Save updated data
            allTasks[targetDate] = dayTasks;
            await chrome.storage.local.set({ 
                dailyTasks: allTasks,
                taskArchive: archive
            });
        }
    }

    // Check and archive yesterday's completed tasks
    async checkAndArchiveCompletedTasks() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split('T')[0];
        
        const data = await chrome.storage.local.get('lastArchiveDate');
        if (data.lastArchiveDate !== yesterdayString) {
            await this.archiveCompletedTasks(yesterdayString);
            await chrome.storage.local.set({ lastArchiveDate: yesterdayString });
        }
    }

    // Get task history (archived tasks)
    async getTaskHistory(startDate = null, endDate = null) {
        const data = await chrome.storage.local.get('taskArchive');
        const archive = data.taskArchive || [];
        
        if (!startDate && !endDate) {
            return archive;
        }
        
        return archive.filter(entry => {
            const entryDate = new Date(entry.date);
            if (startDate && entryDate < new Date(startDate)) return false;
            if (endDate && entryDate > new Date(endDate)) return false;
            return true;
        });
    }

    // Get all tasks (today's + history)
    async getAllTasks() {
        const todaysTasks = await this.getTodaysTasks();
        const history = await this.getTaskHistory();
        
        return {
            today: todaysTasks,
            history: history
        };
    }

    // Clear all task data
    async clearAllTasks() {
        await chrome.storage.local.remove(['dailyTasks', 'taskArchive', 'lastCarryOverDate', 'lastArchiveDate']);
        this.notifyListeners('tasksCleared');
    }

    // Add listener for task updates
    addListener(callback) {
        this.listeners.push(callback);
    }

    // Remove listener
    removeListener(callback) {
        this.listeners = this.listeners.filter(l => l !== callback);
    }

    // Notify all listeners
    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (e) {
                console.error('Error in task listener:', e);
            }
        });
    }
}

// Export for use in other files
window.TaskManager = TaskManager;