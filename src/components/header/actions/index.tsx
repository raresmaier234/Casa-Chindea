import {
  ActionIcon,
  Avatar,
  Button,
  Group,
  Menu,
  MenuDivider,
  MenuDropdown,
  MenuItem,
  MenuLabel,
  MenuTarget,
} from "@mantine/core";
import { IconShoppingCartFilled, IconUser } from "@tabler/icons-react";
import Link from "next/link";

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getInitialsFromName } from "@/utils/user";
import LogoutMenuItem from "@/components/header/logout-button";

const AppHeaderActions = async () => {
  const session = await getServerSession(authOptions);

  return (
    <Group>
      {!session && (
        <Button
          variant="subtle"
          leftSection={<IconUser size={20} />}
          component={Link}
          href={`/login`}
        >
          Login
        </Button>
      )}
      <ActionIcon variant="subtle" size="lg">
        <IconShoppingCartFilled size="60%" />
      </ActionIcon>
      {session && (
        <Menu shadow="md" width={200} position="bottom-end">
          <MenuTarget>
            <Avatar color="cyan" radius="xl">
              {getInitialsFromName(session.user?.email || "NN")}
            </Avatar>
          </MenuTarget>
          <MenuDropdown>
            <MenuLabel>{session.user?.email}</MenuLabel>

            <MenuItem leftSection={<IconUser size={14} />} color={"blue"}>
              Profile
            </MenuItem>

            <MenuItem
              leftSection={<IconShoppingCartFilled size={14} />}
              color={"blue"}
            >
              Orders
            </MenuItem>

            <MenuDivider />

            <LogoutMenuItem />
          </MenuDropdown>
        </Menu>
      )}
    </Group>
  );
};

export default AppHeaderActions;
