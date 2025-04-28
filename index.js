const { PlaywrightCrawler, Dataset } = require("crawlee");
const express = require("express");

async function crawlClip(clipUrl) {
    const startUrls = [clipUrl];
    let lastVideoUrl = null;  // Variable pour stocker la dernière vidéo

    const maxRetries = 5;

    const crawler = new PlaywrightCrawler({
        headless: true,
        launchContext: {
            launchOptions: {
                args: ["--disable-gpu", "--no-sandbox"],
            },
        },
        autoscaledPoolOptions: {
            maxConcurrency: 1,  // Limite la concurrence pour éviter les problèmes de surcharge
        },
        async requestHandler({ page, request, log }) {
            let retryCount = 0;
            while (retryCount < maxRetries) {
                try {
                    log.info(`Scraping ${request.url}`);
                    await page.goto(request.url, { waitUntil: "domcontentloaded", timeout: 120000 });  // Augmentation du timeout

                    const button = await page.$('[data-a-target="content-classification-gate-overlay-start-watching-button"]');
                    if (button) {
                        console.log("Bouton trouvé, on clique dessus...");
                        await button.click();
                        await page.waitForTimeout(1000);
                    }

                    await page.waitForFunction(() => document.querySelector("video")?.src, { timeout: 15000 });
                    const videoUrl = await page.$eval("video", (video) => video.src).catch(() => null);

                    if (videoUrl) {
                        lastVideoUrl = videoUrl;  // Mettre à jour avec la nouvelle vidéo scrappée
                        break;  // Sortir de la boucle en cas de succès
                    }
                    retryCount++;
                    console.log(`Retry attempt #${retryCount}`);
                    await new Promise((resolve) => setTimeout(resolve, 5000));  // Pause entre les tentatives

                } catch (error) {
                    console.error(`Error on attempt #${retryCount + 1}:`, error);
                    retryCount++;
                    if (retryCount >= maxRetries) {
                        console.error(`Max retries reached for ${request.url}`);
                    } else {
                        await new Promise((resolve) => setTimeout(resolve, 5000));  // Pause avant réessayer
                    }
                }
            }
        },
    });

    await crawler.run(startUrls);
    return lastVideoUrl;  // Retourner la dernière vidéo après l'exécution du crawler
}

const app = express();
app.post("/scrape", (req, res) => {
    let body = "";

    req.on("data", chunk => {
        body += chunk.toString(); // Convertir le Buffer en chaîne de caractères
    });

    req.on("end", async () => {
        try {
            const data = JSON.parse(body);
            const clipUrl = data.clipUrl;

            if (!clipUrl) {
                return res.status(400).json({ error: "Missing clipUrl" });
            }

            const videoUrl = await crawlClip(clipUrl);  // Scraper la vidéo
            if (videoUrl) {
                res.json({ videoUrl });  // Retourner la dernière vidéo
            } else {
                res.status(404).json({ error: "No video found" });
            }

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Scraping failed" });
        }
    });
});

app.listen(8080, () => {
    console.log("Server running on port 8080");
});
