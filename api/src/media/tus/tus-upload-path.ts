// Must match the final path Nest resolves for MediaTusController once the
// global URI versioning prefix (VersioningType.URI, defaultVersion: '1') is
// applied — @tus/server uses this to strip the prefix off incoming request
// paths and recover the upload id.
export const TUS_UPLOAD_PATH = '/v1/media/tus';
