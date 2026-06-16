import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { QuoteRequestModule } from './quote-request/quote-request.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    QuoteRequestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

