// options.js

document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('focus-chart').getContext('2d');
    let focusChart;
    let allSessions = [];

    const timeRangeButtons = document.querySelectorAll('.time-range-btn');
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const periodDisplay = document.getElementById('period-display');
    
    // Navigation state
    let currentTimeUnit = 'day';
    let currentDate = new Date();

    // Navigation functions
    function navigatePrevious() {
        const newDate = new Date(currentDate);
        
        switch (currentTimeUnit) {
            case 'day':
                newDate.setDate(newDate.getDate() - 1);
                break;
            case 'week':
                newDate.setDate(newDate.getDate() - 7);
                break;
            case 'month':
                newDate.setMonth(newDate.getMonth() - 1);
                break;
            case 'year':
                newDate.setFullYear(newDate.getFullYear() - 1);
                break;
        }
        
        currentDate = newDate;
        updatePeriodDisplay();
        renderChart(currentTimeUnit);
    }

    function navigateNext() {
        const newDate = new Date(currentDate);
        
        switch (currentTimeUnit) {
            case 'day':
                newDate.setDate(newDate.getDate() + 1);
                break;
            case 'week':
                newDate.setDate(newDate.getDate() + 7);
                break;
            case 'month':
                newDate.setMonth(newDate.getMonth() + 1);
                break;
            case 'year':
                newDate.setFullYear(newDate.getFullYear() + 1);
                break;
        }
        
        currentDate = newDate;
        updatePeriodDisplay();
        renderChart(currentTimeUnit);
    }

    function updatePeriodDisplay() {
        const options = { timeZone: 'local' };
        let displayText = '';
        
        switch (currentTimeUnit) {
            case 'day':
                const today = new Date();
                if (currentDate.toDateString() === today.toDateString()) {
                    displayText = 'Today';
                } else {
                    displayText = currentDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    });
                }
                break;
            case 'week':
                const startOfWeek = new Date(currentDate);
                startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                displayText = `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                break;
            case 'month':
                displayText = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                break;
            case 'year':
                displayText = currentDate.getFullYear().toString();
                break;
        }
        
        periodDisplay.textContent = displayText;
    }

    // Backup/Restore functions
    function exportToCSV() {
        const csvContent = convertSessionsToCSV(allSessions);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'focus_sessions.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function convertSessionsToCSV(sessions) {
        const headers = ['Start Time', 'End Time', 'Tag', 'Note', 'Tree Type', 'Is Success'];
        const csvRows = [headers.join(',')];
        
        sessions.forEach(session => {
            const startTime = new Date(session.endTime - (session.duration * 1000)).toString();
            const endTime = new Date(session.endTime).toString();
            const tag = session.category || 'Uncategorized';
            const note = '';
            const treeType = 'Cedar';
            const isSuccess = 'True';
            
            const row = [
                `"${startTime}"`,
                `"${endTime}"`,
                `"${tag}"`,
                `"${note}"`,
                `"${treeType}"`,
                `"${isSuccess}"`
            ].join(',');
            csvRows.push(row);
    });
        
        return csvRows.join('\n');
    }

    function importFromCSV(csvContent) {
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
        const sessions = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = parseCSVLine(line);
            if (values.length < 6) continue;
            
            const startTime = new Date(values[0].replace(/"/g, ''));
            const endTime = new Date(values[1].replace(/"/g, ''));
            const tag = values[2].replace(/"/g, '');
            const isSuccess = values[5].replace(/"/g, '').toLowerCase() === 'true';
            
            if (isSuccess && !isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
                const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
                sessions.push({
                    duration: duration,
                    category: tag,
                    endTime: endTime.getTime()
            });
        }
    }
        
        return sessions;
    }

    function parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
        } else {
                current += char;
        }
    }
        values.push(current);
        return values;
    }

    function clearAllData() {
        const confirmation = confirm(
            `⚠️ WARNING: This will permanently delete ALL your focus session data!\n\n` +
            `You currently have ${allSessions.length} sessions recorded.\n\n` +
            `This action cannot be undone. Are you sure you want to continue?`
        );
        
        if (confirmation) {
            const doubleConfirmation = confirm(
                `🗑️ FINAL CONFIRMATION\n\n` +
                `Click OK to permanently delete all ${allSessions.length} focus sessions.\n\n` +
                `This is your last chance to cancel!`
            );
            
            if (doubleConfirmation) {
                chrome.storage.local.set({ sessions: [] }, () => {
                    if (chrome.runtime.lastError) {
                        alert('Error clearing data: ' + chrome.runtime.lastError.message);
                    } else {
                        allSessions = [];
                        updateSummaryCards(allSessions);
                        renderChart('day');
                        alert('✅ All focus session data has been cleared successfully!');
                    }
                });
            }
        }
    }

    // Chart.js color palette
    const chartColors = [
        '#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
        '#EF4444', '#F97316', '#84CC16', '#06B6D4', '#D946EF', '#6B7280'
    ];

    function getColorsForCategories(categories) {
        const colorMap = {};
        categories.forEach((cat, index) => {
            colorMap[cat] = chartColors[index % chartColors.length];
    });
        return colorMap;
    }

    function getTimeRanges() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // This week (Sunday to Saturday)
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());
        
        // Last week
        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(thisWeekStart.getDate() - 7);
        const lastWeekEnd = new Date(thisWeekStart);
        
        // This month
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Last month
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // This year
        const thisYearStart = new Date(now.getFullYear(), 0, 1);
        
        // Last year
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear(), 0, 1);
        
        return {
            today: { start: today, end: null },
            thisWeek: { start: thisWeekStart, end: null },
            lastWeek: { start: lastWeekStart, end: lastWeekEnd },
            thisMonth: { start: thisMonthStart, end: null },
            lastMonth: { start: lastMonthStart, end: lastMonthEnd },
            thisYear: { start: thisYearStart, end: null },
            lastYear: { start: lastYearStart, end: lastYearEnd }
        };
    }

    function calculateSummaryStats(sessions) {
        const ranges = getTimeRanges();
        const stats = {};
        const now = Date.now();
        
        // Initialize all stats to 0
        Object.keys(ranges).forEach(period => {
            stats[period] = 0;
        });
        stats.total = 0;
        
        // Process sessions efficiently in a single pass
        sessions.forEach(session => {
            const sessionTime = new Date(session.endTime);
            const durationMinutes = session.duration / 60;
            
            // Add to total
            stats.total += durationMinutes;
            
            // Check each time range
            Object.keys(ranges).forEach(period => {
                const range = ranges[period];
                const isInRange = sessionTime >= range.start && 
                    (range.end === null ? sessionTime.getTime() <= now : sessionTime < range.end);
                
                if (isInRange) {
                    stats[period] += durationMinutes;
                }
            });
        });
        
        return stats;
    }

    function aggregateData(sessions, timeUnit) {
        const aggregated = {}; // e.g., { 'Work': 120, 'Study': 90 }
        let startDate, endDate;

        switch (timeUnit) {
            case 'day':
                startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 1);
                break;
            case 'week':
                startDate = new Date(currentDate);
                startDate.setDate(currentDate.getDate() - currentDate.getDay());
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 7);
                break;
            case 'month':
                startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                break;
            case 'year':
                startDate = new Date(currentDate.getFullYear(), 0, 1);
                endDate = new Date(currentDate.getFullYear() + 1, 0, 1);
                break;
        }

        const filteredSessions = sessions.filter(s => {
            const sessionDate = new Date(s.endTime);
            return sessionDate >= startDate && sessionDate < endDate;
        });

        filteredSessions.forEach(session => {
            const category = session.category || 'Uncategorized';
            const durationMinutes = session.duration / 60;
            if (!aggregated[category]) {
                aggregated[category] = 0;
            }
            aggregated[category] += durationMinutes;
        });
        
        return aggregated;
    }

    function renderChart(timeUnit) {
        const aggregatedData = aggregateData(allSessions, timeUnit);
        const categories = Object.keys(aggregatedData);
        const data = Object.values(aggregatedData);
        const colorMap = getColorsForCategories(categories);
        const backgroundColors = categories.map(label => colorMap[label]);
        
        // Create enhanced labels with time duration
        const labels = categories.map(category => {
            const minutes = aggregatedData[category];
            const formattedTime = formatMinutes(minutes);
            return `${category} (${formattedTime})`;
        });

        if (focusChart) {
            focusChart.destroy();
    }

        focusChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Minutes Focused',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: '#ffffff',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: labels.length > 1,
                        position: window.innerWidth < 768 ? 'bottom' : 'right',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: window.innerWidth < 768 ? 11 : 12
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: `Focus Time by Category (${timeUnit.charAt(0).toUpperCase() + timeUnit.slice(1)})`,
                        font: {
                            size: window.innerWidth < 768 ? 14 : 18
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const categoryIndex = context.dataIndex;
                                const category = categories[categoryIndex];
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                const formattedTime = formatMinutes(value);
                                return `${category}: ${formattedTime} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
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

    function updateSummaryCards(sessions) {
        const stats = calculateSummaryStats(sessions);
        
        // Update each card
        const cards = {
            'today-card': stats.today,
            'week-card': stats.thisWeek,
            'lastweek-card': stats.lastWeek,
            'month-card': stats.thisMonth,
            'lastmonth-card': stats.lastMonth,
            'year-card': stats.thisYear,
            'lastyear-card': stats.lastYear,
            'total-card': stats.total
        };
        
        Object.keys(cards).forEach(cardId => {
            const card = document.getElementById(cardId);
            const valueElement = card.querySelector('.text-2xl');
            const minutes = cards[cardId];
            valueElement.textContent = minutes > 0 ? formatMinutes(minutes) : '--';
        });
    }

    function setActiveButton(activeBtn) {
        timeRangeButtons.forEach(button => {
            button.classList.remove('bg-indigo-600', 'text-white');
            button.classList.add('bg-white', 'text-slate-700', 'hover:bg-slate-100');
    });
        activeBtn.classList.add('bg-indigo-600', 'text-white');
        activeBtn.classList.remove('bg-white', 'text-slate-700', 'hover:bg-slate-100');
    }

    timeRangeButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const timeUnit = e.target.id.split('-')[0];
            currentTimeUnit = timeUnit;
            currentDate = new Date(); // Reset to current date when changing time unit
            setActiveButton(e.target);
            updatePeriodDisplay();
            renderChart(timeUnit);
        });
    });

    // Navigation event listeners
    prevBtn.addEventListener('click', navigatePrevious);
    nextBtn.addEventListener('click', navigateNext);

    // Backup event listeners
    exportBtn.addEventListener('click', exportToCSV);
    
    importBtn.addEventListener('click', () => {
        importFile.click();
    });
    
    clearDataBtn.addEventListener('click', clearAllData);
    
    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csvContent = e.target.result;
                    const importedSessions = importFromCSV(csvContent);
                    
                    if (importedSessions.length === 0) {
                        alert('No valid sessions found in the CSV file.');
                        return;
                    }
                    
                    // Merge with existing sessions
                    const mergedSessions = [...allSessions, ...importedSessions];
                    
                    // Save to storage
                    chrome.storage.local.set({ sessions: mergedSessions }, () => {
                        if (chrome.runtime.lastError) {
                            alert('Error saving imported sessions: ' + chrome.runtime.lastError.message);
                        } else {
                            alert(`Successfully imported ${importedSessions.length} sessions!`);
                            allSessions = mergedSessions;
                            const activeUnit = document.querySelector('.time-range-btn.bg-indigo-600')?.id.split('-')[0] || 'day';
                            renderChart(activeUnit);
                            updateSummaryCards(allSessions);
                        }
                    });
                } catch (error) {
                    alert('Error parsing CSV file: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    });

    // Load data and initialize
    chrome.storage.local.get('sessions', (data) => {
        allSessions = data.sessions || [];
        console.log(`Loaded ${allSessions.length} sessions`);
        updatePeriodDisplay(); // Set initial period display
        renderChart('day'); // Initial view
        updateSummaryCards(allSessions);
        setActiveButton(document.getElementById('day-btn'));
    });
    
    // Listen for storage changes to keep data fresh
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.sessions) {
            allSessions = changes.sessions.newValue || [];
            const activeUnit = document.querySelector('.time-range-btn.bg-indigo-600')?.id.split('-')[0] || 'day';
            renderChart(activeUnit);
            updateSummaryCards(allSessions);
        }
    });
    
    // Listen for window resize to update chart responsiveness
    window.addEventListener('resize', () => {
        if (focusChart) {
            const activeUnit = document.querySelector('.time-range-btn.bg-indigo-600')?.id.split('-')[0] || 'day';
            renderChart(activeUnit);
        }
    });
});
