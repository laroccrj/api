import { Game, User } from '../models';
import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../dynamoose/userRepository';
import { IGameRepository, GAME_REPOSITORY_SYMBOL } from '../dynamoose/gameRepository';
import { USER_SERVICE_SYMBOL, IUserService } from './userService';
import { deleteDiscourseGameTopic } from '../discourse';
import { sendEmail } from '../../lib/email/ses';
import { provideSingleton, inject } from '../ioc';
import * as _ from 'lodash';

export const GAME_SERVICE_SYMBOL = Symbol('IGameService');

export interface IGameService {
  deleteGame(game: Game, steamId: string): Promise<void>;
  getGamesForUser(user: User): Promise<Game[]>;
}

@provideSingleton(GAME_SERVICE_SYMBOL)
export class GameService implements IGameService {
  constructor(
    @inject(USER_REPOSITORY_SYMBOL) private userRepository: IUserRepository,
    @inject(USER_SERVICE_SYMBOL) private userService: IUserService,
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository
  ) {
  }

  public async deleteGame(game: Game, steamId: string) {
    const users = await this.userService.getUsersForGame(game);
    const promises = [];

    promises.push(this.gameRepository.delete(game.gameId));

    for (const curUser of users) {
      _.pull(curUser.activeGameIds, game.gameId);
      promises.push(this.userRepository.saveVersioned(curUser));

      if (curUser.emailAddress && (!steamId || curUser.steamId !== steamId)) {
        let message = `A game that you have recently joined (<b>${game.displayName}</b>) has been deleted`;

        if (!steamId) {
          message += ` because it took too long to start. :(`;
        } else {
          message += ` by it's creator. :(`;
        }

        promises.push(sendEmail(
          'Game Deleted',
          'Game Deleted',
          message,
          curUser.emailAddress
        ));
      }
    }

    promises.push(deleteDiscourseGameTopic(game));

    await Promise.all(promises);
  }

  public getGamesForUser(user: User): Promise<Game[]> {
    const gameKeys = user.activeGameIds || [];

    if (gameKeys.length > 0) {
      return this.gameRepository.batchGet(gameKeys);
    } else {
      return Promise.resolve([]);
    }
  };
}
