# Old Service Research (WordPress)

This folder contains read-only findings collected from the old WordPress service (FTP + SQL).

## What was done

- Verified WordPress files still exist on FTP under `public_html`.
- Installed SQL client locally (`mariadb-client`) to query old WP database in read-only mode.
- Queried WP + WPML tables to locate old Italian content related to `pellegrinaggi`.

## Key conclusion for Italian content

- There is **no published Italian page** with slug `pellegrinaggi` in old WP.
- Search across published Italian content containing `pellegrin` points to one page:
  - `ID=8036`, slug `servizi`, title `Servizi`.
- The old Italian `Servizi` page content includes the `Pellegrinaggi` section and service blocks.

## Important evidence files

- `sql-connection-check.txt`: DB connectivity check timestamp.
- `all-it-published-pages.tsv`: all published Italian pages found in old WP.
- `it-published-any-pellegrin.tsv`: all published Italian entries with `pellegrin*` match.
- `it-target-page.tsv`: canonical old Italian page that contains `Pellegrinaggi` content (`servizi`).
- `it-servizi-content.raw.txt`: raw WP post_content from old page `ID=8036`.
- `it-servizi-titles.txt`: extracted service block titles from old `Servizi` content.
- `search-pellegrin-with-lang.tsv`: broader match list with language metadata.
- `wpml-pielgrzymki-origin.tsv`: source mapping for PL page `pielgrzymki`.
- `wpml-pielgrzymki-translations.tsv`: WPML translations for that PL page (no Italian translation found).

## WPML finding

For WPML group of `pielgrzymki`:

- `pl`: `pielgrzymki`
- `en`: `pielgrzymki`
- missing `it`

This explains why old Italian content around pilgrimages lived in `Servizi` instead of a dedicated `pellegrinaggi` page.
