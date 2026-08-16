# Grolo Legal Publication Readiness Checklist

**Scope:** Audit of the ten policy drafts in `docs/legal/`. This document records launch-readiness work only; it does not rewrite policy language.

**Status:** Not publication-ready until every required value is completed, approved, and tested in the product.

## 1. Master launch checklist

### A. Business identity and scope

- [ ] Confirm the public brand name: Grolo.
- [ ] Confirm the complete legal entity name and entity type.
- [ ] Confirm registered mailing address and service/contact address.
- [ ] Confirm country of incorporation and every country where Grolo will launch.
- [ ] Confirm province/state and city/municipality of the operating entity.
- [ ] Confirm governing law, courts/venue, and whether arbitration or class-action terms are used.
- [ ] Confirm whether Grolo is a marketplace intermediary, payment facilitator, seller of record, or any other regulated role in each launch location.
- [ ] Confirm the launch product scope, seller categories, prohibited goods, and delivery/pickup model.

### B. Contacts and support operations

- [ ] Create and test the general/support email.
- [ ] Create and test the privacy email and determine whether a privacy officer/DPO contact is required.
- [ ] Create and test the safety/abuse reporting channel and define escalation ownership.
- [ ] Create and test the copyright/DMCA designated-agent email and postal address.
- [ ] Define the account deletion request path and verify it works for signed-in and signed-out users.
- [ ] Define the moderation appeal channel and confirm appeals can be tracked.
- [ ] Define the emergency and law-enforcement response process; clearly state that emergencies go to local emergency services.
- [ ] Assign owners and response targets for support, privacy, safety, copyright, deletion, and moderation appeals.

### C. Legal values and policy decisions

- [ ] Set effective date for every policy.
- [ ] Set last-updated date for the Privacy Policy.
- [ ] Set minimum user age and any regional age variations.
- [ ] Decide whether parental/guardian consent is supported and document the process if applicable.
- [ ] Define personal-information, transaction, fraud, safety, moderation, backup, and legal-hold retention schedules.
- [ ] Define deletion-request acknowledgement and completion timelines.
- [ ] Define refund/cancellation windows and statutory consumer-rights exceptions by jurisdiction.
- [ ] Decide whether payments remain cash/e-transfer only at launch or a payment processor will be enabled.
- [ ] If a processor is used, finalize processor name, terms, refund timing, chargeback handling, payout schedule, fees, and payment-data responsibilities.
- [ ] Finalize seller fees, tax collection, invoicing, payout, and seller-record requirements, or explicitly confirm that no Grolo fees apply at launch.
- [ ] Finalize liability-cap amount or formula and all mandatory-law carve-outs.
- [ ] Finalize safety restrictions by jurisdiction and product category.
- [ ] Confirm DMCA applicability and local copyright notice/counter-notice process in each launch country.

### D. Product and publication implementation

- [ ] Publish the Privacy Policy on the website and from account/settings flows.
- [ ] Present Terms of Service at sign-up and retain acceptance/version evidence.
- [ ] Link Community Guidelines from community and reporting surfaces.
- [ ] Link the Seller Agreement before seller tools/listing publication and retain seller acceptance/version evidence.
- [ ] Link the Acceptable Use Policy from account, listing, messaging, and moderation surfaces.
- [ ] Link Refund/Cancellation Policy before order confirmation.
- [ ] Link Marketplace Safety Policy from listings, messaging, order, and report flows.
- [ ] Publish the Copyright/DMCA Process at its designated contact location.
- [ ] Provide the Account Deletion Policy and working deletion entry point.
- [ ] Make the UGC Moderation Policy accessible from report notices, enforcement notices, and appeal flows.
- [ ] Verify all displayed emails, URLs, postal addresses, effective dates, and policy links in production.
- [ ] Verify accessible formatting, mobile readability, language/localization, and screen-reader labels.

### E. Operational evidence and final approval

