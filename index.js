import pg from "pg";
import { GoogleSpreadsheet } from "google-spreadsheet";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const doc = new GoogleSpreadsheet(
  process.env.SHEET_ID,
  JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT)
);

async function sync() {
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];

  const { rows } = await pool.query(`
    SELECT *
    FROM shipments
    ORDER BY created_at DESC
  `);

  if (!rows.length) return;

  await sheet.clear();
  await sheet.setHeaderRow(Object.keys(rows[0]));
  await sheet.addRows(rows);

  console.log("SYNC OK");
}

sync();
