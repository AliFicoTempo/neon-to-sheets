import pg from "pg";
import { GoogleSpreadsheet } from "google-spreadsheet";

const { Pool } = pg;

// 1. KONEKSI POSTGRESQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 2. AUTH GOOGLE
const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const doc = new GoogleSpreadsheet(process.env.SHEET_ID);

async function sync() {
  console.log("START SYNC");

  await doc.useServiceAccountAuth({
    client_email: creds.client_email,
    private_key: creds.private_key.replace(/\\n/g, "\n"),
  });

  await doc.loadInfo();
  console.log("SPREADSHEET LOADED:", doc.title);

  // 3. TARGET SHEET PASTI
  let sheet = doc.sheetsByTitle["PostgreSQL"];
  if (!sheet) {
    sheet = await doc.addSheet({ title: "PostgreSQL" });
  }

  // 4. QUERY SESUAI STRUKTUR ASLI
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

  // 5. TULIS KE SHEET
  await sheet.clear();
  await sheet.setHeaderRow([
    "nik_driver",
    "nama_driver",
    "tanggal",
    "shipment_code"
  ]);
  await sheet.addRows(result.rows);

  console.log("DATA WRITTEN TO SHEET");
}

sync().catch((err) => {
  console.error("SYNC FAILED:", err);
});
