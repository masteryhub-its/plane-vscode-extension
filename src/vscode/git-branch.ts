import * as vscode from 'vscode';

interface GitRepository {
  readonly rootUri: vscode.Uri;
  readonly state: {
    readonly HEAD: { readonly name?: string } | undefined;
    readonly onDidChange: vscode.Event<void>;
  };
  createBranch(name: string, checkout: boolean): Promise<void>;
}

interface GitApi {
  readonly repositories: readonly GitRepository[];
  readonly onDidOpenRepository: vscode.Event<GitRepository>;
}

interface GitExtensionExports {
  getAPI(version: 1): GitApi;
}

function gitApi(): GitApi | undefined {
  const extension = vscode.extensions.getExtension<GitExtensionExports>('vscode.git');
  if (!extension?.isActive) {
    return undefined;
  }
  return extension.exports.getAPI(1);
}

function repositoryForActiveFile(api: GitApi): GitRepository | undefined {
  const active = vscode.window.activeTextEditor?.document.uri;
  const containing = active === undefined ? undefined : api.repositories.find((repo) => active.fsPath.startsWith(repo.rootUri.fsPath));
  return containing ?? api.repositories[0];
}

/** The branch the active file's repository is on, if the built-in Git extension is available. */
export function currentBranchName(): string | undefined {
  const api = gitApi();
  return api === undefined ? undefined : repositoryForActiveFile(api)?.state.HEAD?.name;
}

/** Creates and switches to a branch in the active file's repository. Returns false when there is no repository to do it in. */
export async function createAndCheckoutBranch(name: string): Promise<boolean> {
  const api = gitApi();
  const repository = api === undefined ? undefined : repositoryForActiveFile(api);
  if (repository === undefined) {
    return false;
  }
  await repository.createBranch(name, true);
  return true;
}

/** Calls `listener` whenever the branch might have changed, or the active file moves to another repository. */
export function onBranchMayHaveChanged(listener: () => void): vscode.Disposable {
  const subscriptions: vscode.Disposable[] = [vscode.window.onDidChangeActiveTextEditor(listener)];
  const watch = (repo: GitRepository): void => {
    subscriptions.push(repo.state.onDidChange(listener));
  };
  const api = gitApi();
  if (api !== undefined) {
    api.repositories.forEach(watch);
    subscriptions.push(
      api.onDidOpenRepository((repo) => {
        watch(repo);
        listener();
      })
    );
  }
  return vscode.Disposable.from(...subscriptions);
}
