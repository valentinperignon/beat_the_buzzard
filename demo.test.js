require('chromedriver');
const { Builder, By, Key } = require('selenium-webdriver');

describe('Demo', function () {
	let driver = null;

	beforeEach(async function () {
		driver = await new Builder().forBrowser('chrome').build();
	});

	afterEach(function () {
		driver.quit();
	});

	it('ici', async function () {
		this.timeout(42000);
		const windows = [];
		windows.push(await driver.getWindowHandle());

		// Ouverture du premier onglet

		await driver.get('http://localhost:8080/');
		await driver.manage().window().setRect(1680, 1025);

		switchMode(driver);
		await driver.sleep(1000);

		connectUser(driver, 'fdadeau');
		await driver.sleep(1000);
		sendMessageChat(driver, 'Salut à tous.');

		await driver.sleep(2000);

		// Ouverture du deuxième onglet

		openNewTab(driver);
		connectUser(driver, 'jbernard');

		switchTab(driver, windows, 1);

		await driver.sleep(2000);
	});
});

const SHORT_BREAK = 2000;

/* ---------- Gestion des onglets ---------- */

async function openNewTab(driver, tabs) {
	await driver.switchTo().newWindow('tab');
	await driver.get('http://localhost:8080/');
	await driver.getWindowHandle();

	tabs.push(await driver.getWindowHandle());
}

async function switchTab(driver, tabs, numTab) {
	await driver.switchTo().window(tabs[numTab - 1]);
	await driver.sleep(SHORT_BREAK);
}

/* ---------- Gestion du chat ---------- */

async function connectUser(driver, username) {
	await driver.findElement(By.id('pseudo')).sendKeys(username);
	await driver.sleep(SHORT_BREAK);
	await driver.findElement(By.id('btnConnecter')).click();
	await driver.sleep(SHORT_BREAK);
}

async function sendMessageChat(driver, message) {
	await driver.findElement(By.id('monMessage')).sendKeys(message);
	await driver.sleep(SHORT_BREAK);
	await driver.findElement(By.id('monMessage')).sendKeys(Key.ENTER);
	await driver.sleep(SHORT_BREAK);
}

async function muteVoice(driver) {
	await driver.findElement(By.id('syntheseBtn')).click();
	await driver.sleep(SHORT_BREAK);
	await driver.findElement(By.id('mute')).click();
	await driver.sleep(SHORT_BREAK);
	await driver.findElement(By.css('.afficherFenetre > button')).click();
	await driver.sleep(SHORT_BREAK);
}

async function switchMode(driver) {
	await driver.actions().keyDown(Key.CONTROL).sendKeys('d').perform();
	await driver.sleep(SHORT_BREAK);
}

/* ---------- Gestion de Stupide Vautour ---------- */

async function launchGame(driver) {
	sendMessageChat(driver, '/vautour');
}

async function invitePlayer(driver, playerNum) {
	await driver.findElement(By.id('carte-ajout-joueur')).click();
	await driver.sleep(SHORT_BREAK);
	await driver
		.findElement(By.css(`#choix-utilisateurs > li:nth-child(${playerNum})`))
		.click();
	await driver.sleep(SHORT_BREAK);
}

async function answerInvite(driver, accept) {
	await driver
		.findElement(By.css(`#popup > button:nth-of-type(${accept ? 1 : 2})`))
		.click();
	await driver.sleep(SHORT_BREAK);
}

async function launchGame(driver) {
	await driver.findElement(By.id('labelJouerBtn')).click();
	await driver.sleep(SHORT_BREAK);
}

async function chooseCard(driver, numCard) {
	await driver
		.findElement(By.id(`#main-joueur > .carte-joueur:nth-of-type(${numCard})`))
		.click();
	await driver.sleep(SHORT_BREAK);
}

async function removePopup(driver) {
	await driver.findElement(By.id('popup')).click();
	await driver.sleep(SHORT_BREAK);
}
