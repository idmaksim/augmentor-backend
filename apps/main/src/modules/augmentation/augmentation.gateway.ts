import { WsJwtAuthGuard } from '@app/common';
import { TokenService } from '@app/token';
import { UsersService } from '@app/users';
import { Logger, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
@UseGuards(WsJwtAuthGuard)
export class AugmentationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private logger = new Logger(AugmentationGateway.name);
  private server: Server;

  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  async afterInit(server: Server) {
    this.server = server;
  }

  private async getUser(client: Socket) {
    const token = this.extractToken(client);
    this.logger.debug(`Токен: ${token}`);
    if (token) {
      try {
        const payload = await this.tokenService.verifyAccessToken(token);
        return this.usersService.findOneById({
          id: payload.id,
          withPassword: false,
        });
      } catch (error) {
        this.logger.error(`Ошибка проверки токена: ${error}`);
        this.emitError(client, 'Неверный токен');
        client.disconnect();
      }
    }
  }

  private extractToken(client: Socket): string | undefined {
    return client.handshake.headers.authorization?.split(' ')[1];
  }

  private emitError(client: Socket, message: string) {
    client.emit('error', { message });
  }

  async handleConnection(client: Socket) {
    this.logger.debug(`Клиент подключен: ${client.id}`);
    const user = await this.getUser(client);
    if (user) {
      this.logger.debug(
        `Клиент ${client.id} присоединился к комнате ${user.id}`,
      );
      client.join(user.id);
      return;
    }
    this.logger.error('Неверный токен');
    this.emitError(client, 'Неверный токен');
    client.disconnect();
  }

  async handleDisconnect(client: Socket) {
    const user = await this.getUser(client);
    if (user) {
      this.logger.debug(`Клиент ${client.id} покинул комнату ${user.id}`);
      client.leave(user.id);
    }
    this.logger.debug(`Клиент отключен: ${client.id}`);
  }

  async emitResultToUser(userId: string, result: string) {
    this.server.to(userId).emit('result', result);
  }
}