- [ ] Run end-to-end tests for report, block, moderation action, appeal, deletion, refund/cancellation, and seller onboarding flows.
- [ ] Confirm moderation records, consent/version records, deletion records, and support tickets are retained according to the approved schedules.
- [ ] Confirm privacy, safety, copyright, and deletion requests have identity-verification and escalation procedures.
- [ ] Confirm vendor/data-processor contracts and subprocessors are documented.
- [ ] Confirm insurance, tax, consumer-protection, accessibility, marketing, and product-safety review is complete.
- [ ] Obtain written founder approval for business decisions and written lawyer approval for publication.
- [ ] Record the final policy versions, publication date, approvers, and rollback owner.

## 2. Placeholder audit by document

The items below identify every unresolved publication placeholder or explicit completion instruction found in each document. Markdown links such as `[Terms of Service](...)` are navigation links, not unresolved placeholders.

### Privacy Policy — `privacy-policy.md`

- [ ] `DATE` — effective date.
- [ ] `DATE` — last-updated date.
- [ ] `legal entity name` — legal entity operating Grolo.
- [ ] `Confirm whether local law requires a different disclosure.` — validate the statement that Grolo does not sell personal information for money.
- [ ] `privacy email` — privacy-rights request contact.
- [ ] `AGE` — minimum age and digital-consent age treatment.
- [ ] `ADDRESS` — mailing/contact address.
- [ ] `PRIVACY EMAIL` — privacy contact, and DPO/privacy-officer identity if required.
- [ ] Confirm launch countries, province/state, country, jurisdiction, legal bases/rights disclosures, processors, cross-border transfer mechanism, and retention schedule even though they are described as policy decisions rather than bracketed fields.

### Terms of Service — `terms-of-service.md`

- [ ] `DATE` — effective date.
- [ ] `legal entity name` — operating legal entity.
- [ ] `AGE` — eligibility minimum.
- [ ] `support channel` — moderation/enforcement appeal contact.
- [ ] `amount or fees paid in prior 12 months` — liability cap.
- [ ] `Insert governing law, venue, mandatory arbitration/class-action language only after counsel review.` — dispute-resolution terms.
- [ ] `legal entity name` — contact identity.
- [ ] `legal email` — general legal/support contact.
- [ ] `address` — legal mailing address.
- [ ] Finalize the cash/e-transfer-only language or identify the payment processor and applicable payment terms.
- [ ] Confirm province/state, country, jurisdiction, launch countries, consumer-law carve-outs, and governing courts.

### Community Guidelines — `community-guidelines.md`

- [ ] `DATE` — effective date.
- [ ] `safety email` — reporting and safety contact.
- [ ] Confirm jurisdiction-specific prohibited goods, emergency/law-enforcement escalation, response ownership, and appeal route.

### Seller Agreement — `seller-agreement.md`

- [ ] `DATE` — effective date.
- [ ] `Insert any Grolo fees, tax collection, invoicing, payout, and payment-provider terms before launch.` — seller commercial/payment terms.
- [ ] `support channel` — seller enforcement appeal contact.
- [ ] Confirm legal entity, province/state, country, governing jurisdiction, seller tax responsibilities, payment method, fees, payout timing, refunds, records, and seller acceptance/version capture.

### Acceptable Use Policy — `acceptable-use-policy.md`

- [ ] `DATE` — effective date.
- [ ] `abuse/safety email` — violation reporting contact.
- [ ] Confirm country/province/state-specific prohibited categories, regulated goods, law-enforcement escalation, and response process.

### Refund / Cancellation Policy — `refund-cancellation-policy.md`

- [ ] `DATE` — effective date.
- [ ] `X days` — buyer notice/evidence window.
- [ ] `support channel` — dispute and safety support contact.
- [ ] Complete the explicit pre-launch instruction for refund deadlines, payment-provider workflow, seller obligations, statutory rights by jurisdiction, high-risk goods exceptions, and chargeback handling.
- [ ] Decide and publish whether cash/e-transfer is the only launch payment method; if not, identify processor, refund timing, fees, and dispute process.
- [ ] Confirm province/state, country, jurisdiction, and consumer cooling-off/withdrawal rights.

### Marketplace Safety Policy — `marketplace-safety-policy.md`

- [ ] `DATE` — effective date.
- [ ] `Counsel should tailor this list to launch jurisdictions and product categories.` — finalize prohibited goods/services by jurisdiction and category.
- [ ] `safety email/phone` — user safety reporting contact.
- [ ] `safety contact` — seller incident/recall contact.
- [ ] Confirm emergency, law-enforcement, recall, incident-response, record-retention, and jurisdiction-specific safety processes.

