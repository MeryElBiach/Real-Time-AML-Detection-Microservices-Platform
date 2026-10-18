# Intégration des statuts AML — rapport de validation

Date : 25 septembre 2026.

L’intégration a été implémentée et testée sur les services Docker et PostgreSQL existants. Les modifications présentes avant cette intervention dans ReportingPage, les types frontend, StatsResponse, ReportingStatsService et TimeSeriesPoint ont été conservées et complétées.

## 1. Fichiers inspectés

- `alerts-service/src/main/java/com/meryem/aml/alertsservice/` : application, contrôleur, entités Alert et AlertStatus, repository, consumer des transactions scorées, modèles Transaction et ScoredTransaction.
- `reporting-service/src/main/java/com/meryem/aml/reportingservice/` : application, contrôleur, entité AlertReport, modèle Kafka Alert, repository, consumer, ReportingStatsService, StatsResponse et TimeSeriesPoint.
- `Frontend/src/` : App, types, API auth/alerts/reports, pages Login/Alerts/Reporting, drawer, Sidebar et mockData ; usages des mocks dans les autres composants.
- Ancienne version Git de ReportingPage pour récupérer exactement les classes du graphique empilé du template.
- POM, Dockerfile et application.yml d’Alerts et Reporting ; docker-compose.yml ; configuration centralisée Alerts, Reporting et Gateway ; JwtAuthFilter ; package.json et vite.config.ts.
- Vérifications en lecture seule des données PostgreSQL, enregistrements Eureka, conteneurs et logs Kafka/consumers.

## 2. Fichiers modifiés ou créés

| Ensemble | Fichiers |
|---|---|
| Contrat partagé | `aml-contracts/pom.xml`, déplacement de l’unique `AlertStatus.java` vers `aml-contracts/src/main/java/com/meryem/aml/alertsservice/entity/AlertStatus.java` |
| Alerts | `pom.xml`, `Dockerfile`, `entity/Alert.java`, `controller/AlertController.java`, `service/ScoredTransactionConsumer.java`, nouveau `service/AlertPublisher.java` |
| Reporting | `pom.xml`, `Dockerfile`, `entity/AlertReport.java`, `model/Alert.java`, `repository/AlertReportRepository.java`, `service/AlertConsumer.java`, `service/ReportingStatsService.java`, `dto/StatsResponse.java`, nouveau `dto/StatusTimeSeriesPoint.java` |
| Frontend | `src/App.tsx`, `src/api/alertsApi.ts`, `src/components/AlertDetailDrawer.tsx`, `src/pages/AlertsPage.tsx`, `src/pages/ReportingPage.tsx`, `src/types/index.ts`, `src/data/mockData.ts` |
| Infrastructure/sécurité | `docker-compose.yml`, `.dockerignore`, `gateway-service/.../filter/JwtAuthFilter.java` |
| Tests | `alerts-service/src/test/.../controller/AlertStatusTest.java`, `reporting-service/src/test/.../service/StatusReportingTest.java`, `scripts/test-status-browser.cjs` |
| Reprise/documentation | `scripts/replay-alerts.py`, ce rapport ; résultats et captures dans `artifacts/` |

Le fichier TimeSeriesPoint.java était déjà présent et non suivi par Git avant cette intervention ; il n’a pas été recréé.

## 3. Backend Alerts

Le PUT existant `/api/alerts/{id}/status` accepte toujours une chaîne JSON parmi PENDING, CONFIRMED et FALSE_POSITIVE. Il sauvegarde l’alerte, publie ensuite son état complet et renvoie l’alerte persistée. Un statut absent est rejeté avec 400, une alerte absente avec 404. Un statut invalide est également rejeté par la conversion JSON.

Alert utilise `@Version` avec `statusVersion` pour le verrouillage optimiste et la détection des événements anciens. AlertPublisher attend l’accusé Kafka au lieu d’ignorer une erreur asynchrone.

## 4. Kafka et identité

