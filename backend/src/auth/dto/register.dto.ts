import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 50, { message: 'Имя должно содержать от 2 до 50 символов' })
  name!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Введите корректный email' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(6, 72, { message: 'Пароль должен содержать от 6 до 72 символов' })
  password!: string;
}
