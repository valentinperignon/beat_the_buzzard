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

		let tabs = null;

		// Ouverture du premier onglet

		await driver.get('http://localhost:8080/');
		await driver.manage().window().setRect(1680, 1025);

		await driver.sleep(2000);

		await driver.findElement(By.id('pseudo')).sendKeys('dadeau');
		await driver.sleep(1000);
		await driver.findElement(By.id('btnConnecter')).click();

		await driver.sleep(2000);

		// Ouverture du deuxième onglet

		await driver.switchTo().newWindow('tab');
		await driver.get('http://localhost:8080/');
	
  });
  
  function connectUser()
});
