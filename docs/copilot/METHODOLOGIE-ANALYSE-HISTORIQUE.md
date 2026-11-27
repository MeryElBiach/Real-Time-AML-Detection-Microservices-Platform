---
doc_id: AML-METH-001
title: Méthode d'analyse historique des transactions pour le copilote AML
version: "1.0.0"
date: "2026-11-25"
language: fr
source_type: internal_project
document_type: project_methodology
is_regulation: false
implementation_status: specification_not_implemented
analysis_version: history-mvp-v1
scoring_version_reference: demo-v1
---

# Méthode d'analyse historique des transactions pour le copilote AML

Cette méthode définit les calculs que le futur module Python/SQL fournira au copilote : comparaison de montant, fréquence et répétitions. Les résultats serviront à proposer des vérifications adaptées à une alerte, avec des chiffres reproductibles et leurs limites. Le LLM expliquera les résultats ; les calculs seront réalisés par le module d'analyse.

**Statut : spécification du MVP à développer.** Les fenêtres, seuils et critères de suffisance ci-dessous sont des choix de démonstration du projet. Ils ne sont ni des seuils réglementaires ni des paramètres validés sur des données bancaires réelles.

## METH-01 — Existant et périmètre prévu

Au 25 novembre 2026, le projet dispose de transactions simulées publiées dans Kafka, d'un scoring unitaire et d'alertes conservant les `ruleHits`, leurs `evidence` et la `scoringVersion`. Les nouvelles alertes peuvent aussi conserver la devise et le moment de la transaction. Ces champs peuvent manquer dans les anciennes alertes.

Le dépôt ne contient pas encore de module d'analyse historique, de stockage de toutes les transactions, de service LLM ou d'index Qdrant. Le générateur choisit les comptes aléatoirement ; il ne construit pas un comportement durable par compte.

Le MVP historique portera sur le **compte émetteur** `fromAccount`. Sans correspondance vérifiée entre clients et comptes, le rapport parlera de « comportement observé du compte », pas de comportement global d'un client. Il ne déduira pas la propriété des comptes destinataires.

Les résultats historiques seront des `investigationFindings` distincts du scoring existant. Ils ne modifieront ni les `ruleHits` enregistrés, ni le score, ni le statut de l'alerte.

## METH-02 — Données nécessaires et stockage

L'historique devra contenir toutes les transactions du périmètre, y compris celles sans alerte. Construire une référence avec les seules alertes sélectionnerait déjà les opérations signalées et fausserait la comparaison.

| Donnée | Utilisation et règle |
| --- | --- |
| `transactionId` | Identifiant source unique ; déduplication avant tout calcul. |
| `fromAccount`, `toAccount` | Définition du compte analysé et des contreparties observées. |
| `amount`, `currency` | Montant décimal fini, non négatif, devise explicite. |
| Horodatage de la transaction | Position dans les fenêtres ; conserver aussi la valeur source. |
| `ingestedAt` et provenance | Date de réception, origine simulée et, pour Kafka, topic/partition/offset. |
| Preuve de couverture | Manifest du jeu de démonstration ou mécanisme de complétude de l'ingestion. |

Le stockage historique prévu est PostgreSQL, alimenté par un consumer du topic `transactions` avec son propre groupe. Le rejeu Kafka ne reconstitue que les messages encore conservés. Les documents de méthode et de référence pourront aller dans Qdrant ; les lignes transactionnelles resteront dans PostgreSQL.

Les modèles Java actuels utilisent `double`. À l'entrée du module historique, convertir la représentation décimale reçue vers `Decimal`/`NUMERIC`, sans calcul intermédiaire en flottant. Cette conversion ne répare pas une éventuelle imprécision déjà introduite en amont. Ne jamais ajouter automatiquement une devise manquante ou un taux de change fictif.

Une même transaction reçue plusieurs fois ne compte qu'une fois. Deux contenus différents pour un même identifiant constituent un conflit à signaler. Les montants invalides et les transferts `fromAccount == toAccount` sont exclus des agrégats de ce MVP, avec motif et nombre d'exclusions conservés. Une cible elle-même invalide empêche son analyse.

## METH-03 — Moment de référence et fenêtres

On note `t0` le moment de la transaction à l'origine de l'alerte. Il faut utiliser `transactionTimestamp`, et non la date de création de l'alerte ou la date de la demande au copilote.

