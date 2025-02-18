import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { AuthUserDto } from './dto/auth-user.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      const { password, ...userData } = createUserDto;

      const hashedPassword = bcrypt.hashSync(password, 10);

      const user = this.userRepository.create({
        ...userData,
        password: hashedPassword,
      });

      await this.userRepository.save(user);

      return user;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async login(authUserDto: AuthUserDto) {
    const { email, password } = authUserDto;
    const user = await this.userRepository.findOne({
      where: { email },
      select: { email: true, password: true, id: true },
    });

    if (!user) {
      throw new UnauthorizedException(
        `Please, check if the email or the password is correct`,
      );
    }

    // COMPARE PASSWORDS
    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        `Please, check if the email or the password is correct`,
      );
    }

    // TODO return JWT

    const token = this.getJwt({ id: user.id });

    return {
      ...user,
      token,
    };
  }

  checkAuthStatus(user: User) {
    const token = this.getJwt({ id: user.id });

    return {
      ...user,
      token,
    };
  }

  private getJwt(payload: JwtPayload): string {
    const token = this.jwtService.sign(payload);

    return token;
  }

  private handleDBErrors(error: any): never {
    console.error(error);
    if (error.code == '23505') {
      throw new BadRequestException('The email exist');
    }

    throw new InternalServerErrorException();
  }
}
