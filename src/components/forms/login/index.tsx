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
import { IconAt, IconPassword } from "@tabler/icons-react";
import { ClientResponseError } from "pocketbase";
import ErrorAlert from "@/components/alerts/error";
import Link from "next/link";
import LoginValidationSchema from "@/validators/login";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export type LoginFormValues = {
  email: string;
  password: string;
};

const ICON_SIZE = 16;

const LoginForm: FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    initialValues: {
      email: "",
      password: "",
    },

    validate: joiValidationResolver<LoginFormValues>(LoginValidationSchema),
  });

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push("/private");
      }
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

        <Button type="submit" loading={isLoading}>
          Login
        </Button>

        <Flex align="center" justify="center" gap="sm">
          <Text size="sm">You don't have an account?</Text>
          <Link href={"/register"}>
            <Text size="sm">Create one here</Text>
          </Link>
        </Flex>
      </Stack>
    </form>
  );
};

export default LoginForm;
