/**
 * Storage for this app: S3 (Bucketeer on Heroku) or the local disk in
 * development. See src/platform/storage.ts.
 */
export {
  deleteObject,
  documentStore,
  getObject,
  list,
  presignUpload,
  putObject,
  STORAGE_UPLOAD_FAILURE_HINT,
} from './platform/storage.ts';
