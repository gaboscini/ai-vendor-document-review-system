# Security

## Reporting

Report suspected vulnerabilities privately through GitHub Security Advisories. Do not include credentials, customer documents, personal data, or exploit details in public issues.

## Demonstration boundary

This repository uses synthetic documents and deterministic demo responses. Do not upload confidential vendor documents to an untrusted deployment. A production implementation must add an identity provider, tenant-scoped authorization, encrypted object storage, managed secrets, retention controls, malware scanning, audit-log export, and organization-specific legal review.

## Secrets

Copy `.env.example` to `.env` and provide secrets locally. Never commit API keys, database passwords, access tokens, signed URLs, or document contents from a real assessment.

