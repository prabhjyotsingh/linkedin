document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.sync.get(["postCount", "scheduleTime"], (data) => {
        document.getElementById("postCount").value = data.postCount || 3;
        document.getElementById("scheduleTime").value = data.scheduleTime || "12:00";
    });

    document.getElementById("save").addEventListener("click", () => {
        const postCount = parseInt(document.getElementById("postCount").value, 10);
        const scheduleTime = document.getElementById("scheduleTime").value;
        chrome.storage.sync.set({ postCount, scheduleTime });

        const [hour, minute] = scheduleTime.split(":".map(Number));
        const now = new Date();
        now.setHours(hour, minute, 0, 0);
        if (now < new Date()) now.setDate(now.getDate() + 1);
        const delayInMinutes = (now - new Date()) / 60000;

        chrome.alarms.create("automateActions", { delayInMinutes, periodInMinutes: 1440 });
    });
});

