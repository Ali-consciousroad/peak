# 1.4 Dictionnaire des données

Attributs du diagramme de classes. Types du DC (string, date, number, boolean). Null = champ obligatoire ou non. Les FK ne figurent pas ici : ce sont les associations du DC (Get, Generate, Attract…). UserId / MissionId / … = colonne `id` (sauf CategoryId = `categoryId`). WalletAddress = `cryptoWalletAddress`. Terms = `contractTerms`. Active (participant) = `isActive`.

---


Table ‘User’

| Champ | Type | Null | Description |
|---|---|---|---|
| UserId | string | non | identifiant unique |
| Login | string | oui | identifiant de connexion (ex. marie.dupont) |
| Password | string | oui | mot de passe (non utilisé : auth Clerk) |
| Email | string | non | adresse e-mail (ex. marie@mail.be) |
| ClerkId | string | oui | identifiant Clerk après login (ex. user_2abc…) |
| FirstName | string | oui | prénom (ex. Marie) |
| LastName | string | oui | nom (ex. Dupont) |
| Address | string | oui | adresse (ex. Rue de la Loi 16, 1000 Bruxelles) |
| PhoneNumber | string | oui | téléphone (ex. +32 470 12 34 56) |
| VAT | string | oui | numéro de TVA (ex. BE0123456789) |
| CompanyName | string | oui | nom de société (ex. Peak SPRL) |
| Description | string | oui | présentation du profil |
| Picture | string | oui | URL de la photo (ex. https://…) |
| BankAccount | string | oui | IBAN (ex. BE71 0961 2345 6769) |
| WalletAddress | string | oui | adresse wallet crypto (ex. 0x1a2b…) |
| PreferredPaymentMethod | string | oui | paiement préféré (EUR, crypto) |
| DailyRate | number | oui | tarif journalier en euros (ex. 350.00) |
| Active | boolean | non | compte actif (true, false) |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘Role’

| Champ | Type | Null | Description |
|---|---|---|---|
| RoleId | string | non | identifiant unique |
| Name | string | non | nom du rôle (client, freelance, admin) |
| Description | string | oui | courte description du rôle |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘Mission’

| Champ | Type | Null | Description |
|---|---|---|---|
| MissionId | string | non | identifiant unique |
| Title | string | non | titre (ex. Site vitrine Next.js) |
| Description | string | non | cahier des charges |
| Status | string | non | statut (OPEN, IN_PROGRESS, OVERDUE, COMPLETED, REFUNDED) |
| DailyRate | number | non | tarif journalier en euros (ex. 400.00) |
| Timeframe | number | non | durée en jours (ex. 10) |
| Timezone | date | oui | référence temporelle |
| StartDate | date | oui | date de début |
| EndDate | date | oui | date de fin |
| Deadline | date | oui | date limite de livraison |
| GracePeriodEnd | date | oui | fin du délai de grâce |
| IsVerified | boolean | non | validée par un admin (true, false) |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘Offer’

| Champ | Type | Null | Description |
|---|---|---|---|
| OfferId | string | non | identifiant unique |
| Status | string | non | statut (PENDING, ACCEPTED, REJECTED, CANCELLED) |
| DailyRate | number | non | tarif proposé en euros (ex. 380.00) |
| ProposalText | string | non | texte de la proposition |
| StartDate | date | non | début proposé |
| EndDate | date | non | fin proposée |
| SeenByFreelancerAt | date | oui | date de lecture par le freelance |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘Contract’

| Champ | Type | Null | Description |
|---|---|---|---|
| ContractId | string | non | identifiant unique |
| Terms | string | non | clauses du contrat |
| StartDate | date | non | date de début |
| EndDate | date | non | date de fin |
| IsActive | boolean | non | contrat actif (true, false) |
| DailyRate | number | non | tarif journalier contractuel (ex. 400.00) |
| SeenByClientAt | date | oui | date de lecture par le client |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘Payment’

| Champ | Type | Null | Description |
|---|---|---|---|
| PaymentId | string | non | identifiant unique |
| Status | string | non | statut (PENDING, MADE, RELEASED_1, RELEASED_2, RELEASED, COMPLETED, CANCELLED) |
| Amount | number | non | montant en euros (ex. 2000.00) |
| PaymentMethod | string | non | moyen de paiement (EUR, crypto) |
| TransactionDate | date | non | date de la transaction |
| SeenByFreelancerAt | date | oui | date de lecture par le freelance |
| ConversionRate | number | oui | taux EUR → crypto au versement (ex. 0.00042) |
| CryptoAmount | number | oui | montant crypto envoyé (ex. 0.85) |
| CryptoCurrency | string | oui | devise crypto (AVAX, BTC, ETH) |
| CryptoTransactionHash | string | oui | hash on-chain (ex. 0xabc…) |
| CryptoWalletAddress | string | oui | adresse wallet utilisée au payout |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘Currency’

| Champ | Type | Null | Description |
|---|---|---|---|
| CurrencyId | string | non | identifiant unique |
| Name | string | non | nom (Euro, Bitcoin, Ethereum) |
| Code | string | non | code (EUR, BTC, ETH, AVAX) |
| Type | string | non | nature (fiat, crypto) |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘Conflict’

| Champ | Type | Null | Description |
|---|---|---|---|
| ConflictId | string | non | identifiant unique |
| Status | string | non | statut (OPEN, IN_REVIEW, RESOLVED) |
| Motive | string | non | motif (ex. livrable incomplet) |
| StartDate | date | non | date d’ouverture |
| EndDate | date | oui | date de clôture |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘Notification’

| Champ | Type | Null | Description |
|---|---|---|---|
| NotificationId | string | non | identifiant unique |
| Type | string | non | code événement (conflict_created, payment_released) |
| Title | string | oui | titre (ex. Litige ouvert) |
| Message | string | oui | corps du message |
| ReadAt | date | oui | date de lecture (vide = non lu) |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘Conversation’

| Champ | Type | Null | Description |
|---|---|---|---|
| ConversationId | string | non | identifiant unique |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘ConversationParticipant’

| Champ | Type | Null | Description |
|---|---|---|---|
| ConversationParticipantId | string | non | identifiant unique |
| Active | boolean | non | encore dans le fil (true, false) |
| LastReadAt | date | oui | dernière lecture du fil |

Table ‘Message’

| Champ | Type | Null | Description |
|---|---|---|---|
| MessageId | string | non | identifiant métier unique |
| Content | string | non | texte du message |
| Status | string | non | statut d’envoi (sent) |
| IsRead | boolean | non | message lu (true, false) |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘Category’

| Champ | Type | Null | Description |
|---|---|---|---|
| CategoryId | string | non | identifiant unique |
| Name | string | non | nom (Web Development, Design, Rédaction) |
| Description | string | oui | courte explication de la catégorie |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘Skill’

| Champ | Type | Null | Description |
|---|---|---|---|
| SkillId | string | non | identifiant unique |
| Name | string | non | nom (React, Node.js, PostgreSQL) |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘Portfolio’

| Champ | Type | Null | Description |
|---|---|---|---|
| PortfolioId | string | non | identifiant unique |
| Name | string | oui | nom du portfolio (ex. Travaux 2025) |
| Description | string | oui | présentation du portfolio |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘Project’

| Champ | Type | Null | Description |
|---|---|---|---|
| ProjectId | string | non | identifiant unique |
| Name | string | non | nom (ex. Boutique e-commerce) |
| Description | string | oui | description du projet |
| Url | string | oui | lien (ex. https://exemple.be) |
| Picture | string | oui | URLs des images (plusieurs) |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |

Table ‘Review’

| Champ | Type | Null | Description |
|---|---|---|---|
| ReviewId | string | non | identifiant unique |
| Content | string | non | commentaire |
| Rating | number | non | note (1 à 5) |
| CreatedAt | date | non | date de création |
| UpdatedAt | date | non | date de modification |
