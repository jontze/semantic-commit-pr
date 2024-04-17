const commitTypes = Object.keys(require("conventional-commit-types").types);
import { validate } from "@jontze/parse-commit-message";
import { isHeaderType } from "@jontze/parse-commit-message/utils";

export const isSemanticMessage = (
  message: string,
  validScopes?: string[],
  validTypes?: string[],
  allowMergeCommits?: boolean,
  allowRevertCommits?: boolean
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
