require('chromedriver');
const { Builder, By, Key } = require('selenium-webdriver');

describe('Demo', function () {
	let driver;

	beforeEach(function () {
		driver = new Builder().forBrowser('chrome').build(); // For chrome

		// driver =  new Builder().forBrowser('firefox').build(); // For firefox
	});

	afterEach(function () {
		driver.quit(); // For chrome
		// driver.close(); // For firefox
	});

	it('ici', function () {
		driver.get('http://localhost:8080/');
		driver.manage().window().setRect(1680, 1025);

		driver.findElement(By.id('pseudo')).sendKeys('fdadeau');
		driver.findElement(By.id('btnConnecter')).click();

		driver.findElement(By.id('monMessage')).click();
		driver.findElement(By.id('monMessage')).sendKeys('bonjour');
		driver.findElement(By.id('monMessage')).sendKeys(Key.ENTER);
		driver.findElement(By.id('monMessage')).sendKeys('les jeunes');
		driver.findElement(By.id('monMessage')).sendKeys(Key.ENTER);
		driver.findElement(By.id('monMessage')).sendKeys('typiquement');
		driver.findElement(By.id('monMessage')).sendKeys(Key.ENTER);
		driver.findElement(By.id('monMessage')).sendKeys('/vautour');
		driver.findElement(By.id('monMessage')).sendKeys(Key.ENTER);
		driver.sleep(2000);
	});
});
