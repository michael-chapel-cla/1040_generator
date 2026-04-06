import { FieldType } from "./classifier";

export interface FieldDefinition {
  pdfFieldName: string;
  fieldType: FieldType;
  labelHint: string;
  required: boolean;
  maxLength?: number;
  options?: string[];       // allowed values for radio/dropdown/checkbox
  fakerOverride?: string;   // e.g. "taxpayer.ssn" — dotted path into FakeTaxpayer
}

export interface FormTemplate {
  formId: string;
  displayName: string;
  taxYear: number;
  sourceUrl: string;
  generatedAt: string;     // ISO timestamp
  fields: FieldDefinition[];
}
