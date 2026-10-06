import { publicLabSizeOptions } from "./public-lab-options";
import type {
  PublicLabFillingMethod,
  PublicLabPrintingMethod,
  PublicLabRequestType,
  PublicLabSizeKey,
} from "./public-lab-options";

export const PUBLIC_LAB_CONSENT_VERSION = "public-lab-privacy-v1" as const;

export type PublicLabFieldErrorCode =
  | "invalidRequest"
  | "invalidType"
  | "invalidValue"
  | "tooShort"
  | "tooLong"
  | "controlCharacter"
  | "invalidEmail"
  | "invalidPhone"
  | "unknownField"
  | "notAllowedForRequestType"
  | "invalidInteger"
  | "tooManyDecimalPlaces"
  | "outOfRange"
  | "mustBeAccepted"
  | "mustBeEmpty"
  | "mustBeTrue";

export interface PublicLabFieldError {
  field: string;
  code: PublicLabFieldErrorCode;
}

export interface PublicLabRequestLead {
  company: string;
  contactName: string;
  email: string;
  phone: string;
}

export interface PublicLabRequestConsent {
  consentVersion: typeof PUBLIC_LAB_CONSENT_VERSION;
  consentAccepted: true;
}

export interface PublicLabQuotationRequest extends PublicLabRequestLead, PublicLabRequestConsent {
  requestType: "quotation";
  sizeKey: PublicLabSizeKey;
  quantity: number;
  fillMlPerChamber: number;
  connectedChambers: 1 | 2 | 3 | 4;
  fillingMethod: PublicLabFillingMethod;
  printingMethod: PublicLabPrintingMethod;
  colorCount: number;
  bulkSupplied: true;
  message?: string;
}

export interface PublicLabConsultationRequest extends PublicLabRequestLead, PublicLabRequestConsent {
  requestType: "consultation";
  message?: string;
}

export interface PublicLabSampleRequest extends PublicLabRequestLead, PublicLabRequestConsent {
  requestType: "sample";
  message?: string;
}

export type PublicLabRequest =
  | PublicLabQuotationRequest
  | PublicLabConsultationRequest
  | PublicLabSampleRequest;

export type PublicLabValidationSuccess = {
  success: true;
  data: PublicLabRequest;
};

export type PublicLabValidationFailure = {
  success: false;
  errors: readonly PublicLabFieldError[];
};

export type PublicLabValidationResult =
  | PublicLabValidationSuccess
  | PublicLabValidationFailure;

