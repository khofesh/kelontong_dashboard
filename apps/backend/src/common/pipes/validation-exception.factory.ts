import { ValidationError } from "class-validator";

export interface ValidationDetail {
  field: string;
  message: string;
}

export function flattenValidationErrors(
  errors: ValidationError[],
  parent = "",
): ValidationDetail[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    const children = error.children?.length
      ? flattenValidationErrors(error.children, field)
      : [];
    return [...own, ...children];
  });
}
