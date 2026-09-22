import { Injectable, Logger } from "@nestjs/common";
import type { EmailProvider, EmailSendResult, SendEmailOptions } from "../interfaces/email-provider.interface";

export interface SentEmailRecord extends SendEmailOptions {
  messageId: string;
  sentAt: Date;
}

@Injectable()
export class DevEmailProvider implements EmailProvider {
  private readonly logger = new Logger("DevEmailProvider");
  private sentEmails: SentEmailRecord[] = [];

  async send(options: SendEmailOptions): Promise<EmailSendResult> {
    const messageId = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const record: SentEmailRecord = {
      ...options,
      messageId,
      sentAt: new Date(),
    };
    this.sentEmails.push(record);

    this.logger.log(
      `[DEV EMAIL DISPATCH] To: ${options.to} | Subject: "${options.subject}" | MessageId: ${messageId} | Attachments: ${options.attachments?.length ?? 0}`
    );

    return { messageId, success: true };
  }

  getSentEmails(): SentEmailRecord[] {
    return [...this.sentEmails];
  }

  clearSentEmails(): void {
    this.sentEmails = [];
  }
}
