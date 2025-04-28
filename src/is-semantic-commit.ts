import conventionalCommits from "./conventional-commit-types.json" with { type: "json" };
import { validate } from "@jontze/parse-commit-message";
import { isHeaderType } from "@jontze/parse-commit-message/utils";
import { Config } from "./config.js";

export const commitTypes = Object.keys(conventionalCommits.types);

export const isSemanticResult = (
  hasSemanticCommits: boolean,
  hasSemanticTitle: boolean,
  hasOnlySingleNonMergeCommit: boolean,
  config: Config,
): boolean => {
  let isSemantic = false;

  if (!config.enabled) {
    isSemantic = true;
  } else if (config.titleOnly) {
    isSemantic = hasSemanticTitle;
  } else if (config.commitsOnly) {
    isSemantic = hasSemanticCommits;
  } else if (config.titleAndCommits) {
    isSemantic = hasSemanticTitle && hasSemanticCommits;
  } else if (hasOnlySingleNonMergeCommit) {
    // Watch out for cases where there's only commit and it's not semantic.
    // GitHub won't squash PRs that have only one commit.
    isSemantic = hasSemanticCommits;
  } else {
    isSemantic = hasSemanticTitle || hasSemanticCommits;
  }
  return isSemantic;
};

export const areCommitsSemantic = async (
  commits: { commit: { message: string } }[],
  scopes?: string[],
  types?: string[],
  allCommits?: boolean,
  allowMergeCommits?: boolean,
  allowRevertCommits?: boolean,
): Promise<boolean> => {
  return commits
    .map((element) => element.commit)
    [
      allCommits ? "every" : "some"
    ]((commit) => isSemanticMessage(commit.message, scopes, types, allowMergeCommits, allowRevertCommits));
};

export const isSemanticMessage = (
  message: string,
  validScopes?: string[],
  validTypes?: string[],
  allowMergeCommits?: boolean,
  allowRevertCommits?: boolean,
): boolean => {
  const isMergeCommit = message && message.startsWith("Merge");
  if (allowMergeCommits && isMergeCommit) return true;

  const isRevertCommit = message && message.startsWith("Revert");
  if (allowRevertCommits && isRevertCommit) return true;

  const { error, value: commits } = validate(message, {});

  if (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error(error);
    }
    return false;
  }

  if (commits?.[0] == null) {
    console.error("Fatal: Commits are for some reason undefined");
    return false;
  }

  const header = commits[0].header;
  if (!isHeaderType(header)) {
    console.error("Fatal: Header is not a valid type");
    return false;
  }

  const isScopeValid =
    !validScopes ||
    !header.scope ||
    header.scope
      .split(",")
      .map((scope) => scope.trim())
      .every((scope) => validScopes.includes(scope));
  return (validTypes || commitTypes).includes(header.type) && isScopeValid;
};
