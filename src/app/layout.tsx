import "@mantine/core/styles.css";

import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
  AppShell,
} from "@mantine/core";
import { ReactNode } from "react";
import { theme } from "@/theme";
import AppHeader from "@/components/header";
import AppFooter from "@/components/navbar";
import { SessionProvider } from "next-auth/react";

export const metadata = {
  title: "Casa chindea",
  description: "Lacu rosu."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>
          <AppShell
            header={{ height: 60 }}
            footer={{
              height: 60,
            }}
            padding="md"
          >
            <AppHeader />
            {children}
            <AppFooter />
          </AppShell>
        </MantineProvider>
      </body>
    </html>
  );
}
