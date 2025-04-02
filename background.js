chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "automateActions") {
        chrome.scripting.executeScript({
            target: { allFrames: true },
            files: ["content.js"]
        });
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ postCount: 3, scheduleTime: "12:00" });
});

