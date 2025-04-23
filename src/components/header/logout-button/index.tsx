"use client";

import { LoadingOverlay, MenuItem } from "@mantine/core";
import { IconLogout } from "@tabler/icons-react";
import pocketbaseClient from "@/pocketbase-client";
import { signOut } from "next-auth/react";
import { useState } from "react";

const LogoutMenuItem = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleOnLogoutClick = async () => {
    try {
      setIsLoading(true);
      pocketbaseClient.authStore.clear();
      await signOut({ callbackUrl: "/login" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MenuItem
      leftSection={<IconLogout size={14} />}
      color={"red"}
      onClick={handleOnLogoutClick}
    >
      <LoadingOverlay visible={isLoading} />
      Logout
    </MenuItem>
  );
};

export default LogoutMenuItem;
