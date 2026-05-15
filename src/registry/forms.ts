export type FormCategory =
  | "core" // 1040 main returns
  | "schedule" // Schedules attached to 1040
  | "supporting" // Individual supporting forms
  | "information_return" // W-2, 1099s, 1098s — third-party issued
  | "k1" // Schedule K-1 variants
  | "business" // 1065, 1120, 1120-S, 1041 entity returns
  | "payroll" // 941, 940, W-3, W-4, W-9 etc.
  | "fiduciary" // 706, 709, 1041, estate/trust/gift
  | "exempt_org" // 990 family
  | "excise" // 720, 2290, 730
  | "international" // 5471, 5472, 8865, 8938, FBAR adjacent
  | "admin" // Elections, disclosures, POA, extensions
  | "aca" // 1094/1095 ACA reporting
  | "retirement"; // 5498, 5500, 1095 benefit plans

export type FormSource = "irs" | "ssa";

export interface FormEntry {
  id: string;
  displayName: string;
  category: FormCategory;
  source: FormSource;
  url: string;
  description: string;
  /** false = no standalone IRS PDF exists (online-only or DOL-hosted); skip download */
  pdfAvailable?: boolean;
}

const IRS_BASE = "https://www.irs.gov/pub/irs-pdf";
const SSA_BASE = "https://www.ssa.gov/forms";

function irs(
  slug: string,
  name: string,
  cat: FormCategory,
  desc: string,
): FormEntry {
  return {
    id: slug,
    displayName: name,
    category: cat,
    source: "irs",
    url: `${IRS_BASE}/${slug}.pdf`,
    description: desc,
  };
}

