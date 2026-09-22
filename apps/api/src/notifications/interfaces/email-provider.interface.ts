export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  idempotencyKey?: string;
}

export interface EmailSendResult {
  messageId: string;
  success: boolean;
}

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<EmailSendResult>;
}

export const EMAIL_PROVIDER = Symbol("EMAIL_PROVIDER");
