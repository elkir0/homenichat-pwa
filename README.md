# Homenichat PWA

PWA React historique de Homenichat.

Statut 2026-05-22 : **legacy / decision produit en attente**. La PWA n'est pas
au meme niveau fonctionnel que l'application mobile unifiee
`homenichat-app` : elle ne couvre pas encore proprement WhatsApp
multi-comptes, Zoko/Meta templates, disponibilite de session, IVR moderne,
multi-BLIIOT et les derniers contrats API.

## Role actuel

Ce depot peut encore servir de reference historique ou de base web, mais il ne
doit pas etre considere comme client principal tant que la modernisation n'est
pas planifiee.

Client principal actuel :

- `../homenichat-app` pour iOS, iPadOS et Android.

Backend actuel :

- `../homenichat-serv`

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

Le build CRA genere `build/`, ignore par Git.

## Structure

```text
homenichat-pwa/
├── src/                 # application React legacy
├── public/              # manifest et assets PWA
├── docs/                # notes historiques
├── build/               # genere, ignore Git
└── package.json
```

## Decisions ouvertes

Voir l'issue GitHub `Audit: decide legacy PWA status`.

Options :

1. archiver officiellement le depot ;
2. moderniser vers les contrats actuels multi-comptes/Zoko/templates ;
3. conserver en legacy documente avec maintenance minimale.

## Nettoyage applique

Le SDK Android `build-tools/34.0.0` n'est pas une source PWA et ne doit plus
etre versionne dans ce depot. Utiliser les SDK Android installes localement
hors repo si un outil en a besoin.

## License

MIT License - voir `LICENSE`.
