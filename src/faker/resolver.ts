import { Faker, en } from "@faker-js/faker";
import { FieldDefinition } from "../templates/schema";
import { FieldType } from "../templates/classifier";
import { FakeTaxpayer } from "./taxpayer";

const faker = new Faker({ locale: [en] });

function fmt(n: number | null | undefined): string {
  if (n == null) return "";
  return n.toFixed(2);
}

/**
 * Resolves a single FieldDefinition to a string value using the taxpayer data.
 * Uses the XFA labelHint for context-aware resolution (e.g. which dependent, spouse vs self).
 */
export function resolveField(field: FieldDefinition, taxpayer: FakeTaxpayer): string {
  faker.seed(taxpayer.seed + hashStr(field.pdfFieldName));

  if (field.fakerOverride) {
    const val = resolvePath(taxpayer as unknown, field.fakerOverride);
    if (val !== undefined) return String(val ?? "");
  }

  return resolveByType(field.fieldType, taxpayer, field);
}

function resolveByType(type: FieldType, t: FakeTaxpayer, field: FieldDefinition): string {
  const label = (field.labelHint ?? "").toLowerCase();

  switch (type) {
    // ── Identity numbers ──────────────────────────────────────────────────
    case "ssn": {
      // Spouse SSN
      if (/spouse/.test(label)) return t.spouseSSN ?? t.ssn;
      // Dependent SSN — "column: dependent N"
      const depIdx = dependentIndex(label);
      if (depIdx >= 0) return t.dependents[depIdx]?.ssn ?? "";
      return t.ssn;
    }
    case "itin":         return t.ssn;
    case "ein":
    case "employer_ein": {
      // Use second W-2 employer EIN if label mentions second employer
      if (/employer 2|second employer/.test(label)) return t.w2Records[1]?.employerEin ?? fakeEIN();
      return t.w2Records[0]?.employerEin ?? fakeEIN();
    }
    case "payer_tin":    return t.interest1099s[0]?.payerTin ?? fakeEIN();
    case "ptin":         return t.preparerPtin ?? `P${faker.string.numeric(8)}`;
    case "ip_pin":       return faker.string.numeric(6);

    // ── Names ─────────────────────────────────────────────────────────────
    case "first_name": {
      if (/spouse/.test(label)) return t.spouseFirstName ?? faker.person.firstName();
      const depIdx = dependentIndex(label);
      if (depIdx >= 0) return t.dependents[depIdx]?.firstName ?? "";
      return t.firstName;
    }
    case "last_name": {
      if (/spouse/.test(label)) return t.spouseLastName ?? t.lastName;
      const depIdx = dependentIndex(label);
      if (depIdx >= 0) return t.dependents[depIdx]?.lastName ?? "";
      return t.lastName;
    }
    case "full_name": {
      if (/spouse/.test(label)) return `${t.spouseFirstName ?? ""} ${t.spouseLastName ?? t.lastName}`.trim();
      if (/designee|third.party|third party/.test(label)) return faker.person.fullName();
      if (/preparer|firm/.test(label)) return faker.person.fullName();
      return `${t.firstName} ${t.middleInitial} ${t.lastName}`;
    }
    case "employer_name": {
      if (/employer 2|second/.test(label)) return t.w2Records[1]?.employerName ?? faker.company.name();
      return t.w2Records[0]?.employerName ?? faker.company.name();
    }
    case "payer_name":    return t.interest1099s[0]?.payerName ?? faker.company.name();
    case "entity_name":
    case "business_name": return faker.company.name();

    // ── Address ───────────────────────────────────────────────────────────
    case "street_address": {
      // Apt / suite number
      if (/apt\.?\s*(no|num)|suite\b|unit\b/.test(label)) return t.aptNumber ?? "";
      // Foreign province / postal
      if (/foreign province|foreign postal/.test(label)) return "";
      // Employer or payer address
      if (/employer|payer|firm/.test(label)) return t.w2Records[0]?.employerStreet ?? faker.location.streetAddress();
      return t.streetAddress;
    }
    case "city": {
      if (/employer|payer|firm/.test(label)) return t.w2Records[0]?.employerCity ?? faker.location.city();
      return t.city;
    }
    case "state": {
      if (/foreign province/.test(label)) return "";
      if (/employer|payer|firm/.test(label)) return t.w2Records[0]?.employerState ?? t.state;
      return t.state;
    }
    case "zip_code": {
      if (/foreign postal/.test(label)) return "";
      if (/employer|payer|firm/.test(label)) return t.w2Records[0]?.employerZip ?? t.zipCode;
      return t.zipCode;
    }
    case "country":      return "United States";

    // ── Dates ─────────────────────────────────────────────────────────────
    case "date": {
      if (/birth|born/.test(label)) return t.dateOfBirth;
      if (/spouse.*birth/.test(label)) return t.spouseDateOfBirth ?? t.dateOfBirth;
      if (/death/.test(label)) return fakeDateInYear(t.taxYear - faker.number.int({ min: 0, max: 2 }));
      // Date components (MM, DD, YYYY)
      const dob = t.dateOfBirth.split("/"); // MM/DD/YYYY
      if (/\bm\s*m\b/.test(label)) return dob[0];
      if (/\bd\s*d\b/.test(label)) return dob[1];
      if (/\by\s*y\s*y\s*y\b/.test(label)) return dob[2];
      return fakeDateInYear(t.taxYear);
    }
    case "tax_year":     return String(t.taxYear);

    // ── Contact ───────────────────────────────────────────────────────────
    case "phone_number": {
      if (/designee|third.party/.test(label)) return faker.phone.number();
      if (/preparer|firm/.test(label)) return faker.phone.number();
      return t.phone;
    }
    case "email":        return faker.internet.email({ firstName: t.firstName, lastName: t.lastName });

    // ── Banking ───────────────────────────────────────────────────────────
    case "routing_number": return t.routingNumber;
    case "account_number": return t.accountNumber;

    // ── Status / roles ────────────────────────────────────────────────────
    case "filing_status": return t.filingStatus;
    case "occupation": {
      if (/spouse/.test(label)) return t.spouseOccupation ?? faker.person.jobTitle();
      return t.occupation;
    }

    // ── Dependents ────────────────────────────────────────────────────────
    case "dependent_name": {
      const depIdx = dependentIndex(label);
      const dep = t.dependents[Math.max(0, depIdx)];
      return dep ? `${dep.firstName} ${dep.lastName}` : "";
    }
    case "dependent_ssn": {
      const depIdx = dependentIndex(label);
      return t.dependents[Math.max(0, depIdx)]?.ssn ?? "";
    }
    case "relationship": {
      const depIdx = dependentIndex(label);
      return t.dependents[Math.max(0, depIdx)]?.relationship ?? "Child";
    }

    // ── Financial ─────────────────────────────────────────────────────────
    case "dollar_amount": {
      // Use real taxpayer data where label matches known income lines
      if (/wages|salary/.test(label))       return fmt(t.totalWages);
      if (/interest/.test(label))           return fmt(t.totalInterest);
      if (/dividend/.test(label))           return fmt(t.totalDividends);
      if (/qualified dividend/.test(label)) return fmt(t.totalQualifiedDividends);
      if (/capital gain/.test(label))       return fmt(t.capitalGains);
      if (/business income|schedule c/.test(label)) return fmt(t.businessIncome);
      if (/social security|ssa/.test(label)) return fmt(t.socialSecurityBenefits);
      if (/routing/.test(label))            return t.routingNumber; // misclassified routing field
      // Generic dollar amount
      return fmt(faker.number.float({ min: 0, max: 50000, fractionDigits: 2 }));
    }
    case "percentage":
      return faker.number.float({ min: 0, max: 100, fractionDigits: 2 }).toFixed(2);
    case "shares":
      return faker.number.int({ min: 1, max: 10000 }).toString();

    // ── Form controls ─────────────────────────────────────────────────────
    case "checkbox":
      return field.required
        ? pickCheckboxOn(field)
        : faker.datatype.boolean({ probability: 0.5 }) ? pickCheckboxOn(field) : pickCheckboxOff(field);
    case "radio":
      return field.options?.[faker.number.int({ min: 0, max: (field.options.length - 1) })] ?? "1";

    // ── Signature ─────────────────────────────────────────────────────────
    case "signature":    return `${t.firstName} ${t.lastName}`;

    // ── Fallbacks ─────────────────────────────────────────────────────────
    case "generic_number":
      return faker.number.int({ min: 0, max: 99999 }).toString();
    case "generic_text":
    default:
      return faker.lorem.words(2);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract dependent index 0-3 from label text like "Column: Dependent 2." */
function dependentIndex(label: string): number {
  const m = /dependent\s+(\d)/i.exec(label) ?? /column[^.]*\.\s*(\d)/i.exec(label);
  if (!m) return -1;
  return parseInt(m[1], 10) - 1; // convert 1-based to 0-based
}

function pickCheckboxOn(field: FieldDefinition): string {
  return field.options?.find((o) => o !== "Off" && o !== "0" && o !== "false") ?? "Yes";
}

function pickCheckboxOff(field: FieldDefinition): string {
  return field.options?.find((o) => o === "Off" || o === "0") ?? "Off";
}

function fakeDateInYear(year: number): string {
  const month = faker.number.int({ min: 1, max: 12 });
  const day   = faker.number.int({ min: 1, max: 28 });
  return `${String(month).padStart(2,"0")}/${String(day).padStart(2,"0")}/${year}`;
}

function fakeEIN(): string {
  const prefixes = [10,12,11,13,14,15,16,20,21,22,23,24,25,26,27,30];
  const prefix = prefixes[faker.number.int({ min: 0, max: prefixes.length - 1 })];
  return `${prefix}-${faker.string.numeric(7)}`;
}

function resolvePath(obj: unknown, dotPath: string): unknown {
  return dotPath.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
