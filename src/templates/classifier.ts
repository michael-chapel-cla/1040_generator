/**
 * Classifies a PDF AcroForm field into a semantic FieldType.
 *
 * Priority:
 *   1. XFA label text  (e.g. "Your first name and middle initial.")
 *   2. Field name path (e.g. "topmostSubform[0].Page1[0].f1_14[0]")
 *   3. Structural heuristics (c1_ = checkbox, f1_ = text/number)
 */

export type FieldType =
  | "ssn"
  | "ein"
  | "itin"
  | "ptin"
  | "first_name"
  | "last_name"
  | "full_name"
  | "street_address"
  | "city"
  | "state"
  | "zip_code"
  | "country"
  | "date"
  | "tax_year"
  | "dollar_amount"
  | "phone_number"
  | "email"
  | "routing_number"
  | "account_number"
  | "filing_status"
  | "occupation"
  | "dependent_name"
  | "dependent_ssn"
  | "relationship"
  | "employer_name"
  | "employer_ein"
  | "payer_name"
  | "payer_tin"
  | "entity_name"
  | "business_name"
  | "percentage"
  | "shares"
  | "checkbox"
  | "radio"
  | "signature"
  | "ip_pin"
  | "generic_number"
  | "generic_text";

export interface Classification {
  fieldType: FieldType;
  labelHint: string;   // human-readable; stored in the template JSON
}

// ── Ordered regex rules applied to the label / field-name text ───────────────
// Each entry: [pattern, fieldType, labelHint]
// Patterns are tested against the FULL label text first, then the bare field name.
const RULES: Array<[RegExp, FieldType, string]> = [
  // ── Identity numbers ───────────────────────────────────────────────────────
  [/social security number|s\s*s\s*n\b/i,          "ssn",            "Social Security Number"],
  [/taxpayer id|tin\b/i,                            "ssn",            "Taxpayer Identification Number"],
  [/\bein\b|employer.{0,20}id.{0,20}num|employer identification number/i, "employer_ein", "Employer Identification Number"],
  [/\bitin\b/i,                                     "itin",           "ITIN"],
  [/\bptin\b|preparer.{0,20}tax.{0,20}ident/i,     "ptin",           "Preparer Tax Identification Number (PTIN)"],
  [/identity protection p\.?i\.?n|ip pin/i,        "ip_pin",         "IRS Identity Protection PIN"],

  // ── Name fields ────────────────────────────────────────────────────────────
  [/first name.{0,30}middle initial|first name and middle/i, "first_name", "First Name & Middle Initial"],
  [/spouse.{0,15}first name/i,                      "first_name",     "Spouse First Name & Middle Initial"],
  [/\blast name\b/i,                                "last_name",      "Last Name"],
  [/designee.{0,10}name|third.party.{0,10}name/i,  "full_name",      "Third-Party Designee Name"],
  [/preparer.{0,10}name|firm.{0,10}name/i,         "full_name",      "Preparer / Firm Name"],
  [/first name\b/i,                                 "first_name",     "First Name"],
  [/\byour name\b|\btaxpayer.{0,10}name\b/i,        "full_name",      "Taxpayer Name"],
  [/business name|entity name|corp.{0,10}name|org.{0,10}name|firm.{0,10}name/i, "business_name", "Business / Entity Name"],
  [/employer.{0,10}name/i,                          "employer_name",  "Employer Name"],
  [/payer.{0,10}name|recipient.{0,10}name/i,        "payer_name",     "Payer Name"],
  [/\bname\b/i,                                     "full_name",      "Name"],

  // ── Address ────────────────────────────────────────────────────────────────
  [/home address|mailing address|street address|number and street|p\.o\. box/i, "street_address", "Street Address"],
  [/apt\.?\s*(no|num)|suite\b|unit\b/i,             "street_address", "Apt / Suite Number"],
  [/city,?\s*town|city or town/i,                   "city",           "City"],
  [/\bcity\b/i,                                     "city",           "City"],
  [/\bstate\b/i,                                    "state",          "State"],
  [/zip\s*code|z\s*i\s*p\s*code|postal code/i,      "zip_code",       "ZIP Code"],
  [/foreign country|country name/i,                 "country",        "Country"],
  [/foreign province|foreign postal/i,              "street_address", "Foreign Province / Postal Code"],
  [/firm.{0,10}address|employer.{0,10}address|payer.{0,10}address/i, "street_address", "Business Address"],

  // ── Dates ──────────────────────────────────────────────────────────────────
  [/date of birth|birth date/i,                     "date",           "Date of Birth"],
  [/date of death/i,                                "date",           "Date of Death"],
  [/tax year begin|tax year end|calendar year/i,    "tax_year",       "Tax Year"],
  [/\bdate\b/i,                                     "date",           "Date"],
  [/month and day|\bm\s*m\b|\bd\s*d\b|\by\s*y\s*y\s*y\b/i, "date",  "Date Component"],
  [/2 digit year|year\b/i,                          "tax_year",       "Year"],

  // ── Contact ────────────────────────────────────────────────────────────────
  [/phone\s*(no|number|num)|telephone/i,            "phone_number",   "Phone Number"],
  [/email address/i,                                "email",          "Email Address"],

  // ── Banking ────────────────────────────────────────────────────────────────
  [/routing number/i,                               "routing_number", "Routing Number"],
  [/account number/i,                               "account_number", "Account Number"],

  // ── Status / roles ─────────────────────────────────────────────────────────
  [/filing status|single|married filing|head of household|qualifying surviving/i, "filing_status", "Filing Status"],
  [/occupation\b/i,                                 "occupation",     "Occupation"],
  [/relationship/i,                                 "relationship",   "Relationship to Taxpayer"],
  [/payer.{0,10}tin|payer.{0,10}id/i,              "payer_tin",      "Payer TIN"],
  [/employer.{0,10}ein|employer.{0,10}fed/i,        "employer_ein",   "Employer EIN"],

  // ── Dependents ─────────────────────────────────────────────────────────────
  [/dependent.{0,5}(1|2|3|4).{0,20}(first|last) name|row.*first name.*dependent/i, "dependent_name", "Dependent Name"],
  [/dependent.{0,5}(1|2|3|4).{0,20}s\s*s\s*n|row.*ssn.*dependent/i, "dependent_ssn", "Dependent SSN"],

  // ── Financial ──────────────────────────────────────────────────────────────
  [/percent|%\s*rate|\brate\b/i,                    "percentage",     "Percentage / Rate"],
  [/shares|units\b/i,                               "shares",         "Shares / Units"],
  [/wages|salary|tips|compensation|income|taxable|withheld|federal tax|state tax|withhold|deduct|credit|payment|proceeds|distribution|contribution|benefit|premium|cost basis|adjusted basis|gain|loss|interest|dividend|rent|royalt|total amount|line \d|add lines|subtract line/i,
                                                    "dollar_amount",  "Dollar Amount"],

  // ── Signatures ─────────────────────────────────────────────────────────────
  [/sign here|signature|your signature/i,           "signature",      "Signature"],
];

