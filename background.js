// background.js

// Initialize storage on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    timer: {
      isRunning: false,
      endTime: null,
      duration: 25 * 60 // Default 25 minutes
    },
    sessions: []
  });
  console.log("Focus Time Tracker initialized.");
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'start') {
    startTimer(request.duration);
    sendResponse({ status: "Timer started" });
  } else if (request.command === 'stop') {
    stopTimer();
    sendResponse({ status: "Timer stopped" });
  } else if (request.command === 'reset') {
    resetTimer(request.duration);
    sendResponse({ status: "Timer reset" });
  }
  return true; // Indicates that the response is sent asynchronously
});

// Listen for the alarm to tick
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'focusTimer') {
    chrome.storage.local.get(['timer', 'sessions'], (data) => {
      if (data.timer.isRunning) {
        const remainingTime = data.timer.endTime - Date.now();
        if (remainingTime <= 0) {
          // Timer finished
          stopTimer(true); // Stop and save session
        }
      }
    });
  }
});

function startTimer(duration) {
  const endTime = Date.now() + duration * 1000;
  chrome.storage.local.set({
    timer: {
      isRunning: true,
      endTime: endTime,
      duration: duration
    }
  }, () => {
    chrome.alarms.create('focusTimer', { delayInMinutes: 0, periodInMinutes: 1/60 });
    console.log("Timer started with duration:", duration);
  });
}

function stopTimer(finished = false) {
  chrome.alarms.clear('focusTimer', (wasCleared) => {
    console.log("Alarm cleared:", wasCleared);
    chrome.storage.local.get(['timer', 'sessions', 'settings'], (data) => {
      const { timer, sessions, settings } = data;
      if (!timer.isRunning) return;

      const newTimerState = {
        ...timer,
        isRunning: false,
      };

      if (finished) {
        const newSession = {
          duration: timer.duration,
          category: settings?.lastCategory || 'Uncategorized',
          endTime: Date.now()
        };
        const newSessions = [...sessions, newSession];
        chrome.storage.local.set({ sessions: newSessions });
        console.log("Session saved:", newSession);

        // Show notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Focus Time Complete!',
          message: `You completed a ${timer.duration / 60}-minute session.`,
          priority: 2
        });
      }
      
      chrome.storage.local.set({ timer: newTimerState });
    });
  });
}

function resetTimer(duration) {
    stopTimer(false); // Stop without saving
    chrome.storage.local.set({
        timer: {
            isRunning: false,
            endTime: null,
            duration: duration
        }
    });
    console.log("Timer has been reset.");
}
