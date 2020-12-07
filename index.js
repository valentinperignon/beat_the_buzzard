// Chargement des modules
var express = require('express');
const partieVautour = require('./modules/partie');
var app = express();
var server = app.listen(8080, function () {
	console.log("C'est parti ! En attente de connexion sur le port 8080...");
});

// Ecoute sur les websockets
var io = require('socket.io').listen(server);

// Configuration d'express pour utiliser le répertoire "public"
app.use(express.static('public'));
// set up to
app.get('/', function (_, res) {
	res.sendFile(__dirname + '/public/vautour.html');
});

// déblocage requetes cross-origin
io.set('origins', '*:*');

/***************************************************************
 *           Gestion des clients et des connexions
 ***************************************************************/

var clients = {}; // { id -> socket, ... }

/***************************************************************
 *           Gestion des parties de stupides vautours
 ***************************************************************/
var scores = {};

/**
 *  Supprime les infos associées à l'utilisateur passé en paramètre.
 *  @param  string  tabID  le tableau contenant les identifiants des parties dans lesquelles effacer le joueur
 *  @param string name  Le nom du joueur à effacer
 */
function supprimer(name, tabID) {
	delete clients[name];
	delete scores[name];
	if (tabID != undefined && tabID instanceof Array && tabID.length != 0) {
		for (let id of tabID) {
			// Supprime le joueur dans toutes les parties auquelles il jouait
			console.log('Suppression du joueur ' + name + 'de la partie' + id);
			let err = partieVautour.removePlayer(id, name);
			console.log('Statut de la suppression : ' + err);
			envoyerListeVautour(id, name, true);
		}
	}
}

/**
 * Envoie la liste des joueurs d'une partie de Stupide vautour aux joueurs concernés
 *
 * @param id Identifiant de la partie
 * @param player
 */
function envoyerListeVautour(id, player, estParti = false) {
	let players = partieVautour.getPlayersList(id);
	if (players === false) {
		return;
	}
	for (let j in players) {
		// envoie la nouvelle liste aux joueurs de la parties
		if (clients[players[j]] !== undefined) {
			clients[players[j]].emit('vautour-liste', {
				id: id,
				liste: partieVautour.getPlayersList(id),
				hote: partieVautour.getHost(id),
				invitations: partieVautour.getInvite(id),
				msg: estParti
					? `${player} a quitté la partie`
					: `${player} a rejoint la partie`,
			});
		}
	}
}