Le topic `alerts` et sa clé `transactionId` sont conservés. Les messages contiennent les champs précédents, dont `id` et `status`, et le champ additionnel `statusVersion`. Le consumer utilise l’ID réel de l’alerte pour identifier son rapport.

Ce choix est fondé sur les données : au premier contrôle, Alerts contenait 14 922 lignes mais seulement 14 764 transactionId distincts. Utiliser transactionId comme identité unique aurait fusionné des alertes réellement distinctes. Reporting avait 10 201 lignes avant reprise.

Un événement dont la version est inférieure à celle du rapport est ignoré. La répétition du même événement met à jour la même ligne. La clé Kafka existante garde les événements d’une transaction dans la même partition.

## 5. PostgreSQL et reprise historique

Colonnes ajoutées par la stratégie Hibernate `ddl-auto: update` déjà configurée :

- `alert_schema.alert.status_version`, bigint, valeur initiale 0 ;
- `reporting_schema.alert_report.alert_id`, avec contrainte unique ;
- `reporting_schema.alert_report.status_version`, bigint, valeur initiale 0 ;
- `reporting_schema.alert_report.status`, enum Java stocké en chaîne avec `@Enumerated(EnumType.STRING)`.

Les identifiants locaux des rapports sont conservés. Pour une ancienne ligne sans alert_id, le consumer réutilise la première ligne historique de même transactionId non encore liée. Les événements suivants sont reconnus par alert_id.

`scripts/replay-alerts.py` a relu 15 178 alertes réelles via l’API authentifiée puis les a republiées dans Kafka, sans réinitialiser les offsets et sans supprimer de données. Au contrôle suivant, les 15 196 rapports présents étaient tous liés et renseignés, avec zéro différence de statut entre les deux schémas. Les volumes continuent à évoluer avec le générateur.

Le Reporting Service ne lit jamais les tables Alerts. Les comparaisons interschémas sont uniquement des contrôles administratifs de test.

## 6. Reporting Service

AlertConsumer effectue une mise à jour ou une insertion selon l’ID source. ReportingStatsService calcule les anciennes et nouvelles statistiques à partir de la même liste d’AlertReport récupérée dans son propre repository.

L’unique enum existant est compilé dans un petit JAR partagé. Son package a été conservé pour limiter les changements. Les deux services dépendent de ce contrat, sans dépendre des entités, repositories ou tables de l’autre service. Le contexte Docker de ces deux builds inclut désormais ce module.

## 7. Frontend et design

- `updateAlertStatus` envoie le PUT avec le JWT et un corps JSON string.
- Le drawer attend la réponse avant d’annoncer le succès ; les boutons sont désactivés pendant l’envoi. Un échec est affiché et n’est pas présenté comme une réussite.
- App détient la liste partagée par Dashboard, AlertsPage et le drawer ; la copie indépendante d’AlertsPage a été retirée.
- Les statistiques sont relues toutes les trois secondes après authentification afin de suivre la projection asynchrone Kafka.
- Le premier graphique conserve `stats.timeSeries` et son design.
- Le graphique empilé a été repris de la version Git du template, car il était absent du fichier de travail. Toutes ses classes CSS ont été comparées automatiquement à celles du template : elles sont identiques.
- Le deuxième graphique utilise `stats.statusTimeSeries`, avec les mêmes couleurs, ordre des segments, légende, dimensions, tooltip et footer. Son titre est `Daily AML Alert Inflow (Last 15 Days)`.
- La carte utilise `stats.statusDistribution`. Seuls les libellés et les couleurs sont des constantes de présentation ; les volumes et pourcentages sont calculés à partir de l’API.

## 8. Mocks retirés

`MOCK_STATUS_DISTRIBUTION` et `MOCK_TIME_SERIES` ont été supprimés après contrôle des usages. `MOCK_STATS`, inutilisé et déjà incompatible avec StatsResponse avant intervention, a également été supprimé pour rétablir la compilation. Les règles, le profil prototype, les alertes de démonstration et les autres données non concernées ont été conservés.

