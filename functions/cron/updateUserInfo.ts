import { IUserRepository, USER_REPOSITORY_SYMBOL } from '../../lib/dynamoose/userRepository';
import { getPlayerSummaries } from '../../lib/steamUtil';
import { loggingHandler } from '../../lib/logging';
import { User } from '../../lib/models/user';
import * as _ from 'lodash';

export const handler = loggingHandler(async (event, context, iocContainer) => {
  const userRepository = iocContainer.get<IUserRepository>(USER_REPOSITORY_SYMBOL);

  const usersToUpdate: User[] = [];
  const users: User[] = await userRepository.scan().exec();

  await Promise.all(_.map(_.chunk(users, 75), async chunk => {
    const steamIds = _.map(chunk, 'steamId');

    const players = await getPlayerSummaries(steamIds);

    for (let user of chunk) {
      const curPlayer = _.find(players, player => {
        return user.steamId === player.steamid;
      });

      const isDirty = possiblyUpdateValue(user, 'displayName', curPlayer.personaname) ||
        possiblyUpdateValue(user, 'avatarSmall', curPlayer.avatar) ||
        possiblyUpdateValue(user, 'avatarMedium', curPlayer.avatarmedium) ||
        possiblyUpdateValue(user, 'avatarFull', curPlayer.avatarfull);

      if (isDirty) {
        console.log(`Updating ${user.displayName}...`);
        usersToUpdate.push(user);
      }
    }
  }));

  for (const user of usersToUpdate) {
    await userRepository.saveVersioned(user);
  }
});

////////

function possiblyUpdateValue(source, sourceProp, newValue) {
  if (source[sourceProp] === newValue) {
    return false;
  }

  source[sourceProp] = newValue;

  return true;
}