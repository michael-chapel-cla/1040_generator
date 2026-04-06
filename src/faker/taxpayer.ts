/**
 * FakeTaxpayer — the central identity model.
 * Every field on every form resolves from a single instance so SSN, name,
 * and address are consistent across the entire submission.
 */

export interface Dependent {
  firstName: string;
  lastName: string;
  ssn: string;
  relationship: "Child" | "Parent" | "Sibling" | "Other";
  birthYear: number;
  monthsInHome: number;
  qualifiesChildTaxCredit: boolean;
  qualifiesOtherDependent: boolean;
}

export interface W2Record {
  employerName: string;
  employerEin: string;
  employerStreet: string;
  employerCity: string;
  employerState: string;
  employerZip: string;
  wages: number;                  // Box 1
  federalWithheld: number;        // Box 2
  socialSecurityWages: number;    // Box 3
  ssWithheld: number;             // Box 4
  medicareWages: number;          // Box 5
  medicareWithheld: number;       // Box 6
  stateWages: number;             // Box 16
  stateWithheld: number;          // Box 17
  stateCode: string;              // Box 15
}

export interface Interest1099 {
  payerName: string;
  payerTin: string;
  interestIncome: number;
  earlyWithdrawalPenalty: number;
  usSavingsBondInterest: number;
}

export interface Dividend1099 {
  payerName: string;
  payerTin: string;
  ordinaryDividends: number;
  qualifiedDividends: number;
  totalCapitalGain: number;
}

export type FilingStatus = "Single" | "MFJ" | "MFS" | "HOH" | "QSS";

export interface FakeTaxpayer {
  seed: number;
  taxYear: number;

  // Primary identity
  firstName: string;
  middleInitial: string;
  lastName: string;
  ssn: string;               // XXX-XX-XXXX
  dateOfBirth: string;       // MM/DD/YYYY
  occupation: string;
  phone: string;             // (XXX) XXX-XXXX

  // Address
  streetAddress: string;
  aptNumber: string | null;
  city: string;
  state: string;             // 2-letter
  zipCode: string;

  // Spouse
  filingStatus: FilingStatus;
  spouseFirstName: string | null;
  spouseLastName: string | null;
  spouseSSN: string | null;
  spouseDateOfBirth: string | null;
  spouseOccupation: string | null;

  // Dependents
  dependents: Dependent[];

  // Banking
  routingNumber: string;
  accountNumber: string;
  accountType: "Checking" | "Savings";

  // Income documents
  w2Records: W2Record[];
  interest1099s: Interest1099[];
  dividend1099s: Dividend1099[];

  // Computed income totals
  totalWages: number;
  totalInterest: number;
  totalDividends: number;
  totalQualifiedDividends: number;
  businessIncome: number | null;
  rentalIncome: number | null;
  capitalGains: number | null;
  socialSecurityBenefits: number | null;

  // Deductions
  takesStandardDeduction: boolean;
  itemizedDeductionTotal: number | null;

  // Preparer
  preparerPtin: string | null;
}
