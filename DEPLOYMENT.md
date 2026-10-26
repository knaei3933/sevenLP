# ShapePouch public LP deployment

This guide is for the public `/lab` application. It intentionally does not require Git operations.

## 1. Content-only / DB-less preview

DB-less mode renders `/lab` and lets visitors explore the request form. Final submissions intentionally return `503`.

```bash
npm ci
npm run build
npm run start -- -H 127.0.0.1 -p 3000
```

Do not expose DB-less mode as a production lead-capture site.

## 2. Production with persistent leads

Create a dedicated user, database directory, and absolute path outside `/tmp`.

```bash
sudo useradd --system --home /opt/shapepouch --shell /usr/sbin/nologin shapepouch || true
sudo mkdir -p /opt/shapepouch /var/lib/shapepouch
sudo chown -R shapepouch:shapepouch /opt/shapepouch /var/lib/shapepouch
sudo -u shapepouch env POUCH_PUBLIC_LEAD_DB=/var/lib/shapepouch/public-leads.db npm ci
sudo -u shapepouch env POUCH_PUBLIC_LEAD_DB=/var/lib/shapepouch/public-leads.db npm run build
```

Use `deploy/shapepouch.service` as the service definition.

Required production checks:

- `POUCH_PUBLIC_LEAD_DB` must be durable and non-`/tmp`.
- Configure filesystem/database backup and retention.
- Enable edge rate limiting and anti-bot protection.
- Publish a privacy policy covering lead fields, purpose, retention, and deletion.
- Obtain business approval for pricing samples and Japanese claims.
- Configure the final domain, TLS certificate, and `NEXT_PUBLIC_SITE_URL`.
- `NEXT_PUBLIC_SITE_URL` controls canonical metadata and `/sitemap.xml` output.

## 3. Reverse proxy

`deploy/nginx-shapepouch.conf` is a conservative reverse-proxy example. Replace certificate paths and the public domain. It includes application-level request-rate protection, but Cloudflare or another edge anti-bot service is still required before commercial launch.

## 4. Smoke tests

DB-less:

```bash
curl -I http://127.0.0.1:3000/lab
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/robots.txt
```

Production persistence:

```bash
test -s /var/lib/shapepouch/public-leads.db
curl -I http://127.0.0.1:3000/lab
curl -I http://127.0.0.1:3000/opengraph-image.png
```

Final quote release requires a valid lead submission and should be tested with synthetic business-approved data only.
