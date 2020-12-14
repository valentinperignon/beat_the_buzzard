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
		navbar: document.getElementById('nav'),
		game: document.getElementById('game-content'),
		chat: {
			messages: document.querySelector('#game aside #messages'),
			input: document.querySelector('#game aside #send-messages #message'),
			btnSend: document.querySelector('#game aside #send-messages #envoyer'),
		},
		btnAnnuler: document.getElementById('annulerBtn'),
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

			if (msg.from.startsWith(utilisateurActuel) || msg.from === '[admin]') {
				return;
			}
			parler(`${msg.from} dit ${msg.text}`);
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

						afficherParties();
						creerOngletPartie(data.from);
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
					if (partiesStupideVautour[partieActuelle].size >= 2) {
						creerBtnLancerPartie(data.id);
					}
				} else {
					partiesStupideVautour[partieActuelle].delete(data.from);
					if (!document.getElementById('carte-ajout-joueur')) {
						creerCarteAjouterJoueur();
					}
				}
				break;
		}
	});

	/**
	 * Partie de Stupide Vautour annulée
	 */
	sock.on('partie-annule', () => {
		creerPopup(
			"`<p>La partie que vous tentez de rejoindre n'existe plus...</p><button>Fermer</button>"
		);
		UIChat.radio.checked = true;
	});

	/**
	 * Liste des joueurs participant à une partie
	 */
	sock.on('vautour-liste', data => {
		partiesStupideVautour[data.id] = new Set(data.liste);

		// Mettre à jour la liste affichée
		if (document.querySelector('#game-content #liste-invitations')) {
			afficherListeJoueurs(data.hote, data.invitations);
		}

		// Afficher si un joueur a quitté ou rejoint la partie
		let msg = {
			from: null,
			text: data.msg,
			date: Date.now(),
		};
		afficherMessage(msg);
	});

	/**
	 * Début d'une partie de Stupide Vautour
	 */
	sock.on('vautour-init', data => {
		renderVautour(data, true);
	});

	sock.on('vautour-choix-carte-autre-joueur', data => {
		creerCarteAutreJoueur(data.value, data.from);
	});

	/**
	 * Nouveau tour de jeu dans une partie de Stupide Vautour
	 */
	sock.on('vautour-nouveau-tour', data => {
		finDuTour(data);
	});

	/**
	 * Fin d'une partie de Stupide Vautour
	 */
	sock.on('vautour-fin-partie', data => {
		if (!data.winner) {
			alert("Fin de la partie ! Personne n'a gagné...");
			return;
		}

		if (data.winner === utilisateurActuel) {
			alert('Bravo ! Vous avez gagné cette partie.');
		} else {
			alert(`C'est perdu... ${data.winner} gagne la partie.`);
		}
	});

	/**
	 * Affichage des erreurs lors d'une partie de jeu
	 */
	sock.on('vautour-erreur', data => alert(data));

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
		UIGame.chat.messages.innerHTML = '';
		UIChat.messages.innerHTML = '';
		for (let partie in partiesStupideVautour) {
			delete partiesStupideVautour[partie];
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
	 * @param string Texte à prononcer
	 */
	function parler(text) {
		// Initialiser la synthèse vocale
		if (syntheseVocale === null) {
			syntheseVocale = JSON.parse(
				localStorage.getItem(`voice_${utilisateurActuel}`)
			);
			if (syntheseVocale === null) {
				syntheseVocale = {
					active: true,
					volume: 0.2,
				};
			}
		}

		if (!syntheseVocale.active || typeof speechSynthesis === 'undefined') {
			return;
		}

		let hearThis = new SpeechSynthesisUtterance(text);
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
		partiesStupideVautour[id].add(utilisateurActuel);
		// afficher la zone de jeu
		UIGame.radio.checked = true;
		UIGame.game.innerHTML = '';

		// -> afficher l'interface de création de partie
		// Ajout d'un onglet à la navbar
		creerOngletPartie(utilisateurActuel);

		// liste de cartes
		const listeInvitations = document.createElement('div');
		listeInvitations.setAttribute('id', 'liste-invitations');
		UIGame.game.append(listeInvitations);

		// carte moi
		listeInvitations.append(creerCarteJoueur(utilisateurActuel, true));

		// cartes des autres joueurs
		const autresJoueurs = document.createElement('div');
		autresJoueurs.setAttribute('id', 'cartes-autres');
		listeInvitations.append(autresJoueurs);

		// carte pour ajouter un joueur
		creerCarteAjouterJoueur();
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
				if (partiesStupideVautour[partieActuelle].size >= 4) {
					document.getElementById('liste-invitations').lastChild.remove();
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

	/**
	 * Créer une carte permettant d'ajouter des joueurs
	 *
	 */
	function creerCarteAjouterJoueur() {
		const listeInvitations = document.querySelector(
			'#game-content #liste-invitations'
		);
		const nouveauJoueur = document.createElement('div');
		nouveauJoueur.innerText = '+';
		nouveauJoueur.id = 'carte-ajout-joueur';
		nouveauJoueur.classList.add('carte-joueur');
		nouveauJoueur.addEventListener('click', ajouterJoueur);
		listeInvitations.append(nouveauJoueur);
	}

	/**
	 * Créer une carte choisie par un autre joueur
	 *
	 * @param {*} value La valeur de la carte choisie
	 * @param {string}joueur Le joueur à qui appartient la carte, nécéssaire pour avoir sa couleur
	 */
	function creerCarteAutreJoueur(value, joueur) {
		let numJoueur =
			[...partiesStupideVautour[partieActuelle]].indexOf(joueur) + 1;
		const carteAutreJoueur = document.createElement('span');
		carteAutreJoueur.innerHTML = `<div class=face-cachee value="${value}"><span>${value}</span><div>`;
		carteAutreJoueur.id = `J${numJoueur}`;
		// Mode admin (triche autorisée)
		if (utilisateurActuel.match(/^(fred|Fred)$/)) {
			console.log('ADMIN MOD');
			carteAutreJoueur.addEventListener('click', retournerCarte);
		}
		document
			.getElementById('choix-cartes-autres')
			.appendChild(carteAutreJoueur);

		setTimeout(() => carteAutreJoueur.classList.add('visible'), 200);
	}

	/**
	 * Retourne une carte
	 */
	function retournerCarte() {
		for (let target of document.getElementById('choix-cartes-autres')
			.children) {
			if (target != null) {
				target.style = 'transform:rotateY(180deg) translateX(50%);';
				target = target.children[0];
				setTimeout(() => {
					target.classList.remove(`face-cachee`);
					target.classList.add(`face-visible`);
				}, 500);
			}
		}
	}

	function retournerPioche() {
		let target = document.getElementsByClassName('pioche-cachee')[0];
		target.style = 'transform:rotateY(-180deg) translateX(-120%);';
		setTimeout(() => {
			target.classList.remove(`pioche-cachee`);
			target.classList.add(`pioche-visible`);
			target.innerHTML = `<div><span>${target.id}</span></div>`;
		}, 750);
		setTimeout(() => {
			target.classList.add(`top-pioche`);
		}, 2000);
	}

	/**
	 * Créer une carte de la main du joueur
	 */
	function creerCarteMainJoueur(value) {
		if (partieActuelle == null) {
			return;
		}
		const nouvelleCarte = document.createElement('span');
		nouvelleCarte.innerHTML = `<div><span>${value}</span></div>`;
		nouvelleCarte.setAttribute('value', value);
		// Assigne un numéro de couleur au joueur
		let numCouleur =
			[...partiesStupideVautour[partieActuelle]].indexOf(utilisateurActuel) + 1;
		nouvelleCarte.setAttribute('clr', numCouleur);
		nouvelleCarte.classList = 'carte-main carte-joueur';
		nouvelleCarte.addEventListener('click', eventCarte);

		nouvelleCarte.addEventListener('mouseleave', eventMouseleaveCarte);
		return nouvelleCarte;
	}

	/**
	 * Envoi un message au serveur pour l'informer de la carte choisie
	 * Place la carte en position de carte choisie
	 *
	 * @param {element} e L'élément de l'évènement
	 */
	function eventCarte(e) {
		sock.emit('vautour-choix-carte', {
			id: partieActuelle,
			from: utilisateurActuel,
			value: e.target.innerText,
		});

		// On remonte le dom jusqu'à trouver l'élément de base de la carte
		let target = e.target;
		if (target != null) {
			while (!target.classList.contains('carte-main')) {
				target = target.parentElement;
			}
			target.removeEventListener('mouseleave', eventMouseleaveCarte);
			target.style = 'transition: 2s;';
			let selectedCards = document.getElementsByClassName('selected-card');
			for (let elem of selectedCards) {
				elem.classList.remove('selected-card');
			}
			target.classList.add('selected-card');
			target.classList.remove('carte-main');
			target.style.left = '30%';
			toggleEventCarte(false);
			retournerPioche(
				document.getElementsByClassName('pioche-cachee')[0],
				true
			);
		}
	}

	/**
	 * Ajoute ou enlève un listener d'évènements aux cartes du joueur
	 *
	 * @param {boolean} addEvent Indique s'il faut ajouter ou enlever le listener
	 */
	function toggleEventCarte(addEvent) {
		let cartes = document.getElementsByClassName('carte-main');
		for (let carte of cartes) {
			if (addEvent) {
				carte.addEventListener('click', eventCarte);
			} else {
				carte.removeEventListener('click', eventCarte);
			}
		}
	}

	function creerBtnLancerPartie(id) {
		// bouton pour lancer la partie
		if (document.getElementById('jouerBtn')) {
			return;
		}
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
			'<label for="jouerBtn" class="button" id="labelJouerBtn"><span><svg><use xlink:href="#arrow" href="#arrow"></use></svg></span></label >'
		);
		document.getElementById('labelJouerBtn').addEventListener('click', () => {
			if (partiesStupideVautour[partieActuelle].size < 2) {
				creerPopup(
					'<p>Vous êtes tout seul, vous ne pouvez pas démarrer de partie, invitez des amis !</p><button>Fermer</button>'
				);
			} else {
				sock.emit('vautour-init', id);
			}
		});
	}

	function creerPopup(innerHtml) {
		const popup = document.createElement('div');
		document.body.appendChild(popup);
		popup.setAttribute('id', 'popup');
		popup.innerHTML = innerHtml;
		popup.addEventListener('click', () => {
			document.body.removeChild(document.getElementById('popup'));
		});
	}

	/**
	 * Abaisse les cartes lorsqu'elles ne sont plus hover
	 */
	function eventMouseleaveCarte(e) {
		e.target.style = 'translateY:70%;transition-duration: 1s;';
	}

	/**
	 * Affiche la liste des joueurs présents dans la partie sous forme de cartes ainsi qu'une carte pour ajouter des joueurs
	 *
	 * @param {string} hote	L'hôte de la partie
	 * @param {object} invitations Les invitations en attente de la partie
	 */
	function afficherListeJoueurs(hote, invitations) {
		const listeInvitations = document.querySelector(
			'#game-content #liste-invitations'
		);
		listeInvitations.innerHTML = '';
		const autresJoueur = document.createElement('div');
		autresJoueur.id = 'cartes-autres';
		// Créer les cartes des joueurs
		if (partiesStupideVautour[partieActuelle] != undefined) {
			for (let joueur of partiesStupideVautour[partieActuelle]) {
				if (joueur === hote && !document.getElementById('carte-hote')) {
					listeInvitations.append(creerCarteJoueur(joueur, true));
				} else if (
					joueur !== hote &&
					!document.getElementById(joueur) &&
					!invitations.includes(joueur)
				) {
					autresJoueur.append(creerCarteJoueur(joueur, false));
				}
			}
		}
		if (invitations != null) {
			for (let inv of invitations) {
				if (inv != undefined) {
					const invit = creerCarteJoueur(inv, false);
					invit.classList.add('carte-attente');
					autresJoueur.append(invit);
				}
			}
		}
		listeInvitations.append(autresJoueur);
		// carte pour ajouter un joueur
		if (
			hote === utilisateurActuel &&
			partiesStupideVautour[partieActuelle] != null &&
			invitations != null &&
			partiesStupideVautour[partieActuelle].size + invitations.length < 5
		) {
			creerCarteAjouterJoueur();
		}
	}

	/**
	 * Créer un onglet dans la barre de navigation pour basculer d'une partie à une autre
	 *
	 * @param {string} hote L'hote de la partie
	 */
	function creerOngletPartie(hote) {
		if (UIGame.navbar == undefined) {
			return;
		}
		for (const elem of document.getElementsByClassName('currentGame')) {
			elem.classList.remove('currentGame');
		}
		const onglet = document.createElement('span');
		onglet.id = partieActuelle;
		onglet.innerText = `Partie de ${hote}`;
		onglet.classList.add('currentGame');
		onglet.addEventListener('click', e => {
			for (const elem of document.getElementsByClassName('currentGame')) {
				elem.classList.remove('currentGame');
			}
			e.target.classList.add('currentGame');
			partieActuelle = e.target.id;
			afficherParties();
		});
		UIGame.navbar.insertAdjacentElement('beforeend', onglet);
	}

	/**
	 * Affiche la partie selectionnée par l'utilisateur dans la navbar
	 */
	function afficherParties() {
		sock.emit('vautour-infos', { id: partieActuelle, from: utilisateurActuel });
		sock.on('vautour-infos', data => renderVautour(data, data.isLaunched));
	}

	function renderVautour(data, isLaunched) {
		UIGame.game.innerHTML = '';
		if (!isLaunched) {
			document.getElementsByTagName('h1')[0].style.display = 'block';
			let listeInvitations = document.createElement('div');
			listeInvitations.id = 'liste-invitations';
			UIGame.game.append(listeInvitations);
			if (
				data.hote == utilisateurActuel &&
				partiesStupideVautour[partieActuelle].size >= 2
			) {
				creerBtnLancerPartie(data.id);
			}

			afficherListeJoueurs(data.hote, data.invitations);
		} else {
			document.getElementsByTagName('h1')[0].style.display = 'none';
			// Afficher la partie
			let htmlstr =
				'<div id="choix-cartes-autres"></div><div id="scores"><h3>Scores</h3>';
			const scores = JSON.parse(data.scores);
			for (let player in scores) {
				htmlstr += `<p id="score-${player}">${player} : ${scores[player]}</p>`;
			}
			htmlstr += '</div>';
			if (data.turn < 15) {
				htmlstr += `<div id="pioche-div"><div class="pioche"><div><p>?</p></div></div>`;
			}
			for (let card of data.pile) {
				htmlstr += `<div class="pioche-cachee" id="${card}"><div><p>?</p></div></div>`;
			}
			htmlstr += `</div>`;

			setTimeout(() => retournerPioche(), 1000);

			UIGame.game.insertAdjacentHTML('afterbegin', htmlstr);

			// Ajout  des cartes de la main du joueurs
			let mainJoueur = document.createElement('div');
			mainJoueur.id = 'main-joueur';
			for (let i = 0; i < data.hand.length; i++) {
				if (data.hand[i] != undefined) {
					mainJoueur.append(creerCarteMainJoueur(data.hand[i]));
				}
			}
			UIGame.game.insertAdjacentElement('beforeend', mainJoueur);
		}
	}

	async function finDuTour(data) {
		const encouragerLeJoueur = {
			carteVautour: [
				'Nul. Nul. Nul... Et ? Nul.',
				"T'as compris que tu ne dois pas obtenir les cartes vautours ?",
				"Encore des points en moins ? T'as de la chance, je sais coder la valeur moins infinie.",
				'Pour attirer tous ces vautours, tu dois vraiment être une belle charogne.',
				'Si tu continues comme ça, tu vas finir dans le caniveau.',
				"J'ai rarement vu quelqu'un d'aussi mauvais à ce jeu.",
				'Je me demande qui est le plus stupide, ce vautour ou toi ?',
			],
			aucuneCarte: [
				'Bonne nouvelle : tu ne perds aucun point. Mauvaise nouvelle: tu ne gagnes aucun point non plus.',
				'On est pas au uno ici, il faut gagner les cartes.',
				"C'est gentil d'aider les autres joueurs à gagner.",
				'Espèce de petit joueur.',
				"Tu aurais mieux fait de travailler tes TP de scheme plutôt que de t'entrainer à ce jeu.",
				"Tu l'auras la prochaine fois. Non je rigole t'es trop nul pour ça",
			],
		};

		await sleep(2000);
		retournerCarte();
		await sleep(2000);
		const carteNumero = Number(
			document.querySelector('.pioche-visible div span').innerText
		);
		if (data.winner === utilisateurActuel) {
			if (carteNumero > 0) {
				console.log('GAGNé');
				alert("C'est gagné ! Vous remportez la carte Souris.");
			} else {
				alert("C'est perdu ! Vous obtenez la carte Vautour.");
				parler(
					encouragerLeJoueur.carteVautour[
						getRandomNumber(encouragerLeJoueur.carteVautour.length)
					]
				);
			}
		} else {
			if (carteNumero > 0 && getRandomNumber(5) === 0) {
				parler(
					encouragerLeJoueur.aucuneCarte[
						getRandomNumber(encouragerLeJoueur.aucuneCarte.length)
					]
				);
			}
		}
		delete data.winner;
		await sleep(1000);
		// On réaffiche le jeu
		disparitionCartes();
		await sleep(1200);
		renderVautour(data, true);
	}

	function disparitionCartes() {
		for (let child of document.getElementById('choix-cartes-autres').children) {
			child.classList.add('fade-out');
		}
		document
			.getElementsByClassName('selected-card')[0]
			.classList.add('fade-out');
		for (let child of document.getElementsByClassName('top-pioche')) {
			child.classList.add('fade-out');
		}
	}

	function getRandomNumber(max, min = 0) {
		return Math.floor(Math.random() * max) + min;
	}

	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/* -------------------- Ecouteurs -------------------- */

	// --> click

	UIConnexion.btn.addEventListener('click', connecter);
	// Chat
	UIChat.btnLeft.addEventListener('click', quitter);
	UIChat.btnSend.addEventListener('click', () => envoyer(UIChat.input));
	UIChat.users.addEventListener('click', e => {
		UIChat.input.value += `@${e.target.innerText}`;
	});
	// Game
	UIGame.chat.btnSend.addEventListener('click', () =>
		envoyer(UIGame.chat.input)
	);
	UIGame.btnAnnuler.addEventListener('click', () => {
		if (confirm('Quittez la partie')) {
			sock.emit('vautour-annuler', {
				id: partieActuelle,
				from: utilisateurActuel,
			});
			document.getElementsByClassName('currentGame')[0].remove();
			delete partiesStupideVautour[partieActuelle];
			partieActuelle = null;
			if (document.getElementById('nav').firstChild) {
				partieActuelle = document.getElementById('nav').firstChild.id;
				document.getElementById('nav').firstChild.classList.add('currentGame');
				afficherParties();
			} else {
				UIChat.radio.checked = true;
			}
		}
	});
	// Synthèse vocale
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
