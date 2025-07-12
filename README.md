# Focus Time Tracker

A Chrome extension that helps you track focused work time using the Pomodoro technique with beautiful visualizations and analytics.

## 🚀 Features

### ⏱️ **Timer & Tracking**
- Customizable focus timers with category tracking
- Background timer persistence across browser sessions
- Visual progress indicators with audio completion notifications
- Editable timer display (click to change duration)
- Last category preselection for quick session starts

### 🎯 **New Tab Integration**
- Override default new tab with Focus Time Tracker
- Integrated timer with glass morphism design
- Live statistics dashboard with smart comparisons
- "This Week" vs last week and "This Month" vs last month indicators

### 🏷️ **Smart Categories**
- Pre-loaded categories: Research, Learning, Work, Volunteering
- Auto-discovery from existing sessions
- Dropdown selection (popup) and autocomplete (new tab)

### 📊 **GitHub-Style Streak Heatmap**
- Complete history visualization with year navigation
- 5 intensity levels based on focus duration
- Interactive tooltips with date and time details
- Context-aware streak statistics (current only shown for current year)
- Available on both New Tab and Statistics pages

### 📈 **Advanced Analytics**
- Interactive pie charts with category breakdown
- Time period navigation (Day/Week/Month/Year)
- 8 summary cards for different time periods
- Dynamic titles showing total focus hours
- Smart time formatting (hours/minutes) for all comparisons

### 💾 **Data Management**
- CSV export/import functionality
- Backup and restore capabilities
- Cross-device sync via Chrome storage
- Local storage optimization for large datasets

### 🎨 **Beautiful UI**
- Responsive design for all screen sizes
- Glass morphism and gradient backgrounds
- Touch-friendly mobile interface
- Consistent theming throughout

## 📦 Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your toolbar and override new tabs

## 🎯 Usage

### Popup Timer
- Click the extension icon to open the timer
- Select duration and category
- Start your focus session

### New Tab Dashboard
- Open a new tab to see the focus dashboard
- Use the integrated timer with visual progress
- View your streak heatmap and daily stats
- Navigate through historical data with year controls
- Click timer display to edit duration inline

### Statistics Page
- Click "📊 Full Statistics" or right-click extension → Options
- Explore detailed charts and analytics with year navigation
- Export/import your focus data
- Browse complete focus history across all years

## ✨ Recent Improvements

### v2.1 (Latest)
- **Enhanced Timer UX**: Removed pause button, added editable timer display
- **Smart Category Memory**: Automatically preselects your last used category
- **Historical Navigation**: Complete year-by-year heatmap navigation on both pages
- **Better Time Formatting**: All comparisons now show hours/minutes (e.g., "2h 30m" not "150m")
- **Context-Aware Streaks**: Current streak only displays when viewing current year
- **Audio Notifications**: MP3 chime plays when focus sessions complete
- **Improved Comparisons**: "This Week" vs last week, "This Month" vs last month indicators

### UI/UX Polish
- More legible red color for negative comparisons
- Cleaner comparison text (removed redundant "vs last week/month")
- Hidden comparisons when no previous period data exists
- Streamlined timer controls with better visual feedback

## 🏗️ Architecture

Built with:
- **Vanilla JavaScript** - No frameworks, pure web APIs
- **Chrome Extension MV3** - Modern manifest version
- **Chart.js** - Beautiful data visualizations
- **Tailwind CSS** - Responsive utility-first styling

## 💭 Context of Creation
I appreciated the idea of Forest app and used it for three years. Then in the first week of July '25, I got fed up with Forest app since its last update. There were already too many sore points I had, but the constant nagging about offline mode and so on made me feel like the last straw. So I decided to vibecode with Claude Code for my own personal replacement of the app. I am glad that they had the option to allow me to export my data. Thank you Forest app for your service. Good riddance!

## 📄 License

MIT License - Feel free to use and modify as needed.