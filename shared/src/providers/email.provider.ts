import { Resend } from 'resend';
import env, { required } from '../env.js';

const RESEND_API_KEY = required(env.RESEND_API_KEY);

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export class EmailProvider {
  private resend = new Resend(RESEND_API_KEY);

  async sendEmail({ to, subject, html }: SendEmailParams) {
    return this.resend.emails.send({
      from: 'Bitcoin API <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
  }
}

export const emailProvider = new EmailProvider();
