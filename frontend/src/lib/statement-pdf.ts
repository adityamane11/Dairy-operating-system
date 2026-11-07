// Builds the Milk Payment Statement HTML and shares it as a PDF
import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";

import type { Statement } from "./api";
import { fmtDateTime, fmtDMY, inr } from "./dates";

const GREEN = "#2D6A35";
const GOLD = "#D4A017";
const l = (n: number) => (Math.round(n * 100) / 100).toString();

export function buildStatementHtml(s: Statement): string {
  const rows = (s.rows || [])
    .map(
      (r, i) => `<tr class="${i % 2 ? "alt" : ""}"><td>${fmtDMY(r.date)}</td><td>${l(r.morning)}</td><td>${l(r.evening)}</td><td><b>${l(r.total)}</b></td></tr>`,
    )
    .join("");
  const adv = s.advance_lines
    .map(
      (a) => `<tr><td>Advance उचल ${inr(a.amount)} <span class="muted">(${fmtDMY(a.date)}${a.note ? " · " + a.note : ""})</span><br/><span class="muted">बाकी / Balance: ${inr(a.balance_after)}</span></td><td class="r">${inr(a.deducted_now)} <span class="muted">(कापले)</span></td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  @page { margin: 18mm 14mm; }
  body { font-family: 'Noto Sans Devanagari','Mukta',Arial,sans-serif; color:#1A201C; font-size:12px; margin:0; }
  .head { text-align:center; border-bottom:3px solid ${GOLD}; padding-bottom:8px; }
  .head h1 { margin:0; color:${GREEN}; font-size:24px; letter-spacing:1px; }
  .head h2 { margin:2px 0 0; color:${GREEN}; font-size:16px; }
  .head p { margin:4px 0 0; color:#5A6660; font-size:13px; }
  .info { display:flex; justify-content:space-between; margin:12px 0; }
  .info div p { margin:3px 0; }
  .info b { color:${GREEN}; }
  table { width:100%; border-collapse:collapse; }
  .milk th { background:${GREEN}; color:#fff; padding:7px; font-size:12px; }
  .milk td { border:1px solid #E7E2D6; padding:6px; text-align:center; }
  .milk tr.alt td { background:#F7F4EC; }
  .milk tr.tot td { background:#FBF2DC; font-weight:700; border-top:2px solid ${GOLD}; }
  .sum { margin-top:14px; }
  .sum td { padding:6px 4px; border-bottom:1px dashed #E7E2D6; }
  .r { text-align:right; }
  .big td { font-size:14px; font-weight:700; color:${GREEN}; }
  .sec { margin-top:14px; font-weight:700; color:#A87A0C; font-size:13px; }
  .muted { color:#8A938E; font-size:11px; }
  .final { margin-top:16px; background:${GREEN}; color:#fff; border-radius:8px; padding:14px 16px; display:flex; justify-content:space-between; align-items:center; }
  .final .lbl { font-weight:700; font-size:14px; }
  .final .amt { font-weight:800; font-size:26px; }
  .foot { margin-top:22px; text-align:center; color:#8A938E; font-size:10px; border-top:1px solid #E7E2D6; padding-top:8px; }
</style></head><body>
<div class="head">
  <h1>SIDDHNATH DAIRY</h1><h2>सिद्धनाथ डेअरी</h2>
  <p>Milk Payment Statement / दूध पेमेंट पत्रक</p>
</div>
<div class="info">
  <div>
    <p>Farmer Code / शेतकरी कोड: <b>${s.farmer_code}</b></p>
    <p>Farmer Name / नाव: <b>${s.farmer_name}</b></p>
    <p>Payment Period / कालावधी: <b>${fmtDMY(s.date_from)} to ${fmtDMY(s.date_to)}</b></p>
  </div>
  <div style="text-align:right">
    <p>Saved on: <b>${fmtDateTime(s.created_at)}</b></p>
    <p>Version: <b>${s.version}</b></p>
  </div>
</div>
<table class="milk">
  <tr><th>Date / तारीख</th><th>Morning / सकाळ (L)</th><th>Evening / संध्याकाळ (L)</th><th>Total / एकूण (L)</th></tr>
  ${rows}
  <tr class="tot"><td>Total / एकूण</td><td>${l(s.total_morning)}</td><td>${l(s.total_evening)}</td><td>${l(s.total_liters)}</td></tr>
</table>
<table class="sum">
  <tr><td>Total Morning Milk / एकूण सकाळ</td><td class="r">${l(s.total_morning)} L</td></tr>
  <tr><td>Total Evening Milk / एकूण संध्याकाळ</td><td class="r">${l(s.total_evening)} L</td></tr>
  <tr><td>Combined Milk / एकूण दूध</td><td class="r"><b>${l(s.total_liters)} L</b></td></tr>
  <tr><td>Milk Rate / दर</td><td class="r">${inr(s.rate)} per litre</td></tr>
  <tr class="big"><td>Gross Amount / एकूण रक्कम</td><td class="r">${inr(s.gross_amount)}</td></tr>
</table>
${adv ? `<div class="sec">Advance उचल</div><table class="sum">${adv}</table>` : ""}
<table class="sum">
  <tr class="big"><td>Confirmed Deductions / वजावट</td><td class="r">${inr(s.total_deduction)}</td></tr>
</table>
<div class="final"><span class="lbl">FINAL PAYABLE AMOUNT / देय रक्कम</span><span class="amt">${inr(s.net_payable)}</span></div>
<div class="foot">Computer-generated statement from verified dairy records. · Siddhnath Dairy</div>
</body></html>`;
}

export const statementFileName = (s: Statement) =>
  `Siddhnath-Dairy-${s.farmer_code}-${s.date_from}-to-${s.date_to}-v${s.version}.pdf`;

/** Native: create PDF and open share sheet (WhatsApp). Web: open print dialog to save PDF. */
export async function shareStatementPdf(s: Statement) {
  const html = buildStatementHtml(s);
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  let shareUri = uri;
  try {
    const dest = new File(Paths.cache, statementFileName(s));
    if (dest.exists) dest.delete();
    new File(uri).copy(dest);
    shareUri = dest.uri;
  } catch {}
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing उपलब्ध नाही");
  await Sharing.shareAsync(shareUri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: `${s.farmer_name} – Statement`,
  });
}

export async function previewStatementPdf(s: Statement) {
  await Print.printAsync({ html: buildStatementHtml(s) });
}
