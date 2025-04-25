const { PlaywrightCrawler, Dataset } = require("crawlee");

async function crawlClip(clipUrl) {
    const startUrls = [clipUrl]; // URL dynamique passée en paramètre

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

            await page.waitForFunction(
                () => document.querySelector("video")?.src,
                { timeout: 15000 },
            );

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
                    } catch (error) {
                        continue;
                    }
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

async function main() {
    const clipUrl = process.argv[2]; // L'URL du clip en paramètre
    if (!clipUrl) {
        console.error("No URL provided!");
        return;
    }
    await crawlClip(clipUrl);
}

main().catch(console.error);
