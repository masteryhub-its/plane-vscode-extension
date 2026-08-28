import * as vscode from 'vscode';
import { PlaneError, PlaneErrorCode } from '../errors/plane-error';
import { isAllowedHttpUrl } from '../utils/allowed-http-url';

export async function openPlaneUrl(url: string): Promise<void> {
  if (!isAllowedHttpUrl(url)) {
    throw new PlaneError('Only http and https URLs can be opened', PlaneErrorCode.INVALID_CONFIG);
  }
  await vscode.env.openExternal(vscode.Uri.parse(url));
}
