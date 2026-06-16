import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateQuoteRequestDto {
  @IsNotEmpty({ message: 'A név megadása kötelező.' })
  @IsString({ message: 'A névnek szöveges formátumúnak kell lennie.' })
  name: string;

  @IsNotEmpty({ message: 'Az e-mail cím megadása kötelező.' })
  @IsEmail({}, { message: 'Kérjük, érvényes e-mail címet adjon meg.' })
  email: string;

  @IsOptional()
  @IsString({ message: 'A cégnévnek szöveges formátumúnak kell lennie.' })
  companyName?: string;

  @IsNotEmpty({ message: 'A telefonszám megadása kötelező.' })
  @IsString({ message: 'A telefonszámnak szöveges formátumúnak kell lennie.' })
  phoneNumber: string;

  @IsNotEmpty({ message: 'A projekt típusának kiválasztása kötelező.' })
  @IsString({ message: 'A projekt típusának szöveges formátumúnak kell lennie.' })
  projectType: string;

  @IsNotEmpty({ message: 'A költségvetés megadása kötelező.' })
  @IsString({ message: 'A költségvetésnek szöveges formátumúnak kell lennie.' })
  projectBudget: string;

  @IsNotEmpty({ message: 'A projekt leírásának megadása kötelező.' })
  @IsString({ message: 'A leírásnak szöveges formátumúnak kell lennie.' })
  @MinLength(10, { message: 'Kérjük, fejtse ki részletesebben a projektet (legalább 10 karakter).' })
  projectDescription: string;
}