Les dates sources sont actuellement des `LocalDateTime`, sans fuseau incorporé. Avant comparaison, le futur pipeline devra connaître le fuseau de la source et normaliser les instants en UTC. Un fuseau inconnu produit `TIMEZONE_UNRESOLVED` et bloque les calculs temporels. Le fuseau du poste de l'analyste ne suffit pas à résoudre celui du générateur.

| Ensemble | Définition |
| --- | --- |
| Référence `R` | Transactions dans `[t0 - 31 jours, t0 - 1 jour)`, soit 30 périodes de 24 heures. |
| Récent `E` | Transactions dans `[t0 - 1 jour, t0)`, auxquelles on ajoute la cible une seule fois. |
| Périmètre commun | Même `fromAccount`, même devise, sens sortant, données valides et dédupliquées. |

La référence exclut toute la fenêtre récente pour éviter qu'une hausse récente ne gonfle immédiatement le comportement de comparaison. Les transactions postérieures à `t0` sont exclues. Les autres transactions exactement à `t0` sont également exclues en l'absence d'ordre source fiable, et leur nombre est signalé. La cible est identifiée par son ID, jamais par son seul montant.

Les 30 périodes de référence sont consécutives et alignées sur les bornes ci-dessus. Elles ne correspondent pas nécessairement à des jours civils locaux.

Le calcul utilise une photographie cohérente de la base, identifiée par `snapshotAt` et la provenance d'ingestion. Si la cible est absente de l'historique, elle peut être ajoutée depuis l'alerte lorsque ses champs nécessaires sont disponibles. Si les deux représentations se contredisent, retourner `TARGET_HISTORY_CONFLICT` plutôt que choisir silencieusement une valeur.

## METH-04 — Couverture et suffisance

La présence d'une ancienne transaction ne prouve pas que toute la période intermédiaire a été collectée. La couverture doit être établie indépendamment du nombre de lignes.

| État | Signification |
| --- | --- |
| `COMPLETE_DEMO` | Un manifest du scénario garantit toutes les opérations du périmètre et de la période. |
| `COMPLETE_SOURCE` | Un mécanisme d'ingestion vérifié garantit la couverture et le traitement des retards jusqu'à `t0`. |
| `PARTIAL` | Une période ou une partie du flux est connue comme manquante. |
| `UNKNOWN` | La complétude n'est pas établie. |

`COMPLETE_SOURCE` reste une capacité à construire. Le dernier horodatage reçu et l'absence apparente de retard Kafka ne suffisent pas, seuls, à garantir la complétude.

Pour calculer un ratio de comportement habituel dans cette version, exiger simultanément :

- 30 périodes de référence et la fenêtre récente couvertes ;
- au moins 20 transactions valides de référence ;
- des transactions sur au moins 7 périodes de référence distinctes ;
- les champs requis disponibles, sans conflit affectant le calcul.

Ces minima sont des garde-fous exploratoires, sans garantie de représentativité statistique. Le rapport conserve les nombres réels, le statut de couverture et les motifs de rejet pour chaque calcul.

Si ces conditions échouent, les ratios de comparaison sont `null`, avec un motif tel que `INSUFFICIENT_REFERENCE` ou `INCOMPLETE_COVERAGE`. Les opérations effectivement disponibles peuvent être décrites comme un **minimum observé** ; une période manquante ne doit jamais être remplie de zéros. Une répétition directement constatée peut être rapportée même si la référence est insuffisante.

## METH-05 — Comparaison du montant à la médiane

Soit `m` la médiane des montants de `R`. Pour un effectif pair, prendre la moyenne décimale des deux valeurs centrales.

```text
amountRatio = target.amount / m
```

Ce ratio exige les conditions de METH-04 et `m > 0`. Une référence vide ou une médiane nulle produit un ratio `null` et un motif explicite. Ne pas remplacer le dénominateur par 1 ni afficher un ratio infini.

**Indicateur local :** proposer `AMOUNT_DEVIATION` si `amountRatio >= 5`. Ce seuil ne déclenche pas une nouvelle alerte de scoring ; il sélectionne une piste de lecture historique.

Exemple fictif : 125 000 MAD comparés à une médiane de 5 000 MAD donnent `25`. Comparés à 120 000 MAD, ils donnent environ `1,04`. Le fait que la règle `HIGH_AMOUNT` soit déclenchée reste identique dans les deux cas ; le contexte historique diffère. Un ratio faible ne suffit pas à classer l'opération comme légitime.

