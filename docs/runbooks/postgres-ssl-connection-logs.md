# Runbook: Postgres SSL connection log noise

This runbook explains a class of PostgreSQL log lines that frequently show up
flagged as "errors" in hosting dashboards, even though they do **not** indicate
a problem with the database or with Atriax.

## Symptom

The production Postgres log (and the hosting dashboard's "error lines" view)
shows entries like:

```
LOG:  received direct SSL connection request without ALPN protocol negotiation extension
LOG:  could not accept SSL connection: no application protocol
```

Typically they arrive in a short burst with sequential backend PIDs, e.g.:

```
2026-06-16 21:54:04.379 UTC [21229] LOG:  received direct SSL connection request without ALPN protocol negotiation extension
2026-06-16 21:54:05.050 UTC [21230] LOG:  could not accept SSL connection: no application protocol
2026-06-16 21:54:05.086 UTC [21231] LOG:  could not accept SSL connection: no application protocol
2026-06-16 21:54:05.131 UTC [21232] LOG:  could not accept SSL connection: no application protocol
```

## What it actually means

- These lines are severity `LOG:` (informational), **not** `ERROR:`,
  `WARNING:`, or `FATAL:`. They do not affect stored data and nothing crashed.
- They describe **failed TLS handshakes** on the Postgres port:
  - `received direct SSL connection request without ALPN protocol negotiation extension`
    — a client opened a raw TLS connection (a TLS `ClientHello` as the first
    bytes) but included no ALPN extension at all.
  - `could not accept SSL connection: no application protocol` — the OpenSSL
    ALPN callback rejected the handshake because the client did not advertise
    the `postgresql` protocol.
- Both come from **direct SSL negotiation**, a feature introduced in
  **PostgreSQL 17**. PG 17 expects direct-TLS clients to negotiate via ALPN; a
  TLS client that does not speak the `postgresql` ALPN is rejected with exactly
  these messages.

> Note: because these messages only exist in PostgreSQL 17+, seeing them
> confirms production runs PG 17. The local `docker-compose.yml` pins
> `postgres:15-alpine`, so the production database is a separate managed
> instance, not the compose-defined one.

## Is Atriax the cause?

Almost certainly **no**:

- The backend connects through `node-postgres` (`pg`) in
  `backend/src/db/connect.ts`. `pg` uses the **traditional** `SSLRequest`
  negotiation, not direct SSL, so it never triggers the "direct SSL connection
  request" path.
- If the application could not connect, the `pool.on('error')` handler would
  log `Database connection error` and the app would be down.

The fingerprint — a burst of sequential PIDs within ~1 second, raw TLS with
no/wrong ALPN — is the classic signature of something **probing the port**
rather than a real Postgres client:

- platform TCP/TLS **health checks** hitting the SSL port (common, benign),
- **uptime monitors / security scanners** performing a TLS handshake,
- a misconfigured service pointing an **HTTPS/TLS client** at the DB host:port.

## How to investigate

1. **Confirm it is just noise.** Check the backend logs around the same
   timestamps for `Database connection error`. If the application is healthy
   (no such errors), these are external probes and are safe to ignore.
2. **If a real client is failing to connect**, fix that client to use
   `sslnegotiation=postgres` (the default) instead of `sslnegotiation=direct`,
   or upgrade it to a libpq that supports ALPN.
3. **Security hygiene.** These probes confirm the Postgres port is publicly
   reachable. If public access is not required, restrict the port to a private
   network or an IP allowlist on the host, which removes the probes entirely.

## Can the log lines be suppressed?

Not selectively. Silencing them would require turning off connection logging
broadly (e.g. lowering `log_connections` / general log verbosity), which is not
worth losing the diagnostic signal. The recommended action is to ignore them
once they are confirmed to be external probes.

## Related: checkpoint log lines

Lines such as `checkpoint starting: time` and `checkpoint complete: ...` are
also `LOG:` severity and are **normal, healthy** housekeeping emitted when
`log_checkpoints` is on (default since PG 15). They are not errors either.
