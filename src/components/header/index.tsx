import { FC } from "react";
import {
  AppShellHeader,
  AppShellHeaderProps,
  Container,
  Flex,
} from "@mantine/core";
import Logo from "@/components/logo";
import AppHeaderActions from "@/components/header/actions";

export type AppHeaderProps = AppShellHeaderProps;

const AppHeader: FC<AppHeaderProps> = ({ ...restProps }) => {
  return (
    <AppShellHeader {...restProps}>
      <Container size="md" h={"100%"}>
        <Flex justify="space-between" align="center" h="100%">
          <Logo />
          <AppHeaderActions />
        </Flex>
      </Container>
    </AppShellHeader>
  );
};

export default AppHeader;
