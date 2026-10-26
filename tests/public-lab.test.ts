import { describe, expect, it } from "vitest";

import {
  validatePublicLabRequest,
  type PublicLabFieldError,
  type PublicLabRequest,
} from "@/lib/public-lab";
import {
  publicLabFillingMethodOptions,
  publicLabPrintingMethodOptions,
  publicLabSizeOptions,
} from "@/lib/public-lab-options";
import { getPublicLabSizeRule } from "@/lib/public-lab-rules";

const lead = {
  company: "  株式会社サンプル  ",
  contactName: "  山田 太郎  ",
  email: "  tanaka@example.co.jp  ",
  phone: "  03-1234-5678  ",
};
const consent = {
  consentVersion: "public-lab-privacy-v1",
  consentAccepted: true,
};

function quotationInput(overrides: Record<string, unknown> = {}) {
  return {
    requestType: "quotation",
    ...lead,
    sizeKey: "round-50x60",
    quantity: 10_000,
    fillMlPerChamber: 1,
    connectedChambers: 1,
    fillingMethod: "hopper",
    printingMethod: "digital",
    colorCount: 1,
    bulkSupplied: true,
    message: "  よろしくお願いします。  ",
    ...consent,
    ...overrides,
  };
}

function errors(result: { success: false; errors: readonly PublicLabFieldError[] }) {
  return result.errors.map((error) => `${error.field}:${error.code}`);
}

function expectFailure(input: unknown, expected: string[]) {
  const result = validatePublicLabRequest(input);
  expect(result.success).toBe(false);
  if (result.success) return;
  expect(errors(result)).toEqual(expected);
  const serialized = JSON.stringify(result.errors);
  expect(serialized).not.toContain("送信してはいけない値");
  if (typeof input === "string") expect(serialized).not.toContain(input);
}

