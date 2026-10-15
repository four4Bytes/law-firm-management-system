// The four Philippine case categories, mirroring the CREATABLE_ROLES pattern.
// Validation-only: the `case_type` column stays TEXT, so rows written before
// this list existed keep their legacy free-text values.
export const CaseType = {
  Criminal: "Criminal",
  Civil: "Civil",
  SpecialProceedings: "Special Proceedings",
  CommercialAdmiralty: "Commercial and Admiralty",
} as const;

export type CaseTypeValue = (typeof CaseType)[keyof typeof CaseType];