// Quand un client se connecte, on le note dans la console
io.on('connection', function (socket) {
	// message de debug
	console.log("Un client s'est connecté");
	var currentID = null;

	/**
	 *  Doit être la première action après la connexion.
	 *  @param  id  string  l'identifiant saisi par le client
	 */
	socket.on('login', function (id) {
		// si le pseudo est déjà utilisé, on lui envoie l'erreur
		if (clients[id]) {
			socket.emit('erreur-connexion', 'Le pseudo est déjà pris.');
			return;
		}
		// sinon on récupère son ID
		currentID = id;
		// initialisation
		clients[currentID] = socket;
		// log
		console.log('Nouvel utilisateur : ' + currentID);
		// scores
		scores[currentID] = 0;
		// envoi d'un message de bienvenue à ce client
		socket.emit('bienvenue', scores);
		// envoi aux autres clients
		socket.broadcast.emit('message', {
			from: null,
			to: null,
			text: currentID + ' a rejoint la discussion',
			date: Date.now(),
		});
		// envoi de la nouvelle liste à tous les clients connectés
		socket.broadcast.emit('liste', scores);
	});

	/**
	 *  Réception d'un message et transmission à tous.
	 *  @param  msg     Object  le message à transférer à tous
	 */
	socket.on('message', function (msg) {
		console.log('Reçu message');
		// si message privé, envoi seulement au destinataire
		if (msg.to != null) {
			if (clients[msg.to] !== undefined) {
				console.log(' --> message privé');
				clients[msg.to].emit('message', {
					from: currentID,
					to: msg.to,
					text: msg.text,
					date: Date.now(),
				});
				if (currentID != msg.to) {
					socket.emit('message', {
						from: currentID,
						to: msg.to,
						text: msg.text,
						date: Date.now(),
					});
				}
			} else {
				socket.emit('message', {
					from: null,
					to: currentID,
					text: 'Utilisateur ' + msg.to + ' inconnu',
					date: Date.now(),
				});
			}
		}
		// sinon, envoi à tous les gens connectés
		else {
			console.log(' --> broadcast');
			io.sockets.emit('message', {
				from: currentID,
				to: null,
				text: msg.text,
				date: Date.now(),
			});
		}
	});

	/* -------------------- Stupide Vautour -------------------- */

	/**
	 *  Joue une partie de "stupides Vautours"
	 */
	socket.on('jouer-vautour', id => {
		// Envoi un message aux joueurs de la partie
		let players = partieVautour.getPlayersList(id);
		for (const p of players) {
			if (clients[p] != undefined) {
				clients[p].emit('debut-partie');
			}
		}
		// let currGame = partieVautour.[id];
		// if (currGame !== undefined) {
		// 	let curr_card = currGame.getTopPile();
		// 	while (curr_card) {
		// 		for (const player of currGame.getPlayersList()) {
		// 			if (!player.isAI() && clients[player] === undefined) {
		// 				socket.emit('message', {
		// 					from: null,
		// 					to: currentID,
		// 					text: 'Joueur ' + player + " absent de l'application",
		// 					date: Date.now(),
		// 				});
		// 				return;
		// 			}
		// 			if (!player.isAI()) {
		// 				clients[player].emit('message', {
		// 					from: null,
		// 					to: null,
		// 					text: 'Début du tour n° ' + currGame.getNumTurn(),
		// 					date: Date.now(),
		// 				});
		// 				// Send the card on top of the pile to the players
		// 				clients[player].emit('pile', curr_card);
		// 				// Reception of the players' choices
		// 				socket.on('choixCarte', data => {
		// 					if (data != null) {
		// 						if (currGame.getPlayersList()[data.from] === undefined) {
		// 							socket.emit('message', {
		// 								from: null,
		// 								to: null,
		// 								text:
		// 									"L'utilisateur " +
		// 									data.from +
		// 									" n'est pas un joueur de cette partie",
		// 								date: Date.now(),
		// 							});
		// 							return false;
		// 						}
		// 						currGame.addCard(player.chooseCard(data.card));
		// 					}
		// 				});
		// 			} else {
		// 				// AI
		// 				currGame.addCard(player.chooseCard());
		// 			}
		// 		}
		// 		currGame.playTurn(); // To-do
		// 		curr_card = currGame.getTopPile();
		// 	}
		// 	//let winner = currGame.endGame();
		// 	// TO-DO : End the game and return to menu
		// } else {
		// 	socket.emit('message', {
		// 		from: null,
		// 		to: currentID,
		// 		text: 'Aucune partie de ce nom en cours',
		// 		date: Date.now(),
		// 	});
		// }
	});

	/**
	 * Création d'une partie de Stupide Vautour
	 */
	socket.on('vautour-creer', from => {
		let numPartie = partieVautour.createGame(from);
		// log
		console.log(
			`Création d'une partie de Stupide Vautour par ${from} (numéro ${numPartie})`
		);
		// retourner le numéro de la partie
		socket.emit('vautour-creer', numPartie);
	});

	/**
	 * Invitation à une partie de Stupide Vautour
	 */
	socket.on('vautour-invitation', data => {
		// log
		console.log(
			`Invitation à "Stupide Vautour" (${data.type}) : ${data.from} -> ${data.to} (#${data.id})`
		);
		// transmettre l'invitation
		if (!partieVautour.isInvited(data.id, data.to)) {
			// traitement si invitation acceptée
			if (data.type === 'answer') {
				data.to = partieVautour.getHost(data.id);
				console.log(data.to);
				// S'il n'y a plus d'hote on annule toute les invitations
				if (data.to == undefined) {
					partieVautour.removeInvite(data.id, data.from);
					// envoi d'une popup avertissant le joueur invité
					clients[data.from].emit('partie-annule');
					return;
				}
				if (data.answer) {
					let err = partieVautour.addPlayer(data.id, data.from);
					console.log('Ajout du joueur : ' + data.from + ' retour : ' + err);
					console.log('Joueurs de la partie ' + data.id + ' :');
					for (let j of partieVautour.getPlayersList(data.id)) {
						console.log(' ' + j + ' ');
					}
				}
				partieVautour.removeInvite(data.id, data.from);
				envoyerListeVautour(data.id, data.from);
			} else {
				partieVautour.addInvite(data.id, data.to); // stocke l'invitation
			}
			clients[data.to].emit('vautour-invitation', data);
		}
		console.log('nb invitation : ' + partieVautour.getNbInvite(data.id) + '\n');
	});

	/**
	 * Retour au chat du joueur / annulation de la partie
	 */
	socket.on('vautour-annuler', data => {
		partieVautour.removePlayer(data.id, data.from);
		envoyerListeVautour(data.id, data.from, true);
		// log
		console.log(`Le joueur ${data.from} a quitté la partie (#${data.id})`);
	});

	socket.on('infos-partie', data => {
		if (clients[data.from] != undefined) {
			clients[data.from].emit('infos-partie', {
				id: data.id,
				isLaunched: partieVautour.isLaunched(data.id),
				hote: partieVautour.getHost(data.id),
				players: partieVautour.getPlayerGames(data.id),
				invitations: partieVautour.getInvite(data.id),
				hand: partieVautour.getHand(data.id, data.from),
				pile: partieVautour.getTopPile(data.id),
				turn: partieVautour.getNumTurn(data.id),
			});
		}
	});

	/* --------------------------------------------------------- */

	/**
	 *  Gestion des déconnexions
	 */

	// fermeture
	socket.on('logout', function (tabID) {
		// si client était identifié (devrait toujours être le cas)
		if (currentID) {
			console.log("Sortie de l'utilisateur " + currentID);
			// envoi de l'information de déconnexion
			socket.broadcast.emit('message', {
				from: null,
				to: null,
				text: currentID + ' a quitté la discussion',
				date: Date.now(),
			});
			// suppression de l'entrée
			supprimer(currentID, tabID);
			// désinscription du client
			currentID = null;
			// envoi de la nouvelle liste pour mise à jour
			socket.broadcast.emit('liste', scores);
		}
	});

	// déconnexion de la socket
	socket.on('disconnect', function () {
		// si client était identifié
		if (currentID) {
			// envoi de l'information de déconnexion
			socket.broadcast.emit('message', {
				from: null,
				to: null,
				text: currentID + " vient de se déconnecter de l'application",
				date: Date.now(),
			});

			// cherche les parties dans lesquelles le joueurs se trouvait
			let tabID = partieVautour.getPlayerGames(currentID);

			// suppression de l'entrée
			supprimer(currentID, tabID);
			// désinscription du client
			currentID = null;
			// envoi de la nouvelle liste pour mise à jour
			socket.broadcast.emit('liste', scores);
		}
		console.log('Client déconnecté');
	});
});
