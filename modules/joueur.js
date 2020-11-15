/********************************************************************
 *   Module implementing a player of the game 'Stupides Vautours'
 ********************************************************************/

// Score of the player
var score;

// Name of the player
var name;

// hand of the player
var hand = [];

// Boolean to now if the player is an AI
var isAI;

function getScore() {
	return score;
}

function getName() {
	return name;
}

function getHand() {
	return hand;
}

function addScore(scoreToAdd) {
	score += scoreToAdd;
}

/**
 * Set the name of the player if the parameter only contains alphanumeric characters
 * @param {String} n The player's name
 */
function setName(n) {
	if (n != null && n.match(/^\w+$/g)) {
		name = n;
	}
}

function setAI() {
	isAI = true;
}

/**
 *
 * @param {int} num The numero of the player in the game
 * @param {string} n The player's name
 */
function createPlayer(num, n, AI) {
	setName(n);
	if (name == null) {
		name = 'Joueur ' + num;
	}
	hand = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
	score = 0;
	isAI = AI;
}

/**
 * Return the chosen card of the deck
 *
 * @param {int} value The wanted card's value
 */
function chooseCard(value) {
	if (isAI) {
		return hand.splice(Math.floor(Math.random * hand.length), 1);
	}
	// If no cards correspond to the parameter, return the first card of his hand
	return hand.indexOf(value) != -1
		? hand.splice(hand.indexOf(value), 1)
		: hand[0];
}

module.exports = {
	getScore,
	getHand,
	getName,
	addScore,
	setName,
	setAI,
	createPlayer,
	chooseCard,
};
