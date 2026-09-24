TAHOURI LICENSE API — DEVELOPMENT SERVER

This server is TEST/DEVELOPMENT ONLY.

Run:
  cd services/license-api
  npm install
  npm run generate-key
  npm start

Default:
  http://localhost:8787

Test codes:
  GRADE1-1405-TEST
  GRADE2-1405-TEST
  GRADE3-1405-TEST
  GRADE4-1405-TEST
  GRADE5-1405-TEST
  GRADE6-1405-TEST
  GRADE6-1405-TEST-A
  GRADE6-1405-TEST-B
  GRADE6-1405-TEST-C

The private signing key is intentionally NOT stored in Git.
Set:
  TAHOURI_LICENSE_PRIVATE_KEY_FILE

Production must use environment/secret storage, HTTPS, a real database,
rate limiting, authentication, audit logging and payment verification.


Persistent development storage:
  SQLite database: services/license-api/data/license.sqlite
  Override with TAHOURI_LICENSE_DB_FILE when needed.

The database persists activation-code usage across API restarts.
