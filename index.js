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
   GOOGLE AUTH (JWT)
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

/* ===============================
   DATE FORMATTER
================================ */
function formatDate(dateValue) {
  if (!dateValue) return "";

  const d = new Date(dateValue);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/* ===============================
   MAIN SYNC
================================ */
async function sync() {
  console.log("START SYNC");

  await doc.loadInfo();
  console.log("SPREADSHEET:", doc.title);

  let sheet = doc.sheetsByTitle["PostgreSQL"];
  if (!sheet) {
    sheet = await doc.addSheet({ title: "PostgreSQL" });
  }

  const result = await pool.query(`
    SELECT
      nik_driver,
      nama_driver,
      tanggal,
      shipment_code
    FROM shipment
    ORDER BY tanggal ASC
  `);

  console.log("ROW COUNT:", result.rows.length);

  if (result.rows.length === 0) {
    console.log("NO DATA FROM DATABASE");
    return;
  }

  const rows = result.rows.map((row) => ({
    nik_driver: row.nik_driver,
    nama_driver: row.nama_driver,
    tanggal: formatDate(row.tanggal),
    shipment_code: row.shipment_code,
  }));

  await sheet.clear();
  await sheet.setHeaderRow([
    "nik_driver",
    "nama_driver",
    "tanggal",
    "shipment_code",
  ]);
  await sheet.addRows(rows);

  console.log("DATA WRITTEN SUCCESSFULLY");
}

/* ===============================
   EXECUTE
================================ */
sync()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("SYNC FAILED:", err);
    process.exit(1);
  });
