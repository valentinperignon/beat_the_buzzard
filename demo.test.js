require('chromedriver');
const { Builder, By, Key } = require('selenium-webdriver');

describe('Demo', function () {
	let driver;

	beforeEach(async function () {
		driver = await new Builder().forBrowser('chrome').build(); // For chrome
	});

	afterEach(function () {
		driver.quit(); // For chrome
		//await driver.close(); // For firefox
	});

	it('ici', async function () {
		this.timeout(42000);

		// Ouverture du premier onglet

		await driver.get('http://localhost:8080/');
		await driver.manage().window().setRect(1680, 1025);

		await driver.sleep(2000);

		await driver.findElement(By.id('pseudo')).sendKeys('dadeau');
		await driver.sleep(1000);
		await driver.findElement(By.id('btnConnecter')).click();

		await driver.sleep(2000);

		// Ouverture du deuxième onglet

		await driver.findElement(By.name('body')).sendKeys(`${Key.CONTROL}t`);

		await driver.sleep(2000);
	});
});
