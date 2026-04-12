import bcrypt from 'bcrypt';
import { ValidationError } from 'shared/src/errors.js';
import { UserRepository, userRepository } from 'shared/src/repositories/user.repository.js';
import { ForgotPasswordUsecase, forgotPasswordUsecase } from './forgot-password.usecase.js';

export type ExecuteParams = {
  token: string;
  password: string;
};

export class ResetPasswordUsecase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly forgotPasswordUsecase: ForgotPasswordUsecase,
  ) {}

  async execute({ token, password }: ExecuteParams) {
    let email: string;
    try {
      ({ email } = this.forgotPasswordUsecase.verifyResetToken(token));
    } catch {
      throw new ValidationError('Invalid or expired reset link');
    }

    const user = await this.userRepository.findFirst({ where: { email } });
    if (!user) {
      throw new ValidationError('User not found');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.userRepository.update({
      where: { email },
      data: { password: hashedPassword },
    });
  }
}

export const resetPasswordUsecase = new ResetPasswordUsecase(userRepository, forgotPasswordUsecase);
