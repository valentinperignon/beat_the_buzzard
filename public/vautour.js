'use strict';

document.addEventListener('DOMContentLoaded', () => {
	// socket ouverte vers le client
	const sock = io.connect();
	// utilisateur courant
	let utilisateurActuel = null;
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

	// parties de stupide vautour
	let partieActuelle = -1;
	const partiesStupideVautour = {}; // {id -> { utilisateurs }...}

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
		chat: {
			messages: document.querySelector('#game aside #messages'),
			input: document.querySelector('#game aside #send-messages #message'),
			btnSend: document.querySelector('#game aside #send-messages #envoyer'),
		},
	};
	const UIVoix = {
		activer: document.getElementById('syntheseBtn'),
		popup: document.getElementById('syntheseParam'),
		check: document.querySelector('#syntheseParam #mute'),
		volume: document.querySelector('#syntheseParam #volume'),
		fermer: document.querySelector('#syntheseParam button'),
	};

	// synthèse vocale

	let syntheseVocale = null;

	/* -------------------- Réception des messages du serveur -------------------- */

	/**
	 * Réception du message de bienvenue
	 */
	sock.on('bienvenue', liste => {
		if (utilisateurActuel) {
			const { btn: btnConnecter } = UIConnexion;
			const { radio, username, messages, input } = UIChat;

			// on change l'affichage du bouton
			btnConnecter.value = 'Se connecter';
			btnConnecter.disabled = false;
			// on vide les zones de saisie
			messages.innerHTML = '';
			input.value = '';
			username.innerHTML = utilisateurActuel;
			radio.checked = true;
			input.focus();

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
		if (utilisateurActuel) {
			afficherMessage(msg);
			readMessage(msg);
		}
	});

	/**
	 * Réception de la mise à jour d'une liste
	 */
	sock.on('liste', liste => {
		if (utilisateurActuel) {
			afficherListe(liste);
		}
	});

	/**
	 * Réception du numéro de la partie à créer
	 */
	sock.on('vautour-creer', id => {
		creerPartie(id);
	});

	/**
	 * Réception d'une invitation à une partie de "Stupide Vautour"
	 */
	sock.on('vautour-invitation', data => {
		switch (data.type) {
			case 'ask':
				// affichage d'une popup
				const popup = document.createElement('div');
				document.body.appendChild(popup);
				popup.setAttribute('id', 'popup');
				popup.innerHTML = `<p>${data.from} vous propose de jouer à Stupide Vautour</p><button>Accepter</button><button>Refuser</button>`;
				popup.addEventListener('click', e => {
					const toSend = {
						type: 'answer',
						id: data.id,
						from: utilisateurActuel,
						to: data.from,
						answer: '',
					};
					if (e.target.innerText === 'Accepter') {
						toSend.answer = true;
						partieActuelle = data.id;
						UIGame.radio.checked = true;

						const listeHTML = document.createElement('div');
						listeHTML.setAttribute('id', 'liste-cartes');
						UIGame.game.append(listeHTML);
					} else if (e.target.innerText === 'Refuser') {
						toSend.answer = false;
					}
					if (
						e.target.innerText === 'Accepter' ||
						e.target.innerText === 'Refuser'
					) {
						sock.emit('vautour-invitation', toSend);
						document.body.removeChild(popup);
					}
				});
				break;
			case 'answer':
				if (data.answer) {
					document
						.querySelector(`#cartes-autres #${data.from}`)
						.classList.remove('carte-attente');
				} else {
					partiesStupideVautour[partieActuelle].delete(data.from);
					document
						.getElementById('cartes-autres')
						.remove(document.getElementById(data.from));
				}
				break;
		}
	});

	sock.on('vautour-liste', data => {
		partiesStupideVautour[data.id] = new Set(data.liste);

		// Mettre à jour la liste affichée
		if (document.querySelector('#game-content #liste-cartes')) {
			afficherListeJoueurs(data.id, data.hote, data.invitations);
		}
	});

	/**
	 * Déconnexion d'un utilisateur
	 */
	sock.on('disconnect', () => {
		nettoyer();
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
		utilisateurActuel = user;
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
			// Vide le contenu des chats
			nettoyer();
			sock.emit('logout', Object.keys(partiesStupideVautour));
			UIConnexion.radio.checked = true;
		}
	}

	/**
	 * Vide les interfaces des données entrées par les utilisateurs
	 */
	function nettoyer() {
		UIGame.listeCartes = '';
		UIGame.chat.messages.innerHTML = '';
		UIChat.messages.innerHTML = '';
		for (let partie in partiesStupideVautour) {
			if (partiesStupideVautour[partie].has(utilisateurActuel)) {
				partiesStupideVautour[partie].delete(utilisateurActuel);
			}
		}
		utilisateurActuel = null;
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
		if (!utilisateurActuel) return;

		// affichage des nouveaux messages
		let classe = '';

		// cas des messages privés
		if (msg.from != null && msg.to != null && msg.from != 0) {
			classe = 'mp';
			if (msg.from == utilisateurActuel) {
				msg.from += ' [privé @' + msg.to + ']';
			} else {
				msg.from += ' [privé]';
			}
		}

		// cas des messages ayant une origine spécifique (soi-même ou le serveur)
		if (msg.from == utilisateurActuel) {
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
		const message = `<div class="${classe}"><p><b>${date} - ${msg.from} :</b> ${msg.text}</p></div>`;
		UIChat.messages.innerHTML += message;
		UIGame.chat.messages.innerHTML += message;
		if (UIChat.radio.checked) {
			let msg = document.querySelector('#content > main > p:last-child');
			if (msg != null) {
				msg.scrollIntoView();
			}
		} else {
			let msg = document.querySelector(
				'#game > aside > #messages > p:last-child'
			);
			if (msg != null) {
				msg.scrollIntoView();
			}
		}
	}

	/**
	 * Lire un message avec la synthèse vocale
	 * @param object msg { from: auteur, text: texte du message, date: horodatage (ms) }
	 */
	function readMessage(msg) {
		if (syntheseVocale === null) {
			syntheseVocale = JSON.parse(
				localStorage.getItem(`voice_${utilisateurActuel}`)
			);
			if (syntheseVocale === null) {
				// valeur par défaut
				syntheseVocale = {
					active: true,
					volume: 0.2,
				};
			}
		}

		if (
			!syntheseVocale.active ||
			typeof speechSynthesis === 'undefined' ||
			msg.from.startsWith(utilisateurActuel) ||
			msg.from === '[admin]'
		) {
			return;
		}

		let hearThis = new SpeechSynthesisUtterance(`${msg.from} dit ${msg.text}`);
		hearThis.lang = 'fr-FR';
		hearThis.volume = syntheseVocale.volume;
		speechSynthesis.speak(hearThis);
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
	function afficherListe(nouvelleListe) {
		listeUtilisateurs = Object.keys(nouvelleListe);
		UIChat.users.innerHTML = listeUtilisateurs
			.map(u => `<p data-score="${nouvelleListe[u]}">${u}</p>`)
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

		// cas des messages privés
		let to = null;
		if (msg.startsWith('@')) {
			const i = msg.indexOf(' ');
			to = msg.substring(1, i);
			msg = msg.substring(i);
		}

		if (msg.startsWith('/vautour')) {
			// envoyer la demande au serveur
			sock.emit('vautour-creer', utilisateurActuel);
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
	function creerPartie(id) {
		// enregistrement de la nouvelle partie
		partieActuelle = id;
		partiesStupideVautour[id] = new Set();

		// afficher la zone de jeu
		UIGame.radio.checked = true;
		UIGame.game.innerHTML = '';

		// -> afficher l'interface de création de partie

		// bouton pour lancer la partie
		const jouerBouton = document.createElement('btn');
		jouerBouton.innerText = 'Lancer la partie';
		jouerBouton.setAttribute('id', 'jouerBtn');
		UIGame.game.append(jouerBouton);
		UIGame.game.insertAdjacentHTML(
			'afterbegin',
			'<svg xmlns="http://www.w3.org/2000/svg" style="display: none;"><defs><symbol id="arrow" viewBox="0 0 100 100"><path d="M12.5 45.83h64.58v8.33H12.5z"/><path d="M59.17 77.92l-5.84-5.84L75.43 50l-22.1-22.08 5.84-5.84L87.07 50z"/></symbol></defs></svg>'
		);
		UIGame.game.insertAdjacentHTML(
			'beforeend',
			'<label for="jouerBtn" class="button"><span><svg><use xlink:href="#arrow" href="#arrow"></use></svg></span></label >'
		);

		// bouton pour annuler la partie
		const annulerBouton = document.createElement('btn');
		annulerBouton.innerText = 'Retour';
		annulerBouton.setAttribute('id', 'annulerBtn');
		annulerBouton.addEventListener('click', () => {
			sock.emit('vautour-annuler', { id: partieActuelle, from: utilisateurActuel });
		});
		UIGame.game.append(annulerBouton);

		// liste de cartes
		const listeCartes = document.createElement('div');
		listeCartes.setAttribute('id', 'liste-cartes');
		UIGame.game.append(listeCartes);

		// carte moi
		listeCartes.append(creerCarteJoueur(utilisateurActuel, true));

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
		let canAddUsers = false;
		for (let utilisateur of listeUtilisateurs) {
			if (
				utilisateur === utilisateurActuel ||
				partiesStupideVautour[partieActuelle].has(utilisateur)
			) {
				continue;
			}
			canAddUsers = true;
			const element = document.createElement('li');
			element.innerText = utilisateur;

			element.addEventListener('click', () => {
				// ajouter l'utilisateur à la liste de joueurs
				partiesStupideVautour[partieActuelle].add(utilisateur);

				// envoyer l'invitation
				sock.emit('vautour-invitation', {
					type: 'ask',
					id: partieActuelle,
					from: utilisateurActuel,
					to: utilisateur,
				});

				// effacer la liste de joueurs
				UIGame.game.removeChild(liste);
				if (!document.getElementById(utilisateur)) {
					document
						.getElementById('cartes-autres')
						.append(creerCarteJoueur(utilisateur, false));
					document.getElementById(utilisateur).classList.add('carte-attente');
				}
			});

			liste.append(element);
		}

		// afficher un message si aucun joueur ne peut être ajouté
		if (!canAddUsers) {
			const aucunJoueur = document.createElement('li');
			aucunJoueur.innerText = 'Aucun utilisateur ne peut être ajouté';
			aucunJoueur.addEventListener('click', () => {
				UIGame.game.removeChild(liste);
			});
			liste.appendChild(aucunJoueur);
		}
		UIGame.game.append(liste);
	}

	/**
	 * Créer une carte représentant un joueur
	 * @param {string} name nom du joueur
	 * @param {boolean} estHote indique si le joueur est l'hôte de la partie
	 */
	function creerCarteJoueur(name, estHote) {
		const carte = document.createElement('div');
		carte.innerText = name;
		carte.classList.add('carte-joueur');
		let id = name;
		if (estHote) {
			id = 'carte-hote';
		}
		carte.setAttribute('id', id);
		return carte;
	}

	function afficherListeJoueurs(id, hote, invitations) {
		const listeCartes = document.querySelector('#game-content #liste-cartes');
		listeCartes.innerHTML = '';
		const autresJoueur = document.createElement('div');
		autresJoueur.id = 'cartes-autres';
		for (let joueur of partiesStupideVautour[id]) {
			if (joueur === hote && !document.getElementById('carte-hote')) {
				listeCartes.append(creerCarteJoueur(joueur, true));
			} else if (joueur !== hote && !document.getElementById(joueur)) {
				autresJoueur.append(creerCarteJoueur(joueur, false));
			}
		}
		for (let inv of invitations) {
			if (inv != undefined) {
				const invit = creerCarteJoueur(inv, false);
				invit.classList.add('carte-attente');
				autresJoueur.append(invit);
			}
		}
		listeCartes.append(autresJoueur);
		// carte pour ajouter un joueur
		if (hote === utilisateurActuel) {
			const nouveauJoueur = document.createElement('div');
			nouveauJoueur.innerText = '+';
			nouveauJoueur.classList.add('carte-joueur');
			nouveauJoueur.addEventListener('click', ajouterJoueur);
			listeCartes.append(nouveauJoueur);
		}
	}

	/* -------------------- Ecouteurs -------------------- */

	// --> click

	UIConnexion.btn.addEventListener('click', connecter);
	UIChat.btnLeft.addEventListener('click', quitter);
	UIChat.btnSend.addEventListener('click', () => envoyer(UIChat.input));
	UIGame.chat.btnSend.addEventListener('click', () =>
		envoyer(UIGame.chat.input)
	);
	UIChat.users.addEventListener('click', e => {
		UIChat.input.value += `@${e.target.innerText}`;
	});
	UIVoix.activer.addEventListener('click', () => {
		if (!utilisateurActuel) return;
		UIVoix.popup.classList.add('afficherFenetre');
		UIVoix.check.checked = syntheseVocale.active;
		UIVoix.volume.value = syntheseVocale.volume * 10;
	});
	UIVoix.popup.addEventListener('click', ev => {
		if (!utilisateurActuel) return;
		let target = ev.target;

		switch (target) {
			case UIVoix.fermer:
				UIVoix.popup.classList.remove('afficherFenetre');
				localStorage.setItem(
					`voice_${utilisateurActuel}`,
					JSON.stringify(syntheseVocale)
				);
				break;
			case UIVoix.volume:
				syntheseVocale.volume = UIVoix.volume.value / 10;
				break;
			case UIVoix.check:
				syntheseVocale.active = UIVoix.check.checked;
				break;
		}
	});

	// --> keydown

	UIConnexion.input.addEventListener('keydown', e => {
		if (e.key === 'Enter')
			// touche entrée
			connecter();
	});
	addKeyListerners(UIChat);
	addKeyListerners(UIGame.chat);

	// affichage de l'écran de connexion au démarrage
	UIConnexion.radio.checked = true;
	UIConnexion.input.focus();

	function addKeyListerners(UI) {
		UI.input.addEventListener('keydown', e => {
			switch (e.key) {
				case 'Tab': // tabulation
					e.preventDefault(); // empêche de perdre le focus
					completion.next();
					break;
				case 'ArrowUp': // fleche haut
					e.preventDefault(); // empêche de faire revenir le curseur au début du texte
					historique.precedent();
					break;
				case 'ArrowDown': // fleche bas
					e.preventDefault(); // par principe
					historique.suivant();
					break;
				case 'Enter': // touche entrée
					envoyer(UI.input);
				default:
					completion.reset();
			}
		});
	}
});
