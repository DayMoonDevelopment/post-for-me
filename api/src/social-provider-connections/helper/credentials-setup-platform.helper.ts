import type { AuthUrlProviderData } from '../dto/create-provider-auth-url.dto';

type CredentialsSetupPlatformInput = {
  platform: string;
  platformData?: AuthUrlProviderData | null;
};

export const getCredentialsSetupPlatformLabel = ({
  platform,
  platformData,
}: CredentialsSetupPlatformInput): string => {
  switch (platform) {
    case 'instagram': {
      const connectionType = platformData?.instagram?.connection_type;

      if (connectionType) {
        return `${platform} ${connectionType == 'facebook' ? '(Facebook Login)' : ''}`;
      }

      return platform;
    }
    case 'x': {
      const connectionType = platformData?.x?.connection_type;

      if (connectionType) {
        return `${platform} (${connectionType})`;
      }

      return platform;
    }
    default:
      return platform;
  }
};
