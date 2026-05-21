/**
 * Accès Netlify Blobs — connectLambda (webhook/cron) ou siteID + token (appel HTTP manuel).
 */

let netlifyBlobsModule = null;
try {
  netlifyBlobsModule = require('@netlify/blobs');
} catch (e) {}

function getBlobStore(event, storeName) {
  if (!netlifyBlobsModule) return null;
  const blobs = netlifyBlobsModule;
  if (event && blobs.connectLambda) {
    try {
      blobs.connectLambda(event);
      return blobs.getStore(storeName);
    } catch (e) {
      console.warn('blobs connectLambda:', e.message);
    }
  }
  const siteID =
    process.env.NETLIFY_SITE_ID ||
    process.env.SITE_ID ||
    process.env.NETLIFY_SITE_ID ||
    '';
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN ||
    process.env.NETLIFY_API_TOKEN ||
    '';
  if (siteID && token) {
    return blobs.getStore({ name: storeName, siteID, token });
  }
  try {
    return blobs.getStore(storeName);
  } catch (e) {
    console.warn('blobs getStore:', e.message);
    return null;
  }
}

module.exports = { getBlobStore, netlifyBlobsAvailable: () => !!netlifyBlobsModule };
