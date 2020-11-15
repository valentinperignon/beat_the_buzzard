/********************************************************************
 *   Module implementing a game of 'Stupides Vautours'
 ********************************************************************/
var Player = require("./joueur");

// players' list
var playersList = [];

// Sets of cards
var pile = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
var chosenCards = [];

// Game's turn numero
var numTurn = 1;

function getPlayersList() {
    return playersList;
}

function getTopPile() {
    return (pile.length == 0 ? null : pile.pop());
}

function getNumTurn() {
    return numTurn;
}

function addCard(val) {
    if (val != null) {
        chosenCards.push(val);
    }
}

/**
 * Play a turn of the game
 */
function playTurn() {

}

/**
 * return a JSON object which contains all the players' scores 
 */
function getScores() {
    let scores = {};
    for (let player of playersList) {
        scores[player] = player.getScore();
    }
    return JSON.stringify(scores);
}

/**
 * shuffle the set of cards
 */
function shuffleCards() {
    pile = pile.map((n) => ({ sort: Math.random(), value: n }))
        .sort((a, b) => a.sort - b.sort)
        .map((n) => n.value);
}

/**
 * Add a player in the list 
 * 
 * @param {string} name The player's name
 * @param {boolean} isAI Boolean to know if the player is an AI
 */
function addPlayer(name, isAI = false) {
    playersList.push(Player.createPlayer(playersList.length() + 1, name, isAI));
}

/**
 * Initialize a game but adding the player to the list and shuffling the card's pile
 * 
 * @param {Array} playersNames An array of the players' names
 */
function initGame(playersNames) {
    for (let name of playersNames) {
        addPlayer(name);
    }
    shuffleCards();
}


/**
 * Remove a real player to replace it by an AI
 * 
 * @param {String} p The player to replace by an AI
 */
function removePlayer(p) {
    let index = playersList.indexOf(p);
    if (index == -1) {
        return -1;
    }
    playersList[index].setName("IA");
    playersList[index].setAI();
}


function endGame() {
    // TO-DO : end the game and return the winner
}

module.exports = { initGame, getScores, getTopPile, playTurn, getPlayersList, removePlayer, getNumTurn, addCard, endGame };