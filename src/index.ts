import { Probot, ApplicationFunction } from "probot";

import { handlePullRequestChange } from "./handle-pr-change.js";

const appFn: ApplicationFunction = (app: Probot) => {
  app.on(
    ["pull_request.opened", "pull_request.edited", "pull_request.synchronize"],
    async (context: any) => await handlePullRequestChange(context),
  );
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};

export default appFn;