Conserver le montant cible, la médiane, la devise, l'effectif, les bornes et les identifiants permettant de reconstituer la référence. Le module conserve les valeurs de calcul ; les arrondis d'affichage n'interviennent pas dans l'évaluation du seuil.

## METH-06 — Fréquence et volume récents

Pour chacune des 30 périodes de référence, calculer le nombre de transactions et leur somme. Les périodes sans opération valent zéro uniquement lorsque leur couverture est établie.

```text
referenceCountMedian = médiane des 30 nombres de transactions
referenceVolumeMedian = médiane des 30 sommes de montants
recentCount = nombre de transactions de E, cible comprise une seule fois
recentVolume = somme des montants de E
countRatio = recentCount / referenceCountMedian
volumeRatio = recentVolume / referenceVolumeMedian
```

Les conditions de METH-04 s'appliquent. Chaque ratio exige son propre dénominateur strictement positif ; un dénominateur nul laisse ce ratio indisponible, même si l'autre peut être calculé.

**Indicateurs locaux :** `FREQUENCY_INCREASE` si `recentCount >= 5` et `countRatio >= 3` ; `VOLUME_INCREASE` si `recentCount >= 5` et `volumeRatio >= 5`.

Exemple fictif : 6 opérations récentes contre une médiane de 2 par période donnent un ratio de fréquence de `3`. Un volume récent de 185 000 MAD contre une médiane de 10 000 MAD donne `18,5`. Le rapport précise que ces deux résultats peuvent provenir des mêmes opérations ; ils ne sont pas deux preuves indépendantes.

Ce MVP ne corrige pas les effets de fin de mois, jours ouvrés ou saisonnalité. Il compare une fenêtre glissante à des périodes de même durée, sans calcul de probabilité de fraude.

## METH-07 — Répétitions observées

Dans `E`, regrouper les transactions par `(fromAccount, toAccount, currency, amount)`, avec égalité numérique décimale du montant. Les valeurs `9900.0` et `9900.00` sont égales ; aucun arrondi ne doit rendre égaux deux montants distincts.

**Indicateur local :** `REPEATED_TRANSFERS` lorsqu'un groupe contient au moins 3 identifiants distincts. Restituer le nombre, le total, le premier et le dernier instant, les IDs et la couverture. Si la couverture est partielle, annoncer « au moins N opérations observées ».

Exemple fictif : trois virements de 9 900 MAD au même compte donnent un total de 29 700 MAD. Cela établit une répétition dans les données disponibles ; cela n'établit ni intention de fractionnement, ni contournement d'un seuil légal.

La règle actuelle `STRUCTURING_PATTERN` se limite à un montant unitaire exactement égal à 9 900. Elle ne fournit pas cette analyse historique. Les groupes sous le minimum ne déclenchent pas l'indicateur, sans constituer une preuve d'absence de schéma inhabituel. Les montants proches, réseaux de comptes et regroupements par propriétaire sont hors périmètre.

## METH-08 — Paramètres et justification du MVP

| Paramètre | Valeur initiale | Rôle |
| --- | --- | --- |
| `reference_periods` | 30 × 24 h | Référence séparée de l'activité récente. |
| `recent_window` | 24 h | Lecture courte, reproductible à `t0`. |
| `minimum_reference_transactions` | 20 | Éviter un ratio fondé sur quelques observations. |
| `minimum_active_reference_periods` | 7 | Éviter une référence concentrée sur une seule période. |
| `amount_ratio_threshold` | 5 | Choix exploratoire de contraste de montant. |
| `minimum_recent_count` | 5 | Éviter un signal de fréquence sur une ou deux opérations. |
| `count_ratio_threshold` | 3 | Choix exploratoire de hausse de fréquence. |
| `volume_ratio_threshold` | 5 | Choix exploratoire de hausse de volume. |
| `repeated_transfer_minimum` | 3 | Minimum local pour décrire une répétition. |

Ces valeurs appartiennent à `history-mvp-v1`. Elles restent à évaluer sur des scénarios légitimes et atypiques, puis à versionner lors de tout changement. Elles ne sont pas déduites des documents GAFI ou BAM et ne remplacent pas les règles `demo-v1`.