export const FORM_REGISTRY: FormEntry[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // A. INDIVIDUAL INCOME TAX — CORE 1040 FAMILY
  // ═══════════════════════════════════════════════════════════════════════════

  irs("f1040", "Form 1040", "core", "U.S. Individual Income Tax Return"),
  irs("f1040sr", "Form 1040-SR", "core", "U.S. Tax Return for Seniors"),
  irs(
    "f1040nr",
    "Form 1040-NR",
    "core",
    "U.S. Nonresident Alien Income Tax Return",
  ),
  irs(
    "f1040x",
    "Form 1040-X",
    "core",
    "Amended U.S. Individual Income Tax Return",
  ),
  irs("f1040es", "Form 1040-ES", "core", "Estimated Tax for Individuals"),

  // ─── Numbered Schedules ────────────────────────────────────────────────────
  irs("f1040s1", "Schedule 1", "schedule", "Additional Income and Adjustments"),
  irs("f1040s2", "Schedule 2", "schedule", "Additional Taxes"),
  irs("f1040s3", "Schedule 3", "schedule", "Additional Credits and Payments"),

  // ─── Lettered Schedules ────────────────────────────────────────────────────
  irs("f1040sa", "Schedule A", "schedule", "Itemized Deductions"),
  irs("f1040sb", "Schedule B", "schedule", "Interest and Ordinary Dividends"),
  irs(
    "f1040sc",
    "Schedule C",
    "schedule",
    "Profit or Loss from Business (Sole Proprietorship)",
  ),
  irs("f1040sd", "Schedule D", "schedule", "Capital Gains and Losses"),
  irs("f1040se", "Schedule E", "schedule", "Supplemental Income and Loss"),
  irs("f1040sf", "Schedule F", "schedule", "Profit or Loss from Farming"),
  irs("f1040sh", "Schedule H", "schedule", "Household Employment Taxes"),
  irs(
    "f1040sj",
    "Schedule J",
    "schedule",
    "Income Averaging for Farmers and Fishermen",
  ),
  irs("f1040sse", "Schedule SE", "schedule", "Self-Employment Tax"),

  // ═══════════════════════════════════════════════════════════════════════════
  // B. INDIVIDUAL SUPPORTING FORMS
  // ═══════════════════════════════════════════════════════════════════════════

  irs("f2106", "Form 2106", "supporting", "Employee Business Expenses"),
  irs(
    "f2210",
    "Form 2210",
    "supporting",
    "Underpayment of Estimated Tax by Individuals",
  ),
  irs("f2441", "Form 2441", "supporting", "Child and Dependent Care Expenses"),
  irs("f2555", "Form 2555", "supporting", "Foreign Earned Income"),
  irs("f3903", "Form 3903", "supporting", "Moving Expenses"),
  irs(
    "f4137",
    "Form 4137",
    "supporting",
    "Social Security and Medicare Tax on Unreported Tip Income",
  ),
  irs(
    "f4562",
    "Form 4562",
    "supporting",
    "Depreciation and Amortization (Including Section 179)",
  ),
  irs("f4684", "Form 4684", "supporting", "Casualties and Thefts"),
  irs("f4797", "Form 4797", "supporting", "Sales of Business Property"),
  irs("f4835", "Form 4835", "supporting", "Farm Rental Income and Expenses"),
  irs(
    "f4868",
    "Form 4868",
    "supporting",
    "Application for Automatic Extension of Time to File",
  ),
  irs(
    "f5329",
    "Form 5329",
    "supporting",
    "Additional Taxes on Qualified Plans",
  ),
  irs(
    "f6251",
    "Form 6251",
    "supporting",
    "Alternative Minimum Tax—Individuals",
  ),
  irs("f8283", "Form 8283", "supporting", "Noncash Charitable Contributions"),
  irs("f8582", "Form 8582", "supporting", "Passive Activity Loss Limitations"),
  irs("f8606", "Form 8606", "supporting", "Nondeductible IRAs"),
  irs(
    "f8615",
    "Form 8615",
    "supporting",
    "Tax for Certain Children Who Have Unearned Income",
  ),
  irs(
    "f8812",
    "Form 8812",
    "supporting",
    "Credits for Qualifying Children and Other Dependents",
  ),
  irs(
    "f8814",
    "Form 8814",
    "supporting",
    "Parents' Election To Report Child's Interest and Dividends",
  ),
  irs(
    "f8829",
    "Form 8829",
    "supporting",
    "Expenses for Business Use of Your Home",
  ),
  irs("f8839", "Form 8839", "supporting", "Qualified Adoption Expenses"),
  irs(
    "f8863",
    "Form 8863",
    "supporting",
    "Education Credits (American Opportunity and Lifetime Learning Credits)",
  ),
  irs(
    "f8880",
    "Form 8880",
    "supporting",
    "Credit for Qualified Retirement Savings Contributions (Saver's Credit)",
  ),
  irs("f8889", "Form 8889", "supporting", "Health Savings Accounts (HSAs)"),
  irs("f8936", "Form 8936", "supporting", "Clean Vehicle Credits"),
  irs(
    "f8949",
    "Form 8949",
    "supporting",
    "Sales and Other Dispositions of Capital Assets",
  ),
  irs("f8959", "Form 8959", "supporting", "Additional Medicare Tax"),
  irs(
    "f8960",
    "Form 8960",
    "supporting",
    "Net Investment Income Tax—Individuals, Estates, and Trusts",
  ),
  irs("f8962", "Form 8962", "supporting", "Premium Tax Credit (PTC)"),
  irs(
    "f8990",
    "Form 8990",
    "supporting",
    "Limitation on Business Interest Expense Under Section 163(j)",
  ),
  irs(
    "f8995",
    "Form 8995",
    "supporting",
    "Qualified Business Income Deduction Simplified Computation",
  ),
  irs(
    "f8995a",
    "Form 8995-A",
    "supporting",
    "Deduction for Qualified Business Income (Complex)",
  ),
  irs(
    "f8997",
    "Form 8997",
    "supporting",
    "Initial and Annual Statement of Qualified Opportunity Fund Investments",
  ),
  irs(
    "f1116",
    "Form 1116",
    "supporting",
    "Foreign Tax Credit (Individual, Estate, or Trust)",
  ),

  // ═══════════════════════════════════════════════════════════════════════════
  // C. BUSINESS ENTITY RETURNS
  // ═══════════════════════════════════════════════════════════════════════════

  // Partnerships
  irs("f1065", "Form 1065", "business", "U.S. Return of Partnership Income"),
  irs(
    "f8082",
    "Form 8082",
    "business",
    "Notice of Inconsistent Treatment or AAR",
  ),
  irs(
    "f8308",
    "Form 8308",
    "business",
    "Report of a Sale or Exchange of Certain Partnership Interests",
  ),
  irs(
    "f8825",
    "Form 8825",
    "business",
    "Rental Real Estate Income and Expenses of a Partnership or S Corporation",
  ),
  irs(
    "f8865",
    "Form 8865",
    "business",
    "Return of U.S. Persons With Respect to Certain Foreign Partnerships",
  ),
  irs(
    "f8918",
    "Form 8918",
    "business",
    "Material Advisor Disclosure Statement",
  ),

  // S Corporations
  irs(
    "f1120s",
    "Form 1120-S",
    "business",
    "U.S. Income Tax Return for an S Corporation",
  ),
  irs(
    "f2553",
    "Form 2553",
    "business",
    "Election by a Small Business Corporation",
  ),
  irs(
    "f7203",
    "Form 7203",
    "business",
    "S Corporation Shareholder Stock and Debt Basis Limitations",
  ),

  // C Corporations
  irs("f1120", "Form 1120", "business", "U.S. Corporation Income Tax Return"),
  // 1120-W is a worksheet embedded in 1120 instructions, no standalone PDF
  {
    id: "f1120w",
    displayName: "Form 1120-W",
    category: "business",
    source: "irs",
    url: `${IRS_BASE}/f1120w.pdf`,
    description: "Estimated Tax for Corporations (worksheet)",
    pdfAvailable: false,
  },
  irs("f1125a", "Form 1125-A", "business", "Cost of Goods Sold"),
  irs("f1125e", "Form 1125-E", "business", "Compensation of Officers"),
  irs(
    "f2220",
    "Form 2220",
    "business",
    "Underpayment of Estimated Tax by Corporations",
  ),
  irs("f3800", "Form 3800", "business", "General Business Credit"),
  irs("f4626", "Form 4626", "business", "Alternative Minimum Tax—Corporations"),
  irs("f5884", "Form 5884", "business", "Work Opportunity Credit"),
  irs(
    "f6765",
    "Form 6765",
    "business",
    "Credit for Increasing Research Activities",
  ),
  irs(
    "f8594",
    "Form 8594",
    "business",
    "Asset Acquisition Statement Under Section 1060",
  ),
  irs("f8824", "Form 8824", "business", "Like-Kind Exchanges"),
  irs(
    "f8886",
    "Form 8886",
    "business",
    "Reportable Transaction Disclosure Statement",
  ),
  irs(
    "f8992",
    "Form 8992",
    "business",
    "U.S. Shareholder Calculation of Global Intangible Low-Taxed Income",
  ),
  irs(
    "f8993",
    "Form 8993",
    "business",
    "Section 250 Deduction for Foreign-Derived Intangible Income",
  ),
  irs("f3468", "Form 3468", "business", "Investment Credit"),
  irs("f966", "Form 966", "business", "Corporate Dissolution or Liquidation"),

  // ═══════════════════════════════════════════════════════════════════════════
  // D. FIDUCIARY / ESTATE / GIFT / TRUST
  // ═══════════════════════════════════════════════════════════════════════════

  irs(
    "f1041",
    "Form 1041",
    "fiduciary",
    "U.S. Income Tax Return for Estates and Trusts",
  ),
  irs(
    "f1041es",
    "Form 1041-ES",
    "fiduciary",
    "Estimated Income Tax for Estates and Trusts",
  ),
  irs(
    "f5227",
    "Form 5227",
    "fiduciary",
    "Split-Interest Trust Information Return",
  ),
  irs(
    "f706",
    "Form 706",
    "fiduciary",
    "United States Estate (and Generation-Skipping Transfer) Tax Return",
  ),
  irs(
    "f709",
    "Form 709",
    "fiduciary",
    "United States Gift (and Generation-Skipping Transfer) Tax Return",
  ),
  irs(
    "f8971",
    "Form 8971",
    "fiduciary",
    "Information Regarding Beneficiaries Acquiring Property from a Decedent",
  ),

  // ═══════════════════════════════════════════════════════════════════════════
  // E. EXEMPT ORGANIZATIONS / NONPROFITS
  // ═══════════════════════════════════════════════════════════════════════════

  irs(
    "f990",
    "Form 990",
    "exempt_org",
    "Return of Organization Exempt From Income Tax",
  ),
  irs(
    "f990ez",
    "Form 990-EZ",
    "exempt_org",
    "Short Form Return of Organization Exempt From Income Tax",
  ),
  irs("f990pf", "Form 990-PF", "exempt_org", "Return of Private Foundation"),
  irs(
    "f990t",
    "Form 990-T",
    "exempt_org",
    "Exempt Organization Business Income Tax Return",
  ),
  irs(
    "f1023",
    "Form 1023",
    "exempt_org",
    "Application for Recognition of Exemption Under Section 501(c)(3)",
  ),
  irs(
    "f1024",
    "Form 1024",
    "exempt_org",
    "Application for Recognition of Exemption Under Section 501(a)",
  ),
  irs(
    "f4720",
    "Form 4720",
    "exempt_org",
    "Return of Certain Excise Taxes Under Chapters 41 and 42",
  ),
  irs(
    "f8868",
    "Form 8868",
    "exempt_org",
    "Application for Extension of Time to File an Exempt Organization Return",
  ),

  // ═══════════════════════════════════════════════════════════════════════════
  // F. PAYROLL / EMPLOYMENT TAX FORMS
  // ═══════════════════════════════════════════════════════════════════════════

  // Employer returns
  irs(
    "f940",
    "Form 940",
    "payroll",
    "Employer's Annual Federal Unemployment (FUTA) Tax Return",
  ),
  irs("f941", "Form 941", "payroll", "Employer's QUARTERLY Federal Tax Return"),
  irs(
    "f941x",
    "Form 941-X",
    "payroll",
    "Adjusted Employer's QUARTERLY Federal Tax Return or Claim for Refund",
  ),
  irs(
    "f943",
    "Form 943",
    "payroll",
    "Employer's Annual Tax Return for Agricultural Employees",
  ),
  irs("f944", "Form 944", "payroll", "Employer's ANNUAL Federal Tax Return"),
  irs(
    "f945",
    "Form 945",
    "payroll",
    "Annual Return of Withheld Federal Income Tax",
  ),

  // Wage statements
  irs("fw2", "Form W-2", "payroll", "Wage and Tax Statement"),
  irs("fw2c", "Form W-2c", "payroll", "Corrected Wage and Tax Statement"),
  irs("fw2g", "Form W-2G", "payroll", "Certain Gambling Winnings"),
  irs("fw3", "Form W-3", "payroll", "Transmittal of Wage and Tax Statements"),
  irs(
    "fw3c",
    "Form W-3c",
    "payroll",
    "Transmittal of Corrected Wage and Tax Statements",
  ),

  // Withholding / setup
  irs("fw4", "Form W-4", "payroll", "Employee's Withholding Certificate"),
  irs(
    "fw4p",
    "Form W-4P",
    "payroll",
    "Withholding Certificate for Periodic Pension or Annuity Payments",
  ),
  irs(
    "fw4r",
    "Form W-4R",
    "payroll",
    "Withholding Certificate for Nonperiodic Payments and Eligible Rollover Distributions",
  ),
  irs(
    "fw7",
    "Form W-7",
    "payroll",
    "Application for IRS Individual Taxpayer Identification Number",
  ),
  irs(
    "fw9",
    "Form W-9",
    "payroll",
    "Request for Taxpayer Identification Number and Certification",
  ),

  // ═══════════════════════════════════════════════════════════════════════════
  // G. INFORMATION RETURNS — 1099 SERIES
  // ═══════════════════════════════════════════════════════════════════════════

  irs(
    "f1099a",
    "Form 1099-A",
    "information_return",
    "Acquisition or Abandonment of Secured Property",
  ),
  irs(
    "f1099b",
    "Form 1099-B",
    "information_return",
    "Proceeds from Broker and Barter Exchange Transactions",
  ),
  irs("f1099c", "Form 1099-C", "information_return", "Cancellation of Debt"),
  irs(
    "f1099div",
    "Form 1099-DIV",
    "information_return",
    "Dividends and Distributions",
  ),
  irs(
    "f1099g",
    "Form 1099-G",
    "information_return",
    "Certain Government Payments",
  ),
  irs("f1099int", "Form 1099-INT", "information_return", "Interest Income"),
  irs(
    "f1099k",
    "Form 1099-K",
    "information_return",
    "Payment Card and Third Party Network Transactions",
  ),
  irs(
    "f1099ltc",
    "Form 1099-LTC",
    "information_return",
    "Long-Term Care and Accelerated Death Benefits",
  ),
  irs(
    "f1099msc",
    "Form 1099-MISC",
    "information_return",
    "Miscellaneous Information",
  ),
  irs(
    "f1099nec",
    "Form 1099-NEC",
    "information_return",
    "Nonemployee Compensation",
  ),
  irs(
    "f1099oid",
    "Form 1099-OID",
    "information_return",
    "Original Issue Discount",
  ),
  // IRS slug for 1099-PATR is "f1099ptr" — saved to forms/ as f1099patr.pdf
  {
    id: "f1099patr",
    displayName: "Form 1099-PATR",
    category: "information_return",
    source: "irs",
    url: `${IRS_BASE}/f1099ptr.pdf`,
    description: "Taxable Distributions Received From Cooperatives",
  },
  irs(
    "f1099q",
    "Form 1099-Q",
    "information_return",
    "Payments from Qualified Education Programs",
  ),
  irs(
    "f1099r",
    "Form 1099-R",
    "information_return",
    "Distributions from Pensions, Annuities, Retirement or Profit-Sharing Plans",
  ),
  irs(
    "f1099s",
    "Form 1099-S",
    "information_return",
    "Proceeds from Real Estate Transactions",
  ),
  irs(
    "f1099sa",
    "Form 1099-SA",
    "information_return",
    "Distributions from an HSA, Archer MSA, or Medicare Advantage MSA",
  ),
  irs(
    "f1096",
    "Form 1096",
    "information_return",
    "Annual Summary and Transmittal of U.S. Information Returns",
  ),

  // ─── 1098 Series ──────────────────────────────────────────────────────────
  irs(
    "f1098",
    "Form 1098",
    "information_return",
    "Mortgage Interest Statement",
  ),
  irs(
    "f1098c",
    "Form 1098-C",
    "information_return",
    "Contributions of Motor Vehicles, Boats, and Airplanes",
  ),
  irs(
    "f1098e",
    "Form 1098-E",
    "information_return",
    "Student Loan Interest Statement",
  ),
  irs(
    "f1098f",
    "Form 1098-F",
    "information_return",
    "Fines, Penalties, and Other Amounts",
  ),
  irs("f1098t", "Form 1098-T", "information_return", "Tuition Statement"),

  // ═══════════════════════════════════════════════════════════════════════════
  // H. RETIREMENT / BENEFITS / HEALTH COVERAGE
  // ═══════════════════════════════════════════════════════════════════════════

  irs("f5498", "Form 5498", "retirement", "IRA Contribution Information"),
  // 5498-ESA not available as standalone IRS PDF
  {
    id: "f5498esa",
    displayName: "Form 5498-ESA",
    category: "retirement",
    source: "irs",
    url: `${IRS_BASE}/f5498esa.pdf`,
    description: "Coverdell ESA Contribution Information",
    pdfAvailable: false,
  },
  irs(
    "f5498sa",
    "Form 5498-SA",
    "retirement",
    "HSA, Archer MSA, or Medicare Advantage MSA Information",
  ),
  irs(
    "f5500",
    "Form 5500",
    "retirement",
    "Annual Return/Report of Employee Benefit Plan",
  ),
  // 5500-SF is filed through DOL EFAST2 system, no standalone IRS PDF
  {
    id: "f5500sf",
    displayName: "Form 5500-SF",
    category: "retirement",
    source: "irs",
    url: `${IRS_BASE}/f5500sf.pdf`,
    description:
      "Short Form Annual Return/Report of Small Employee Benefit Plan",
    pdfAvailable: false,
  },

  // ─── ACA / Health Coverage ────────────────────────────────────────────────
  irs(
    "f1094b",
    "Form 1094-B",
    "aca",
    "Transmittal of Health Coverage Information Returns",
  ),
  irs(
    "f1094c",
    "Form 1094-C",
    "aca",
    "Transmittal of Employer-Provided Health Insurance Offer and Coverage Information Returns",
  ),
  irs("f1095a", "Form 1095-A", "aca", "Health Insurance Marketplace Statement"),
  irs("f1095b", "Form 1095-B", "aca", "Health Coverage"),
  irs(
    "f1095c",
    "Form 1095-C",
    "aca",
    "Employer-Provided Health Insurance Offer and Coverage",
  ),

  // ═══════════════════════════════════════════════════════════════════════════
  // I. INTERNATIONAL / FOREIGN REPORTING
  // ═══════════════════════════════════════════════════════════════════════════

  irs(
    "f926",
    "Form 926",
    "international",
    "Return by a U.S. Transferor of Property to a Foreign Corporation",
  ),
  irs(
    "f1042",
    "Form 1042",
    "international",
    "Annual Withholding Tax Return for U.S. Source Income of Foreign Persons",
  ),
  irs(
    "f3520",
    "Form 3520",
    "international",
    "Annual Return To Report Transactions With Foreign Trusts",
  ),
  irs(
    "f3520a",
    "Form 3520-A",
    "international",
    "Annual Information Return of Foreign Trust With a U.S. Owner",
  ),
  irs(
    "f5471",
    "Form 5471",
    "international",
    "Information Return of U.S. Persons With Respect To Certain Foreign Corporations",
  ),
  irs(
    "f5472",
    "Form 5472",
    "international",
    "Information Return of a 25% Foreign-Owned U.S. Corporation",
  ),
  irs("f5713", "Form 5713", "international", "International Boycott Report"),
  irs(
    "f8288",
    "Form 8288",
    "international",
    "U.S. Withholding Tax Return for Certain Dispositions by Foreign Persons",
  ),
  irs(
    "f8288a",
    "Form 8288-A",
    "international",
    "Statement of Withholding on Certain Dispositions by Foreign Persons",
  ),
  irs(
    "f8621",
    "Form 8621",
    "international",
    "Information Return by a Shareholder of a PFIC or QEF",
  ),
  irs(
    "f8804",
    "Form 8804",
    "international",
    "Annual Return for Partnership Withholding Tax (Section 1446)",
  ),
  irs(
    "f8805",
    "Form 8805",
    "international",
    "Foreign Partner's Information Statement of Section 1446 Withholding Tax",
  ),
  irs(
    "f8833",
    "Form 8833",
    "international",
    "Treaty-Based Return Position Disclosure",
  ),
  irs(
    "f8843",
    "Form 8843",
    "international",
    "Statement for Exempt Individuals and Individuals with a Medical Condition",
  ),
  irs(
    "f8854",
    "Form 8854",
    "international",
    "Initial and Annual Expatriation Statement",
  ),
  irs(
    "f8938",
    "Form 8938",
    "international",
    "Statement of Specified Foreign Financial Assets",
  ),
  irs(
    "f8991",
    "Form 8991",
    "international",
    "Tax on Base Erosion Payments of Taxpayers With Substantial Gross Receipts",
  ),

  // ═══════════════════════════════════════════════════════════════════════════
  // J. EXCISE / SPECIALTY TAXES
  // ═══════════════════════════════════════════════════════════════════════════

  irs("f720", "Form 720", "excise", "Quarterly Federal Excise Tax Return"),
  irs("f730", "Form 730", "excise", "Monthly Tax Return for Wagers"),
  irs("f2290", "Form 2290", "excise", "Heavy Highway Vehicle Use Tax Return"),
  irs(
    "f8027",
    "Form 8027",
    "excise",
    "Employer's Annual Information Return of Tip Income and Allocated Tips",
  ),
  irs("f8611", "Form 8611", "excise", "Recapture of Low-Income Housing Credit"),
  irs("f8849", "Form 8849", "excise", "Claim for Refund of Excise Taxes"),

  // ═══════════════════════════════════════════════════════════════════════════
  // K. ADMIN / ELECTIONS / DISCLOSURES / EXTENSIONS
  // ═══════════════════════════════════════════════════════════════════════════

  irs("f56", "Form 56", "admin", "Notice Concerning Fiduciary Relationship"),
  irs(
    "f2848",
    "Form 2848",
    "admin",
    "Power of Attorney and Declaration of Representative",
  ),
  irs(
    "f3115",
    "Form 3115",
    "admin",
    "Application for Change in Accounting Method",
  ),
  irs(
    "f5213",
    "Form 5213",
    "admin",
    "Election to Postpone Determination as to Whether the Presumption Applies",
  ),
  irs(
    "f7004",
    "Form 7004",
    "admin",
    "Application for Automatic Extension of Time to File Certain Business Income Tax, Information, and Other Returns",
  ),
  irs("f8275", "Form 8275", "admin", "Disclosure Statement"),
  irs("f8275r", "Form 8275-R", "admin", "Regulation Disclosure Statement"),
  irs(
    "f8300",
    "Form 8300",
    "admin",
    "Report of Cash Payments Over $10,000 Received in a Trade or Business",
  ),
  irs("f8821", "Form 8821", "admin", "Tax Information Authorization"),
  irs("f8822", "Form 8822", "admin", "Change of Address"),
  irs(
    "f8822b",
    "Form 8822-B",
    "admin",
    "Change of Address or Responsible Party — Business",
  ),
  irs("f8832", "Form 8832", "admin", "Entity Classification Election"),
  irs(
    "f8878",
    "Form 8878",
    "admin",
    "IRS e-file Signature Authorization for Form 4868 or Form 2350",
  ),
  irs("f8879", "Form 8879", "admin", "IRS e-file Signature Authorization"),

  // ─── Schedule K-1 Forms ────────────────────────────────────────────────────
  irs(
    "f1065sk1",
    "Schedule K-1 (Form 1065)",
    "k1",
    "Partner's Share of Income, Deductions, Credits, etc.",
  ),
  // K-1 (1120-S) not found at expected IRS slug — embedded in 1120-S package
  {
    id: "f1120ssk1",
    displayName: "Schedule K-1 (Form 1120-S)",
    category: "k1",
    source: "irs",
    url: `${IRS_BASE}/f1120ssk1.pdf`,
    description: "Shareholder's Share of Income, Deductions, Credits, etc.",
    pdfAvailable: false,
  },
  irs(
    "f1041sk1",
    "Schedule K-1 (Form 1041)",
    "k1",
    "Beneficiary's Share of Income, Deductions, Credits, etc.",
  ),

  // ─── SSA Form ──────────────────────────────────────────────────────────────
  // SSA-1099: SSA blocks direct PDF downloads (403); must be obtained from SSA.gov portal
  {
    id: "ssa1099",
    displayName: "SSA-1099",
    category: "information_return",
    source: "ssa",
    url: `${SSA_BASE}/ssa-1099.pdf`,
    description: "Social Security Benefit Statement",
    pdfAvailable: false,
  },
];

export const FORM_MAP = new Map<string, FormEntry>(
  FORM_REGISTRY.map((f) => [f.id, f]),
);

export function getForm(id: string): FormEntry {
  const form = FORM_MAP.get(id);
  if (!form) throw new Error(`Unknown form ID: ${id}`);
  return form;
}

/** List all form IDs grouped by category */
export function listByCategory(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const f of FORM_REGISTRY) {
    if (!result[f.category]) result[f.category] = [];
    result[f.category].push(f.id);
  }
  return result;
}
