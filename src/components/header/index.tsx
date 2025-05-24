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
  const headerHeight = 100;

  return (
    <AppShellHeader {...restProps}>
      <Container size="md" h={"100%"} m={0} w={"100%"} maw={"100%"}>
        <Flex justify="space-between" align="center" h="100%">
          <Logo maxHeight={headerHeight * 0.8} />
          <AppHeaderActions />
        </Flex>
      </Container>
    </AppShellHeader>
  );
};

export default AppHeader;
