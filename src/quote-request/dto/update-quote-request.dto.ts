import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateQuoteRequestDto {
  @IsNotEmpty({ message: 'A státusz megadása kötelező.' })
  @IsIn(['PENDING', 'CONTACTED', 'ARCHIVED'], {
    message: 'A státusznak a következő értékek egyikének kell lennie: PENDING, CONTACTED, ARCHIVED.',
  })
  status: string;
}
