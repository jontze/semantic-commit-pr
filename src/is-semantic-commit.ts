const commitTypes = Object.keys(require("conventional-commit-types").types);
import { validate } from "parse-commit-message";

export function isSemanticMessage(
  message: string,
  validScopes?: string[],
  validTypes?: string[],
  allowMergeCommits?: boolean,
  allowRevertCommits?: boolean
) {
  const isMergeCommit = message && message.startsWith("Merge");
  if (allowMergeCommits && isMergeCommit) return true;

  const isRevertCommit = message && message.startsWith("Revert");
  if (allowRevertCommits && isRevertCommit) return true;

  const { error, value: commits } = validate(message, true);

  if (error) {
    if (process.env.NODE_ENV !== "test") console.error(error);
    return false;
  }

  const [result] = commits;
  const { scope: scopes, type } = result.header;
  const isScopeValid =
    !validScopes ||
    !scopes ||
    scopes
      .split(",")
      .map((scope) => scope.trim())
      .every((scope) => validScopes.includes(scope));
  return (validTypes || commitTypes).includes(type) && isScopeValid;
}
