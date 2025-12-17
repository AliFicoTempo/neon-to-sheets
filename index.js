import pg from "pg";
import { GoogleSpreadsheet } from "google-spreadsheet";

const { Pool } = pg;

// 1. POSTGRESQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 2. GOOGLE CREDENTIALS
const rawCreds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

const creds = {
  client_email: rawCreds.client_email,
  private_key: rawCreds.private_key.replace(/\\n/g, "\n"),
};

// 3. INIT SPREADSHEET (INI KUNCI v4)
const doc = new GoogleSpreadsheet(process.env.SHEET_ID, creds);

async function sync() {
  console.log("START SYNC");

  await doc.loadInfo();
  console.log("SPREADSHEET:", doc.title);

  // TARGET SHEET
  let sheet = doc.sheetsByTitle["PostgreSQL"];
  if (!sheet) {
    sheet = await doc.addSheet({ title: "PostgreSQL" });
  }

  // QUERY SESUAI STRUKTUR DB ANDA
  const query = `
    SELECT
      nik_driver,
      nama_driver,
      tanggal,
      shipment_code
    FROM shipment
    LIMIT 50
  `;

  const result = await pool.query(query);

  console.log("ROW COUNT:", result.rows.length);
  console.log("FIRST ROW:", result.rows[0]);

  if (result.rows.length === 0) {
    console.log("NO DATA FROM DATABASE");
    return;
  }

  // WRITE TO SHEET
  await sheet.clear();
  await sheet.setHeaderRow([
    "nik_driver",
    "nama_driver",
    "tanggal",
    "shipment_code"
  ]);
  await sheet.addRows(result.rows);

  console.log("DATA WRITTEN SUCCESSFULLY");
}

sync().catch((err) => {
  console.error("SYNC FAILED:", err);
});