### Copyright / DMCA Process — `copyright-dmca-process.md`

- [ ] `DATE` — effective date.
- [ ] `designated copyright email and postal address` — complaint submission contact.
- [ ] `NAME / ENTITY / EMAIL / ADDRESS` — designated copyright/DMCA agent details.
- [ ] Confirm company/legal entity, mailing address, country, jurisdiction, DMCA applicability, counter-notice process, repeat-infringer standard, and response/record-retention schedule.

### Account Deletion Policy — `account-deletion-policy.md`

- [ ] `DATE` — effective date.
- [ ] `in-app path` — working deletion request location.
- [ ] `account support email` — account deletion support contact.
- [ ] `retention period` — transaction, tax, fraud, safety, moderation, dispute, security, and legal records.
- [ ] `X days` — request acknowledgement target.
- [ ] `Y days` — ordinary completion target.
- [ ] Confirm backup rotation period, legal-hold process, content treatment, identity verification, appeal route, country/jurisdiction rights, and deletion exceptions.

### User-Generated Content Moderation Policy — `ugc-moderation-policy.md`

- [ ] `DATE` — effective date.
- [ ] `appeal channel` — moderation appeal submission channel.
- [ ] `X days` — appeal deadline.
- [ ] `retention period` — moderation-record retention schedule.
- [ ] Confirm jurisdiction-specific notice/appeal requirements, reviewer independence, automated-decision disclosures, reporter privacy, law-enforcement escalation, and account/content restoration rules.

## 3. Founder review checklist

- [ ] Confirm Grolo’s business model and user-to-user marketplace role.
- [ ] Confirm launch country, province/state, city, and operating entity.
- [ ] Approve public-facing company name, address, support email, privacy email, safety contact, and copyright contact.
- [ ] Approve minimum age and whether minors can use any feature.
- [ ] Approve cash/e-transfer-only launch scope or payment-processor scope.
- [ ] Approve seller fees, taxes, payouts, refunds, cancellations, and chargebacks.
- [ ] Approve prohibited product categories and safety escalation ownership.
- [ ] Approve retention schedule, deletion timelines, backup handling, and legal holds.
- [ ] Approve moderation enforcement levels, appeal channel, and response targets.
- [ ] Approve publication surfaces and acceptance/version-record requirements.
- [ ] Confirm operational owners can monitor every published contact channel.
- [ ] Sign off on final values in `legal-publication-config.example.env`.

**Founder approver:** ____________________  **Date:** __________

## 4. Lawyer review checklist

- [ ] Confirm entity, agency, marketplace-intermediary, seller-of-record, and payment-facilitator characterization.
- [ ] Confirm governing law, venue, arbitration/class-action language, liability limits, indemnity needs, and mandatory-law exceptions.
- [ ] Review privacy-law coverage for every launch country, including notice, consent, legal basis, rights, children, sensitive data, processors, transfers, breach response, and retention.
- [ ] Review consumer-protection, e-commerce, refund, cancellation, cooling-off, pricing, promotion, tax, and seller-disclosure requirements.
- [ ] Review product-safety, recall, regulated-goods, accessibility, advertising, and local marketplace obligations.
- [ ] Review cash/e-transfer risk allocation and any future payment-provider terms.
- [ ] Review copyright/DMCA applicability, designated-agent registration/publication, notice, counter-notice, and repeat-infringer process.
- [ ] Review moderation, notice, appeal, transparency, reporter privacy, automated decision, and law-enforcement requirements.
- [ ] Review account deletion, retention, legal holds, backups, and content-attribution treatment.
- [ ] Confirm all bracketed placeholders and qualitative completion instructions are resolved or intentionally removed before publication.
- [ ] Approve final policy text, effective dates, translations, and publication locations.

**Lawyer/firm:** ____________________  **Date:** __________

## 5. Final publication record

- **Final policy version/date:** ____________________
- **Production publication date:** ____________________
- **Founder approval reference:** ____________________
- **Lawyer approval reference:** ____________________
- **Release owner:** ____________________
- **Rollback owner:** ____________________
- **Next review date:** ____________________