const CONTROL_CHARACTER_PATTERN = /[\p{Cc}]/u;
const PHONE_ALLOWED_PATTERN = /^[0-9+(). -]+$/;
const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const FILLING_METHODS: readonly PublicLabFillingMethod[] = ["hopper", "pressure"];
const PRINTING_METHODS: readonly PublicLabPrintingMethod[] = ["digital", "gravure"];
const REQUEST_TYPES: readonly PublicLabRequestType[] = ["quotation", "consultation", "sample"];
const TECHNICAL_FIELDS = [
  "sizeKey",
  "quantity",
  "fillMlPerChamber",
  "connectedChambers",
  "fillingMethod",
  "printingMethod",
  "colorCount",
  "bulkSupplied",
] as const;
const COMMON_FIELDS = [
  "requestType",
  "company",
  "contactName",
  "email",
  "phone",
  "message",
  "consentVersion",
  "consentAccepted",
  "honeypot",
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object"
    && value !== null
    && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function isText(value: unknown): value is string {
  return typeof value === "string";
}

function hasControlCharacter(value: string): boolean {
  return CONTROL_CHARACTER_PATTERN.test(value);
}

function isValidEmail(value: string): boolean {
  if (value.length > 254 || value.includes("..")) return false;
  const separator = value.indexOf("@");
  if (separator < 1 || separator > 64 || separator === value.length - 1) return false;
  return EMAIL_PATTERN.test(value);
}

function isValidPhone(value: string): boolean {
  return value.length >= 7
    && value.length <= 30
    && PHONE_ALLOWED_PATTERN.test(value)
    && /[0-9]/.test(value);
}

function hasAtMostTwoFractionDigits(value: number): boolean {
  return Number(value.toFixed(2)) === value;
}

function isTechnicalField(field: string): boolean {
  return (TECHNICAL_FIELDS as readonly string[]).includes(field);
}

export function validatePublicLabRequest(input: unknown): PublicLabValidationResult {
  if (!isPlainObject(input)) {
    return { success: false, errors: [{ field: "request", code: "invalidRequest" }] };
  }

  const requestType = input.requestType;
  if (!isEnumValue(requestType, REQUEST_TYPES)) {
    return { success: false, errors: [{ field: "requestType", code: "invalidValue" }] };
  }

  const allowedFields = new Set<string>(COMMON_FIELDS);
  if (requestType === "quotation") {
    for (const field of TECHNICAL_FIELDS) allowedFields.add(field);
  }

  const errors: PublicLabFieldError[] = [];
  const keys = Reflect.ownKeys(input);
  for (const key of keys) {
    const field = typeof key === "string" ? key : key.description ?? "[symbol]";
    if (allowedFields.has(field)) continue;
    errors.push({
      field,
      code: requestType === "quotation" || !isTechnicalField(field)
        ? "unknownField"
        : "notAllowedForRequestType",
    });
  }

  if (errors.length > 0) return { success: false, errors };

  const trimmedCompany = isText(input.company) && !hasControlCharacter(input.company)
    ? input.company.trim()
    : "";
  if (!isText(input.company)) {
    errors.push({ field: "company", code: "invalidType" });
  } else if (hasControlCharacter(input.company)) {
    errors.push({ field: "company", code: "controlCharacter" });
  } else if (trimmedCompany.length < 1) {
    errors.push({ field: "company", code: "tooShort" });
  } else if (trimmedCompany.length > 200) {
    errors.push({ field: "company", code: "tooLong" });
  }

  const trimmedContactName = isText(input.contactName) && !hasControlCharacter(input.contactName)
    ? input.contactName.trim()
    : "";
  if (!isText(input.contactName)) {
    errors.push({ field: "contactName", code: "invalidType" });
  } else if (hasControlCharacter(input.contactName)) {
    errors.push({ field: "contactName", code: "controlCharacter" });
  } else if (trimmedContactName.length < 1) {
    errors.push({ field: "contactName", code: "tooShort" });
  } else if (trimmedContactName.length > 100) {
    errors.push({ field: "contactName", code: "tooLong" });
  }

  const trimmedEmail = isText(input.email) && !hasControlCharacter(input.email) ? input.email.trim() : "";
  if (!isText(input.email)) {
    errors.push({ field: "email", code: "invalidType" });
  } else if (hasControlCharacter(input.email)) {
    errors.push({ field: "email", code: "controlCharacter" });
  } else if (!isValidEmail(trimmedEmail)) {
    errors.push({ field: "email", code: "invalidEmail" });
  }

  const trimmedPhone = isText(input.phone) && !hasControlCharacter(input.phone) ? input.phone.trim() : "";
  if (!isText(input.phone)) {
    errors.push({ field: "phone", code: "invalidType" });
  } else if (hasControlCharacter(input.phone)) {
    errors.push({ field: "phone", code: "controlCharacter" });
  } else if (!isValidPhone(trimmedPhone)) {
    errors.push({ field: "phone", code: "invalidPhone" });
  }

  let message: string | undefined;
  if (input.message !== undefined) {
    if (!isText(input.message)) {
      errors.push({ field: "message", code: "invalidType" });
    } else if (hasControlCharacter(input.message)) {
      errors.push({ field: "message", code: "controlCharacter" });
    } else {
      message = input.message.trim();
      if (message.length > 2_000) errors.push({ field: "message", code: "tooLong" });
    }
  }

  if (input.consentVersion !== PUBLIC_LAB_CONSENT_VERSION) {
    errors.push({ field: "consentVersion", code: "invalidValue" });
  }
  if (input.consentAccepted !== true) {
    errors.push({ field: "consentAccepted", code: "mustBeAccepted" });
  }

  if (input.honeypot !== undefined) {
    if (!isText(input.honeypot)) {
      errors.push({ field: "honeypot", code: "invalidType" });
    } else if (hasControlCharacter(input.honeypot) || input.honeypot.length !== 0) {
      errors.push({ field: "honeypot", code: "mustBeEmpty" });
    }
  }

  if (requestType !== "quotation") {
    for (const field of TECHNICAL_FIELDS) {
      if (field in input) errors.push({ field, code: "notAllowedForRequestType" });
    }
  } else {
    validateQuotationTechnicalFields(input, errors);
  }

  if (errors.length > 0) return { success: false, errors };

  const lead = {
    company: trimmedCompany,
    contactName: trimmedContactName,
    email: trimmedEmail,
    phone: trimmedPhone,
  };
  const consent = {
    consentVersion: PUBLIC_LAB_CONSENT_VERSION,
    consentAccepted: true,
  } as const;

  if (requestType === "quotation") {
    return {
      success: true,
      data: {
        requestType,
        ...lead,
        sizeKey: input.sizeKey as PublicLabSizeKey,
        quantity: input.quantity as number,
        fillMlPerChamber: input.fillMlPerChamber as number,
        connectedChambers: input.connectedChambers as 1 | 2 | 3 | 4,
        fillingMethod: input.fillingMethod as PublicLabFillingMethod,
        printingMethod: input.printingMethod as PublicLabPrintingMethod,
        colorCount: input.colorCount as number,
        bulkSupplied: true,
        ...(message === undefined ? {} : { message }),
        ...consent,
      },
    };
  }

  if (requestType === "consultation") {
    return {
      success: true,
      data: {
        requestType,
        ...lead,
        ...(message === undefined ? {} : { message }),
        ...consent,
      },
    };
  }

  return {
    success: true,
    data: {
      requestType,
      ...lead,
      ...(message === undefined ? {} : { message }),
      ...consent,
    },
  };
}

function validateQuotationTechnicalFields(
  input: Record<string, unknown>,
  errors: PublicLabFieldError[],
): void {
  if (typeof input.sizeKey !== "string" || !isPublicLabSizeKey(input.sizeKey)) {
    errors.push({ field: "sizeKey", code: "invalidValue" });
  }

  if (typeof input.quantity !== "number" || !Number.isInteger(input.quantity)) {
    errors.push({ field: "quantity", code: "invalidInteger" });
  } else if (input.quantity < 500 || input.quantity > 1_000_000) {
    errors.push({ field: "quantity", code: "outOfRange" });
  }

  if (typeof input.fillMlPerChamber !== "number" || !Number.isFinite(input.fillMlPerChamber)) {
    errors.push({ field: "fillMlPerChamber", code: "invalidType" });
  } else if (!hasAtMostTwoFractionDigits(input.fillMlPerChamber)) {
    errors.push({ field: "fillMlPerChamber", code: "tooManyDecimalPlaces" });
  } else if (input.fillMlPerChamber < 0.5 || input.fillMlPerChamber > 20) {
    errors.push({ field: "fillMlPerChamber", code: "outOfRange" });
  }

  if (
    typeof input.connectedChambers !== "number"
    || !Number.isInteger(input.connectedChambers)
    || input.connectedChambers < 1
    || input.connectedChambers > 4
  ) {
    errors.push({ field: "connectedChambers", code: "outOfRange" });
  }

  if (!isEnumValue(input.fillingMethod, FILLING_METHODS)) {
    errors.push({ field: "fillingMethod", code: "invalidValue" });
  }
  if (!isEnumValue(input.printingMethod, PRINTING_METHODS)) {
    errors.push({ field: "printingMethod", code: "invalidValue" });
  }

  if (typeof input.colorCount !== "number" || !Number.isInteger(input.colorCount)) {
    errors.push({ field: "colorCount", code: "invalidInteger" });
  } else if (input.colorCount < 1 || input.colorCount > 10) {
    errors.push({ field: "colorCount", code: "outOfRange" });
  }

  if (input.bulkSupplied !== true) {
    errors.push({ field: "bulkSupplied", code: "mustBeTrue" });
  }
}

function isEnumValue<TValue extends string>(value: unknown, values: readonly TValue[]): value is TValue {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

function isPublicLabSizeKey(value: string): boolean {
  return publicLabSizeKeySet.has(value);
}

const publicLabSizeKeySet = new Set<string>(publicLabSizeOptions.map((option) => option.key));
