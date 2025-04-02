document.addEventListener("DOMContentLoaded", async () => {
    const config = await getConfig();
    automateActions(config.postCount);
});

async function getConfig() {
    return new Promise((resolve) => {
        chrome.storage.sync.get({ postCount: 3 }, (data) => {
            resolve(data);
        });
    });
}

function automateActions(postCount) {
    const posts = document.querySelectorAll(".feed-shared-update-v2");
    for (let i = 0; i < Math.min(postCount, posts.length); i++) {
        const post = posts[i];
        likePost(post);
        repostPost(post);
    }
}

function likePost(post) {
    const likeButton = post.querySelector("button[aria-label*='Like']");
    if (likeButton && !likeButton.classList.contains("reacted")) {
        likeButton.click();
    }
}

function repostPost(post) {
    const repostButton = post.querySelector("button[aria-label*='Repost']");
    if (repostButton) {
        repostButton.click();
        setTimeout(() => {
            const confirmButton = document.querySelector("button[aria-label='Repost']");
            if (confirmButton) confirmButton.click();
        }, 1000);
    }
}
