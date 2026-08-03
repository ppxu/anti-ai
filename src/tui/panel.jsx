import React from "react";
import { Box, Text } from "ink";

function Panel({ title, color = "gray", children, ...props }) {
  return (
    <Box
      borderStyle="round"
      borderColor={color}
      flexDirection="column"
      paddingX={1}
      {...props}
    >
      <Text bold color={color}>
        {title}
      </Text>
      {children}
    </Box>
  );
}

export { Panel };
