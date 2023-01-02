// /* globals gauge*/
// "use strict";
// const path = require('path');
// const PNG = require('pngjs').PNG;
// const pixelmatch = require('pixelmatch');
// const fs = require('fs');
// const assert = require('assert');
// const {
//     openBrowser, closeBrowser, goto, screenshot, click, evaluate, button, toRightOf, $, mouseAction, rightClick, highlight
// } = require('taiko');
// const headless = process.env.headless_chrome.toLowerCase() === 'true';


// beforeSuite(async () => await openBrowser( {
//     headless: true,
//     observe: true,
//     observeTime: 1000,
//     args: [
//         '--disable-gpu',
//         '--disable-dev-shm-usage',
//         '--disable-setuid-sandbox',
//         '--no-first-run',
//         '--no-sandbox',
//         '--no-zygote',
//         '--window-size=1440,900']}
// ));

// afterSuite(async () => {
//     await closeBrowser();
// });

// // // Return a screenshot file name
// // gauge.customScreenshotWriter = async function () {
// //     const screenshotFilePath = path.join(process.env['gauge_screenshots_dir'],`screenshot-${process.hrtime.bigint()}.png`);
// //     await screenshot({path: screenshotFilePath});
// //     return path.basename(screenshotFilePath);
// // };

// step("Click on <table>", async function (table) {
//     for (var row of table.rows) {
//                  await click(button(toRightOf(row.cells[1])));
//             }
// });

// step("Click <text>", async function (text) {
//     await click(text);
// });

// step("Click button to dismiss timeline", async function () {
//     // await click(button(toRightOf(timeline)));
//     await click(button({"class":"btn    btn-outline-secondary btn-timeline"}));

// });

// step("Click on Element and take screenshot <screenshotFileName>", async (screenshotFileName) => {
//     let pos_array = await evaluate($('canvas'),canvas => {
//         const canvasBCR = canvas.getBoundingClientRect();
//         return [canvasBCR.top+550, canvasBCR.left+550];
//     });


//     let canvas_x = pos_array[0];
//     let canvas_y = pos_array[1];

//     await click({x:canvas_x, y: canvas_y})
//     await screenshot({path: 'screenshots/test/' + screenshotFileName + '.png'});
//     // await gauge.screenshot();

// });

// step("Move mouse to Element and take screenshot <screenshotFileName>", async (screenshotFileName) => {
//     let pos_array = await evaluate($('canvas'),canvas => {
//         const canvasBCR = canvas.getBoundingClientRect();
//         return [canvasBCR.top+550, canvasBCR.left+550];
//     });

//     let canvas_x = pos_array[0];
//     let canvas_y = pos_array[1];

//     await mouseAction('move', {x: canvas_x, y:canvas_y});
//     await screenshot({path: 'screenshots/test/' + screenshotFileName + '.png'});
// });

// step("Open Frontend-Demo application", async function () {
//     await goto("localhost:8080");
// });

// step("Right click and take screenshot <screenshotFileName>", async (screenshotFileName) => {
//     let pos_array = await evaluate($('canvas'),canvas => {
//         const canvasBCR = canvas.getBoundingClientRect();
//         return [canvasBCR.top+250, canvasBCR.left+400];
//     });

//     let canvas_x = pos_array[0];
//     let canvas_y = pos_array[1];

//     await rightClick({x: canvas_x, y: canvas_y});
//     await screenshot({path: 'screenshots/test/' + screenshotFileName + '.png'});

// })

// step("Compare <screenshotFileName1> screenshot with <screenshotFileName2> screenshot", async (screenshotFileName1, screenshotFileName2) => {
//     // await screenshot($('canvas'), {path: 'screenshots/actual/'+ screenshotFileName + '.png'});

//     const img1 = PNG.sync.read(fs.readFileSync('screenshots/expected/' + screenshotFileName2  + '.png'));
//     const img2 = PNG.sync.read(fs.readFileSync('screenshots/test/' + screenshotFileName1 + '.png'));

//     const {width, height} = img1;
//     const diff = new PNG({width, height});

//     const diffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {threshold: 0.2});

//     fs.writeFileSync('screenshots/diff/' + screenshotFileName1 + '.png', PNG.sync.write(diff));
//     fs.writeFileSync('reports/html-report/images/' + screenshotFileName1 + '.png', PNG.sync.write(diff));

//     gauge.message("Diff Pic:");
//     gauge.message('<img src="../images/' + screenshotFileName1 + '.png" alt="Report logo">');

//     if(screenshotFileName1.includes("RightClick")){
//         assert.ok(diffPixels < width * height * 0.002);
//     }
//     else{
//         // Test a sample application to get this value right, in this case 5% wrong pixels are tolerated
//         assert.ok(diffPixels < width * height * 0.005);
//     }
// });

// step("Take screenshot <screenshotFileName>", async function() {
//     await screenshot({path: 'screenshots/test/' + screenshotFileName + '.png'});
// });