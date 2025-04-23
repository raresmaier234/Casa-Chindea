import { Container, Text } from "@mantine/core";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";

const PrivatePage = async () => {
  const session = await getServerSession(authOptions);

  return (
    <Container h="100vh" mt={100}>
      <Text>If you can see this page, you are logged in!</Text>
      <Text>Welcome, {session?.user?.email}!</Text>
    </Container>
  );
};

export default PrivatePage;
