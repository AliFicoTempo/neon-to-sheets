import pg from "pg";
import { GoogleSpreadsheet } from "google-spreadsheet";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

async function sync() {
  await doc.useServiceAccountAuth({
    client_email: creds.client_email,
    private_key: creds.private_key.replace(/\\n/g, "\n"),
  });

  await doc.loadInfo();

  // TARGET SHEET TEPAT
  let sheet = doc.sheetsByTitle["PostgreSQL"];
  if (!sheet) {
    sheet = await doc.addSheet({ title: "PostgreSQL" });
  }

  const { rows } = await pool.query(`
    SELECT *
    FROM shipment
    ORDER BY created_at DESC
  `);

  console.log("TOTAL ROWS:", rows.length);

  if (!rows.length) return;

  await sheet.clear();
  await sheet.setHeaderRow(Object.keys(rows[0]));
  await sheet.addRows(rows);

  console.log("SYNC SUCCESS");
}

sync().catch(console.error);
