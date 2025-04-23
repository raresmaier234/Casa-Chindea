import { Alert, AlertProps } from "@mantine/core";
import { FC } from "react";
import { IconAlertCircle } from "@tabler/icons-react";

export type ErrorAlertProps = Omit<AlertProps, "color" | "title" | "icon">;

const ErrorAlert: FC<ErrorAlertProps> = ({ children, ...restProps }) => {
  return (
    <Alert color="red" title="Error" icon={<IconAlertCircle />} {...restProps}>
      {children}
    </Alert>
  );
};

export default ErrorAlert;
