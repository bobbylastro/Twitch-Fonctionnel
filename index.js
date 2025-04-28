const { PlaywrightCrawler, Dataset } = require("crawlee");
const express = require("express");

async function crawlClip(clipUrl) {
    const startUrls = [clipUrl];

    const crawler = new PlaywrightCrawler({
        headless: true,
        launchContext: {
            launchOptions: {
                args: ["--disable-gpu", "--no-sandbox"],
            },
        },
        async requestHandler({ page, request, log }) {
            log.info(Scraping ${request.url});
            await page.goto(request.url, { waitUntil: "domcontentloaded" });

            const button = await page.$('[data-a-target="content-classification-gate-overlay-start-watching-button"]');
            if (button) {
                console.log("Bouton trouvé, on clique dessus...");
                await button.click();
                await page.waitForTimeout(1000);
            }

            await page.waitForFunction(() => document.querySelector("video")?.src, { timeout: 15000 });
            const videoUrl = await page.$eval("video", (video) => video.src).catch(() => null);

            if (videoUrl) {
                await Dataset.pushData({ url: startUrls[0], videoUrl });
            }
        },
    });

    await crawler.run(startUrls);
}

const app = express();
app.post("/scrape", (req, res) => {
    let body = "";

    req.on("data", chunk => {
        body += chunk.toString(); // convert Buffer to string
    });

    req.on("end", async () => {
        try {
            const data = JSON.parse(body);
            const clipUrl = data.clipUrl;

            if (!clipUrl) {
                return res.status(400).json({ error: "Missing clipUrl" });
            }

            await crawlClip(clipUrl);
            const items = await Dataset.getData();
            res.json(items.items);

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Scraping failed" });
        }
    });
});

app.listen(8080, () => {
    console.log("Server running on port 8080");
});
