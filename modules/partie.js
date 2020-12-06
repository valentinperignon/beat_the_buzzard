/********************************************************************
 *   Module implementing a game of 'Stupides Vautours'
 ********************************************************************/

let games = {};
let maxId = 0;

function Player(name, isAI = false) {
	this.name = name;
	this.isAI = isAI;
	this.score = 0;
	this.hand = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
}

/************** Funtions for the lobby creation, add players... */

function createGame(host) {
	const id = maxId;
	maxId += 1;

	games[id] = {
		host: host,
		playersList: {},
		invitations: [],
		isLaunched: false,
		pile: [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
		chosenCards: [],
		numTurn: 1,
	};
	games[id].playersList[host] = new Player(host);

	return id;
}

function addInvite(id, player) {
	if (!games[id] || games[id].invitations.includes(player)) return false;

	games[id].invitations.push(player);
	return true;
}

function removeInvite(id, player) {
	if (!games[id] || !games[id].invitations.includes(player)) return false;
	games[id].invitations.splice(games[id].invitations.indexOf(player), 1);
	return true;
}

function isInvited(id, player) {
	if (!games[id]) return false;
	return games[id].invitations.includes(player);
}

function getNbInvite(id) {
	if (!games[id]) return 0;
	return games[id].invitations.length;
}

function getInvite(id) {
	if (!games[id]) return null;
	return games[id].invitations;
}

function getPlayersList(id) {
	if (id == null) {
		return false;
	}
	return Object.keys(games[id].playersList);
}

function getHost(id) {
	if (!games[id]) return null;
	return games[id].host;
}

/**
 * Add a player in the list
 *
 * @param id The id of the game
 * @param {string} name The player's name
 * @param {boolean} isAI Boolean to know if the player is an AI
 */
function addPlayer(id, name, isAI = false) {
	if (!games[id] || (!isAI && !isInvited(id, name))) return false;

	games[id].playersList[name] = new Player(name, isAI);
	return true;
}

function getPlayerGames(player) {
	let tabGames = [];
	for (let game in games) {
		if (Object.keys(games[game].playersList).includes(player)) {
			tabGames.push(game);
		}
	}
	return tabGames;
}

/**
 * Remove a real player to replace it by an AI
 *
 * @param id The id of the game
 * @param {String} p The player to replace by an AI
 */
function removePlayer(id, p) {
	if (id == null) {
		return -1;
	}
	let players = games[id].playersList;
	if (!players[p]) return -2;
	if (!games[id].isLaunched) {
		// If the game hasn't started yet, delete the player and make another player host if the player to delete was the host
		delete players[p];
		if (p === games[id].host) {
			for (let player in players) {
				if (player != undefined && !players[player].isAI)
					games[id].host = player;
			}
		}
	} else {
		// If the game has already started, replace the player by an AI
		players[p].name = 'IA';
		players[p].isAI = true;
	}

	// If all the players are AI, end the game
	for (let p in players) {
		if (!players[p].isAI) {
			return true;
		}
	}
	endGame(games[id]);
	return false;
}

/****************  Functions for the game itself  *******************/

function getTopPile(id) {
	if (id == null) {
		return false;
	}
	return games[id].pile.length == 0 ? null : games[id].pile.pop();
}

function getNumTurn(id) {
	if (id == null) {
		return false;
	}
	return games[id].numTurn;
}

function addCard(val, id) {
	if (id == null) {
		return false;
	}
	if (val != null) {
		games[id].chosenCards.push(val);
	}
}

/**
 * Play a turn of the game
 */
function playTurn() {}

/**
 * return a JSON object which contains all the players' scores
 *
 * @param id The id of the game
 */
function getScores(id) {
	if (id == null || games[id] == undefined) {
		return false;
	}
	let scores = {};
	for (let user of games[id].playersList) {
		if (games[id].playersList[user] === undefined) {
			scores[user] = 0;
		} else {
			scores[user] = games[id].playersList[user].getScore();
		}
	}
	return JSON.stringify(scores);
}

/**
 * shuffle the set of cards
 *
 * @param id The id of the game
 */
function shuffleCards(id) {
	if (id == null) {
		return false;
	}
	games[id].pile = games[id].pile
		.map(n => ({ sort: Math.random(), value: n }))
		.sort((a, b) => a.sort - b.sort)
		.map(n => n.value);
}

/**
 * Initialize a game but adding the player to the list and shuffling the card's pile
 *
 * @param id The id of the game
 */
function initGame(id) {
	if (id == null) {
		return false;
	}
	for (let name of games[id].playersList) {
		addPlayer(id, name);
	}
	games[id].isLaunched = true;
	shuffleCards();
}

function endGame(game) {
	console.log(game);
	console.log('TO-DO : end the game and return the winner');
}

module.exports = {
	createGame,
	addInvite,
	isInvited,
	getNbInvite,
	getPlayerGames,
	getHost,
	getInvite,
	initGame,
	removeInvite,
	getScores,
	getTopPile,
	playTurn,
	getPlayersList,
	addPlayer,
	removePlayer,
	getNumTurn,
	addCard,
	endGame,
};
