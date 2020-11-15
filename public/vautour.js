'use strict';

document.addEventListener('DOMContentLoaded', () => {
	// socket ouverte vers le client
	const sock = io.connect();
	// utilisateur courant
	let utilisateurActuelle = null;
	let listeUtilisateurs = [];
	// caractères spéciaux
	const emojis = {
		':paper:': '&#9995;',
		':rock:': '&#9994;',
		':scissors:': '&#x270C;',
		':lizard:': '&#129295;',
		':spock:': '&#128406;',
		':smile:': '&#128578;',
		':sad:': '&#128577;',
		':laugh:': '&#128512;',
		':wink:': '&#128521;',
		':love:': '&#129392;',
		':coeur:': '&#10084;',
		':bisou:': '&#128536;',
		':peur:': '&#128561;',
		':whoa:': '&#128562;',
		':mask:': '&#128567;',
	};

	// éléments de l'interface de connexion
	const UIConnexion = {
		radio: document.getElementById('radio1'),
		input: document.getElementById('pseudo'),
		btn: document.getElementById('btnConnecter'),
	};
	const UIChat = {
		radio: document.getElementById('radio2'),
		content: document.getElementById('content'),
		username: document.getElementById('login'),
		messages: document.querySelector('main'),
		users: document.querySelector('aside'),
		input: document.getElementById('monMessage'),
		btnSend: document.getElementById('btnEnvoyer'),
		btnLeft: document.getElementById('btnQuitter'),
	};
	const UIGame = {
		radio: document.getElementById('radio3'),
		content: document.getElementById('game'),
		game: document.getElementById('game-content'),
		messages: document.querySelector('#game aside #messages'),
		input: document.querySelector('#game aside #send-messages #message'),
		btnSend: document.querySelector('#game aside #send-messages #envoyer'),
	};

	/* -------------------- Réception des messages du serveur -------------------- */

	/**
	 * Réception du message de bienvenue
	 */
	sock.on('bienvenue', liste => {
		if (utilisateurActuelle) {
			const { btn: btnConnecter } = UIConnexion;
			const { radio, username, messages, input } = UIChat;

			// on change l'affichage du bouton
			btnConnecter.value = 'Se connecter';
			btnConnecter.disabled = false;
			// on vide les zones de saisie
			messages.innerHTML = '';
			input.value = '';
			username.innerHTML = utilisateurActuelle;
			radio.checked = true;
			input.focus();

			listeUtilisateurs = liste;
			afficherListe(liste);
		}
	});

	/**
	 * Réception d'une erreur de connexion
	 */
	sock.on('erreur-connexion', msg => {
		alert(msg);
		const { btn } = UIConnexion;
		btn.value = 'Se connecter';
		btn.disabled = false;
	});

	/**
	 * Réception d'un message classique
	 */
	sock.on('message', msg => {
		if (utilisateurActuelle) {
			afficherMessage(msg);
		}
	});

	/**
	 * Réception de la mise à jour d'une liste
	 */
	sock.on('liste', liste => {
		listeUtilisateurs = liste;
		if (utilisateurActuelle) {
			afficherListe(liste);
		}
	});

	/**
	 * Réception d'une demande d'invitation à une partie'
	 */
	sock.on('vautour-demande', joueur => {
		// affichage d'une popup
		const popup = document.createElement('div');
		popup.classList.add('popup');
		popup.innerHTML = `<p>${joueur} vous propose de jouer à Stupide Vautour</p><button>Accepter</button><button>Refuser</button>`;
		popup.addEventListener('click', e => {
			if (e.target.innerText === 'Accepter') {
				sock.emit('vautour-demande', true);
			} else if (e.target.innerText === 'Refuser') {
				sock.emit('vautour-demande', false);
			}
		});
	});

	sock.on('vautour-invitation', resultat => {
		if (resultat.reponse) {
			document
				.getElementById(resultat.utilisateur)
				.classList.remove('carte-attente');
		} else {
			document
				.getElementById('cartes-autres')
				.remove(document.getElementById(resultat.utilisateur));
		}
	});

	/**
	 * Déconnexion d'un utilisateur
	 */
	sock.on('disconnect', () => {
		utilisateurActuelle = null;
		UIConnexion.radio.checked = true;
		UIChat.username.focus();
	});

	/**
	 * Connexion de l'utilisateur au chat.
	 */
	function connecter() {
		// recupération du pseudo
		const user = document.getElementById('pseudo').value.trim();
		if (!user) return;
		utilisateurActuelle = user;
		// ouverture de la connexion
		sock.emit('login', user);
		const { btn } = UIConnexion;
		btn.value = 'En attente...';
		btn.disabled = true;
	}

	/**
	 * Quitter le chat et revenir à la page d'accueil.
	 */
	function quitter() {
		if (confirm('Quitter le chat ?')) {
			utilisateurActuelle = null;
			sock.emit('logout');
			UIConnexion.radio.checked = true;
		}
	}

	/* -------------------- Traitement de l'interface -------------------- */

	// Objet singleton gérant l'auto-complétion
	const completion = {
		text: null,
		index: -1,
		props: [],

		reset: function () {
			this.text = null;
			this.index = -1;
		},
		next: function () {
			if (this.text === null) {
				this.text = document.getElementById('monMessage').value;
				this.props = this.calculePropositions();
				this.text = this.text.substring(0, this.text.lastIndexOf(':'));
				this.index = -1;
				if (this.props.length == 0) {
					this.text = null;
					return;
				}
			}
			this.index = (this.index + 1) % this.props.length;
			document.getElementById('monMessage').value =
				this.text + this.props[this.index];
		},
		calculePropositions: function () {
			const i = this.text.lastIndexOf(':');
			if (i >= 0) {
				const prefixe = this.text.substr(i);
				return Object.keys(emojis).filter(e => e.startsWith(prefixe));
			}
			return [];
		},
	};

	// Objet singleton gérant l'historique des commandes saisies
	const historique = {
		content: [],
		index: -1,
		currentInput: '',

		precedent: function () {
			if (this.index >= this.content.length - 1) {
				return;
			}
			// sauvegarde de la saisie en cours
			if (this.index == -1) {
				this.currentInput = document.getElementById('monMessage').value;
			}
			this.index++;
			document.getElementById('monMessage').value = this.content[this.index];
			completion.reset();
		},
		suivant: function () {
			if (this.index == -1) {
				return;
			}
			this.index--;
			if (this.index == -1) {
				document.getElementById('monMessage').value = this.currentInput;
			} else {
				document.getElementById('monMessage').value = this.content[this.index];
			}
			completion.reset();
		},
		ajouter: function () {
			this.content.splice(0, 0, document.getElementById('monMessage').value);
			this.index = -1;
		},
	};

	/**
	 * Affichage des messages
	 * @param object msg { from: auteur, text: texte du message, date: horodatage (ms) }
	 */
	function afficherMessage(msg) {
		// si réception du message alors que l'on est déconnecté du service
		if (!utilisateurActuelle) return;

		// affichage des nouveaux messages
		let classe = '';

		// cas des messages privés
		if (msg.from != null && msg.to != null && msg.from != 0) {
			classe = 'mp';
			if (msg.from == utilisateurActuelle) {
				msg.from += ' [privé @' + msg.to + ']';
			} else {
				msg.from += ' [privé]';
			}
		}

		// cas des messages ayant une origine spécifique (soi-même ou le serveur)
		if (msg.from == utilisateurActuelle) {
			classe = 'moi';
		} else if (msg.from == null) {
			classe = 'system';
			msg.from = '[admin]';
		} else if (msg.from === 0) {
			classe = 'chifoumi';
			msg.from = '[chifoumi]';
		}

		// affichage de la date format ISO pour avoir les HH:MM:SS
		let date = new Date(msg.date);
		date = date
			.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
			.substr(13, 8);
		// remplacement des caractères spéciaux par des émoji
		msg.text = traiterTexte(msg.text);
		// création et affichage du message
		const message = `<p class="${classe}">${date} - ${msg.from} : ${msg.text}</p>`;
		UIChat.messages.innerHTML += message;
		UIGame.messages.innerHTML += message;
		if (UIChat.radio.checked) {
			document.querySelector('#content > main > p:last-child').scrollIntoView();
		} else {
			document.querySelector('#game > aside > #messages').scrollIntoView();
		}
	}

	// traitement des emojis
	function traiterTexte(txt) {
		// remplacement de quelques smileys par les :commandes: correspondantes
		txt = txt.replace(/:[-]?\)/g, ':smile:');
		txt = txt.replace(/:[-]?[Dd]/g, ':laugh:');
		txt = txt.replace(/;[-]?\)/g, ':wink:');
		txt = txt.replace(/:[-]?[oO]/g, ':whoa:');
		txt = txt.replace(/:[-]?\*/g, ':bisou:');
		txt = txt.replace(/<3/g, ':coeur:');
		// remplacement des :commandes: par leur caractère spécial associé
		for (let sp in emojis) {
			txt = txt.replace(new RegExp(sp, 'gi'), emojis[sp]);
		}
		return txt;
	}

	/**
	 *  Affichage de la liste de joueurs
	 */
	function afficherListe(newList) {
		UIChat.users.innerHTML = newList
			.map(u => "<p data-score='0'>" + u + '</p>')
			.join('');
	}

	/**
	 * Envoi d'un message :
	 *   - Récupération du message dans la zone de saisie.
	 *   - Identification des cas spéciaux : @pseudo ... ou /vautour
	 *   - Envoi au serveur via la socket
	 */
	function envoyer(input) {
		let msg = input.value.trim();
		if (!msg) return;

		// Cas des messages privés
		let to = null;
		if (msg.startsWith('@')) {
			const i = msg.indexOf(' ');
			to = msg.substring(1, i);
			msg = msg.substring(i);
		}

		if (msg.startsWith('/vautour')) {
			if (input === UIGame.input) return;
			creerPartie();
		} else {
			sock.emit('message', { to: to, text: msg });
		}

		// enregistrement de la commande dans l'historique
		historique.ajouter();
		// effacement de la zone de saisie
		input.value = '';
	}

	/* -------------------- Partie de Stupide Vautour -------------------- */

	/**
	 * Créer une partie de Stupide Vautour
	 */
	function creerPartie() {
		// envoyer la demande au serveur
		sock.emit('vautour', { status: 'create' });
		// afficher la zone de jeu
		UIGame.radio.checked = true;
		UIGame.game.innerHTML = '';

		// -> afficher l'interface de création de partie

		// bouton pour lancer la partie
		const jouerBouton = document.createElement('btn');
		jouerBouton.innerText = 'Lancer la partie';
		jouerBouton.setAttribute('id', 'jouerBtn');
		UIGame.game.append(jouerBouton);

		// bouton pour annuler la partie
		const annulerBouton = document.createElement('btn');
		annulerBouton.innerText = 'Annuler la partie';
		annulerBouton.setAttribute('id', 'annulerBtn');
		annulerBouton.addEventListener('click', () => {
			sock.emit('vautour', { status: 'cancel' });
		});
		UIGame.game.append(annulerBouton);

		// liste de cartes
		const listeCartes = document.createElement('div');
		listeCartes.setAttribute('id', 'liste-cartes');
		UIGame.game.append(listeCartes);

		// carte moi
		listeCartes.append(creerCarteJoueur(utilisateurActuelle, 'joueur-moi'));

		// cartes des autres joueurs
		const autresJoueurs = document.createElement('div');
		autresJoueurs.setAttribute('id', 'cartes-autres');
		listeCartes.append(autresJoueurs);

		// carte pour ajouter un joueur
		const nouveauJoueur = document.createElement('div');
		nouveauJoueur.innerText = '+';
		nouveauJoueur.classList.add('carte-joueur');
		nouveauJoueur.addEventListener('click', ajouterJoueur);
		listeCartes.append(nouveauJoueur);
	}

	/**
	 * Ajouter un jour à la partie
	 */
	function ajouterJoueur() {
		const liste = document.createElement('ul');
		liste.setAttribute('id', 'choix-utilisateurs');

		// afficher la liste des utilisateurs
		for (let utilisateur of listeUtilisateurs) {
			if (utilisateur === utilisateurActuelle) {
				continue;
			}
			const element = document.createElement('li');
			element.innerText = utilisateur;

			element.addEventListener('click', () => {
				sock.emit('vautour-nouveau-joueur', utilisateur);
				UIGame.game.removeChild(liste);
				document
					.getElementById('cartes-autres')
					.append(creerCarteJoueur(utilisateur, utilisateur));
				document.getElementById(utilisateur).classList.add('carte-attente');
			});

			liste.append(element);
		}

		UIGame.game.append(liste);
	}

	/**
	 * Créer une carte représentant un joueur
	 * @param {string} name nom du joueur
	 * @param {string} id id de la carte
	 */
	function creerCarteJoueur(name, id) {
		const carte = document.createElement('div');
		carte.innerText = name;
		carte.classList.add('carte-joueur');
		carte.setAttribute('id', id);
		return carte;
	}

	/* -------------------- Ecouteurs -------------------- */

	// --> click

	UIConnexion.btn.addEventListener('click', connecter);
	UIChat.btnLeft.addEventListener('click', quitter);
	UIChat.btnSend.addEventListener('click', () => envoyer(UIChat.input));
	UIGame.btnSend.addEventListener('click', () => envoyer(UIGame.input));
	UIChat.users.addEventListener('click', e => {
		UIChat.input.value += `@${e.target.innerText}`;
	});

	// --> keydown

	UIConnexion.input.addEventListener('keydown', e => {
		if (e.keyCode == 13)
			// touche entrée
			connecter();
	});
	UIChat.input.addEventListener('keydown', e => {
		switch (e.keyCode) {
			case 9: // tabulation
				e.preventDefault(); // empêche de perdre le focus
				completion.next();
				break;
			case 38: // fleche haut
				e.preventDefault(); // empêche de faire revenir le curseur au début du texte
				historique.precedent();
				break;
			case 40: // fleche bas
				e.preventDefault(); // par principe
				historique.suivant();
				break;
			case 13: // touche entrée
				envoyer(UIChat.input);
			default:
				completion.reset();
		}
	});

	// affichage de l'écran de connexion au démarrage
	UIConnexion.radio.checked = true;
	UIConnexion.input.focus();
});
