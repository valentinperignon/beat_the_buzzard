const assert = require('assert');
const partie = require('./partie');

const wrongId = 4242;

/* -------------------- Create a game -------------------- */

describe('Create a game', function () {
	it('should generate a unique id for each game', function () {
		const firstId = partie.createGame('fabian');
		const secondId = partie.createGame('valentin');

		assert.notStrictEqual(firstId, secondId);
	});

	it('should know who is the host', function () {
		const player = 'nath';

		const id = partie.createGame(player);
		partie.addPlayer(id, 'antoine');
		partie.addPlayer(id, 'medhi');
		assert.strictEqual(partie.getHost(id), player);

		assert.strictEqual(partie.getHost(wrongId), null);
	});

	it('should allow a host to create several games', function () {
		const player = 'françois';

		const firstId = partie.createGame(player);
		const secondId = partie.createGame(player);
		assert.notStrictEqual(firstId, secondId);
	});
});

/*-------------------- Invite players -------------------- */

describe('Invite players', function () {
	it('should allow a host to send several invitations', function () {
		const id = partie.createGame('valentin');

		const [player1, player2] = ['pierre', 'fdadeau'];
		let result = partie.addInvite(id, player1);
		assert.strictEqual(result, true);
		assert.strictEqual(partie.getNbInvite(id), 1);
		result = partie.addInvite(id, player2);
		assert.strictEqual(result, true);
		assert.strictEqual(partie.getNbInvite(id), 2);
	});

	it('should refuse to send an invitation if the id is wrong', function () {
		const result = partie.addInvite(42, 'baptiste');
		assert.strictEqual(result, false);
	});

	it('should refuse to send several invitations to the same player', function () {
		const id = partie.createGame('fabian');

		const player = 'valentin';
		assert.strictEqual(partie.addInvite(id, player), true);
		assert.strictEqual(partie.addInvite(id, player), false);
	});

	it('should return true if a member is invited', function () {
		const host = 'fabian';
		const id = partie.createGame(host);

		const player = 'valentin';
		assert.strictEqual(partie.addInvite(id, player), true);
		assert.strictEqual(partie.isInvited(id, player), true);
		assert.strictEqual(partie.isInvited(id, host), false);

		assert.strictEqual(partie.isInvited(wrongId, player), false);
	});

	it('should return the number of players invited', function () {
		const id = partie.createGame('fabian');

		assert.strictEqual(partie.getNbInvite(id), 0);
		assert.strictEqual(partie.addInvite(id, 'fdadeau'), true);
		assert.strictEqual(partie.getNbInvite(id), 1);
		assert.strictEqual(partie.addInvite(id, 'jbernard'), true);
		assert.strictEqual(partie.getNbInvite(id), 2);

		assert.strictEqual(partie.getNbInvite(wrongId), 0);
	});

	it('should remove players', function () {
		const id = partie.createGame('fabian');

		const playerHacker = 'fd4d34u';
		assert.strictEqual(partie.getNbInvite(id), 0);
		assert.strictEqual(partie.addInvite(id, 'fdadeau'), true);
		assert.strictEqual(partie.getNbInvite(id), 1);
		assert.strictEqual(partie.addInvite(id, playerHacker), true);
		assert.strictEqual(partie.getNbInvite(id), 2);

		assert.strictEqual(partie.removeInvite(id, playerHacker), true);
		assert.strictEqual(partie.getNbInvite(id), 1);
		assert.strictEqual(partie.removeInvite(id, playerHacker), false);
		assert.strictEqual(partie.getNbInvite(id), 1);
	});

	it('should return all invites', function () {
		const id = partie.createGame('valentin');

		const [player1, player2] = ['pierre', 'fdadeau'];
		assert.strictEqual(partie.addInvite(id, player1), true);
		assert.strictEqual(partie.addInvite(id, player2), true);

		const invites = partie.getInvite(id);
		assert.strictEqual(invites.length, 2);
		assert.strictEqual(invites.includes(player1), true);

		assert.strictEqual(partie.getInvite(wrongId), null);
	});
});

/*-------------------- Player management -------------------- */

