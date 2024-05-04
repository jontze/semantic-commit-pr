# Semantic Commit Analyzer for PRs

> A GitHub App built with [Probot](https://github.com/probot/probot)

This is a library that exposes a single Probot Application function that can be
used in Probot Apps to analyze the commits in PRs to determine if they follow
the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
specification.

This project is based and heavily inspired by [zeke's Probot
App](https://github.com/zeke/semantic-pull-requests) that sadly is no longer
maintained.

> **Note:** I wrote this mainly for my own personal use. If you want to use it
> in production, it might eat your laundry. Do it at your own risk.

## Usage

```typescript
import SemanticCommitPR from "@jontze/semantic-commit-pr";
import { createProbot } from "probot";

// https://probot.github.io/docs/development/#run-probot-programmatically

// Choose your way to instantiate Probot
const probotApp = createProbot();

// Load the Application Function into your App
probotApp.load(SemanticCommitPR);

// Start your Probot App
```

## License

[ISC](LICENSE) © 2024 jontze
