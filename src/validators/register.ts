import Joi from "joi";

const RegisterValidationSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Invalid email format",
    }),

  password: Joi.string().min(8).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 8 characters long",
  }),

  passwordConfirm: Joi.any().equal(Joi.ref("password")).required().messages({
    "any.only": "Passwords must match",
    "any.required": "Password confirmation is required",
  }),

  name: Joi.string().min(3).max(30).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 3 characters long",
    "string.max": "Name must be no longer than 30 characters",
  }),
});

export default RegisterValidationSchema;
