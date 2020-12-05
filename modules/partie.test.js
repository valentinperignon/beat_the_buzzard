const assert = require('assert');
const partie = require('./partie');

const wrongId = 42;

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
	it('should refuse to add a player (not IA) not invited', function () {
		const id = partie.createGame('fabian');

		assert.strictEqual(partie.addPlayer(id, 'nath'), false);
		assert.strictEqual(partie.addPlayer(id, 'fd4d434u', true), true);
	});
});
