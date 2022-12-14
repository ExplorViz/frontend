<h1>Preparation</h1>
<p> This test uses Gauge and Taiko - therefore [Gauge](https://docs.gauge.org/getting_started/installing-gauge.html?os=windows&language=javascript&ide=vscode) needs to be installed.
<p> Pixelmatch is used for screenshot comparson. It should be installed (as you can see in the <em>package.json</em>). If there is a problem install it with <strong>npm install pixelmatch</strong>.
<p> install the node_modules, use <strong>npm i</strong> within the E2E-gauge directory
<p> use <strong>docker compose up -d</strong> to start the software stack and the fron-end demo.

<h1>Additional info</h1>
Gauge has two important folders - <strong>specs</strong> and <strong>test</strong>. These two contain the files whichs are needed for the testruns.<br> 
The <strong>specs</strong> folder contains .spec files. These are detailed statements of what will be tested.<br>
The <strong>tests</strong> folder contains the implementation file for the statements from the .spec files. The implementations are written in a langauge of your choice (here .js) in combination with the Taiko [API](https://docs.taiko.dev/api/reference/).

<h1>Testing</h1>
<p> To start all tests at once go to the <em>E2E-gauge</em> directory and use <strong>gauge run specs</strong> or <strong>npm test</strong> within the cmd (or terminal of VSC) to start the test.
<p> You can also run the tests individual. Go to the <em>specs</em> directory and use <strong>gauge run "name of spec".spec</strong> for the spec of your choice (e.g. <em>gauge run highlight.spec</em>).

<h1>View Report</h1>
<p> After the test is finished you will get feedback on the output console. Additional you can view HTML Reports. For that you can ether use the <strong>Gauge: Show Last Run Report</strong> command via the command Palette  in VSC (to open use <strong>Ctrl + Shift + P</strong> as shortcut) or go via the summary link in VSC (lower left corner of the [screen](https://docs.gauge.org/getting_started/view-a-report.html?os=windows&language=javascript&ide=vscode)).
