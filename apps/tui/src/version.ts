import rootPackage from '../../../package.json' with { type: 'json' }

export const APP_NAME = 'agent-ledger'
export const APP_VERSION = rootPackage.version

export function getHelpText() {
  return [
    `Usage: ${APP_NAME} [options]`,
    '',
    'Options:',
    '  --help       Show this help message',
    '  --version    Show the current version',
    '',
    'Keyboard shortcuts are available inside the TUI.',
  ].join('\n')
}
