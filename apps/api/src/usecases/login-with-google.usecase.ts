import { GoogleProvider, googleProvider } from '#src/providers/google.provider.js';
import { AppError } from 'shared/src/errors.js';
import { UserRepository, userRepository } from 'shared/src/repositories/user.repository.js';

type ExecuteParams = {
  code: string;
};

export class LoginWithGoogleUsecase {
  constructor(
    private readonly googleProvider: GoogleProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute({ code }: ExecuteParams) {
    const googleUser = await this.googleProvider.exchangeCode(code);

    if (!googleUser.email) {
      throw new AppError('Google account has no email', { code: 'GOOGLE_AUTH_FAILED' });
    }

    const existingUser = await this.userRepository.findFirst({
      where: { email: googleUser.email },
    });

    if (existingUser) return existingUser;

    return await this.userRepository.create({
      data: {
        email: googleUser.email,
        password: '',
        isActive: true,
      },
    });
  }
}

export const loginWithGoogleUsecase = new LoginWithGoogleUsecase(googleProvider, userRepository);
