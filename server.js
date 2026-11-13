
const express = require("express");
const cron = require("node-cron");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.static("public"));

const DATA_FILE = path.join(__dirname, "data.json");

function getWebsites() {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveWebsites(websites) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(websites, null, 2));
}

// Email configuration
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Send alert email
async function sendAlert(website) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS ||
        !process.env.ALERT_EMAIL) {
        console.log("Email not configured. Alert:", website.url);
        return;
    }

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.ALERT_EMAIL,
            subject: "Website Down Alert!",
            text: `Your website ${website.url} is currently unavailable.`
        });

        console.log("Alert email sent!");
    } catch (error) {
        console.log("Email error:", error.message);
    }
}

// Check one website
async function checkWebsite(website) {
    const previousStatus = website.status;
    const startTime = Date.now();

    try {
        const response = await fetch(website.url, {
            signal: AbortSignal.timeout(10000)
        });

        website.status = response.ok ? "UP" : "DOWN";
        website.httpStatus = response.status;
        website.responseTime = Date.now() - startTime;
        website.lastChecked = new Date().toISOString();

    } catch (error) {
        website.status = "DOWN";
        website.httpStatus = null;
        website.responseTime = Date.now() - startTime;
        website.lastChecked = new Date().toISOString();
    }

    // Send email only when website changes from UP to DOWN
    if (previousStatus === "UP" && website.status === "DOWN") {
        await sendAlert(website);
    }
}

// Check all websites
async function checkAllWebsites() {
    const websites = getWebsites();

    for (const website of websites) {
        await checkWebsite(website);
    }

    saveWebsites(websites);
}

app.get("/api/websites", (req, res) => {
    res.json(getWebsites());
});

// Add a website
app.post("/api/websites", async (req, res) => {
    const { url } = req.body;

    try {
        const parsedUrl = new URL(url);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return res.status(400).json({ message: "Only HTTP and HTTPS URLs are allowed." });
        }

        const websites = getWebsites();

        if (websites.some(site => site.url === parsedUrl.href)) {
            return res.status(400).json({ message: "Website already exists." });
        }

        const website = {
            id: Date.now(),
            url: parsedUrl.href,
            status: "CHECKING",
            httpStatus: null,
            responseTime: null,
            lastChecked: null
        };

        websites.push(website);
        saveWebsites(websites);

        await checkWebsite(website);
        saveWebsites(websites);

        res.status(201).json(website);

    } catch (error) {
        res.status(400).json({ message: "Please enter a valid URL." });
    }
});

// Delete a website
app.delete("/api/websites/:id", (req, res) => {
    let websites = getWebsites();

    websites = websites.filter(
        site => site.id !== Number(req.params.id)
    );

    saveWebsites(websites);

    res.json({ message: "Website deleted successfully." });
});

// Manually check all websites
app.post("/api/check", async (req, res) => {
    await checkAllWebsites();
    res.json({ message: "Website checks completed." });
});

// Automatically check every minute
cron.schedule("* * * * *", () => {
    console.log("Running automatic website checks...");
    checkAllWebsites();
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
