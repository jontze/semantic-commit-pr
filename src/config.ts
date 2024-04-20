import { PrChangeContext } from "./handle-pr-change.js";

export interface Config {
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

export const DEFAULT_OPTS: Config = {
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

const CONFIG_PATH = "semantic.yml";

export const loadConfig = async (context: PrChangeContext): Promise<Config> => {
  const repoConfig = await context.config<Config>(CONFIG_PATH);
  console.debug("Repo Config: ", repoConfig);
  return {
    ...DEFAULT_OPTS,
    ...repoConfig,
  };
};
