import crypto from 'node:crypto';
import env, { required } from 'shared/src/env.js';
import { EmailProvider, emailProvider } from 'shared/src/providers/email.provider.js';
import { UserRepository, userRepository } from 'shared/src/repositories/user.repository.js';

const SECRET_KEY = required(env.SECRET_KEY);
const SITE_URL = required(env.SITE_URL);

export type ExecuteParams = {
  email: string;
};

export class ForgotPasswordUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailProvider: EmailProvider,
  ) {}

  async execute({ email }: ExecuteParams) {
    const user = await this.userRepository.findFirst({ where: { email } });
    if (!user) return;

    const token = this.createResetToken(email);
    const resetUrl = `${SITE_URL}/authorization/reset-password?token=${token}`;

    await this.emailProvider.sendEmail({
      to: email,
      subject: 'Reset your password - Bitcoin API',
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  }

  createResetToken(email: string): string {
    const payload = JSON.stringify({ email, type: 'reset', exp: Date.now() + 60 * 60 * 1000 });
    const encoded = Buffer.from(payload).toString('base64url');
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(encoded).digest('base64url');
    return `${encoded}.${signature}`;
  }

  verifyResetToken(token: string): { email: string } {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) {
      throw new Error('Invalid token');
    }

    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(encoded).digest('base64url');
    if (signature !== expectedSignature) {
      throw new Error('Invalid token signature');
    }

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (payload.type !== 'reset') {
      throw new Error('Invalid token type');
    }
    if (payload.exp < Date.now()) {
      throw new Error('Token expired');
    }

    return { email: payload.email };
  }
}

export const forgotPasswordUsecase = new ForgotPasswordUsecase(userRepository, emailProvider);
