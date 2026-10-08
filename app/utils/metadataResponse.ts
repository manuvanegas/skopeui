import type { Dataset, MetadataResponse } from "@/types/metadata";

// The /metadata major version this UI reads. A newer minor version only adds
// fields, which the UI ignores; any other major means one side needs an update.
export const SUPPORTED_METADATA_MAJOR = 1;

export class UnsupportedMetadataVersionError extends Error {
  constructor(readonly received: string | null) {
    super(
      `The API serves /metadata ${received ?? "without a schema_version"}; ` +
        `this UI reads ${SUPPORTED_METADATA_MAJOR}.x.`,
    );
    this.name = "UnsupportedMetadataVersionError";
  }
}

/** Returns the datasets of a /metadata response this UI can read, or throws. */
export function datasetsFromMetadata(response: unknown): Dataset[] {
  const version =
    response !== null && typeof response === "object"
      ? (response as Partial<MetadataResponse>).schema_version
      : undefined;
  if (typeof version !== "string") {
    throw new UnsupportedMetadataVersionError(null);
  }
  if (Number(version.split(".")[0]) !== SUPPORTED_METADATA_MAJOR) {
    throw new UnsupportedMetadataVersionError(version);
  }
  return (response as MetadataResponse).datasets;
}
