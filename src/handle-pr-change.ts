import { Context } from "probot";

import {
  areCommitsSemantic,
  isSemanticMessage,
  isSemanticResult,
} from "./is-semantic-commit.js";
import { Config, loadConfig } from "./config.js";

export type PrChangeContext = Context<
  "pull_request.opened" | "pull_request.synchronize" | "pull_request.reopened"
>;

const createPrCheckDescription = (
  isSemantic: boolean,
  hasSemanticTitle: boolean,
  hasSemanticCommits: boolean,
  hasOnlySingleNonMergeCommit: boolean,
  config: Config
): string => {
  if (!config.enabled) {
    return "skipped; check disabled in semantic.yml config";
  } else if (!isSemantic && hasOnlySingleNonMergeCommit) {
    return "PR has only one non-merge commit and it's not semantic; add another commit before squashing";
  } else if (isSemantic && config.titleAndCommits) {
    return "ready to be merged, squashed or rebased";
  } else if (!isSemantic && config.titleAndCommits) {
    return "add a semantic commit AND PR title";
  } else if (hasSemanticTitle && !config.commitsOnly) {
    return "ready to be squashed";
  } else if (hasSemanticCommits && !config.titleOnly) {
    return "ready to be merged or rebased";
  } else if (config.titleOnly) {
    return "add a semantic PR title";
  } else if (config.commitsOnly && config.anyCommit) {
    return "add a semantic commit";
  } else if (config.commitsOnly) {
    return "make sure every commit is semantic";
  }
  // Fallback
  return "add a semantic commit or PR title";
};

export const createCheck = async (
  context: PrChangeContext,
  {
    isDone,
    description,
    conclusion,
  }: {
    isDone: boolean;
    description: string;
    conclusion?: "success" | "failure";
  }
): Promise<void> => {
  if (isDone && !conclusion) {
    throw new Error("conclusion must be provided when isDone is true");
  }

  const baseStatus = {
    head_sha: context.payload.pull_request.head.sha,
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
    name: "Semantic Pull Request",
  };
  await context.octokit.checks.create(
    isDone
      ? {
          ...baseStatus,
          status: "completed",
          conclusion,
          output: {
            title: `Semantic Commit Check - ${description}`,
            summary: "",
          },
          completed_at: new Date().toISOString(),
        }
      : {
          ...baseStatus,
          status: "in_progress",
          started_at: new Date().toISOString(),
        }
  );
};

export async function handlePullRequestChange(context: PrChangeContext) {
  console.debug("PR Context: ", context);
  console.debug("Repo: ", context.payload.repository.owner);
  console.debug("Commits: ", context.payload.pull_request.commits_url);
  await createCheck(context, {
    isDone: false,
    description: "checking...",
  });

  try {
    const config = await loadConfig(context);

    const hasSemanticTitle = isSemanticMessage(
      context.payload.pull_request.title,
      config.scopes,
      config.types
    );
    const commits = (
      await context.octokit.pulls.listCommits({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        pull_number: context.payload.pull_request.number,
        per_page: 250,
      })
    ).data;
    const hasSemanticCommits = await areCommitsSemantic(
      commits,
      config.scopes,
      config.types,
      (config.commitsOnly || config.titleAndCommits) && !config.anyCommit,
      config.allowMergeCommits,
      config.allowRevertCommits
    );
    const hasOnlySingleNonMergeCommit =
      commits.filter((element) => !element.commit.message.startsWith("Merge"))
        .length === 1;

    const isSemantic = isSemanticResult(
      hasSemanticCommits,
      hasSemanticTitle,
      hasOnlySingleNonMergeCommit,
      config
    );

    const description = createPrCheckDescription(
      isSemantic,
      hasSemanticTitle,
      hasSemanticCommits,
      hasOnlySingleNonMergeCommit,
      config
    );
    await createCheck(context, {
      isDone: true,
      description,
      conclusion: isSemantic ? "success" : "failure",
    });
  } catch (error) {
    console.error("Error checking PR: ", error);
    await createCheck(context, {
      isDone: true,
      description:
        "Something went horrible wrong. Probably nothing to do with your PR...",
      conclusion: "failure",
    });
    return;
  }
}
