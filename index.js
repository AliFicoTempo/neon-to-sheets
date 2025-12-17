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
  const sheet = doc.sheetsByIndex[0];

  const { rows } = await pool.query(`
    SELECT *
    FROM shipment
    ORDER BY tanggal ASC
  `);

  if (!rows.length) return;

  await sheet.clear();
  await sheet.setHeaderRow(Object.keys(rows[0]));
  await sheet.addRows(rows);

  console.log("SYNC OK");
}

sync().catch(console.error);
