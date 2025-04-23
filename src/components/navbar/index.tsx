import { FC } from "react";
import { AppShellFooter, AppShellFooterProps, Flex } from "@mantine/core";

export type AppFooterProps = AppShellFooterProps;

const AppFooter: FC<AppFooterProps> = ({ ...restProps }) => {
  return (
    <AppShellFooter {...restProps}>
      <Flex align="center" justify="center" h="100%">
        <div>Copyright @ Mobila</div>
      </Flex>
    </AppShellFooter>
  );
};

export default AppFooter;
