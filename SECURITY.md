# Security Policy

## Supported Versions

This repository publishes the current `main` branch to GitHub Pages. Security fixes are applied to `main`; historical versions are not maintained separately.

## Reporting a Vulnerability

Please do not open a public issue for suspected vulnerabilities.

Use GitHub's private vulnerability reporting flow for this repository:

1. Open the repository on GitHub.
2. Go to **Security** → **Advisories** → **Report a vulnerability**.
3. Include a concise description, reproduction steps, affected paths, and any proof-of-concept details.

If private vulnerability reporting is unavailable, contact the repository owner directly through GitHub.

## Scope

In scope:

- Exposed secrets or credentials
- GitHub Actions / supply-chain risks
- Dependency vulnerabilities that affect the deployed site or build pipeline
- Cross-site scripting or content-injection issues on the published site
- Accidental exposure of private files, absolute local paths, or non-public data

Out of scope:

- Social engineering
- Denial-of-service testing
- Automated scanner noise without a reproducible impact
- Issues requiring access to private systems or accounts without authorization

## Expectations

- Provide enough detail for reproduction and triage.
- Do not access, modify, exfiltrate, or destroy data that is not yours.
- Do not perform disruptive testing against the live site.
- Allow reasonable time for triage before public disclosure.

## Maintainer Response

Security reports are triaged by severity and exploitability. Confirmed high-impact issues are prioritized for a fix on `main`, followed by a GitHub Pages deployment and verification.
