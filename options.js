// options.js

document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('focus-chart').getContext('2d');
    let focusChart;
    let allSessions = [];

    const timeRangeButtons = document.querySelectorAll('.time-range-btn');

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

    function aggregateData(sessions, timeUnit) {
        const aggregated = {}; // e.g., { 'Work': 120, 'Study': 90 }
        const now = new Date();
        let startDate;

        switch (timeUnit) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - now.getDay()));
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
        }

        const filteredSessions = sessions.filter(s => new Date(s.endTime) >= startDate);

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
        const labels = Object.keys(aggregatedData);
        const data = Object.values(aggregatedData);
        const colorMap = getColorsForCategories(labels);
        const backgroundColors = labels.map(label => colorMap[label]);

        if (focusChart) {
            focusChart.destroy();
        }

        focusChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Minutes Focused',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors,
                    borderWidth: 1,
                    borderRadius: 5,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: labels.length > 1,
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: `Focus Time by Category (${timeUnit.charAt(0).toUpperCase() + timeUnit.slice(1)})`,
                        font: {
                            size: 18
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += Math.round(context.parsed.y * 100) / 100 + ' min';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Total Minutes'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    function renderTable(sessions) {
        const tableBody = document.getElementById('sessions-table-body');
        tableBody.innerHTML = ''; // Clear existing rows

        if (sessions.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-slate-500 py-4">No focus sessions recorded yet.</td></tr>`;
            return;
        }

        // Sort sessions by most recent first
        const sortedSessions = [...sessions].sort((a, b) => b.endTime - a.endTime);

        sortedSessions.forEach(session => {
            const date = new Date(session.endTime).toLocaleDateString();
            const category = session.category || 'Uncategorized';
            const duration = session.duration / 60;

            const row = `
                <tr class="hover:bg-slate-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-700">${date}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-700">${category}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-700">${duration}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
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
            setActiveButton(e.target);
            renderChart(timeUnit);
        });
    });

    // Load data and initialize
    chrome.storage.local.get('sessions', (data) => {
        allSessions = data.sessions || [];
        renderChart('day'); // Initial view
        renderTable(allSessions);
        setActiveButton(document.getElementById('day-btn'));
    });
    
    // Listen for storage changes to keep data fresh
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.sessions) {
            allSessions = changes.sessions.newValue || [];
            const activeUnit = document.querySelector('.time-range-btn.bg-indigo-600').id.split('-')[0] || 'day';
            renderChart(activeUnit);
            renderTable(allSessions);
        }
    });
});