ReportingPage n’importe plus aucun mock de statistiques et ne contient plus les mentions de démonstration dans les sections remplacées.

## 9. Structure de StatsResponse

```typescript
interface StatsResponse {
  totalAlerts: number;
  alertsByRule: Record<string, number>;
  alertsByCountry: Record<string, number>;
  averageRiskScore: number;
  highRiskAlerts: number;
  riskScoreDistribution: Record<string, number>;
  timeSeries: { date: string; alerts: number }[];
  statusDistribution: Record<AlertStatus, number>;
  statusTimeSeries: {
    date: string;
    pending: number;
    confirmed: number;
    falsePositive: number;
  }[];
  alertsToday?: number; // propriété frontend préexistante
}
```

L’API conserve tous ses champs existants. `artifacts/stats-confirmed.json` contient une réponse réelle capturée pendant le test, sans token.

## 10. statusDistribution

Le backend initialise les trois catégories à zéro puis compte les statuts persistés. La somme des trois catégories égale totalAlerts. Le frontend calcule les pourcentages sur cette somme, avec protection du cas vide.

Pour les anciens messages sans statut, PENDING est utilisé par compatibilité. La reprise effectuée a renseigné tous les statuts historiques de cette base depuis la source réelle ; au premier contrôle toutes les alertes source étaient effectivement PENDING.

## 11. statusTimeSeries

Les rapports sont regroupés par date de création puis par statut actuel. Les dates sont triées chronologiquement avant formatage `dd MMM`, en anglais pour conserver les libellés du template. Les deux séries temporelles partagent le même regroupement : pour chaque date, pending + confirmed + falsePositive égale timeSeries.alerts.

Une confirmation aujourd’hui d’une alerte créée en août modifie donc le segment d’août. Il s’agit du statut actuel des cohortes créées chaque jour, pas d’un historique des décisions prises chaque jour.

Le frontend prend les 15 derniers points disponibles, conformément à l’option autorisée dans la demande. Aucun jour vide n’est fabriqué. Le footer précise `Last 15 available alert dates` : ce n’est pas nécessairement une fenêtre de 15 jours calendaires consécutifs.

## 12. Flux de l’analyste et autorisations

Bouton → PUT avec JWT → Gateway → sauvegarde Alerts → événement Kafka → upsert AlertReport → statistiques Reporting → rafraîchissement React.

JWT reste obligatoire. ANALYST et ADMIN conservent le droit de modifier les statuts ; AUDITOR ne peut pas le faire. La seule extension de droits est la lecture de `/api/reports/stats` pour ANALYST, nécessaire à la consultation du Reporting après ses décisions. Les autres routes Reporting gardent les restrictions précédentes.

## 13. Tests réalisés

- Build Docker des huit microservices, build Maven du contrat partagé et démarrage des dix conteneurs existants.
- Build TypeScript/Vite du frontend, réussi après la dernière correction de texte.
- Deux tests unitaires Alerts : sauvegarde avant publication pour les trois statuts ; absence de publication pour requêtes invalides.
- Quatre tests unitaires Reporting : totaux quotidiens cohérents ; base vide ; événements répétés et anciens ; liaison d’un rapport historique sans insertion supplémentaire.
- Connexion réelle de l’analyste dans Edge via Playwright ; clics successifs CONFIRMED, FALSE_POSITIVE, PENDING sur l’alerte 1.
- Vérification du PUT, des deux schémas PostgreSQL, de l’identité du rapport, des statistiques quotidiennes, de la carte et des tooltips.
- Réinjection réelle deux fois d’un ancien message PENDING dans Kafka alors que l’alerte était CONFIRMED.
- Simulation ciblée d’un HTTP 503 dans le navigateur pour vérifier l’absence de faux succès.
- Rechargement du frontend, captures desktop/mobile, contrôle des erreurs JavaScript.
- Tests API : sans JWT 401 ; lecture AUDITOR 200 ; écriture AUDITOR 403 ; statut invalide/null 400 ; alerte absente 404.
- Contrôle Eureka : six applications clientes UP. Kafka : lag du groupe reporting-service-group égal à zéro au contrôle final. PostgreSQL et infrastructure Docker : opérationnels.