export function classifyField(
  fieldName: string,
  fieldType: "text" | "checkbox" | "radio" | "dropdown" | "unknown",
  xfaLabel: string = ""
): Classification {
  // Checkboxes / radios bypass label classification
  if (fieldType === "checkbox") return { fieldType: "checkbox", labelHint: xfaLabel || "Checkbox" };
  if (fieldType === "radio")    return { fieldType: "radio",    labelHint: xfaLabel || "Radio Button" };

  // ── Try XFA label first (most reliable) ─────────────────────────────────
  if (xfaLabel) {
    for (const [pattern, type, hint] of RULES) {
      if (pattern.test(xfaLabel)) {
        return { fieldType: type, labelHint: xfaLabel.slice(0, 100) };
      }
    }
  }

  // ── Fallback: bare field name ────────────────────────────────────────────
  const bare = fieldName
    .replace(/^.*\]\./, "")    // strip XFA path prefix
    .replace(/\[\d+\]$/, "")   // strip trailing index
    .toLowerCase();

  for (const [pattern, type, hint] of RULES) {
    if (pattern.test(bare) || pattern.test(fieldName)) {
      return { fieldType: type, labelHint: hint };
    }
  }

  // ── Structural heuristics ───────────────────────────────────────────────
  if (/^c\d/.test(bare)) return { fieldType: "checkbox",     labelHint: xfaLabel || "Checkbox" };
  if (/^f\d/.test(bare)) return { fieldType: "dollar_amount",labelHint: xfaLabel || "Dollar Amount" };

  return { fieldType: "generic_text", labelHint: xfaLabel || "Text Field" };
}
