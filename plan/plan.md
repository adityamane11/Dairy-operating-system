# Siddhnath Dairy – 10-Day Statement (PDF) with Bulk Entry & Fixed Rate

A new "Statement" section where the admin picks a farmer and a 10-day period, enters all milk at once if needed, sets one fixed rate for that period, and gets a PDF matching the sample statement.
The PDF is shared to the farmer on WhatsApp and replaces the old daily WhatsApp message.

## Who it's for
- **Dairy owner/admin**: makes and sends the statements.
- **Farmers**: get one clear PDF on WhatsApp every 10 days.

## Core features and experience
1. **Statement section (admin)**
   - Choose a farmer (with search) and a date range. The range defaults to the last 10 days and can be changed.
   - Shows the milk already recorded for those days.
2. **Bulk entry for the period**
   - A table with one row per day and two boxes per row: सकाळ (L) and संध्याकाळ (L).
   - Days that already have entries come pre-filled and can be edited. Empty days can be filled in.
   - Saving creates or updates the milk records for all those days in one go, so daily manual entry is not needed.
3. **Fixed rate for the period**
   - A "दर (₹/L)" box, typed in manually.
   - That one rate applies to every litre in the period, for that farmer only. It replaces the Fat/SNF-based rate for those days.
   - Other farmers and other periods keep their own rates.
4. **Advance उचल (advance taken)**
   - Lists the farmer's open advances, one line each, e.g. "Advance उचल ₹5,000 – या वेळी कापले ₹200 (बाकी ₹4,800)".
   - The admin types how much to deduct from each advance this time.
   - Total deductions are shown as "वजावट". The remaining balance on each advance is updated after the statement is saved.
5. **PDF statement (same layout as the sample)**
   - **Header**: SIDDHNATH DAIRY / सिद्धनाथ डेअरी • Milk Payment Statement / दूध पेमेंट पत्रक.
   - **Farmer details**: शेतकरी कोड, नाव, कालावधी, Saved on, Version.
   - **Milk table**: Date / तारीख, सकाळ (L), संध्याकाळ (L), एकूण (L), plus a Total row.
   - **Summary**: एकूण सकाळ, एकूण संध्याकाळ, एकूण दूध, दर, एकूण रक्कम.
   - **Advance and payment**: the Advance उचल lines, वजावट, and a big green **FINAL PAYABLE AMOUNT / देय रक्कम** box.
   - **Footer**: "Computer-generated statement… Siddhnath Dairy".
   - "Upper margin: Advance" from the sample is replaced with "Advance उचल".
6. **Send on WhatsApp**
   - "Share PDF" opens the phone's share sheet, where WhatsApp can be picked to send the file to the farmer.
   - On web, the PDF downloads instead.
7. **Saved statements history**
   - Each saved statement is kept per farmer with its period and version.
   - Editing and re-saving the same period creates version 2, 3, and so on.
   - Any saved statement can be opened and shared again.
8. **Daily WhatsApp message removed**
   - The automatic daily slip after each milk entry is turned off.
   - Daily entry itself, including the AI photo reading, stays as it is.

## User flow
Admin → Statement → pick farmer → period (last 10 days) → fill or edit morning/evening litres → enter rate → set the deduction for each advance → Preview → Save → Share PDF → WhatsApp → farmer.

## UI/UX feel
- Same gold and green brand look, with bilingual Marathi/English labels.
- Large number boxes made for quick thumb entry. The keyboard moves to the next box automatically.
- A sticky bottom bar with live totals (litres, amount, payable) and the Save & Share button.

## Implementation phases
- **Phase 1 (MVP – build now)**: everything above, i.e. the Statement section, bulk entry, fixed period rate, Advance उचल deductions, the PDF matching the sample, WhatsApp sharing, version history, and removing the daily message.
- **Phase 2**: farmers can see and download their own statements from the farmer login; one-tap statements for all farmers in a period.
- **Phase 3**: custom Fat/SNF rate chart upload as an alternative to the fixed rate; monthly and yearly summary reports.

## Assumptions
- WhatsApp sharing goes through the phone's share sheet. The farmer still has to be picked in WhatsApp, because WhatsApp doesn't allow apps to attach a file directly to a chosen contact.
- The fixed rate is entered per statement and is not remembered for later periods. It overrides the Fat/SNF rate only for that farmer's entries inside the period.
- Bulk-entered days store litres only (no Fat/SNF). A day left empty counts as 0 L.
- Statements are not fixed to exactly 10 days. Any date range can be picked, with 10 days as the default.
- Advance deductions are typed in by the admin. They can't be more than the advance balance or the gross amount.
- Real WhatsApp sending and PDF sharing work best on a published Android/iOS build. The web preview downloads the PDF instead.
