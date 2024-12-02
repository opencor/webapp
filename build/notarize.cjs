const { notarize } = require('@electron/notarize')
require('dotenv').config({ path: ['.env.local', '.env'] })

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context

  if (electronPlatformName !== 'darwin') {
    return
  }

  const appPath = `${appOutDir}/${context.packager.appInfo.productFilename}.app`
  const appleId = process.env.APPLE_ID
  const appleIdPassword = process.env.APPLE_ID_PASSWORD
  const teamId = process.env.TEAM_ID

  console.log(`>>> appPath: ${appPath}`)
  console.log(`>>> appleId: ${appleId}`)
  console.log(`>>> appleIdPassword: ${appleIdPassword}`)
  console.log(`>>> teamId: ${teamId}`)

  return await notarize({ appPath, appleId, appleIdPassword, teamId })
}
