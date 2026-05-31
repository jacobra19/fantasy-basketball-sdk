import { readFileSync } from 'node:fs';

export interface PackageMetadata {
  name: string;
  version: string;
}

const FALLBACK_METADATA: PackageMetadata = {
  name: 'fantasy-basketball-sdk',
  version: '0.0.0',
};

function readPackageMetadata(): PackageMetadata {
  try {
    const rawPackageJson = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
    const packageJson: unknown = JSON.parse(rawPackageJson);

    if (typeof packageJson !== 'object' || packageJson === null) {
      return FALLBACK_METADATA;
    }

    const metadata = packageJson as Record<string, unknown>;
    return {
      name: typeof metadata.name === 'string' ? metadata.name : FALLBACK_METADATA.name,
      version: typeof metadata.version === 'string' ? metadata.version : FALLBACK_METADATA.version,
    };
  } catch {
    return {
      name: process.env.npm_package_name ?? FALLBACK_METADATA.name,
      version: process.env.npm_package_version ?? FALLBACK_METADATA.version,
    };
  }
}

export const PACKAGE_METADATA = readPackageMetadata();