describe('Player management', function () {
	it('should add a player invited', function () {
		const id = partie.createGame('françois');

		const player = 'medhi';
		assert.strictEqual(partie.addInvite(id, player), true);
		assert.strictEqual(partie.getNbInvite(id), 1);
		assert.strictEqual(partie.addPlayer(id, player), true);
		assert.strictEqual(partie.getNbInvite(id), 0);
	});

	it('should refuse to add a player (not IA) not invited', function () {
		const id = partie.createGame('fabian');

		assert.strictEqual(partie.addPlayer(id, 'nath'), false);
		assert.strictEqual(partie.addInvite(id, 'baptiste'), true);
		assert.strictEqual(partie.addPlayer(id, 'fd4d434u', true), true);
		assert.strictEqual(partie.getNbInvite(id), 1);
	});

	it('should refuse to add a player if the game doesn\t exist', function () {
		assert.strictEqual(partie.addPlayer(wrongId, 'fd4d34u'), false);
	});

	it('should send the list of players', function () {
		assert.strictEqual(partie.getPlayersList(wrongId), null);

		const id = partie.createGame('antoine');

		assert.notStrictEqual(partie.getPlayersList(id), null);
		const player1 = 'fdadeau',
			player2 = 'jbernard';
		assert.strictEqual(partie.addInvite(id, player1), true);
		assert.strictEqual(partie.addPlayer(id, player1), true);
		assert.strictEqual(partie.addInvite(id, player2), true);
		assert.strictEqual(partie.addPlayer(id, player2), true);
		const list = partie.getPlayersList(id);
		assert.notStrictEqual(list, null);
	});

	it('should remove a player - wrong id', function () {
		assert.strictEqual(partie.removePlayer(wrongId, 'f') < 0, true);
	});

	it('should remove a player - wrong player', function () {
		const id = partie.createGame('lucas');

		const player = 'antoine';
		assert.strictEqual(partie.removePlayer(id, player) < 0, true);
		assert.strictEqual(partie.addInvite(id, player), true);
		assert.strictEqual(partie.removePlayer(id, player) < 0, true);
	});

	it('should remove a player - not replaced by an IA', function () {
		const id = partie.createGame('fabian');

		const player = 'bernard';
		assert.strictEqual(partie.addInvite(id, player), true);
		assert.strictEqual(partie.addPlayer(id, player), true);
		assert.strictEqual(partie.removePlayer(id, player), 0);
	});

	it('should remove a player - game launched', function () {
		const host = 'jbernard';
		const id = partie.createGame(host);

		const players = ['fdadeau', 'vfelea'];
		for (let player of players) {
			assert.strictEqual(partie.addInvite(id, player), true);
			assert.strictEqual(partie.addPlayer(id, player), true);
		}

		assert.strictEqual(partie.initGame(id), true);

		for (let player of players) {
			assert.strictEqual(partie.removePlayer(id, player), 0);
		}
		assert.strictEqual(partie.removePlayer(id, host), 1);
	});

	it("should return all the player's game - general", function () {
		const games = partie.getPlayerGames('fabian');
		assert.strictEqual(games.length > 0, true);
	});

	it('should remove host and get a new one', function () {
		const host = 'baptist';
		const id = partie.createGame(host);

		const players = ['fdadeau', 'vfelea'];
		for (let player of players) {
			assert.strictEqual(partie.addInvite(id, player), true);
			assert.strictEqual(partie.addPlayer(id, player), true);
		}

		assert.strictEqual(partie.removePlayer(id, host), 0);
		assert.notStrictEqual(partie.getHost(id), host);
	});

	it("should return all the player's games - as host", function () {
		const player = 'matz';

		const gamesNumber = 3;
		for (let i = 0; i < gamesNumber; i++) {
			partie.createGame(player);
		}

		const games = partie.getPlayerGames(player);
		assert.strictEqual(games.length, gamesNumber);
	});

	it('should remove a game', function () {
		const host = 'abraracourcix';
		const id = partie.createGame(host);

		assert.strictEqual(partie.getHost(id), host);
		partie.removeGame(id);
		assert.strictEqual(partie.getHost(id), null);
	});
});

/*-------------------- Game management -------------------- */

describe('Game management', function () {
	it('should return the top stack card', function () {
		assert.strictEqual(partie.getTopPile(wrongId), null);

		const id = partie.createGame('Asterix');

		let topStack = partie.getTopPile(id);
		assert.notStrictEqual(topStack, null);

		let last = topStack;
		for (let i = 0; i < 3; i++) {
			topStack = partie.getTopPile(id);
			assert.notStrictEqual(topStack, last);
			last = topStack;
		}
	});

	it('should return null when stack is empty', function () {
		const id = partie.createGame('Idefix');

		let nbOfCards = 0;
		while (partie.getTopPile(id) != null) {
			nbOfCards++;
		}
		assert.strictEqual(nbOfCards > 0, true);
		assert.strictEqual(partie.getTopPile(id), null);
	});

	it('should return the turn number', function () {
		assert.strictEqual(partie.getNumTurn(wrongId), -1);

		const id = partie.createGame('Obelix');
		assert.strictEqual(partie.getNumTurn(id), 1);
	});

	it('should add a new card', function () {
		assert.strictEqual(partie.addCard(12, wrongId), false);

		const id = partie.createGame('Panoramix');
		assert.strictEqual(partie.addCard(id, 4), true);
	});

	it('should return scores of players', function () {
		assert.strictEqual(partie.getScores(wrongId), null);

		const id = partie.createGame('lucas');
		const players = ['fabian', 'nath', 'medhi', 'antoine'];
		for (let pl of players) {
			assert.strictEqual(partie.addInvite(id, pl), true);
			assert.strictEqual(partie.addPlayer(id, pl), true);
		}

		const scores = JSON.parse(partie.getScores(id));
		assert.notStrictEqual(scores, null);
		assert.strictEqual(Object.keys(scores).length, players.length + 1);
	});

	it('should initialize a game', function () {
		assert.strictEqual(partie.initGame(wrongId), false);

		const id = partie.createGame('fabian');
		assert.strictEqual(partie.initGame(id), true);

		let isLower = true,
			card = null,
			lastCard = null;
		while ((card = partie.getTopPile(id)) != null) {
			if (!lastCard) {
				lastCard = card;
				continue;
			}
			if (card > lastCard) {
				isLower = false;
			}
			lastCard = card;
		}

		assert.strictEqual(isLower, false);
	});

	it('should launch the game', function () {
		assert.strictEqual(partie.isLaunched(wrongId), false);

		const id = partie.createGame('ricola');
		assert.strictEqual(partie.initGame(id), true);
		assert.strictEqual(partie.isLaunched(id), true);
	});

	it('should end the game LOL', function () {
		const id = partie.createGame('nath');
		partie.endGame(id);
	});

	it("should return a player's hand", function () {
		assert.strictEqual(partie.getHand(wrongId, 'baptiste'), null);

		const player = 'ludoChrono';
		const id = partie.createGame(player);

		assert.notStrictEqual(partie.getHand(id, player), null);
		assert.strictEqual(partie.getHand(id, `${player}s`), null);
	});
});
