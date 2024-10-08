// See: https://medium.com/@TwitterArchiveEraser/notarize-electron-apps-7a5f988406db

//const fs = require('fs');
import fs from 'node:fs';
//const path = require('path');
import path from 'node:path';
import electron_notarize from 'electron-notarize';

export default async function (params) {
  // Only notarize the app on Mac OS only.
  if (params.electronPlatformName !== 'darwin') {
    return;
  }
  console.log('afterSign hook triggered', params);

  // Same appId in electron-builder.
  let appId = 'com.lot49.rssputin';

  let appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot find application at: ${appPath}`);
  }

  console.log(`Notarizing ${appId} found at ${appPath}`);

  try {
    await electron_notarize.notarize({
      tool: 'notarytool',
      appBundleId: appId,
      appPath: appPath,
      appleId: process.env.APPLEID,
      appleIdPassword: process.env.APPLEIDPASSRSSPUTIN,
      teamId: process.env.APPLETEAMID,
      //ascProvider: process.env.ASCPROVIDER,
    });
  } catch (error) {
    console.error(error);
  }

  console.log(`Done notarizing ${appId}`);
}
