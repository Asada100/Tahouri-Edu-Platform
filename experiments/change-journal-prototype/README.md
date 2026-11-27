# Browser Change Journal prototype

This isolated harness runs against the browser's real `window.localStorage` through a Storage-compatible adapter.

## Run

Open `index.html` in a modern browser from this directory (or serve this directory with any static HTTP server). The page runs six tests on load and has a button to rerun them.

## Safety

- Uses only keys prefixed with `Tahouri_ChangeJournal_BrowserTest:`.
- Clears only its own test namespace after each test.
- Does not import or modify production/student profile keys.
- Failure injection simulates interruption at selected localStorage writes; it does not forcibly terminate the browser process.
- This is a prototype harness, not integration with Tahouri's production storage or sync pipeline.
