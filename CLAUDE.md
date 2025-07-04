# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome extension called "Focus Time Tracker" that helps users track their focused work time using the Pomodoro technique. It's built with vanilla JavaScript and uses Chrome Extension APIs.

## Architecture

The extension follows Chrome Extension MV3 architecture:

- **background.js**: Service worker that manages timer state, alarms, and session storage
- **popup.js**: Controls the popup UI and communicates with background script
- **options.js**: Handles the statistics page with Chart.js visualization
- **popup.html**: Main popup interface (320px width)
- **options.html**: Statistics page with charts and session tables
- **manifest.json**: Extension configuration (MV3)

## Key Components

### Storage System
- Uses `chrome.storage.sync` for timer state and settings (cross-device sync)
- Uses `chrome.storage.local` for session history (performance)
- Timer state includes: `isRunning`, `endTime`, `duration`
- Sessions include: `duration`, `category`, `endTime`

### Timer Logic
- Managed by background script using `chrome.alarms` API
- Alarm fires every second to check timer status
- Sessions are only saved when timer completes naturally (not when manually stopped)
- Timer duration is stored in seconds, displayed in minutes

### UI Framework
- Uses Tailwind CSS loaded from `vendor/tailwindcss.js`
- Chart.js for statistics visualization
- Inter font from Google Fonts
- Responsive design with slate color scheme

## Development Commands

This is a Chrome extension project with no build process. Development workflow:

1. **Load extension**: Chrome → Extensions → Developer mode → Load unpacked
2. **Test changes**: Reload extension in Chrome Extensions page
3. **Debug popup**: Right-click extension icon → Inspect popup
4. **Debug background**: Chrome Extensions → Details → Inspect views: service worker
5. **Debug options**: Right-click extension → Options → DevTools

## Storage Architecture

- Timer state syncs across devices via `chrome.storage.sync`
- Session history stored locally for performance (handles 12K+ sessions efficiently)
- Categories are saved as user settings
- Storage listeners keep UI synchronized across popup and options pages
- **Optimized for Large Datasets**: Local storage prevents sync quota issues

## Advanced Features

### 📊 **Interactive Statistics Dashboard**
- **Pie Chart Visualization**: Shows focus time distribution by category
- **Responsive Design**: Adapts to browser window size (400px height, 60vh max)
- **Enhanced Legends**: Display category names with time duration (e.g., "Work (2h 30m)")
- **Smart Positioning**: Legend on right (desktop) or bottom (mobile)

### 🗓️ **Time Period Navigation**
- **Previous/Next Navigation**: Browse through historical periods
- **Smart Period Display**: Shows "Today", specific dates, or date ranges
- **Multiple Time Units**: Day, Week, Month, Year navigation
- **Precise Data Filtering**: Accurate date range filtering for each period

### 📈 **Summary Cards**
- **8 Time Period Cards**: Today, This Week, Last Week, This Month, Last Month, This Year, Last Year, All Time
- **Gradient Design**: Color-coded cards with beautiful gradients
- **Smart Time Formatting**: Hours and minutes only (no days)
- **Responsive Grid**: Adapts from 1 to 4 columns based on screen size

### 💾 **Backup & Restore System**
- **CSV Export**: Download all sessions as CSV file
- **CSV Import**: Import sessions from external CSV files (plants.csv format compatible)
- **Merge Functionality**: Imported data merges with existing sessions
- **Data Validation**: Only imports successful sessions
- **Progress Feedback**: Success/error messages with session counts

### 🗑️ **Data Management**
- **Clear All Data**: One-click data clearing with double confirmation
- **Safety Measures**: Two-step confirmation process with session count display
- **Complete Reset**: Clears storage and updates all UI components
- **Error Handling**: Proper error handling for storage operations

### 🎨 **UI/UX Improvements**
- **Responsive Chart**: Auto-resizes with browser window changes
- **Touch-Friendly**: Optimized for mobile devices
- **Visual Feedback**: Loading states and progress indicators
- **Consistent Theming**: Slate color scheme throughout

## Chart System

The options page uses Chart.js (loaded locally from `vendor/chart.js`) to display:
- **Pie charts** showing focus time distribution by category
- **Time range filters** (day/week/month/year) with navigation
- **Enhanced tooltips** with time duration and percentages
- **Responsive legends** with time durations visible
- **Color-coded categories** with consistent 12-color palette

## Performance Optimizations

- **Efficient Data Processing**: Single-pass aggregation algorithms
- **Local Chart.js**: No CDN dependencies, faster loading
- **Responsive Design**: Viewport-based sizing and font scaling
- **Memory Management**: Chart destruction and recreation for navigation
- **Large Dataset Handling**: Optimized for 12K+ session records

## Time Formatting

- **Consistent Format**: Hours and minutes only (e.g., "2h 30m", "45m")
- **Smart Display**: Under 60 minutes shows minutes only
- **No Days**: Simplified format focusing on hours/minutes

## Extension Permissions

Required permissions in manifest.json:
- `storage`: For sync and local storage
- `alarms`: For timer functionality
- `notifications`: For completion alerts