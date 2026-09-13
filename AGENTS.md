> ## Environnement de travail — mis à jour le 2026-09-13
>
> **Ce projet ne vit plus dans Google Drive.** Repères actuels :
>
> | | |
> |---|---|
> | Code | `~/code/<projet>` sur le **devbox** (CT601, `ssh devbox`) — aussi clonable sur le Mac ou omarchy |
> | Origine git | Forgejo — `http://192.168.1.76:3000/anthony/<dépôt>` (joignable de partout via Tailscale) |
> | Secrets | coffre chiffré **SOPS + age**, dépôt `infra-secrets` |
> | Sauvegardes | Proxmox 2 disques + restic chiffré sur Google (1h30 / 2h / 3h) |
>
> **Tout chemin `~/Library/CloudStorage/GoogleDrive-…/08-Dev-Projets-Serveurs/X` cité plus bas
> est obsolète** — le lire comme `~/code/X`. Le dossier Google Drive a été supprimé.
>
> ### Secrets — aucun `.env` en clair dans le dépôt
>
> ```bash
> env-restore                      # lister les .env disponibles au coffre
> env-restore <projet>             # afficher le contenu (stdout, rien sur disque)
> env-restore <projet> --ecrire    # écrire le fichier à sa place, en 600
> sops -d --extract '["cle"]' ~/infra-secrets/services/<service>.enc.yaml
> sops exec-env ~/infra-secrets/env/<fichier>.enc 'ma-commande'   # secret en mémoire seulement
> ```
>
> Les `.gitignore` sont durcis : un `.env` écrit localement ne peut plus être commité.
> **Ne jamais recopier une valeur de secret dans une réponse, un log ou un fichier de doc.**

## Homenichat PWA — consignes agents IA

Ce depot est legacy. Ne pas le confondre avec l'application mobile principale
`/Users/anthony/Homenichat/homenichat-app`.

## Regles

- Ne pas ajouter de nouvelles fonctionnalites produit sans decision explicite :
  la PWA n'est pas encore alignee avec les flux modernes Zoko/Meta, templates,
  multi-BLIIOT et IVR.
- Ne pas reintroduire de SDK Android ou outils binaires dans le depot.
- Ne pas ignorer `package-lock.json` : le lockfile doit rester versionne pour
  rendre les builds reproductibles.
- `build/` et `node_modules/` restent locaux et regenerables.

## Validation

```bash
npm run build
git diff --check
```

Les warnings CRA/ESLint existants ne bloquent pas le build, mais ils devront
etre traites si la PWA redevient produit actif.
