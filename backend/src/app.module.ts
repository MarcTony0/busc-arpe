import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { BensModule } from './bens/bens.module';

@Module({
  imports: [PrismaModule, BensModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
