import { Context } from "probot";

import { isSemanticMessage } from "./is-semantic-commit.js";

type PrOpenContext = Context<"pull_request.opened">;
type PrSyncContext = Context<"pull_request.synchronize">;
type PrReopenContext = Context<"pull_request.reopened">;

type PrChangeContext = PrOpenContext | PrSyncContext | PrReopenContext;

interface Config {
  enabled: boolean;
  titleOnly: boolean;
  commitsOnly: boolean;
  titleAndCommits: boolean;
  anyCommit: boolean;
  scopes?: string[];
  types?: string[];
  allowMergeCommits: boolean;
  allowRevertCommits: boolean;
}

const DEFAULT_OPTS: Config = {
  enabled: true,
  titleOnly: false,
  commitsOnly: false,
  titleAndCommits: false,
  anyCommit: false,
  scopes: undefined,
  types: undefined,
  allowMergeCommits: false,
  allowRevertCommits: false,
};

async function commitsAreSemantic(
  commits: { commit: { message: string } }[],
  scopes?: string[],
  types?: string[],
  allCommits?: boolean,
  allowMergeCommits?: boolean,
  allowRevertCommits?: boolean
) {
  return commits
    .map((element) => element.commit)
    [allCommits ? "every" : "some"]((commit) =>
      isSemanticMessage(
        commit.message,
        scopes,
        types,
        allowMergeCommits,
        allowRevertCommits
      )
    );
}

export async function handlePullRequestChange(context: PrChangeContext) {
  const { title, head } = context.payload.pull_request;
  const userConfig = await context.config<Config>("semantic.yml");
  const noConfigProvided = userConfig == null;
  const {
    enabled,
    titleOnly,
    commitsOnly,
    titleAndCommits,
    anyCommit,
    scopes,
    types,
    allowMergeCommits,
    allowRevertCommits,
  } = { ...DEFAULT_OPTS, ...userConfig };

  const hasSemanticTitle = isSemanticMessage(title, scopes, types);
  const commits = (await context.octokit.pulls.listCommits()).data;
  const hasSemanticCommits = await commitsAreSemantic(
    commits,
    scopes,
    types,
    (commitsOnly || titleAndCommits) && !anyCommit,
    allowMergeCommits,
    allowRevertCommits
  );
  const nonMergeCommits = commits.filter(
    (element) => !element.commit.message.startsWith("Merge")
  );

  let isSemantic = false;

  if (!enabled) {
    isSemantic = true;
  } else if (titleOnly) {
    isSemantic = hasSemanticTitle;
  } else if (commitsOnly) {
    isSemantic = hasSemanticCommits;
  } else if (titleAndCommits) {
    isSemantic = hasSemanticTitle && hasSemanticCommits;
  } else if (noConfigProvided && nonMergeCommits.length === 1) {
    // Watch out for cases where there's only commit and it's not semantic.
    // GitHub won't squash PRs that have only one commit.
    isSemantic = hasSemanticCommits;
  } else {
    isSemantic = hasSemanticTitle || hasSemanticCommits;
  }

  const state = isSemantic ? "success" : "failure";

  function getDescription() {
    if (!enabled) return "skipped; check disabled in semantic.yml config";
    if (!isSemantic && noConfigProvided && nonMergeCommits.length === 1)
      return "PR has only one non-merge commit and it's not semantic; add another commit before squashing";
    if (isSemantic && titleAndCommits)
      return "ready to be merged, squashed or rebased";
    if (!isSemantic && titleAndCommits)
      return "add a semantic commit AND PR title";
    if (hasSemanticTitle && !commitsOnly) return "ready to be squashed";
    if (hasSemanticCommits && !titleOnly)
      return "ready to be merged or rebased";
    if (titleOnly) return "add a semantic PR title";
    if (commitsOnly && anyCommit) return "add a semantic commit";
    if (commitsOnly) return "make sure every commit is semantic";
    return "add a semantic commit or PR title";
  }

  const status = {
    head_sha: head.sha,
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
    name: "Semantic Pull Request",
    state,
    target_url: "https://github.com/probot/semantic-pull-requests",
    description: getDescription(),
  };
  const result = await context.octokit.checks.create(status);
  return result;
}
