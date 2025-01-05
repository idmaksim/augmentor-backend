import {
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class AugmentationGateway implements OnGatewayInit {
  private server: Server;

  async afterInit(server: Server) {
    this.server = server;
  }

  @SubscribeMessage('message')
  async handleMessage(client: Socket) {
    client.emit('message', 'Hello world!');
  }
}
