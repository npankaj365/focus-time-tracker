// background.js

// Initialize storage on installation
chrome.runtime.onInstalled.addListener(() => {
  // Use chrome.storage.sync to enable data synchronization
  chrome.storage.sync.get(null, (data) => {
    // Initialize only if data is not already present
    if (Object.keys(data).length === 0) {
        chrome.storage.sync.set({
            timer: {
              isRunning: false,
              endTime: null,
              duration: 25 * 60 // Default 25 minutes
            }
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("Initialization failed:", chrome.runtime.lastError.message);
            } else {
                console.log("Focus Time Tracker initialized with sync storage.");
            }
        });
        
        // Initialize sessions in local storage
        chrome.storage.local.get('sessions', (localData) => {
            if (!localData.sessions) {
                chrome.storage.local.set({ sessions: [] });
            }
        });
    }
  });
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'start') {
    startTimer(request.duration);
    sendResponse({ status: "Timer started" });
  } else if (request.command === 'stop') {
    // When user manually stops, don't save the session.
    stopTimer(false);
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
    chrome.storage.sync.get('timer', (data) => {
      if (data.timer && data.timer.isRunning) {
        const remainingTime = data.timer.endTime - Date.now();
        if (remainingTime <= 0) {
          // Timer finished, so save the session.
          stopTimer(true);
        }
      }
    });
  }
});

function startTimer(duration) {
  const endTime = Date.now() + duration * 1000;
  chrome.storage.sync.set({
    timer: {
      isRunning: true,
      endTime: endTime,
      duration: duration
    }
  }, () => {
    // Create an alarm that fires every second to check the timer
    chrome.alarms.create('focusTimer', { delayInMinutes: 0, periodInMinutes: 1/60 });
    console.log("Timer started with duration:", duration);
  });
}

function stopTimer(finished = false) {
  // Clear the alarm first
  chrome.alarms.clear('focusTimer', (wasCleared) => {
    console.log("Alarm cleared:", wasCleared);
    
    chrome.storage.sync.get(['timer', 'settings'], (data) => {
      // Exit if timer is not running or data is missing
      if (!data.timer || !data.timer.isRunning) {
        return;
      }

      let dataToSave = {
        timer: { ...data.timer, isRunning: false }
      };
      
      let notificationOptions = null;

      if (finished) {
        const newSession = {
          duration: data.timer.duration,
          category: data.settings?.lastCategory || 'Uncategorized',
          endTime: Date.now()
        };
        // Save session to local storage instead of sync
        chrome.storage.local.get('sessions', (localData) => {
          const newSessions = [...(localData.sessions || []), newSession];
          chrome.storage.local.set({ sessions: newSessions });
        });
        
        // Prepare success notification
        notificationOptions = {
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Focus Time Complete!',
          message: `You completed a ${data.timer.duration / 60}-minute session.`,
          priority: 2
        };
      }

      // Save all changes in one go
      chrome.storage.sync.set(dataToSave, () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving data:', chrome.runtime.lastError.message);
          // Notify user of the error
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Save Error',
            message: `Could not save session: ${chrome.runtime.lastError.message}`,
            priority: 2
          });
        } else {
          console.log('Data saved successfully. Finished:', finished);
          // If a session was successfully completed and saved, show the notification
          if (notificationOptions) {
            chrome.notifications.create(notificationOptions);
            // Play chime sound
            playChimeSound();
          }
        }
      });
    });
  });
}

function resetTimer(duration) {
    stopTimer(false); // Stop without saving
    chrome.storage.sync.set({
        timer: {
            isRunning: false,
            endTime: null,
            duration: duration
        }
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error resetting timer:', chrome.runtime.lastError.message);
      } else {
        console.log("Timer has been reset.");
      }
    });
}

async function playChimeSound() {
  try {
    // Create an offscreen document to play the MP3 file
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play focus completion chime sound'
    });
    
    // Send message to offscreen document to play chime
    chrome.runtime.sendMessage({ action: 'playChime' });
    
    // Clean up offscreen document after a delay
    setTimeout(async () => {
      try {
        await chrome.offscreen.closeDocument();
      } catch (error) {
        // Document might already be closed
      }
    }, 3000);
  } catch (error) {
    console.error('Failed to play chime sound:', error);
  }
}
