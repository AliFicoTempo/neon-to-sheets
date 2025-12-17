import pg from "pg";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const { Pool } = pg;

/* ===============================
   POSTGRESQL CONNECTION
================================ */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/* ===============================
   GOOGLE AUTH (INI KUNCI)
================================ */
const rawCreds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

const auth = new JWT({
  email: rawCreds.client_email,
  key: rawCreds.private_key.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

/* ===============================
   SPREADSHEET INIT
================================ */
const doc = new GoogleSpreadsheet(process.env.SHEET_ID, auth);

async function sync() {
  console.log("START SYNC");

  await doc.loadInfo();
  console.log("SPREADSHEET:", doc.title);

  /* TARGET SHEET */
  let sheet = doc.sheetsByTitle["PostgreSQL"];
  if (!sheet) {
    sheet = await doc.addSheet({ title: "PostgreSQL" });
  }

  /* QUERY SESUAI DB ANDA */
  const result = await pool.query(`
    SELECT
      nik_driver,
      nama_driver,
      tanggal,
      shipment_code
    FROM shipment
  `);

  console.log("ROW COUNT:", result.rows.length);
  console.log("FIRST ROW:", result.rows[0]);

  if (result.rows.length === 0) {
    console.log("NO DATA FROM DATABASE");
    return;
  }

  /* WRITE DATA */
  await sheet.clear();
  await sheet.setHeaderRow([
    "nik_driver",
    "nama_driver",
    "tanggal",
    "shipment_code",
  ]);
  await sheet.addRows(result.rows);

  console.log("DATA WRITTEN SUCCESSFULLY");
}

sync().catch((err) => {
  console.error("SYNC FAILED:", err);
});
