
const websiteForm = document.getElementById("websiteForm");
const websiteUrl = document.getElementById("websiteUrl");
const websiteList = document.getElementById("websiteList");

async function loadWebsites() {
    const response = await fetch("/api/websites");
    const websites = await response.json();

    document.getElementById("total").textContent = websites.length;

    document.getElementById("online").textContent =
        websites.filter(site => site.status === "UP").length;

    document.getElementById("offline").textContent =
        websites.filter(site => site.status === "DOWN").length;

    websiteList.innerHTML = "";

    if (websites.length === 0) {
        websiteList.innerHTML = "<p>No websites added yet.</p>";
        return;
    }

    websites.forEach(site => {
        const card = document.createElement("div");
        card.className = "website-card";

        const info = document.createElement("div");
        info.className = "website-info";

        const url = document.createElement("strong");
        url.textContent = site.url;

        const details = document.createElement("p");
        details.textContent =
            "HTTP: " + (site.httpStatus ?? "N/A") +
            " | Response: " +
            (site.responseTime === null ? "N/A" : site.responseTime + " ms");

        const status = document.createElement("p");
        status.className = "status " + site.status;
        status.textContent = "Status: " + site.status;

        info.appendChild(url);
        info.appendChild(details);
        info.appendChild(status);

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", async () => {
            await fetch("/api/websites/" + site.id, {
                method: "DELETE"
            });

            loadWebsites();
        });

        card.appendChild(info);
        card.appendChild(deleteButton);

        websiteList.appendChild(card);
    });
}

// Add website
websiteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const response = await fetch("/api/websites", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            url: websiteUrl.value
        })
    });

    const result = await response.json();

    if (!response.ok) {
        alert(result.message);
        return;
    }

    websiteUrl.value = "";
    loadWebsites();
});

// Manual check
document.getElementById("checkButton").addEventListener("click", async () => {
    const button = document.getElementById("checkButton");

    button.textContent = "Checking...";
    button.disabled = true;

    await fetch("/api/check", {
        method: "POST"
    });

    await loadWebsites();

    button.textContent = "Check Now";
    button.disabled = false;
});

// Refresh dashboard every 10 seconds
loadWebsites();
setInterval(loadWebsites, 10000);
