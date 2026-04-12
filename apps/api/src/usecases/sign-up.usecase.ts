import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import env, { required } from 'shared/src/env.js';
import { ValidationError } from 'shared/src/errors.js';
import { EmailProvider, emailProvider } from 'shared/src/providers/email.provider.js';
import { UserRepository, userRepository } from 'shared/src/repositories/user.repository.js';

const SECRET_KEY = required(env.SECRET_KEY);
const API_BROWSER_URL = required(env.API_BROWSER_URL);

export type ExecuteParams = {
  email: string;
  password: string;
};

export class SignUpUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailProvider: EmailProvider,
  ) {}

  async execute({ email, password }: ExecuteParams) {
    const existingUser = await this.userRepository.findFirst({
      where: { email },
    });

    if (existingUser) {
      throw new ValidationError('This user already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.userRepository.create({
      data: {
        email,
        password: hashedPassword,
        isActive: false,
      },
    });

    const token = this.createVerificationToken(email);
    const verifyUrl = `${API_BROWSER_URL}/v1/auth/verify-email?token=${token}`;

    await this.emailProvider.sendEmail({
      to: email,
      subject: 'Verify your email - Bitcoin API',
      html: `
        <h2>Welcome to Bitcoin API!</h2>
        <p>Click the link below to verify your email address:</p>
        <a href="${verifyUrl}">Verify Email</a>
        <p>This link expires in 24 hours.</p>
      `,
    });
  }

  createVerificationToken(email: string): string {
    const payload = JSON.stringify({ email, exp: Date.now() + 24 * 60 * 60 * 1000 });
    const encoded = Buffer.from(payload).toString('base64url');
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(encoded).digest('base64url');
    return `${encoded}.${signature}`;
  }

  verifyToken(token: string): { email: string } {
    const [encoded, signature] = token.split('.');
    if (!encoded || !signature) {
      throw new Error('Invalid token');
    }

    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(encoded).digest('base64url');
    if (signature !== expectedSignature) {
      throw new Error('Invalid token signature');
    }

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (payload.exp < Date.now()) {
      throw new Error('Token expired');
    }

    return { email: payload.email };
  }
}

export const signUpUsecase = new SignUpUsecase(userRepository, emailProvider);
