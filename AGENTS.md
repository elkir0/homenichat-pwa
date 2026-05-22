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
