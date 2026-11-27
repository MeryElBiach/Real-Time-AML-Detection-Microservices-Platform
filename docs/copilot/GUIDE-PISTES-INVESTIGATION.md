---
doc_id: AML-PISTES-001
title: Guide de pistes d'investigation pour le copilote AML
version: "1.0.0"
date: "2026-11-25"
language: fr
source_type: internal_project
document_type: project_investigation_guide
is_regulation: false
implementation_status: specification_not_implemented
analysis_version_reference: history-mvp-v1
scoring_version_reference: demo-v1
---

# Guide de pistes d'investigation pour le copilote AML

Le copilote doit aider l'analyste à choisir la prochaine vérification utile à partir des faits d'une alerte et, lorsqu'ils existent, des résultats historiques calculés. Chaque piste associe un constat vérifiable, une question ouverte et les éléments nécessaires pour y répondre.

**Ce guide est une procédure de démonstration du projet**, à utiliser avec la [méthode d'analyse historique](METHODOLOGIE-ANALYSE-HISTORIQUE.md). Il n'est pas le manuel interne d'une banque et n'atteste pas d'une validation par un responsable de conformité. Les analyses historiques décrites restent à implémenter. Les références officielles étayent des principes généraux ; la sélection des pistes et leurs conditions sont des choix du projet.

## INV-00 — Sélectionner une piste à partir des preuves disponibles

Avant toute proposition, identifier la transaction, le compte émetteur, le montant, la devise, le moment de l'opération et les `ruleHits` enregistrés. Vérifier ensuite la disponibilité, la version et la couverture des analyses historiques.

| Élément disponible | Ce qu'il permet d'affirmer |
| --- | --- |
| `ruleHit` et `evidence` | Le prédicat de scoring appliqué à cette transaction, avec ses paramètres enregistrés. |
| Résultat Python/SQL et provenance | Le résultat chiffré calculé sur le périmètre indiqué. |
| Passage documentaire | Le principe de référence ou la méthode locale applicable ; pas un fait sur le compte. |
| Document client réellement fourni | Seulement les informations qui y figurent, avec son origine et sa date. |
| Information absente | Une limite ou une demande de vérification ; jamais une valeur supposée. |

Choisir jusqu'à trois pistes distinctes, selon leur lien avec les faits et leur utilité pour résoudre une question. Ce plafond est un choix d'interface du projet. Ne pas additionner les indicateurs comme des preuves indépendantes lorsqu'ils reposent sur les mêmes opérations. Si plusieurs fiches proposent la même vérification, les fusionner.

L'analyste garde la décision sur l'alerte. La validation d'un texte du copilote est une action distincte du changement de statut de l'alerte. Le copilote ne bloque pas un compte et ne déclenche pas de déclaration externe.

## INV-01 — Montant élevé et écart au comportement observé

**Activation :** `HIGH_AMOUNT` est présent dans les preuves enregistrées, ou le calcul disponible produit `AMOUNT_DEVIATION`. Conserver la distinction entre seuil unitaire et comparaison historique.

**Constat possible :** « Le montant dépasse le seuil de démonstration enregistré. Sur la référence couverte du compte, il représente X fois la médiane, calculée sur N opérations de même devise. » La seconde phrase n'est permise que si ce calcul est disponible.

**Vérifications proposées :**

1. Identifier l'objet économique déclaré de ce paiement et sa relation avec la contrepartie.
2. Comparer l'explication aux informations d'activité effectivement disponibles ; demander les éléments manquants à l'analyste.
3. Examiner un justificatif adapté à l'objet déclaré : facture, contrat, acte de cession ou autre pièce pertinente. La pièce n'est pas présumée existante.

**Éléments attendus :** ID de la cible, calcul de médiane et périmètre, contexte de paiement et éventuel justificatif daté. Le module ne connaît actuellement ni l'activité professionnelle, ni le revenu, ni l'origine des fonds du titulaire.

**Alternative à examiner :** règlement exceptionnel, achat important ou activité habituelle à montants élevés. Si le ratio est faible, le signaler comme contexte favorable sur le seul axe du montant ; conserver les autres questions ouvertes. Un montant proche de l'habitude n'établit pas la légitimité de son objet.

**Repères généraux :** `REF-GAFI-10`, `REF-GAFI-NI10-20`, `REF-BAM-34` ; portée et liens en INV-09. La comparaison suit METH-05.

## INV-02 — Hausse de fréquence ou de volume

**Activation :** résultat disponible `FREQUENCY_INCREASE` ou `VOLUME_INCREASE`, selon METH-06. Une impression visuelle ou le seul score de l'alerte ne suffit pas.

**Constat possible :** annoncer séparément le nombre et le volume des dernières 24 heures, leurs médianes de référence, leurs ratios et les bornes de calcul. Préciser que la cible est comprise une seule fois.

**Vérifications proposées :**

1. Déterminer si la hausse concerne beaucoup de paiements ou surtout une seule grosse opération, à partir des transactions disponibles.
2. Examiner les contreparties et les heures des opérations qui expliquent la hausse ; référencer leurs IDs.
3. Vérifier si un événement connu peut l'expliquer : échéance commerciale, campagne de paiement ou regroupement de règlements. Ce sont des hypothèses, pas des événements établis.

**Éléments attendus :** transactions contributrices, ratios, couverture et éventuel calendrier de paiement réellement fourni.

**Alternative et limite :** saisonnalité ou activité ponctuelle légitime. Le MVP ne corrige pas les jours ouvrés et fins de mois ; ne pas qualifier la hausse de statistiquement improbable.

**Repères généraux :** `REF-GAFI-NI10-20`, `REF-BAM-34` ; ils ne prescrivent ni fenêtre de 24 heures ni seuil de ratio.

## INV-03 — Virements répétés effectivement observés

**Activation :** `REPEATED_TRANSFERS` est calculé selon METH-07, avec les IDs de plusieurs transactions distinctes. Cette piste n'est pas activée par le seul nom `STRUCTURING_PATTERN`.

**Constat possible :** « N virements de A unités de devise vers le même compte sont observés sur la fenêtre, pour un total de S. » Si la couverture est incomplète, écrire « au moins N virements observés » et conserver la limite.

**Vérifications proposées :**

1. Vérifier la réalité de plusieurs opérations après déduplication, puis examiner leur espacement et leur total.
2. Rechercher si elles correspondent à des factures distinctes, échéances ou paiements échelonnés documentés.
3. Demander une explication de la répétition lorsqu'aucun objet distinct n'est établi dans les éléments disponibles.

**Éléments attendus :** IDs, montants, devise, compte destinataire, instants, total et pièces éventuellement disponibles. Un identifiant de compte ne révèle pas à lui seul son propriétaire.

**Alternative et limite :** paiements récurrents ou échéancier légitime. Les montants égaux n'établissent pas une intention de contournement. Le MVP ne recherche pas de montants approchants, de réseaux ou de liens de propriété entre comptes.

**Repères généraux :** `REF-GAFI-NI10-20`, `REF-BAM-34`. Le groupe de trois opérations est un critère du projet.

## INV-04 — Montant exact ou montant rond sans preuve de répétition

**Activation :** `STRUCTURING_PATTERN` ou `ROUND_AMOUNT` est présent, mais aucun résultat historique ne démontre un groupe répété.

**Constat possible :** restituer le prédicat dans les `evidence`. Dans `demo-v1`, `STRUCTURING_PATTERN` teste exactement 9 900 sur une seule transaction. `ROUND_AMOUNT` teste un minimum de 10 000 et un multiple de 5 000. Ces valeurs sont nominales, sans conversion de devise.

**Vérifications proposées :**

1. Vérifier le montant et la devise de la cible, puis examiner les résultats de répétition s'ils sont disponibles.
2. Demander le mode de fixation du montant et, si pertinent, la pièce commerciale correspondante.
3. Si l'historique manque, demander son accès avant de proposer une conclusion sur une répétition.

**Éléments attendus :** preuve de règle, contexte de paiement, historique éventuel et ID des opérations liées si elles existent.

**Alternative et limite :** prix forfaitaire, acompte ou tarif fixe. Ne pas présenter 9 900 comme un montant inférieur à un seuil légal de 10 000. Un montant rond n'est pas, seul, un comportement de fractionnement.

**Repère :** `REF-CODE-SCORING`, qui décrit le code du projet. Les montants et prédicats de cette fiche ne proviennent pas du GAFI ou de BAM.

## INV-05 — Pays présent dans la liste de démonstration

**Activation :** `RISK_COUNTRY` est présent dans les preuves de l'alerte.

**Constat possible :** le champ `country` correspond à un code de la liste simulée enregistrée. Dans `demo-v1`, cette liste contient `IR`, `KP` et `SY`. Le champ n'établit pas, à lui seul, la résidence du client, la banque destinataire ou le trajet des fonds.

**Vérifications proposées :**

1. Vérifier ce que représente réellement `country` dans la source de données.
2. Demander, si nécessaire, les pays des parties et des établissements concernés, ainsi que le contexte du paiement.
3. Si un contrôle réglementaire est requis par le cadre applicable, orienter l'analyste vers une source officielle à jour, en distinguant risque géographique et sanctions. Conserver la source, sa date et le résultat effectif du contrôle.

**Éléments attendus :** définition du champ source et résultat d'un contrôle réellement réalisé. En leur absence, mentionner « contrôle officiel non effectué » conformément à l'évidence enregistrée.

**Alternative et limite :** relation commerciale légitime ou champ mal interprété. Le copilote ne présentera pas la liste du projet comme une liste officielle et ne déduira pas une interdiction de paiement.

**Repère :** `REF-CODE-SCORING`. Cette fiche ne contient aucune qualification réglementaire actuelle des pays cités.

## INV-06 — Devise étrangère sans preuve de transfert international

**Activation :** `FOREIGN_CURRENCY` est présent dans les preuves enregistrées.

**Constat possible :** la devise appartient à la liste configurée dans cette version de scoring. Cette information n'établit pas un passage de frontière.

**Vérifications proposées :**

1. Comparer le montant à l'historique de la même devise seulement, si l'analyse est disponible.
2. Examiner l'objet du règlement et les parties réellement identifiées.
3. Pour déterminer un caractère transfrontalier, demander les informations des établissements et des parties concernées ; ne pas le déduire de la seule devise.

**Éléments attendus :** devise de la cible, historique comparable, contexte et données de transfert si elles sont fournies. Aucune conversion n'est réalisée dans ce MVP.

**Alternative et limite :** activité habituelle en devise ou paiement domestique en devise. Sans historique comparable, annoncer que le caractère habituel n'est pas évaluable.

**Repère :** `REF-CODE-SCORING` ; la limite sur le contexte client rejoint le principe général `REF-GAFI-10`, sans créer une règle de suspicion liée à la devise.

## INV-07 — Historique insuffisant ou donnée indispensable manquante

**Activation :** calcul indisponible, couverture `PARTIAL`/`UNKNOWN`, devise ou date absente, fuseau non résolu, cible invalide ou conflit d'identifiants.

**Constat possible :** indiquer le calcul impossible et son motif précis. Séparer ce qui reste démontré par les preuves de l'alerte de ce qui ne peut pas être évalué historiquement.

**Vérifications proposées :**

1. Identifier la donnée nécessaire : historique complet, devise, fuseau source ou rapprochement de la cible, selon le motif effectif.
2. Demander le complément approprié à l'analyste ou au fournisseur de données. Une absence dans l'application ne prouve pas que le client est nouveau ou inactif.
3. Une fois le complément obtenu, relancer une analyse versionnée ; conserver le rapport précédent et sa limite.

**Éléments attendus :** motif d'indisponibilité, période réellement couverte, nombres observés et donnée manquante identifiée.

**Limite :** ne pas inventer de médiane, remplir un historique manquant avec des zéros ou annoncer « aucune anomalie » parce que les calculs n'ont pas abouti.

**Repères :** METH-02 à METH-04. Cette fiche traite de la qualité des données du projet.

## INV-08 — Exemple de restitution à l'analyste

**Exemple entièrement fictif**, destiné à montrer le format ; les identifiants et résultats ci-dessous ne correspondent pas à une alerte du système.

> **Faits de l'alerte — DEMO-TARGET-001** : transaction sortante de 125 000 MAD. Les preuves enregistrées indiquent `HIGH_AMOUNT` (+50) et `ROUND_AMOUNT` (+15), score de démonstration 65/100, version `demo-v1`.
>
> **Contexte calculé — DEMO-ANALYSIS-001** : le scénario garantit une référence complète de 60 opérations sur 30 périodes de 24 heures, dont 30 périodes actives. La médiane des montants est de 5 000 MAD ; le ratio de la cible est de 25. Le périmètre porte sur le même compte émetteur et la même devise selon METH-03 à METH-05.
>
> **Piste proposée** : vérifier l'objet de ce paiement et sa justification au regard de l'activité connue du titulaire. Un règlement exceptionnel reste une explication possible. [Guide du projet, INV-01](#inv-01--montant-élevé-et-écart-au-comportement-observé)
>
> **Informations manquantes** : objet économique, activité documentée et justificatif de paiement. Le système ne permet pas de conclure à leur absence dans le dossier bancaire.
>
> **Référence générale** : l'examen du contexte et de l'objet des opérations inhabituelles est abordé dans la [note interprétative de la recommandation 10 du GAFI, paragraphe 20](https://www.fatf-gafi.org/content/dam/fatf-gafi/recommendations/recommandations-du-gafi-2012.pdf.coredownload.pdf#page=81). Le ratio de 25 est un calcul du scénario, pas une valeur donnée par cette référence.
>
> **Décision** : à l'analyste après vérification. Ce rapport initial ne confirme pas un blanchiment.

Dans un rapport réel, remplacer les références de démonstration par les IDs vérifiables de l'alerte, des calculs et des transactions. Ajouter les bornes temporelles, le statut de couverture et les limites effectives. Les documents clients ne deviennent des preuves que lorsqu'ils ont réellement été fournis et examinés.

## INV-09 — Références et limites de leur utilisation

Les descriptions de cette section résument seulement la portée des références. Elles n'attribuent pas les seuils ou les fiches du projet aux organismes cités.

| Identifiant | Référence et portée |
| --- | --- |
| `REF-GAFI-10` | [GAFI, recommandations 10(c) et 10(d), juin 2026](https://www.fatf-gafi.org/content/dam/fatf-gafi/recommendations/recommandations-du-gafi-2012.pdf.coredownload.pdf#page=17) : connaissance de la relation et cohérence des opérations avec les informations sur le client. |
| `REF-GAFI-NI10-20` | [GAFI, note interprétative de la recommandation 10, paragraphe 20, juin 2026](https://www.fatf-gafi.org/content/dam/fatf-gafi/recommendations/recommandations-du-gafi-2012.pdf.coredownload.pdf#page=81) : examen du contexte et de l'objet des opérations inhabituelles. Ce numéro de paragraphe ne désigne pas la recommandation 20. |
| `REF-BAM-34` | [Bank Al-Maghrib, circulaire n° 5/W/2017, articles 33 et 34](https://www.bkam.ma/ar/content/download/746625/8468997/Circulaire%20n%C2%B05W2017%20relative%20%C3%A0%20l%E2%80%99obligation%20de%20vigilance%20incombant%20aux%20%C3%A9tablissements%20de%20cr%C3%A9dit%20et%20organismes%20assimil%C3%A9s.pdf) : cohérence avec le profil connu et examen des opérations inhabituelles. **Version de base 2017, consolidation non validée** ; ne pas la présenter comme l'intégralité du droit actuel. |
| `REF-CODE-SCORING` | [ScoringEngine.java](../../scoring-service/src/main/java/com/meryem/aml/scoringservice/service/ScoringEngine.java), `demo-v1` : règles de démonstration et limites capturées dans les `evidence`. Pour une alerte passée, ses preuves enregistrées priment sur le catalogue courant. |

Références consultées le 25 novembre 2026. Les pages liées du PDF GAFI correspondent aux pages imprimées 15 et 79. Les références BAM doivent être rapprochées de leurs modifications avant utilisation comme droit applicable actuel.

## INV-10 — Préparer la récupération documentaire

Pour le futur index Qdrant, une fiche `INV-xx` constitue une unité logique. Conserver son activation, ses limites et ses références avec ses pistes. Utiliser une clé de citation de type `AML-PISTES-001/INV-01`, distincte de l'identifiant technique du point Qdrant.

Chaque passage héritera du titre, de la version, de la langue, de `source_type=internal_project`, de `is_regulation=false` et de `implementation_status`. Associer les références externes citées avec leur URL, version, article/paragraphe et leur statut de consolidation. Pour BAM, ce statut reste `base_2017_not_consolidated` tant que la vérification n'est pas faite.

Une recherche pourra utiliser les codes de `ruleHits`, les types de `investigationFindings` réellement produits et les motifs d'indisponibilité. Le choix final d'une piste doit vérifier les conditions de la fiche : une ressemblance sémantique seule n'active pas une analyse absente.

Le LLM ne citera comme passage retrouvé que le texte effectivement fourni par la récupération. Une référence mentionnée dans ce guide n'équivaut pas à la récupération de son contenu officiel. La section INV-08 sera exclue du contexte probant de production ; si elle sert à illustrer le format, son caractère fictif doit être conservé.