describe("validatePublicLabRequest", () => {
  it("normalizes and accepts digital and gravure quotations", () => {
    const digital = validatePublicLabRequest(quotationInput());
    expect(digital).toEqual({
      success: true,
      data: {
        requestType: "quotation",
        company: "株式会社サンプル",
        contactName: "山田 太郎",
        email: "tanaka@example.co.jp",
        phone: "03-1234-5678",
        sizeKey: "round-50x60",
        quantity: 10_000,
        fillMlPerChamber: 1,
        connectedChambers: 1,
        fillingMethod: "hopper",
        printingMethod: "digital",
        colorCount: 1,
        bulkSupplied: true,
        message: "よろしくお願いします。",
        ...consent,
      },
    });

    const gravure = validatePublicLabRequest(quotationInput({
      sizeKey: "tube-70x120",
      quantity: 1_000_001,
      fillMlPerChamber: 10,
      connectedChambers: 4,
      fillingMethod: "pressure",
      printingMethod: "gravure",
      colorCount: 10,
      message: undefined,
    }));
    expect(gravure.success).toBe(true);
    if (gravure.success) expect(gravure.data).not.toHaveProperty("message");
  });

  it("accepts consultation and sample requests without technical fields", () => {
    for (const requestType of ["consultation", "sample"] as const) {
      const result = validatePublicLabRequest({
        requestType,
        ...lead,
        message: "",
        ...consent,
        honeypot: "",
      });
      expect(result).toEqual({
        success: true,
        data: {
          requestType,
          company: "株式会社サンプル",
          contactName: "山田 太郎",
          email: "tanaka@example.co.jp",
          phone: "03-1234-5678",
          message: "",
          ...consent,
        },
      });
    }
  });

  it("rejects non-plain and prototype-like inputs", () => {
    expectFailure(null, ["request:invalidRequest"]);
    expectFailure("quotation", ["request:invalidRequest"]);
    expectFailure([], ["request:invalidRequest"]);
    expectFailure(new Date(), ["request:invalidRequest"]);
    expectFailure(Object.create(null), ["request:invalidRequest"]);
    const prototypeInput: Record<string, unknown> = { ...quotationInput() };
    Object.defineProperty(prototypeInput, "__proto__", {
      value: {},
      enumerable: true,
      configurable: true,
      writable: true,
    });
    expectFailure(prototypeInput, ["__proto__:unknownField"]);
  });

  it("rejects unknown and pricing/control fields", () => {
    expectFailure(quotationInput({ unknown: "送信してはいけない値" }), ["unknown:unknownField"]);
    expectFailure(quotationInput({ metadata: { candidateId: "D-1" } }), ["metadata:unknownField"]);
    expectFailure(quotationInput({ message: { text: "オブジェクトは送れません" } }), ["message:invalidType"]);
    expectFailure(quotationInput({
      isCustom: false,
      skuCount: 1,
      skuQuantities: [500],
      parameters: {},
      targetMargin: 0.4,
      candidateId: "D-1",
      subtotal: 1000,
      total: 1100,
      cost: 500,
    }), [
      "isCustom:unknownField",
      "skuCount:unknownField",
      "skuQuantities:unknownField",
      "parameters:unknownField",
      "targetMargin:unknownField",
      "candidateId:unknownField",
      "subtotal:unknownField",
      "total:unknownField",
      "cost:unknownField",
    ]);
  });

  it("enforces lead text, email, phone, consent, and honeypot", () => {
    expectFailure(quotationInput({ company: "x".repeat(201) }), ["company:tooLong"]);
    expectFailure(quotationInput({ company: "   " }), ["company:tooShort"]);
    expectFailure(quotationInput({ contactName: "x".repeat(101) }), ["contactName:tooLong"]);
    expectFailure(quotationInput({ email: "not-an-email" }), ["email:invalidEmail"]);
    expectFailure(quotationInput({ email: `${"a".repeat(250)}@example.co.jp` }), ["email:invalidEmail"]);
    expectFailure(quotationInput({ phone: "03-123" }), ["phone:invalidPhone"]);
    expectFailure(quotationInput({ phone: "abcdefg" }), ["phone:invalidPhone"]);
    expectFailure(quotationInput({ phone: "+81 (3) 1234-5678 ext.9" }), ["phone:invalidPhone"]);
    expectFailure(quotationInput({ ...consent, consentAccepted: false }), ["consentAccepted:mustBeAccepted"]);
    expectFailure(quotationInput({
      consentVersion: undefined,
      consentAccepted: undefined,
    }), ["consentVersion:invalidValue", "consentAccepted:mustBeAccepted"]);
    expectFailure(quotationInput({
      consentVersion: "public-lab-privacy-v2",
      consentAccepted: false,
    }), ["consentVersion:invalidValue", "consentAccepted:mustBeAccepted"]);
    expectFailure(quotationInput({ honeypot: " " }), ["honeypot:mustBeEmpty"]);
    expectFailure(quotationInput({ honeypot: "bot" }), ["honeypot:mustBeEmpty"]);
  });

  it("enforces exact quotation technical ranges and closed enum values", () => {
    expectFailure(quotationInput({ sizeKey: "custom-100x100" }), ["sizeKey:invalidValue"]);
    expectFailure(quotationInput({ quantity: 9_999 }), ["quantity:outOfRange"]);
    expectFailure(quotationInput({ quantity: 500.5 }), ["quantity:invalidInteger"]);
    expectFailure(quotationInput({ fillMlPerChamber: 0.99 }), ["fillMlPerChamber:outOfRange"]);
    expectFailure(quotationInput({ fillMlPerChamber: 10.01 }), ["fillMlPerChamber:outOfRange"]);
    expectFailure(quotationInput({ fillMlPerChamber: 1.234 }), ["fillMlPerChamber:tooManyDecimalPlaces"]);
    expectFailure(quotationInput({ connectedChambers: 0 }), ["connectedChambers:outOfRange"]);
    expectFailure(quotationInput({ connectedChambers: 5 }), ["connectedChambers:outOfRange"]);
    expectFailure(quotationInput({ fillingMethod: "pump" }), ["fillingMethod:invalidValue"]);
    expectFailure(quotationInput({ printingMethod: "offset" }), ["printingMethod:invalidValue"]);
    expectFailure(quotationInput({ colorCount: 0 }), ["colorCount:outOfRange"]);
    expectFailure(quotationInput({ colorCount: 11 }), ["colorCount:outOfRange"]);
    expectFailure(quotationInput({ bulkSupplied: false }), ["bulkSupplied:mustBeTrue"]);
  });

  it("rejects every technical field on consultation and sample requests", () => {
    const technical = {
      sizeKey: "round-50x60",
      quantity: 10_000,
      fillMlPerChamber: 1,
      connectedChambers: 1,
      fillingMethod: "hopper",
      printingMethod: "digital",
      colorCount: 1,
      bulkSupplied: true,
    };
    const expected = [
      "sizeKey:notAllowedForRequestType",
      "quantity:notAllowedForRequestType",
      "fillMlPerChamber:notAllowedForRequestType",
      "connectedChambers:notAllowedForRequestType",
      "fillingMethod:notAllowedForRequestType",
      "printingMethod:notAllowedForRequestType",
      "colorCount:notAllowedForRequestType",
      "bulkSupplied:notAllowedForRequestType",
    ];
    for (const requestType of ["consultation", "sample"] as const) {
      expectFailure({
        requestType,
        ...lead,
        ...technical,
        ...consent,
      }, expected);
    }
  });

  it("rejects control characters and overlong messages", () => {
    expectFailure(quotationInput({ company: "株式会社\u0000サンプル" }), ["company:controlCharacter"]);
    expectFailure(quotationInput({ contactName: "山田\n太郎" }), ["contactName:controlCharacter"]);
    expectFailure(quotationInput({ email: "a\u0007@example.co.jp" }), ["email:controlCharacter"]);
    expectFailure(quotationInput({ phone: "03-1234-5678\u001f" }), ["phone:controlCharacter"]);
    expectFailure(quotationInput({ message: "abc\u0085def" }), ["message:controlCharacter"]);
    expectFailure(quotationInput({ message: "x".repeat(2_001) }), ["message:tooLong"]);
  });

  it("enforces shape-specific capacity and minimum quantity rules", () => {
    expectFailure(quotationInput({
      sizeKey: "spa-35x80",
      quantity: 49_999,
    }), ["quantity:outOfRange"]);
    expect(validatePublicLabRequest(quotationInput({
      sizeKey: "spa-35x80",
      quantity: 50_000,
      fillMlPerChamber: 1,
    })).success).toBe(true);

    expectFailure(quotationInput({
      sizeKey: "xra-38.5x90",
      fillMlPerChamber: 2,
    }), ["fillMlPerChamber:outOfRange"]);
    expect(validatePublicLabRequest(quotationInput({
      sizeKey: "xra-38.5x90",
      fillMlPerChamber: 1,
    })).success).toBe(true);

    expectFailure(quotationInput({
      sizeKey: "circle-70x70",
      fillMlPerChamber: 3,
    }), ["fillMlPerChamber:outOfRange"]);
    expect(validatePublicLabRequest(quotationInput({
      sizeKey: "circle-70x70",
      fillMlPerChamber: 2,
    })).success).toBe(true);
  });

  it("exposes exactly 20 standard sizes and public enum options", () => {
    expect(publicLabSizeOptions).toHaveLength(20);
    expect(new Set(publicLabSizeOptions.map((option) => option.key)).size).toBe(20);
    expect(publicLabFillingMethodOptions.map((option) => option.value)).toEqual(["hopper", "pressure"]);
    expect(publicLabPrintingMethodOptions.map((option) => option.value)).toEqual(["digital", "gravure"]);
    for (const option of publicLabSizeOptions) {
      const rule = getPublicLabSizeRule(option.key);
      expect(validatePublicLabRequest(quotationInput({
        sizeKey: option.key,
        quantity: rule.minimumQuantity,
        fillMlPerChamber: rule.capacity.min,
      })).success).toBe(true);
    }
    const validRequests: PublicLabRequest[] = [];
    for (const option of publicLabPrintingMethodOptions) {
      const result = validatePublicLabRequest(quotationInput({ printingMethod: option.value }));
      if (result.success) validRequests.push(result.data);
    }
    expect(validRequests).toHaveLength(2);
  });

  it("accepts all limited phone punctuation forms", () => {
    const result = validatePublicLabRequest(quotationInput({
      phone: "+81 (3) 1234-5678.",
    }));
    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({ phone: "+81 (3) 1234-5678." }),
    });
  });
});
