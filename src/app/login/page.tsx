import { Card, Container, Flex, Stack, Title } from "@mantine/core";
import LoginForm from "@/components/forms/login";

const LoginPage = () => {
  return (
    <Container h="100vh">
      <Flex h="100%" align="center" justify="center">
        <Card withBorder shadow="md" miw={400}>
          <Stack>
            <Title order={2}>Login</Title>
            <LoginForm />
          </Stack>
        </Card>
      </Flex>
    </Container>
  );
};

export default LoginPage;
