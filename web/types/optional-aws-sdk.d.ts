declare module "@aws-sdk/client-s3" {
  export class S3Client {
    constructor(config: { region: string });
    send(command: unknown): Promise<{
      Body?: { transformToByteArray(): Promise<Uint8Array> };
    }>;
  }
  export class PutObjectCommand {
    constructor(input: Record<string, unknown>);
  }
  export class GetObjectCommand {
    constructor(input: Record<string, unknown>);
  }
}
