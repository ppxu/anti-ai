import React from "react";
import { render } from "ink";

import { TuiApp } from "./app.jsx";

function startTui(snapshot, options = {}) {
  return render(
    <TuiApp snapshot={snapshot} lang={options.lang ?? "zh"} />,
    {
      exitOnCtrlC: true,
      patchConsole: false,
    },
  );
}

export { startTui };
