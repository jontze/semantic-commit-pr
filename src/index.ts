import { Probot } from "probot";

import { handlePullRequestChange } from "./handle-pr-change.js";

export default (app: Probot) => {
  app.on("issues.opened", async (context) => {
    const issueComment = context.issue({
      body: "Thanks for opening this issue!",
    });
    await context.octokit.issues.createComment(issueComment);
  });

  app.on(
    ["pull_request.opened", "pull_request.edited", "pull_request.synchronize"],
    handlePullRequestChange
  );
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
