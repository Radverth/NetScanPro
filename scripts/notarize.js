// macOS notarization hook for electron-builder
// Only runs on macOS CI with APPLE_ID secret configured
exports.default = async function notarize(context) {
  const { electronPlatformName } = context
  if (electronPlatformName !== 'darwin') return
  if (!process.env.APPLE_ID) return

  const { notarize } = await import('@electron/notarize')
  const appName = context.packager.appInfo.productFilename

  await notarize({
    tool: 'notarytool',
    appPath: `${context.appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  })
}
