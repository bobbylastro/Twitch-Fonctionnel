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
            log.info(`Scraping ${request.url}`);
            await page.goto(request.url, { waitUntil: "domcontentloaded" });

            const button = await page.$('[data-a-target="content-classification-gate-overlay-start-watching-button"]');
            if (button) {
                console.log("Bouton trouvé, on clique dessus...");
                await button.click();
                await page.waitForTimeout(1000);
            } else {
                console.log("Pas de bouton, on continue...");
            }

            await page.waitForFunction(() => document.querySelector("video")?.src, { timeout: 15000 });
            let videoUrl = await page.$eval("video", (video) => video.src).catch(() => null);

            if (!videoUrl) {
                log.info("No video found in main page, checking iframes...");
                for (const frame of page.frames()) {
                    try {
                        videoUrl = await frame.$eval("video", (video) => video.src);
                        if (videoUrl) {
                            log.info(`Video found in iframe: ${videoUrl}`);
                            break;
                        }
                    } catch (_) {}
                }
            }

            if (!videoUrl) {
                log.info("No video found in DOM, intercepting network requests...");
                page.on("response", async (response) => {
                    if (response.request().resourceType() === "media") {
                        const url = response.url();
                        log.info(`Detected media URL: ${url}`);
                        videoUrl = url;
                    }
                });
                await page.waitForTimeout(5000);
            }

            if (videoUrl) {
                log.info(`Clip URL: ${videoUrl}`);
                await Dataset.pushData({ url: request.url, videoUrl });
            } else {
                log.warn(`No video URL found for ${request.url}`);
            }
        },
    });

    await crawler.run(startUrls);
}

// --- Partie CLI (si lancé avec un argument)
if (require.main === module) {
    const clipUrl = process.argv[2];
    if (!clipUrl) {
        console.error("No URL provided!");
        process.exit(1);
    }

    crawlClip(clipUrl).catch(console.error);
} else {
    // --- Partie API Express (si importé ou démarré comme serveur)
    const app = express();
    app.use(express.json());

    app.post("/scrape", async (req, res) => {
        const clipUrl = req.body.clipUrl;
        if (!clipUrl) {
            return res.status(400).json({ error: "Missing clipUrl in body" });
        }

        try {
            await crawlClip(clipUrl);
            const items = await Dataset.getData();
            res.json(items.items);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Scraping failed" });
        }
    });

    app.listen(8080, () => {
        console.log("Server running on port 8080");
    });
}
