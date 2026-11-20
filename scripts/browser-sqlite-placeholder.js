// Build-time stand-in: the browser build replaces this with the sql.js connection
// inside src/platform/compat/sqlite-browser.ts.
export default class BetterSqlitePlaceholder {
  constructor() {
    throw new Error('better-sqlite3 is not available in the browser build');
  }
}
