// WhatsApp slip generator + share helper
import { Linking } from "react-native";
import type { MilkEntry, PaymentSummary } from "./api";

const MONTHS_MR = [
  "जानेवारी",
  "फेब्रुवारी",
  "मार्च",
  "एप्रिल",
  "मे",
  "जून",
  "जुलै",
  "ऑगस्ट",
  "सप्टेंबर",
  "ऑक्टोबर",
  "नोव्हेंबर",
  "डिसेंबर",
];

function formatDateMr(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-").map((x) => parseInt(x, 10));
  return `${d.toString().padStart(2, "0")} ${MONTHS_MR[m - 1]} ${y}`;
}

export function buildEntrySlip(e: MilkEntry, dairyName: string): string {
  const shift = e.shift === "morning" ? "सकाळ" : "संध्याकाळ";
  return [
    `नमस्कार ${e.farmer_name} 🙏`,
    `${dairyName}`,
    ``,
    `दिनांक: ${formatDateMr(e.date)} | ${shift}`,
    `दूध: ${e.liters} लिटर`,
    `Fat: ${e.fat}% | SNF: ${e.snf}%`,
    `दर: ₹${e.rate}/लिटर`,
    `एकूण: ₹${e.amount}`,
    ``,
    `धन्यवाद! 🥛`,
  ].join("\n");
}

export function buildPaymentSlip(p: PaymentSummary, dairyName: string): string {
  return [
    `नमस्कार ${p.farmer.name} 🙏`,
    `${dairyName}`,
    ``,
    `दिनांक: ${formatDateMr(p.date_from)} ते ${formatDateMr(p.date_to)}`,
    `Farmer ID: ${p.farmer.farmer_code}`,
    ``,
    `एकूण दूध: ${p.total_liters} लिटर`,
    `सरासरी Fat: ${p.avg_fat}% | SNF: ${p.avg_snf}%`,
    `एकूण रक्कम: ₹${p.gross_amount}`,
    `उचल (Advance): ₹${p.total_advance}`,
    `─────────────`,
    `देय रक्कम: ₹${p.net_payable}`,
    ``,
    `धन्यवाद! 🥛`,
  ].join("\n");
}

export async function shareToWhatsApp(phone: string, message: string) {
  // Clean phone: keep digits only, default to 91 if 10-digit
  let p = (phone || "").replace(/[^0-9]/g, "");
  if (p.length === 10) p = "91" + p;
  const url = `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
  const can = await Linking.canOpenURL(url);
  if (can) {
    await Linking.openURL(url);
  } else {
    throw new Error("WhatsApp उघडता आले नाही");
  }
}
