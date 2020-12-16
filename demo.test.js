const { Builder, By, Key } = require('selenium-webdriver');

describe('Demo', function () {
	let driver;

	beforeEach(async function () {
		// driver = await new Builder().forBrowser('chrome').build(); // For chrome

		driver = await new Builder().forBrowser('chrome').build(); // For chrome
	});

	afterEach(async function () {
		await driver.quit(); // For chrome
		//await driver.close(); // For firefox
	});

	it('ici', async function () {
		await driver.get('http://localhost:8080/');
		await driver.manage().window().setRect(1680, 1025);

		await driver.sleep(2000);

		await driver.findElement(By.id('pseudo')).sendKeys('fdadeau');
		await driver.findElement(By.id('btnConnecter')).click();

		await driver.findElement(By.id('monMessage')).click();
		await driver.findElement(By.id('monMessage')).sendKeys('bonjour');
		await driver.findElement(By.id('monMessage')).sendKeys(Key.ENTER);
		await driver.findElement(By.id('monMessage')).sendKeys('les jeunes');
		await driver.findElement(By.id('monMessage')).sendKeys(Key.ENTER);
		await driver.findElement(By.id('monMessage')).sendKeys('typiquement');
		await driver.findElement(By.id('monMessage')).sendKeys(Key.ENTER);
		await driver.findElement(By.id('monMessage')).sendKeys('/vautour');
		await driver.findElement(By.id('monMessage')).sendKeys(Key.ENTER);
	});
});