## 14. Résultats et preuves

Les six tests unitaires passent. Le test navigateur valide les trois changements, la propagation dans les deux schémas et les statistiques, sans doublon et sans erreur JavaScript. Le même rapport 10513 est conservé pour l’alerte 1. L’alerte a été remise à PENDING et ce statut a été confirmé dans les deux schémas.

Résultats reproductibles : `artifacts/status-browser-results.json`. Réponse API réelle : `artifacts/stats-confirmed.json`. Captures : `artifacts/reporting-confirmed.png` et `artifacts/reporting-mobile.png`.

Commandes utiles :

```powershell
mvn -B -f aml-contracts/pom.xml install -DskipTests
mvn -B -f alerts-service/pom.xml test -Dtest=AlertStatusTest
mvn -B -f reporting-service/pom.xml test -Dtest=StatusReportingTest
docker compose build
docker compose up -d
npm --prefix Frontend run build
```

La reprise se lance avec `python scripts/replay-alerts.py` (compte demandé interactivement, ou variables AML_TEST_EMAIL/AML_TEST_PASSWORD). Le test navigateur utilise Playwright installé localement dans `artifacts/browser-tools`, Edge et le frontend sur localhost:5173. Il se lance avec `node scripts/test-status-browser.cjs` et restaure le statut initial après le test. Il utilise les comptes de démonstration du projet ; le mot de passe peut être fourni par AML_TEST_PASSWORD.

## 15. Limites et décisions documentées

- La sauvegarde PostgreSQL et la publication Kafka sont deux opérations distinctes, comme dans l’architecture existante. En cas de panne entre les deux, la donnée peut être sauvegardée sans être encore propagée. Une erreur de publication connue produit un HTTP 503 explicite ; renvoyer le même statut ou utiliser la reprise permet de resynchroniser. Une garantie automatique contre les crashs à cet endroit nécessiterait une outbox transactionnelle, non ajoutée dans cette modification ciblée.
- `@Version` évite les écrasements concurrents ; une collision simultanée de décisions reste une erreur serveur selon le traitement Spring par défaut, et l’utilisateur peut rafraîchir puis réessayer.
- Les doublons de transactions déjà présents dans Alerts sont conservés comme alertes distinctes. La reprise complète augmente légitimement le total Reporting puisqu’elle récupère aussi les alertes précédemment absentes ; elle ne fabrique pas de données.
- Le sélecteur visuel 14 Days / 30 Days / Quarter demeure sans filtrage backend, comme avant. Il n’a pas été présenté comme un filtre fonctionnel.
- Les notes d’investigation et le profil prototype restent hors périmètre. Le bandeau général de simulation concerne toujours le générateur AML de démonstration.
- Les tests applicatifs Spring `contextLoads` de tous les services n’ont pas été exécutés : les tests ciblés, la compilation des images et les vérifications réelles des services ont été utilisés ici.

Aucune validation supplémentaire n’est nécessaire pour les changements demandés. Les décisions de contrat partagé, d’identité par ID source, de lecture stats pour ANALYST et des 15 dernières dates disponibles sont explicitées ci-dessus pour la soutenance technique.

## Ajustement demandé après validation

À la demande de l’utilisateur, le graphique bleu « Total Alerts » a été retiré de ReportingPage. Un seul graphique d’évolution est désormais affiché : les barres empilées Confirmed / False Positive / Pending, alimentées par statusTimeSeries. Cette consigne remplace la demande initiale de conserver deux graphiques. Le champ timeSeries reste disponible dans l’API. Le design du graphique empilé est conservé et aucune donnée fictive n’est ajoutée pour forcer la présence des trois couleurs : un statut à zéro n’occupe aucune hauteur.
