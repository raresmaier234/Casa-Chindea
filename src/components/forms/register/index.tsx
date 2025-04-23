"use client";

import { FC, useState } from "react";
import {
  Button,
  PasswordInput,
  Stack,
  TextInput,
  Text,
  Flex,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { joiValidationResolver } from "@/utils/form-validation";
import RegisterValidationSchema from "@/validators/register";
import { IconAt, IconPassword, IconUser } from "@tabler/icons-react";
import pocketbaseClient from "@/pocketbase-client";
import { ClientResponseError } from "pocketbase";
import ErrorAlert from "@/components/alerts/error";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type RegisterFormValues = {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
};

const ICON_SIZE = 16;

const RegisterForm: FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    initialValues: {
      email: "",
      password: "",
      passwordConfirm: "",
      name: "",
    },

    validate: joiValidationResolver<RegisterFormValues>(
      RegisterValidationSchema,
    ),
  });

  const handleSubmit = async (values: RegisterFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      await pocketbaseClient.collection("users").create({
        email: values.email,
        password: values.password,
        passwordConfirm: values.passwordConfirm,
        name: values.name,
      });

      router.push("/login");
    } catch (e) {
      setError((e as ClientResponseError).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        {error && (
          <ErrorAlert>
            <Text>{error}</Text>
          </ErrorAlert>
        )}

        <TextInput
          label="Email"
          placeholder="you@example.com"
          withAsterisk
          readOnly={isLoading}
          leftSection={<IconAt size={ICON_SIZE} />}
          {...form.getInputProps("email")}
        />

        <PasswordInput
          label="Password"
          type="password"
          placeholder="Your password"
          withAsterisk
          readOnly={isLoading}
          leftSection={<IconPassword size={ICON_SIZE} />}
          {...form.getInputProps("password")}
        />

        <PasswordInput
          label="Confirm Password"
          placeholder="Re-enter password"
          withAsterisk
          readOnly={isLoading}
          leftSection={<IconPassword size={ICON_SIZE} />}
          {...form.getInputProps("passwordConfirm")}
        />

        <TextInput
          label="Name"
          placeholder="John Doe"
          withAsterisk
          readOnly={isLoading}
          leftSection={<IconUser size={ICON_SIZE} />}
          {...form.getInputProps("name")}
        />

        <Button type="submit" loading={isLoading}>
          Create a new account
        </Button>

        <Flex align="center" justify="center" gap="sm">
          <Text size="sm">Already have an account?</Text>
          <Link href={"/login"}>
            <Text size="sm">Login</Text>
          </Link>
        </Flex>
      </Stack>
    </form>
  );
};

export default RegisterForm;
