import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Введите корректный email' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(1, 72, { message: 'Введите пароль' })
  password!: string;
}