## METH-09 — Résultats et preuves à conserver

Pour chaque calcul, produire un état (`AVAILABLE`, `UNAVAILABLE` ou `INVALID_INPUT`), les valeurs calculées lorsqu'elles existent, le résultat de l'heuristique, les limites et la provenance. Un calcul disponible qui ne franchit pas son seuil reste disponible ; ce n'est pas un échec technique ni une déclaration d'innocuité.

Conserver au minimum :

- ID d'analyse, ID d'alerte et ID de la cible ;
- version de méthode et valeurs effectives des paramètres ;
- compte, sens, devise, `t0`, fuseau source et bornes ;
- date du snapshot, couverture, effectifs et exclusions ;
- IDs des opérations probantes et référence durable de l'ensemble utilisé ;
- formule, résultat non arrondi, motif d'indisponibilité et éventuel indicateur.

Si l'affichage ne montre qu'un échantillon d'opérations, indiquer le nombre total et rendre l'ensemble consultable. Le consumer pouvant recevoir des événements tardifs, une nouvelle analyse peut produire d'autres résultats : créer une nouvelle version de résultat et garder la photographie précédente. Ne pas écraser silencieusement un rapport déjà généré.

## METH-10 — Utilisation par le LLM et Qdrant

Le contexte du LLM distinguera les faits de l'alerte, les résultats historiques calculés et les passages documentaires récupérés. Un passage de procédure ne peut pas prouver qu'une opération ou un justificatif existe.

Les chiffres du rapport doivent reprendre les résultats du module. Une affirmation sur une transaction référence son ID ; une comparaison référence son calcul ; une piste documentaire référence un passage réellement récupéré. Le LLM peut proposer une hypothèse, mais doit la présenter comme à vérifier.

Pour le futur découpage Qdrant, utiliser chaque section `METH-xx` comme unité logique, avec l'identifiant `AML-METH-001/METH-xx`. Hériter des métadonnées du document, notamment `source_type=internal_project`, `is_regulation=false`, `version` et `implementation_status`. Si une section est subdivisée, conserver ses conditions, formules et limites avec le passage pertinent.

Les identifiants de section sont des clés de citation dans le payload. Le futur point Qdrant utilisera un identifiant technique compatible, distinct de cette clé. Les exemples de ce document ne sont jamais des transactions probantes et ne doivent pas être injectés comme faits d'une alerte.

## METH-11 — Vérifications avant mise en service du module

La validation devra couvrir la déduplication, l'ajout unique de la cible, les bornes temporelles, l'exclusion du futur, les devises séparées, les fuseaux absents, les dénominateurs nuls et la couverture partielle. Une période manquante ne doit pas devenir une période à zéro opération.

Prévoir des scénarios reproductibles : montant exceptionnel, montant élevé habituel, hausse de fréquence, répétition, historique insuffisant et transfert en devise sans preuve de passage de frontière. Les résultats attendus seront calculés indépendamment du LLM. Ces scénarios restent à construire ; ce document n'atteste pas que leurs tests existent déjà.

## METH-12 — Références et portée

La recommandation 10 du GAFI relie l'examen des opérations à la connaissance du client ; la recommandation 11 traite de la conservation des éléments permettant leur reconstitution. Elles ne prescrivent pas les formules de ce projet. [GAFI, recommandations, mise à jour juin 2026, recommandations 10 et 11](https://www.fatf-gafi.org/content/dam/fatf-gafi/recommendations/recommandations-du-gafi-2012.pdf.coredownload.pdf#page=17).

Les articles 7 et 8 du texte BAM consulté concernent les capacités d'analyse et l'examen des opérations inhabituelles. Il s'agit de la version de base de 2017 ; sa consolidation n'est pas validée ici. [Bank Al-Maghrib, circulaire n° 5/W/2017, articles 7 et 8](https://www.bkam.ma/ar/content/download/746625/8468997/Circulaire%20n%C2%B05W2017%20relative%20%C3%A0%20l%E2%80%99obligation%20de%20vigilance%20incombant%20aux%20%C3%A9tablissements%20de%20cr%C3%A9dit%20et%20organismes%20assimil%C3%A9s.pdf).

Références consultées le 25 novembre 2026. Le [guide de pistes d'investigation](GUIDE-PISTES-INVESTIGATION.md) définit l'utilisation opérationnelle des résultats de cette méthode.
