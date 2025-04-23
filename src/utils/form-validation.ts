import { Schema } from "joi";

export function joiValidationResolver<Values>(schema: Schema) {
  return (values: Values) => {
    const { error } = schema.validate(values, { abortEarly: false });
    if (!error) return {};

    return error.details.reduce((acc: Record<string, string>, curr) => {
      const fieldName = curr.path.join(".");
      acc[fieldName] = curr.message;
      return acc;
    }, {});
  };
}
