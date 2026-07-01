export type UploadCredentials = {
  url: string;
  method: 'PUT' | 'POST';
  fields: Record<string, string>;
};

export abstract class MediaStorageService {
  abstract createUploadCredentials(
    key: string,
    contentType: string,
  ): Promise<UploadCredentials>;
  abstract getPublicUrl(key: string): string;
  abstract createSignedReadUrl(
    key: string,
    expiresIn?: number,
  ): Promise<string>;
}
