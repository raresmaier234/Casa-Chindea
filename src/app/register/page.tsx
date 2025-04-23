import { Card, Container, Flex, Stack, Title } from "@mantine/core";
import RegisterForm from "@/components/forms/register";

const RegisterPage = () => {
  return (
    <Container h="100vh">
      <Flex h="100%" align="center" justify="center">
        <Card withBorder shadow="md" miw={400}>
          <Stack>
            <Title order={2}>Register</Title>
            <RegisterForm />
          </Stack>
        </Card>
      </Flex>
    </Container>
  );
};

export default RegisterPage;
