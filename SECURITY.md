# Security Policy

- Target: OWASP ASVS L2 coverage posture.
- Report vulnerabilities to security@flowfoundry.example. We triage within 48 hours.
- Never include secrets in logs; all secrets are stored in sealed boxes (libsodium SecretBox) at rest.
- We run CodeQL, Trivy, npm audit (prod only), and gitleaks in CI. See `.github/workflows/ci.yml`.
